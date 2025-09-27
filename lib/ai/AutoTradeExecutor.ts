import { TradeSignal, Portfolio, MarketData } from '@/types/trading'
import { AILearningSystem, TradeOutcome } from './AILearningSystem'
import { PositionSizingManager, PositionSizeResult } from './PositionSizingManager'
import { getAlpacaClient } from '@/lib/alpaca/server-client'

export interface ExecutionConfig {
  autoExecuteEnabled: boolean
  confidenceThresholds: {
    minimum: number // 0.65 = 65% minimum to consider
    conservative: number // 0.75 = 75% for smaller positions
    aggressive: number // 0.85 = 85% for larger positions
    maximum: number // 0.95 = 95% for maximum position size
  }
  positionSizing: {
    baseSize: number // Base position size (e.g., 0.02 = 2% of portfolio)
    maxSize: number // Maximum position size (e.g., 0.10 = 10% of portfolio)
    confidenceMultiplier: number // How much confidence affects size (e.g., 2.0)
  }
  riskControls: {
    maxDailyTrades: number // Maximum trades per day
    maxOpenPositions: number // Maximum open positions
    maxDailyLoss: number // Maximum daily loss percentage
    cooldownPeriod: number // Minutes between trades for same symbol
  }
  executionRules: {
    marketHoursOnly: boolean
    avoidEarnings: boolean // Avoid trading around earnings
    volumeThreshold: number // Minimum volume requirement
    spreadThreshold: number // Maximum bid-ask spread
    cryptoTradingEnabled?: boolean // Enable crypto trading
    afterHoursTrading?: boolean // Enable after hours trading
    weekendTrading?: boolean // Enable weekend trading for crypto
    cryptoSpreadThreshold?: number // Higher spread tolerance for crypto
  }
}

interface ExecutionDecision {
  shouldExecute: boolean
  positionSize: number
  reason: string
  confidence: number
  riskScore: number
  executionPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface TradeExecution {
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  price: number
  orderId: string
  timestamp: Date
  confidence: number
  aiScore: number
  executionTime: number // milliseconds
  slippage: number
  fees: number
}

interface ExecutionMetrics {
  totalExecutions: number
  successfulExecutions: number
  avgExecutionTime: number
  avgSlippage: number
  avgConfidence: number
  profitableExecutions: number
  totalPnL: number
  avgPnL: number
  bestExecution: TradeExecution | null
  worstExecution: TradeExecution | null
}

export class AutoTradeExecutor {
  private config: ExecutionConfig
  private executionHistory: TradeExecution[] = []
  private lastTradeTime = new Map<string, Date>()
  private dailyTradeCount = 0
  private dailyPnL = 0
  private isExecutionEnabled = true
  private learningSystem: AILearningSystem
  private openTrades = new Map<string, { tradeId: string, entryPrice: number, entryTime: Date, symbol: string, action: 'BUY' | 'SELL' }>()
  private positionSizingManager: PositionSizingManager
  private alpacaClient = getAlpacaClient()

  constructor(config: ExecutionConfig) {
    this.config = config
    this.learningSystem = new AILearningSystem()
    this.positionSizingManager = new PositionSizingManager({
      maxPositionPercent: config.positionSizing.maxSize,
      basePositionPercent: config.positionSizing.baseSize,
      minOrderValue: 25,
      maxOrderValue: 1000,
      buyingPowerBuffer: 0.05,
      conservativeMode: true // Enable conservative mode from quick_fix_patch for extra safety
    })
    this.resetDailyCounters()
  }

  async evaluateAndExecute(
    signal: TradeSignal,
    marketData: MarketData[],
    portfolio: Portfolio,
    aiScore: number
  ): Promise<ExecutionDecision> {

    // Step 1: Make execution decision
    const decision = await this.makeExecutionDecision(signal, marketData, portfolio, aiScore)

    // Step 2: Execute if approved
    console.log(`🔧 AutoTradeExecutor Config: autoExecute=${this.config.autoExecuteEnabled}, isEnabled=${this.isExecutionEnabled}`)

    if (decision.shouldExecute && this.config.autoExecuteEnabled && this.isExecutionEnabled) {
      try {
        console.log(`🚀 EXECUTING TRADE: ${signal.action} ${marketData[0].symbol} - Position Size: ${(decision.positionSize * 100).toFixed(2)}%`)

        const execution = await this.executeTradeOrder(signal, decision, marketData, portfolio)

        // Track trade entry for learning
        const tradeId = execution.orderId
        await this.learningSystem.trackTradeEntry(
          tradeId,
          signal,
          marketData,
          execution.price,
          decision.positionSize
        )

        // Store open trade for exit tracking
        this.openTrades.set(tradeId, {
          tradeId,
          entryPrice: execution.price,
          entryTime: new Date(),
          symbol: marketData[0].symbol,
          action: signal.action.toUpperCase() as 'BUY' | 'SELL'
        })

        console.log(`🚀 AUTO-EXECUTED: ${signal.action} ${marketData[0].symbol} - Confidence: ${(signal.confidence * 100).toFixed(1)}%`)
        console.log(`💰 Order ID: ${tradeId} | Price: $${execution.price} | Amount: $${(execution.price * execution.quantity).toFixed(2)}`)
        console.log(`📚 Learning: Tracking trade ${tradeId} for AI improvement`)
      } catch (error) {
        console.error(`❌ Auto-execution failed for ${marketData[0].symbol}:`, error.message)
        console.error('📊 Error details:', error.stack)
        decision.shouldExecute = false
        decision.reason = `Execution failed: ${error.message}`
      }
    } else {
      console.log(`⏸️ AUTO-EXECUTION BLOCKED: shouldExecute=${decision.shouldExecute}, autoEnabled=${this.config.autoExecuteEnabled}, executionEnabled=${this.isExecutionEnabled}`)
    }

    return decision
  }

  private async makeExecutionDecision(
    signal: TradeSignal,
    marketData: MarketData[],
    portfolio: Portfolio,
    aiScore: number
  ): Promise<ExecutionDecision> {

    const symbol = marketData[0].symbol
    const confidence = signal.confidence
    const currentPrice = marketData[marketData.length - 1].close

    // Default decision
    const decision: ExecutionDecision = {
      shouldExecute: false,
      positionSize: 0,
      reason: 'Analysis pending',
      confidence,
      riskScore: signal.riskScore || 0.5,
      executionPriority: 'LOW'
    }

    // Check 1: Enhanced confidence threshold with performance adjustment
    const performanceAdjustment = this.getPerformanceBasedAdjustment()
    const effectiveMinimum = Math.max(0.55, this.config.confidenceThresholds.minimum + performanceAdjustment)

    console.log(`📊 ${symbol} Execution Check: confidence=${(confidence * 100).toFixed(1)}%, threshold=${(effectiveMinimum * 100).toFixed(1)}%`)

    if (confidence < effectiveMinimum) {
      decision.reason = `Confidence below threshold: ${(confidence * 100).toFixed(1)}% < ${(effectiveMinimum * 100).toFixed(1)}%`
      return decision
    }

    // Check 2: Market conditions (relaxed for crypto)
    const isCrypto = this.isCryptoSymbol(symbol)
    if (this.config.executionRules.marketHoursOnly && !isCrypto && !this.isMarketOpen()) {
      // Allow crypto trading 24/7, but respect market hours for stocks
      const now = new Date()
      const isWeekend = now.getDay() === 0 || now.getDay() === 6

      if (!isWeekend || !this.config.executionRules.weekendTrading) {
        decision.reason = 'Market closed and weekend trading disabled'
        return decision
      }
    }

    // Check 3: Daily trade limits (more lenient for bot)
    const dailyLimit = Math.min(this.config.riskControls.maxDailyTrades, 100) // Cap at 100/day
    if (this.dailyTradeCount >= dailyLimit) {
      decision.reason = `Daily trade limit reached: ${this.dailyTradeCount}/${dailyLimit}`
      return decision
    }

    // Check 4: Daily loss limits
    if (this.dailyPnL < -this.config.riskControls.maxDailyLoss * portfolio.totalValue) {
      decision.reason = `Daily loss limit reached: ${(this.dailyPnL / portfolio.totalValue * 100).toFixed(2)}%`
      this.isExecutionEnabled = false // Disable execution for the day
      return decision
    }

    // Check 5: Maximum open positions
    if (portfolio.positions.length >= this.config.riskControls.maxOpenPositions) {
      decision.reason = `Maximum positions reached: ${portfolio.positions.length}/${this.config.riskControls.maxOpenPositions}`
      return decision
    }

    // Check 6: Cooldown period (relaxed)
    const lastTradeTime = this.lastTradeTime.get(symbol)
    if (lastTradeTime) {
      const timeSinceLastTrade = (Date.now() - lastTradeTime.getTime()) / 1000 / 60 // minutes
      const cooldownPeriod = Math.max(1, this.config.riskControls.cooldownPeriod / 2) // Half the cooldown

      if (timeSinceLastTrade < cooldownPeriod) {
        decision.reason = `Cooldown active: ${timeSinceLastTrade.toFixed(1)}/${cooldownPeriod} minutes`
        return decision
      }
    }

    // Check 7: Volume threshold
    const avgVolume = this.calculateAverageVolume(marketData)
    if (avgVolume < this.config.executionRules.volumeThreshold) {
      decision.reason = `Volume too low: ${avgVolume.toLocaleString()}`
      return decision
    }

    // Check 8: Bid-ask spread (if available) - use crypto threshold for crypto assets
    const spread = this.estimateSpread(marketData)
    const spreadThreshold = isCrypto && this.config.executionRules.cryptoSpreadThreshold
      ? this.config.executionRules.cryptoSpreadThreshold
      : this.config.executionRules.spreadThreshold

    if (spread > spreadThreshold) {
      decision.reason = `Spread too wide: ${(spread * 100).toFixed(2)}% (${isCrypto ? 'crypto' : 'stock'} threshold: ${(spreadThreshold * 100).toFixed(1)}%)`
      return decision
    }

    // Check 9: Existing position
    const existingPosition = portfolio.positions.find(pos => pos.symbol === symbol)
    if (existingPosition) {
      // If we have a position, only allow opposite trades or scaling out
      if (
        (existingPosition.side === 'LONG' && signal.action === 'BUY') ||
        (existingPosition.side === 'SHORT' && signal.action === 'SELL')
      ) {
        decision.reason = 'Already have position in same direction'
        return decision
      }
    }

    // Calculate position size based on confidence
    decision.positionSize = this.calculateOptimalPositionSize(confidence, aiScore, portfolio, signal.riskScore || 0.5)

    // Enhanced minimum position size check (lower for crypto)
    const minPositionSize = isCrypto ? 0.003 : 0.005 // 0.3% crypto, 0.5% stocks
    if (decision.positionSize < minPositionSize) {
      decision.reason = `Position size too small: ${(decision.positionSize * 100).toFixed(3)}% < ${(minPositionSize * 100).toFixed(1)}%`
      return decision
    }

    // Determine execution priority
    decision.executionPriority = this.determineExecutionPriority(confidence, aiScore, decision.positionSize)

    // All checks passed - approve execution
    decision.shouldExecute = true
    decision.reason = this.generateExecutionReason(confidence, aiScore, decision.positionSize, decision.executionPriority)

    return decision
}

  private calculateOptimalPositionSize(
    confidence: number,
    aiScore: number,
    portfolio: Portfolio,
    riskScore: number
  ): number {

    // Start with base size
    let positionSize = this.config.positionSizing.baseSize

    // Enhanced confidence multiplier (more aggressive for bots)
    const confidenceBonus = Math.pow(confidence / 0.6, 1.8) // Exponential scaling from 60% baseline
    positionSize *= confidenceBonus

    // AI score multiplier (0-100 scale)
    const aiMultiplier = 0.5 + (aiScore / 100) * 1.5 // 0.5x to 2.0x multiplier
    positionSize *= aiMultiplier

    // Risk adjustment (less aggressive penalty)
    const riskAdjustment = 1 - (riskScore * 0.3) // Max 30% reduction for high risk
    positionSize *= riskAdjustment

    // Confidence tier bonuses (enhanced for automation)
    if (confidence >= 0.90) {
      positionSize *= 1.8 // 80% bonus for 90%+ confidence
    } else if (confidence >= 0.85) {
      positionSize *= 1.5 // 50% bonus for 85%+ confidence
    } else if (confidence >= 0.75) {
      positionSize *= 1.25 // 25% bonus for 75%+ confidence
    } else if (confidence >= 0.65) {
      positionSize *= 1.1 // 10% bonus for 65%+ confidence
    }

    // Portfolio health multiplier
    const portfolioHealth = this.assessPortfolioHealth(portfolio)
    positionSize *= portfolioHealth

    // Ensure within bounds with bot-friendly limits
    const maxSize = Math.min(this.config.positionSizing.maxSize, 0.10) // Cap at 10% for safety
    positionSize = Math.max(0.003, Math.min(positionSize, maxSize))

    return positionSize
  }

  private determineExecutionPriority(
    confidence: number,
    aiScore: number,
    positionSize: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {

    const score = (confidence * 40) + (aiScore * 0.4) + (positionSize * 200)

    if (score >= 90) return 'CRITICAL' // Ultra-high confidence + large position
    if (score >= 75) return 'HIGH'     // High confidence
    if (score >= 60) return 'MEDIUM'   // Medium confidence
    return 'LOW'                       // Lower confidence but still executable
  }

  private generateExecutionReason(
    confidence: number,
    aiScore: number,
    positionSize: number,
    priority: string
  ): string {
    const confidencePercent = (confidence * 100).toFixed(1)
    const sizePercent = (positionSize * 100).toFixed(1)

    return `${priority} PRIORITY: ${confidencePercent}% confidence, AI score: ${aiScore.toFixed(1)}, size: ${sizePercent}% of portfolio`
  }

  private async executeTradeOrder(
    signal: TradeSignal,
    decision: ExecutionDecision,
    marketData: MarketData[],
    portfolio: Portfolio
  ): Promise<TradeExecution> {

    const symbol = marketData[0].symbol
    const currentPrice = marketData[marketData.length - 1].close

    // ENHANCED: Get account info for accurate buying power validation
    console.log('💳 Getting current account information for buying power validation...')
    const accountInfo = await this.alpacaClient.getAccount()
    if (!accountInfo) {
      throw new Error('Failed to get account information')
    }

    const availableBuyingPower = parseFloat(accountInfo.availableBuyingPower.toString()) || 0
    console.log(`💰 Available buying power: $${availableBuyingPower}`)

    // ENHANCED: Use advanced position sizing with buying power validation
    const positionSizeResult = this.positionSizingManager.calculatePositionSize(
      signal.confidence * 100, // Convert to percentage
      symbol,
      availableBuyingPower,
      currentPrice
    )

    if (!positionSizeResult.withinLimits) {
      throw new Error(`Position sizing failed: ${positionSizeResult.reasoning}`)
    }

    const notionalAmount = positionSizeResult.positionSize
    console.log(`📏 Enhanced position sizing: $${notionalAmount} (${(positionSizeResult.positionPercent * 100).toFixed(1)}% of buying power)`)

    // Final validation
    const validation = this.positionSizingManager.validatePositionSize(notionalAmount, availableBuyingPower, symbol)
    if (!validation.valid) {
      throw new Error(`Position validation failed: ${validation.reason}`)
    }

    // EXTRA SAFETY CHECK: Ensure position doesn't exceed 95% of buying power (from quick_fix_patch)
    if (notionalAmount > availableBuyingPower * 0.95) {
      throw new Error(`Position size $${notionalAmount} exceeds 95% of buying power $${availableBuyingPower}`)
    }

    // ENHANCED: Get current market price for validation
    console.log('📊 Getting current market price for validation...')
    try {
      const priceInfo = await this.getCurrentPrice(symbol)
      if (priceInfo && Math.abs(priceInfo.price - currentPrice) / currentPrice > 0.05) {
        console.log(`⚠️ Price difference detected: cached $${currentPrice} vs current $${priceInfo.price}`)
      }
    } catch (error) {
      console.warn('Could not validate current price:', error.message)
    }

    const startTime = Date.now()

    // Clean symbol for Alpaca API (remove crypto suffixes)
    const cleanSymbol = symbol.replace('-USD', '').replace('/USD', '')

    // Create enhanced order payload
    const orderPayload = {
      symbol: cleanSymbol,
      notional: Math.round(notionalAmount * 100) / 100, // Round to 2 decimal places
      side: signal.action.toLowerCase(), // buy/sell
      type: 'market', // Use market orders for immediate execution
      time_in_force: 'day',
      client_order_id: `ai_auto_${cleanSymbol}_${Date.now()}`
    }

    console.log('📝 Placing order with enhanced validation:', {
      ...orderPayload,
      currentPrice,
      estimatedShares: (notionalAmount / currentPrice).toFixed(4),
      buyingPowerUsed: `${(positionSizeResult.positionPercent * 100).toFixed(1)}%`,
      buyingPowerRemaining: `$${(availableBuyingPower - notionalAmount).toFixed(2)}`
    })

    // Execute order using server-side Alpaca client for better error handling
    let orderResult
    try {
      // Try using server-side client first (better error handling)
      orderResult = await this.executeOrderWithAlpaca(orderPayload)
    } catch (serverError) {
      console.warn('Server-side execution failed, trying API endpoint:', serverError.message)

      // Fallback to API endpoint
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://ai-trading-bot-nextjs.vercel.app'
        : 'http://localhost:3000'

      const response = await fetch(`${baseUrl}/api/alpaca/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Order execution failed: ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(`Order execution failed: ${result.error || 'Unknown error'}`)
      }

      orderResult = { success: true, data: result.order }
    }

    const executionTime = Date.now() - startTime
    const order = orderResult.data

    // Calculate slippage (if order filled)
    const filledPrice = order.filledPrice || order.filled_avg_price || order.avg_fill_price || currentPrice
    const slippage = Math.abs(filledPrice - currentPrice) / currentPrice

    // Calculate actual quantity from notional amount and fill price
    const actualQuantity = filledPrice ? (notionalAmount / filledPrice) : 0

    // Create execution record
    const execution: TradeExecution = {
      symbol: cleanSymbol,
      action: signal.action === 'HOLD' ? 'BUY' : signal.action,
      quantity: actualQuantity,
      price: filledPrice,
      orderId: order.orderId || order.id || order.client_order_id,
      timestamp: new Date(),
      confidence: signal.confidence,
      aiScore: 0, // Will be updated by caller
      executionTime,
      slippage,
      fees: 0 // Would calculate based on commission structure
    }

    // Update tracking
    this.executionHistory.push(execution)
    this.lastTradeTime.set(symbol, new Date())
    this.dailyTradeCount++

    // Set stop loss and take profit
    if (order.status === 'filled' || order.status === 'partially_filled') {
      await this.setAutomatedStopLossAndTakeProfit(execution, signal, marketData)
    }

    console.log(`✅ ENHANCED AUTO-EXECUTED: ${signal.action} $${notionalAmount.toFixed(2)} ${cleanSymbol} @ $${filledPrice.toFixed(2)} (${actualQuantity.toFixed(4)} shares)`)
    console.log(`   Position sizing: ${positionSizeResult.reasoning}`)
    console.log(`   Execution time: ${executionTime}ms, Slippage: ${(slippage * 100).toFixed(3)}%`)
    console.log(`   Buying power used: ${(positionSizeResult.positionPercent * 100).toFixed(1)}%, Remaining: $${(availableBuyingPower - notionalAmount).toFixed(2)}`)

    return execution
  }

  private async setAutomatedStopLossAndTakeProfit(
    execution: TradeExecution,
    signal: TradeSignal,
    marketData: MarketData[]
  ): Promise<void> {

    const atr = this.calculateATR(marketData, 14)
    const currentPrice = execution.price

    // Dynamic stop loss based on confidence and volatility
    const stopLossMultiplier = signal.confidence > 0.8 ? 1.5 : 2.0 // Tighter stops for high confidence
    const takeProfitMultiplier = 2.5 // Always 2.5:1 risk/reward minimum

    const stopLoss = execution.action === 'BUY'
      ? currentPrice - (atr * stopLossMultiplier)
      : currentPrice + (atr * stopLossMultiplier)

    const takeProfit = execution.action === 'BUY'
      ? currentPrice + (atr * stopLossMultiplier * takeProfitMultiplier)
      : currentPrice - (atr * stopLossMultiplier * takeProfitMultiplier)

    try {
      // Stop Loss Order
      const stopLossPayload = {
        symbol: execution.symbol,
        qty: execution.quantity,
        side: execution.action === 'BUY' ? 'sell' : 'buy',
        type: 'stop',
        stop_price: stopLoss,
        time_in_force: 'gtc',
        client_order_id: `ai_sl_${execution.symbol}_${Date.now()}`
      }

      const stopLossResponse = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stopLossPayload)
      })

      // Take Profit Order
      const takeProfitPayload = {
        symbol: execution.symbol,
        qty: execution.quantity,
        side: execution.action === 'BUY' ? 'sell' : 'buy',
        type: 'limit',
        limit_price: takeProfit,
        time_in_force: 'gtc',
        client_order_id: `ai_tp_${execution.symbol}_${Date.now()}`
      }

      const takeProfitResponse = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(takeProfitPayload)
      })

      console.log(`🛡️ Auto stop-loss: $${stopLoss.toFixed(2)}, take-profit: $${takeProfit.toFixed(2)}`)

    } catch (error) {
      console.error(`Failed to set stop-loss/take-profit for ${execution.symbol}:`, error.message)
    }
  }

  // Utility methods
  private isMarketOpen(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16
  }

  private calculateAverageVolume(marketData: MarketData[]): number {
    const volumes = marketData.slice(-20).map(d => d.volume)
    return volumes.reduce((a, b) => a + b, 0) / volumes.length
  }

  private estimateSpread(marketData: MarketData[]): number {
    // Estimate spread from price movement (simplified)
    const prices = marketData.slice(-5).map(d => d.close)
    const volatility = this.calculateVolatility(prices)
    return Math.min(0.02, volatility * 0.1) // Max 2% spread
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.02

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance)
  }

  private calculateATR(marketData: MarketData[], period: number): number {
    if (marketData.length < period + 1) return 0.02

    const trs: number[] = []
    for (let i = 1; i < marketData.length; i++) {
      const high = marketData[i].high
      const low = marketData[i].low
      const prevClose = marketData[i-1].close

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trs.push(tr)
    }

    return trs.slice(-period).reduce((a, b) => a + b, 0) / period
  }

  private resetDailyCounters(): void {
    this.dailyTradeCount = 0
    this.dailyPnL = 0
    this.isExecutionEnabled = true

    // Schedule next reset at market open
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 30, 0, 0) // 9:30 AM next day

    const msUntilReset = tomorrow.getTime() - now.getTime()
    setTimeout(() => {
      this.resetDailyCounters()
    }, msUntilReset)
  }

  // Public methods for monitoring and control
  updateDailyPnL(pnl: number): void {
    this.dailyPnL = pnl
  }

  getExecutionMetrics(): ExecutionMetrics {
    if (this.executionHistory.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        avgExecutionTime: 0,
        avgSlippage: 0,
        avgConfidence: 0,
        profitableExecutions: 0,
        totalPnL: 0,
        avgPnL: 0,
        bestExecution: null,
        worstExecution: null
      }
    }

    const totalExecutions = this.executionHistory.length
    const avgExecutionTime = this.executionHistory.reduce((sum, exec) => sum + exec.executionTime, 0) / totalExecutions
    const avgSlippage = this.executionHistory.reduce((sum, exec) => sum + exec.slippage, 0) / totalExecutions
    const avgConfidence = this.executionHistory.reduce((sum, exec) => sum + exec.confidence, 0) / totalExecutions

    return {
      totalExecutions,
      successfulExecutions: totalExecutions, // All in history are successful
      avgExecutionTime,
      avgSlippage,
      avgConfidence,
      profitableExecutions: 0, // Would need P&L tracking
      totalPnL: 0, // Would need P&L tracking
      avgPnL: 0, // Would need P&L tracking
      bestExecution: this.executionHistory[0] || null,
      worstExecution: this.executionHistory[0] || null
    }
  }

  getRecentExecutions(limit = 10): TradeExecution[] {
    return this.executionHistory.slice(-limit).reverse()
  }

  // AI Learning and Adaptation Methods
  async checkAndTrackTradeExits(): Promise<void> {
    // Check for completed trades to track exits
    for (const [orderId, tradeInfo] of this.openTrades.entries()) {
      try {
        // Fetch orders from our direct API to check status
        const response = await fetch('/api/alpaca/orders')
        if (!response.ok) continue

        const ordersData = await response.json()
        if (!ordersData.success) continue

        // Find our specific order
        const order = ordersData.orders.find((o: any) => o.orderId === orderId || o.id === orderId)
        if (!order) continue

        if (order.status === 'filled' || order.status === 'canceled' || order.status === 'FILLED' || order.status === 'CANCELED') {
          // Calculate PnL
          const exitPrice = order.filledPrice || order.filled_avg_price || order.averageFillPrice
          const entryPrice = tradeInfo.entryPrice

          let realizedPnL = 0
          if (exitPrice) {
            if (tradeInfo.action === 'BUY') {
              realizedPnL = (exitPrice - entryPrice) / entryPrice
            } else {
              realizedPnL = (entryPrice - exitPrice) / entryPrice
            }
          }

          // Track exit in learning system
          await this.learningSystem.trackTradeExit(
            orderId,
            exitPrice || entryPrice,
            realizedPnL
          )

          // Remove from open trades
          this.openTrades.delete(orderId)

          console.log(`📚 Learning: Trade ${orderId} exit tracked - PnL: ${(realizedPnL * 100).toFixed(2)}%`)
        }
      } catch (error) {
        console.error(`Error checking trade exit for ${orderId}:`, error.message)
      }
    }
  }

  async adaptConfigurationBasedOnLearning(): Promise<boolean> {
    const insights = this.learningSystem.getLatestInsights()

    if (!insights) {
      console.log('📚 Learning: No insights available yet for configuration adaptation')
      return false
    }

    let configChanged = false

    // Adapt confidence thresholds based on performance
    if (insights.overallAccuracy < 0.6) {
      // Poor performance - increase minimum thresholds
      this.config.confidenceThresholds.minimum = Math.min(0.8, this.config.confidenceThresholds.minimum + 0.05)
      this.config.confidenceThresholds.conservative = Math.min(0.85, this.config.confidenceThresholds.conservative + 0.05)
      configChanged = true
      console.log(`🧠 AI Learning: Increased confidence thresholds due to accuracy: ${(insights.overallAccuracy * 100).toFixed(1)}%`)
    } else if (insights.overallAccuracy > 0.75) {
      // Good performance - can be slightly more aggressive
      this.config.confidenceThresholds.minimum = Math.max(0.6, this.config.confidenceThresholds.minimum - 0.02)
      configChanged = true
      console.log(`🧠 AI Learning: Decreased minimum threshold due to good accuracy: ${(insights.overallAccuracy * 100).toFixed(1)}%`)
    }

    // Adapt position sizing based on calibration
    if (insights.confidenceCalibration > 0.8) {
      // Well-calibrated - can use higher confidence multiplier
      this.config.positionSizing.confidenceMultiplier = Math.min(2.5, insights.recommendedAdjustments.positionSizing.confidenceMultiplier)
      configChanged = true
      console.log(`🧠 AI Learning: Increased confidence multiplier due to good calibration`)
    }

    // Adapt based on optimal threshold
    if (insights.optimalConfidenceThreshold > this.config.confidenceThresholds.minimum + 0.1) {
      this.config.confidenceThresholds.minimum = insights.optimalConfidenceThreshold
      configChanged = true
      console.log(`🧠 AI Learning: Updated minimum threshold to optimal: ${(insights.optimalConfidenceThreshold * 100).toFixed(1)}%`)
    }

    if (configChanged) {
      console.log(`🔧 AI Learning: Configuration adapted based on performance insights`)
      console.log(`   New Min Confidence: ${(this.config.confidenceThresholds.minimum * 100).toFixed(1)}%`)
      console.log(`   New Conservative: ${(this.config.confidenceThresholds.conservative * 100).toFixed(1)}%`)
      console.log(`   Confidence Multiplier: ${this.config.positionSizing.confidenceMultiplier.toFixed(1)}`)
    }

    return configChanged
  }

  getLearningInsights() {
    return this.learningSystem.getLatestInsights()
  }

  getTradeHistory() {
    return this.learningSystem.getTradeHistory()
  }

  getAccuracyTrend(days: number = 30) {
    return this.learningSystem.getAccuracyTrend(days)
  }

  getTodayStats(): {
    tradesExecuted: number
    tradesRemaining: number
    dailyPnL: number
    executionEnabled: boolean
  } {
    return {
      tradesExecuted: this.dailyTradeCount,
      tradesRemaining: Math.max(0, this.config.riskControls.maxDailyTrades - this.dailyTradeCount),
      dailyPnL: this.dailyPnL,
      executionEnabled: this.isExecutionEnabled
    }
  }

  enableExecution(): void {
    this.isExecutionEnabled = true
  }

  disableExecution(): void {
    this.isExecutionEnabled = false
  }

  private isCryptoSymbol(symbol: string): boolean {
    // Comprehensive crypto symbols list for Alpaca
    const cryptoSymbols = [
      // Major Cryptos
      'BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD',
      // Popular Altcoins
      'ADAUSD', 'DOTUSD', 'SOLUSD', 'AVAXUSD', 'MATICUSD', 'SHIBUSD',
      // Additional Crypto Assets
      'LINKUSD', 'UNIUSD', 'AAVEUSD', 'ALGOUSD', 'BATUSD', 'COMPUSD',
      'TRXUSD', 'XLMUSD', 'XTZUSD', 'ATOMUSD', 'EOSUSD', 'IOTAUSD'
    ]

    // Enhanced crypto detection - USD pairs with short names are likely crypto
    return cryptoSymbols.includes(symbol) ||
           (symbol.endsWith('USD') && symbol.length >= 6 && symbol.length <= 8) ||
           (symbol.endsWith('USDT') && symbol.length <= 9) ||
           (symbol.endsWith('USDC') && symbol.length <= 9)
  }

  private isMarketOpen(): boolean {
    // If crypto trading is enabled and we have crypto, market is always open
    if (this.config.executionRules.cryptoTradingEnabled) {
      return true
    }

    // Get current time in Eastern Time (market timezone)
    const now = new Date()
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const hour = etTime.getHours()
    const minute = etTime.getMinutes()
    const day = etTime.getDay()

    // US market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    const isWeekday = day >= 1 && day <= 5
    const isAfterOpen = hour > 9 || (hour === 9 && minute >= 30)
    const isBeforeClose = hour < 16

    let isOpen = isWeekday && isAfterOpen && isBeforeClose

    // Extended hours support
    if (this.config.executionRules.afterHoursTrading) {
      const isPreMarket = isWeekday && hour >= 4 && (hour < 9 || (hour === 9 && minute < 30))
      const isAfterHours = isWeekday && hour >= 16 && hour < 20
      isOpen = isOpen || isPreMarket || isAfterHours
    }

    // Weekend trading for crypto
    if (this.config.executionRules.weekendTrading && !isWeekday) {
      isOpen = true
    }

    return isOpen
  }

  updateConfig(newConfig: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Performance-based threshold adjustment
  private getPerformanceBasedAdjustment(): number {
    const insights = this.learningSystem.getLatestInsights()

    if (!insights) return 0

    // Lower threshold if performing well, raise if performing poorly
    if (insights.overallAccuracy > 0.75) {
      return -0.05 // Lower threshold by 5% for good performance
    } else if (insights.overallAccuracy < 0.55) {
      return 0.10 // Raise threshold by 10% for poor performance
    }

    return 0
  }

  // Portfolio health assessment
  private assessPortfolioHealth(portfolio: Portfolio): number {
    // Base health multiplier
    let healthMultiplier = 1.0

    // Check daily P&L
    if (this.dailyPnL > 0) {
      healthMultiplier *= 1.1 // 10% bonus for positive day
    } else if (this.dailyPnL < -0.02 * portfolio.totalValue) {
      healthMultiplier *= 0.8 // 20% reduction for significant losses
    }

    // Check portfolio concentration
    const totalPositions = portfolio.positions.length
    if (totalPositions > this.config.riskControls.maxOpenPositions * 0.8) {
      healthMultiplier *= 0.9 // Reduce position size when portfolio is concentrated
    }

    return Math.max(0.5, Math.min(1.5, healthMultiplier)) // Cap between 50% and 150%
  }

  // ENHANCED: Direct Alpaca order execution with better error handling
  private async executeOrderWithAlpaca(orderData: any): Promise<{ success: boolean; data: any }> {
    try {
      console.log('📤 Placing order via server-side Alpaca client')
      const orderResult = await this.alpacaClient.createOrder(orderData)
      return {
        success: true,
        data: orderResult
      }
    } catch (error: any) {
      console.error('❌ Server-side order execution failed:', error)

      // Handle specific Alpaca error codes
      if (error.message.includes('40310000')) {
        throw new Error('Insufficient buying power for this trade')
      } else if (error.message.includes('403')) {
        throw new Error('Account not authorized for trading this symbol')
      } else if (error.message.includes('422')) {
        throw new Error('Invalid order parameters')
      }

      throw new Error(`Order execution failed: ${error.message}`)
    }
  }

  // ENHANCED: Get current price for validation
  private async getCurrentPrice(symbol: string): Promise<{ success: boolean; price: number } | null> {
    try {
      const quotes = await this.alpacaClient.getLatestQuotes([symbol])
      if (quotes && quotes[symbol]) {
        const quote = quotes[symbol]
        const price = (quote.askPrice + quote.bidPrice) / 2 // Mid price
        return { success: true, price }
      }
      return null
    } catch (error) {
      console.warn(`Could not get current price for ${symbol}:`, error.message)
      return null
    }
  }
}