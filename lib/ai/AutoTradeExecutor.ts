import { TradeSignal, Portfolio, MarketData } from '@/types/trading'
import { AILearningSystem, TradeOutcome } from './AILearningSystem'

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

  constructor(config: ExecutionConfig) {
    this.config = config
    this.learningSystem = new AILearningSystem()
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
    if (decision.shouldExecute && this.config.autoExecuteEnabled && this.isExecutionEnabled) {
      try {
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
        console.log(`📚 Learning: Tracking trade ${tradeId} for AI improvement`)
      } catch (error) {
        console.error(`❌ Auto-execution failed for ${marketData[0].symbol}:`, error.message)
        decision.shouldExecute = false
        decision.reason = `Execution failed: ${error.message}`
      }
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

    // Check 1: Confidence threshold
    if (confidence < this.config.confidenceThresholds.minimum) {
      decision.reason = `Confidence too low: ${(confidence * 100).toFixed(1)}% < ${(this.config.confidenceThresholds.minimum * 100).toFixed(1)}%`
      return decision
    }

    // Check 2: Market hours (if required, but skip for crypto)
    const isCrypto = this.isCryptoSymbol(symbol)
    if (this.config.executionRules.marketHoursOnly && !isCrypto && !this.isMarketOpen()) {
      decision.reason = 'Market is closed (non-crypto asset)'
      return decision
    }

    // Check 3: Daily trade limits
    if (this.dailyTradeCount >= this.config.riskControls.maxDailyTrades) {
      decision.reason = `Daily trade limit reached: ${this.dailyTradeCount}/${this.config.riskControls.maxDailyTrades}`
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

    // Check 6: Cooldown period
    const lastTrade = this.lastTradeTime.get(symbol)
    if (lastTrade) {
      const timeSinceLastTrade = Date.now() - lastTrade.getTime()
      const cooldownMs = this.config.riskControls.cooldownPeriod * 60 * 1000
      if (timeSinceLastTrade < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - timeSinceLastTrade) / 60000)
        decision.reason = `Cooldown active: ${remainingCooldown} minutes remaining`
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

    // Minimum position size check (lower for crypto)
    const minPositionSize = isCrypto ? 0.001 : 0.005 // 0.1% for crypto, 0.5% for stocks
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

    // Base position size
    let positionSize = this.config.positionSizing.baseSize

    // Confidence multiplier effect
    const confidenceMultiplier = Math.pow(confidence, this.config.positionSizing.confidenceMultiplier)
    positionSize *= confidenceMultiplier

    // AI score enhancement
    const aiMultiplier = (aiScore / 100) * 1.5 // AI score is 0-100, convert to 0-1.5 multiplier
    positionSize *= aiMultiplier

    // Risk adjustment (higher risk = smaller position)
    const riskAdjustment = 1 - (riskScore * 0.5) // Max 50% reduction for high risk
    positionSize *= riskAdjustment

    // Apply confidence tier bonuses
    if (confidence >= this.config.confidenceThresholds.maximum) {
      positionSize *= 1.5 // 50% bonus for maximum confidence
    } else if (confidence >= this.config.confidenceThresholds.aggressive) {
      positionSize *= 1.25 // 25% bonus for aggressive confidence
    } else if (confidence < this.config.confidenceThresholds.conservative) {
      positionSize *= 0.75 // 25% reduction for low confidence
    }

    // Ensure within bounds
    positionSize = Math.max(0.005, Math.min(positionSize, this.config.positionSizing.maxSize))

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
    const notionalAmount = portfolio.totalValue * decision.positionSize

    // Use minimum $1 for notional orders (Alpaca requirement)
    if (notionalAmount < 1) {
      throw new Error(`Notional amount too small: $${notionalAmount.toFixed(2)} (minimum $1)`)
    }

    const startTime = Date.now()

    // Create order payload for direct API call using notional orders
    const orderPayload = {
      symbol,
      notional: Math.round(notionalAmount * 100) / 100, // Round to 2 decimal places
      side: signal.action.toLowerCase(), // buy/sell
      type: 'market', // Use market orders for immediate execution
      time_in_force: 'day',
      client_order_id: `ai_auto_${symbol}_${Date.now()}`
    }

    console.log(`🚀 Executing order via direct API:`, orderPayload)

    // Direct fetch to our orders API endpoint
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
    const executionTime = Date.now() - startTime

    if (!result.success) {
      throw new Error(`Order execution failed: ${result.error || 'Unknown error'}`)
    }

    const order = result.order

    // Calculate slippage (if order filled)
    const filledPrice = order.filledPrice || order.filled_avg_price || currentPrice
    const slippage = Math.abs(filledPrice - currentPrice) / currentPrice

    // Calculate actual quantity from notional amount and fill price
    const actualQuantity = filledPrice ? (notionalAmount / filledPrice) : 0

    // Create execution record
    const execution: TradeExecution = {
      symbol,
      action: signal.action === 'HOLD' ? 'BUY' : signal.action, // Default to 'BUY' if 'HOLD' (or handle as needed)
      quantity: actualQuantity,
      price: filledPrice,
      orderId: order.orderId || order.id,
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

    console.log(`✅ AUTO-EXECUTED: ${signal.action} $${notionalAmount.toFixed(2)} ${symbol} @ $${filledPrice.toFixed(2)} (${actualQuantity.toFixed(4)} shares)`)
    console.log(`   Execution Time: ${executionTime}ms, Slippage: ${(slippage * 100).toFixed(3)}%`)

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
    // Common crypto symbols on Alpaca
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD', 'ADAUSD', 'DOTUSD', 'SOLUSD', 'AVAXUSD', 'MATICUSD', 'SHIBUSD']
    return cryptoSymbols.includes(symbol) || (symbol.endsWith('USD') && symbol.length <= 7)
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
}