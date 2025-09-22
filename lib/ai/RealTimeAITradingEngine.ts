import { AlpacaClient } from '@/lib/alpaca/client'
import { MLPredictionEngine } from './MLPredictionEngine'
import { AdvancedRiskManager } from './AdvancedRiskManager'
import { PortfolioOptimizer } from './PortfolioOptimizer'
import { MarketData, TradeSignal, Portfolio, Position, TradeOrder } from '@/types/trading'

interface AITradingConfig {
  maxPositionsCount: number
  riskPerTrade: number
  minConfidenceThreshold: number
  rebalanceFrequency: number // hours
  watchlist: string[]
  paperTrading: boolean
}

interface TradingSession {
  sessionId: string
  startTime: Date
  endTime?: Date
  tradesExecuted: number
  totalPnL: number
  maxDrawdown: number
  aiPredictions: number
  successfulPredictions: number
}

interface AITradingDecision {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  aiScore: number
  riskScore: number
  positionSize: number
  stopLoss: number
  takeProfit: number
  reasoning: string[]
  marketData: MarketData[]
}

export class RealTimeAITradingEngine {
  private alpacaClient: AlpacaClient
  private mlEngine: MLPredictionEngine
  private riskManager: AdvancedRiskManager
  private portfolioOptimizer: PortfolioOptimizer

  private config: AITradingConfig
  private isRunning = false
  private currentSession: TradingSession | null = null
  private marketDataCache = new Map<string, MarketData[]>()
  private lastRebalanceTime = new Date(0)

  private tradingIntervals = new Map<string, NodeJS.Timeout>()

  constructor(alpacaClient: AlpacaClient, config: AITradingConfig) {
    this.alpacaClient = alpacaClient
    this.mlEngine = new MLPredictionEngine()
    this.riskManager = new AdvancedRiskManager()
    this.portfolioOptimizer = new PortfolioOptimizer()
    this.config = config
  }

  async startAITrading(): Promise<void> {
    if (this.isRunning) {
      throw new Error('AI Trading Engine is already running')
    }

    console.log('🤖 Starting AI Trading Engine...')

    // Initialize session
    this.currentSession = {
      sessionId: `session_${Date.now()}`,
      startTime: new Date(),
      tradesExecuted: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      aiPredictions: 0,
      successfulPredictions: 0
    }

    this.isRunning = true

    try {
      // Verify Alpaca connection
      await this.verifyConnection()

      // Load initial market data
      await this.loadInitialMarketData()

      // Start main trading loop
      this.startTradingLoop()

      // Start market data updates
      this.startMarketDataUpdates()

      // Start portfolio monitoring
      this.startPortfolioMonitoring()

      console.log('✅ AI Trading Engine started successfully')

    } catch (error) {
      this.isRunning = false
      console.error('❌ Failed to start AI Trading Engine:', error)
      throw error
    }
  }

  async stopAITrading(): Promise<void> {
    console.log('🛑 Stopping AI Trading Engine...')

    this.isRunning = false

    // Clear all intervals
    for (const [symbol, interval] of this.tradingIntervals) {
      clearInterval(interval)
    }
    this.tradingIntervals.clear()

    // Close current session
    if (this.currentSession) {
      this.currentSession.endTime = new Date()
      console.log(`📊 Session Summary:`, {
        duration: `${Math.round((this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()) / 60000)} minutes`,
        trades: this.currentSession.tradesExecuted,
        pnl: `$${this.currentSession.totalPnL.toFixed(2)}`,
        aiAccuracy: `${((this.currentSession.successfulPredictions / Math.max(1, this.currentSession.aiPredictions)) * 100).toFixed(1)}%`
      })
    }

    console.log('✅ AI Trading Engine stopped')
  }

  private async verifyConnection(): Promise<void> {
    try {
      const account = await this.alpacaClient.getAccount()
      console.log(`🔗 Connected to Alpaca - Account Type: ${account.accountType}, Balance: $${account.totalBalance.toLocaleString()}`)
    } catch (error) {
      throw new Error(`Alpaca connection failed: ${error.message}`)
    }
  }

  private async loadInitialMarketData(): Promise<void> {
    console.log('📈 Loading initial market data...')

    for (const symbol of this.config.watchlist) {
      try {
        // Get 100 bars of historical data (about 2-3 weeks of daily data)
        const marketData = await this.fetchMarketData(symbol, '1Day', 100)
        this.marketDataCache.set(symbol, marketData)

        console.log(`✓ Loaded ${marketData.length} data points for ${symbol}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Failed to load data for ${symbol}:`, error.message)
      }
    }
  }

  private async fetchMarketData(symbol: string, timeframe: string, limit: number): Promise<MarketData[]> {
    try {
      // Use Alpaca's getBarsV2 method for historical data
      const barsData = await this.alpacaClient.getBarsV2(symbol, {
        timeframe,
        limit,
        adjustment: 'raw'
      })

      return barsData.map((bar: any) => ({
        symbol,
        timestamp: new Date(bar.t),
        timeframe,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        source: 'alpaca'
      }))
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error)
      return []
    }
  }

  private startTradingLoop(): void {
    // Main AI trading decision loop - runs every 5 minutes during market hours
    const tradingInterval = setInterval(async () => {
      if (!this.isRunning || !this.isMarketOpen()) return

      try {
        await this.executeAITradingCycle()
      } catch (error) {
        console.error('Error in trading cycle:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    this.tradingIntervals.set('main', tradingInterval)
  }

  private startMarketDataUpdates(): void {
    // Update market data every 1 minute during market hours
    const dataInterval = setInterval(async () => {
      if (!this.isRunning || !this.isMarketOpen()) return

      await this.updateMarketData()
    }, 60 * 1000) // 1 minute

    this.tradingIntervals.set('data', dataInterval)
  }

  private startPortfolioMonitoring(): void {
    // Monitor portfolio risk every 2 minutes
    const riskInterval = setInterval(async () => {
      if (!this.isRunning) return

      try {
        await this.monitorPortfolioRisk()
      } catch (error) {
        console.error('Error monitoring portfolio risk:', error)
      }
    }, 2 * 60 * 1000) // 2 minutes

    this.tradingIntervals.set('risk', riskInterval)
  }

  private async executeAITradingCycle(): Promise<void> {
    console.log('🧠 Executing AI trading cycle...')

    // Get current portfolio
    const portfolio = await this.getCurrentPortfolio()

    // Generate AI trading decisions for all watchlist symbols
    const decisions: AITradingDecision[] = []

    for (const symbol of this.config.watchlist) {
      try {
        const decision = await this.generateAITradingDecision(symbol, portfolio)
        if (decision) {
          decisions.push(decision)
        }
      } catch (error) {
        console.error(`Error generating decision for ${symbol}:`, error.message)
      }
    }

    // Sort decisions by AI score (best opportunities first)
    decisions.sort((a, b) => b.aiScore - a.aiScore)

    // Execute top decisions within risk limits
    let executedTrades = 0
    for (const decision of decisions) {
      if (executedTrades >= 3) break // Limit to 3 trades per cycle

      if (decision.confidence >= this.config.minConfidenceThreshold) {
        try {
          await this.executeAIDecision(decision, portfolio)
          executedTrades++

          if (this.currentSession) {
            this.currentSession.tradesExecuted++
            this.currentSession.aiPredictions++
          }
        } catch (error) {
          console.error(`Failed to execute trade for ${decision.symbol}:`, error.message)
        }
      }
    }

    // Check if portfolio rebalancing is needed
    await this.checkAndRebalancePortfolio(portfolio)

    console.log(`✅ AI cycle complete - ${executedTrades} trades executed`)
  }

  private async generateAITradingDecision(symbol: string, portfolio: Portfolio): Promise<AITradingDecision | null> {
    const marketData = this.marketDataCache.get(symbol)
    if (!marketData || marketData.length < 50) {
      return null
    }

    // Generate ML prediction
    const mlPrediction = await this.mlEngine.predict(marketData, 24)

    // Calculate base signal
    const signal: TradeSignal = {
      action: mlPrediction.direction === 'UP' ? 'BUY' : mlPrediction.direction === 'DOWN' ? 'SELL' : 'HOLD',
      confidence: mlPrediction.confidence,
      reason: `AI ML Prediction: ${mlPrediction.direction} with ${(mlPrediction.confidence * 100).toFixed(1)}% confidence`,
      timestamp: new Date(),
      riskScore: 1 - mlPrediction.confidence, // Higher confidence = lower risk
      strategy: 'AI_ML_ENGINE'
    }

    // Validate trade with risk management
    const riskValidation = await this.riskManager.validateTrade(signal, portfolio, marketData)

    if (!riskValidation.approved) {
      console.log(`❌ Trade rejected for ${symbol}: ${riskValidation.restrictions.join(', ')}`)
      return null
    }

    // Calculate AI score (combines confidence, risk, and market conditions)
    const marketVolatility = this.calculateVolatility(marketData.slice(-20).map(d => d.close))
    const momentum = this.calculateMomentum(marketData.slice(-10).map(d => d.close))

    const aiScore = this.calculateAIScore(mlPrediction, marketVolatility, momentum, riskValidation.sizing.riskRewardRatio)

    return {
      symbol,
      action: signal.action,
      confidence: signal.confidence,
      aiScore,
      riskScore: signal.riskScore,
      positionSize: riskValidation.sizing.recommendedSize,
      stopLoss: riskValidation.sizing.stopLoss,
      takeProfit: riskValidation.sizing.takeProfit,
      reasoning: [
        signal.reason,
        `Risk/Reward: ${riskValidation.sizing.riskRewardRatio.toFixed(2)}:1`,
        `Position Size: ${(riskValidation.sizing.recommendedSize * 100).toFixed(1)}% of portfolio`,
        ...riskValidation.warnings
      ],
      marketData
    }
  }

  private async executeAIDecision(decision: AITradingDecision, portfolio: Portfolio): Promise<void> {
    if (decision.action === 'HOLD') return

    console.log(`🎯 Executing AI decision: ${decision.action} ${decision.symbol} (Confidence: ${(decision.confidence * 100).toFixed(1)}%, AI Score: ${decision.aiScore.toFixed(2)})`)

    const currentPrice = decision.marketData[decision.marketData.length - 1].close
    const positionValue = portfolio.totalValue * decision.positionSize
    const quantity = Math.floor(positionValue / currentPrice)

    if (quantity < 1) {
      console.log(`❌ Position too small for ${decision.symbol}: ${quantity} shares`)
      return
    }

    const order: TradeOrder = {
      symbol: decision.symbol,
      side: decision.action,
      quantity,
      orderType: 'MARKET',
      timeInForce: 'DAY',
      clientOrderId: `ai_${decision.symbol}_${Date.now()}`,
      source: 'AI_ENGINE',
      strategy: 'ML_PREDICTION',
      notes: `AI Score: ${decision.aiScore.toFixed(2)}, Confidence: ${(decision.confidence * 100).toFixed(1)}%`
    }

    try {
      const result = await this.alpacaClient.createOrder(order)

      console.log(`✅ Order executed: ${result.id} - ${decision.action} ${quantity} ${decision.symbol} @ $${currentPrice.toFixed(2)}`)

      // Log AI decision reasoning
      console.log(`📝 AI Reasoning:`)
      decision.reasoning.forEach(reason => console.log(`   • ${reason}`))

      // Schedule stop loss and take profit orders if the main order fills
      if (result.status === 'FILLED' || result.status === 'PARTIALLY_FILLED') {
        await this.setStopLossAndTakeProfit(decision, quantity)
      }

    } catch (error) {
      console.error(`❌ Order failed for ${decision.symbol}:`, error.message)
      throw error
    }
  }

  private async setStopLossAndTakeProfit(decision: AITradingDecision, quantity: number): Promise<void> {
    try {
      // Stop Loss Order
      const stopLossOrder: TradeOrder = {
        symbol: decision.symbol,
        side: decision.action === 'BUY' ? 'SELL' : 'BUY',
        quantity,
        orderType: 'STOP',
        stopPrice: decision.stopLoss,
        timeInForce: 'GTC',
        clientOrderId: `sl_${decision.symbol}_${Date.now()}`,
        source: 'AI_ENGINE',
        strategy: 'RISK_MANAGEMENT'
      }

      await this.alpacaClient.createOrder(stopLossOrder)
      console.log(`🛡️ Stop loss set at $${decision.stopLoss.toFixed(2)} for ${decision.symbol}`)

      // Take Profit Order
      const takeProfitOrder: TradeOrder = {
        symbol: decision.symbol,
        side: decision.action === 'BUY' ? 'SELL' : 'BUY',
        quantity,
        orderType: 'LIMIT',
        price: decision.takeProfit,
        timeInForce: 'GTC',
        clientOrderId: `tp_${decision.symbol}_${Date.now()}`,
        source: 'AI_ENGINE',
        strategy: 'PROFIT_TAKING'
      }

      await this.alpacaClient.createOrder(takeProfitOrder)
      console.log(`🎯 Take profit set at $${decision.takeProfit.toFixed(2)} for ${decision.symbol}`)

    } catch (error) {
      console.error(`Failed to set stop loss/take profit for ${decision.symbol}:`, error.message)
    }
  }

  private async updateMarketData(): Promise<void> {
    for (const symbol of this.config.watchlist) {
      try {
        // Get latest bar
        const latestBars = await this.fetchMarketData(symbol, '1Min', 1)

        if (latestBars.length > 0) {
          const cachedData = this.marketDataCache.get(symbol) || []

          // Add new data and keep last 200 points
          cachedData.push(...latestBars)
          if (cachedData.length > 200) {
            cachedData.splice(0, cachedData.length - 200)
          }

          this.marketDataCache.set(symbol, cachedData)
        }
      } catch (error) {
        console.error(`Failed to update data for ${symbol}:`, error.message)
      }
    }
  }

  private async getCurrentPortfolio(): Promise<Portfolio> {
    try {
      const account = await this.alpacaClient.getAccount()
      const positions = await this.alpacaClient.getPositions()

      const portfolio: Portfolio = {
        totalValue: account.totalBalance,
        cashBalance: account.cashBalance,
        equity: account.totalBalance - account.cashBalance,
        totalPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
        dayPnL: 0, // Would need to calculate from daily change
        unrealizedPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
        realizedPnL: 0, // Would need to get from trade history
        totalReturn: 0, // Would need historical data
        dayReturn: 0, // Would need daily change
        maxDrawdown: 0, // Would need historical tracking
        positions: positions.map(pos => ({
          symbol: pos.symbol,
          quantity: pos.quantity,
          side: pos.side,
          avgPrice: pos.avgBuyPrice,
          currentPrice: pos.currentPrice,
          marketValue: pos.marketValue,
          unrealizedPnL: pos.unrealizedPnL,
          realizedPnL: 0,
          totalPnL: pos.unrealizedPnL,
          percentChange: pos.unrealizedPnLPercent,
          openDate: new Date(), // Would need from position history
          lastUpdate: new Date()
        })),
        allocation: {},
        lastUpdate: new Date(),
        currency: 'USD'
      }

      // Calculate allocation percentages
      positions.forEach(pos => {
        portfolio.allocation[pos.symbol] = Math.abs(pos.marketValue) / portfolio.totalValue
      })

      return portfolio
    } catch (error) {
      console.error('Failed to get current portfolio:', error)
      throw error
    }
  }

  private async monitorPortfolioRisk(): Promise<void> {
    try {
      const portfolio = await this.getCurrentPortfolio()
      const alerts = await this.riskManager.monitorRealTimeRisk(portfolio, this.marketDataCache)

      for (const alert of alerts) {
        console.log(`🚨 Risk Alert [${alert.type}]: ${alert.message} - Action: ${alert.action}`)

        // Handle critical alerts
        if (alert.type === 'CRITICAL' || alert.type === 'EMERGENCY') {
          await this.handleCriticalRiskAlert(alert, portfolio)
        }
      }

      // Update session tracking
      if (this.currentSession) {
        this.currentSession.totalPnL = portfolio.totalPnL
        this.currentSession.maxDrawdown = Math.max(this.currentSession.maxDrawdown, portfolio.maxDrawdown)
      }

    } catch (error) {
      console.error('Error monitoring portfolio risk:', error)
    }
  }

  private async handleCriticalRiskAlert(alert: any, portfolio: Portfolio): Promise<void> {
    console.log(`🚨 CRITICAL RISK ALERT: ${alert.message}`)

    if (alert.action === 'STOP_TRADING') {
      await this.stopAITrading()
    } else if (alert.action === 'CLOSE_POSITION') {
      // Close problematic positions
      for (const position of portfolio.positions) {
        if (Math.abs(position.unrealizedPnL / position.marketValue) > 0.1) { // 10% loss
          try {
            await this.closePosition(position)
          } catch (error) {
            console.error(`Failed to close position ${position.symbol}:`, error)
          }
        }
      }
    }
  }

  private async closePosition(position: Position): Promise<void> {
    const order: TradeOrder = {
      symbol: position.symbol,
      side: position.side === 'LONG' ? 'SELL' : 'BUY',
      quantity: Math.abs(position.quantity),
      orderType: 'MARKET',
      timeInForce: 'DAY',
      clientOrderId: `close_${position.symbol}_${Date.now()}`,
      source: 'RISK_MANAGEMENT',
      notes: 'Emergency position close due to risk alert'
    }

    await this.alpacaClient.createOrder(order)
    console.log(`🔒 Emergency close: ${position.symbol}`)
  }

  private async checkAndRebalancePortfolio(portfolio: Portfolio): Promise<void> {
    const now = new Date()
    const hoursSinceLastRebalance = (now.getTime() - this.lastRebalanceTime.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastRebalance < this.config.rebalanceFrequency) {
      return // Not time to rebalance yet
    }

    console.log('🔄 Checking portfolio rebalancing...')

    try {
      const signals = new Map<string, TradeSignal>()

      // Generate signals for optimization
      for (const symbol of this.config.watchlist) {
        const marketData = this.marketDataCache.get(symbol)
        if (marketData && marketData.length >= 50) {
          const prediction = await this.mlEngine.predict(marketData, 24)
          signals.set(symbol, {
            action: prediction.direction === 'UP' ? 'BUY' : prediction.direction === 'DOWN' ? 'SELL' : 'HOLD',
            confidence: prediction.confidence,
            reason: `ML Prediction for rebalancing`,
            riskScore: 1 - prediction.confidence
          })
        }
      }

      const optimization = await this.portfolioOptimizer.optimizePortfolio(
        portfolio,
        this.marketDataCache,
        signals,
        'BALANCED'
      )

      // Execute high-priority rebalancing recommendations
      const highPriorityActions = optimization.rebalanceRecommendations.filter(rec => rec.priority === 'HIGH')

      if (highPriorityActions.length > 0) {
        console.log(`📊 Executing ${highPriorityActions.length} high-priority rebalancing actions`)

        for (const action of highPriorityActions.slice(0, 3)) { // Limit to 3 actions
          await this.executeRebalanceAction(action, portfolio)
        }

        this.lastRebalanceTime = now
      }

    } catch (error) {
      console.error('Error in portfolio rebalancing:', error)
    }
  }

  private async executeRebalanceAction(action: any, portfolio: Portfolio): Promise<void> {
    const currentPrice = this.marketDataCache.get(action.symbol)?.[this.marketDataCache.get(action.symbol)!.length - 1]?.close
    if (!currentPrice) return

    const adjustmentValue = Math.abs(action.adjustmentAmount)
    const quantity = Math.floor(adjustmentValue / currentPrice)

    if (quantity < 1) return

    const order: TradeOrder = {
      symbol: action.symbol,
      side: action.action,
      quantity,
      orderType: 'MARKET',
      timeInForce: 'DAY',
      clientOrderId: `rebalance_${action.symbol}_${Date.now()}`,
      source: 'PORTFOLIO_OPTIMIZATION',
      notes: `Rebalancing: ${action.reason}`
    }

    try {
      await this.alpacaClient.createOrder(order)
      console.log(`⚖️ Rebalance: ${action.action} ${quantity} ${action.symbol} - ${action.reason}`)
    } catch (error) {
      console.error(`Failed to execute rebalance for ${action.symbol}:`, error)
    }
  }

  // Utility methods
  private isMarketOpen(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    // US market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16
  }

  private calculateAIScore(prediction: any, volatility: number, momentum: number, riskReward: number): number {
    // Composite AI score combining multiple factors
    const confidenceScore = prediction.confidence * 100
    const volatilityPenalty = volatility > 0.3 ? -10 : volatility < 0.1 ? 5 : 0
    const momentumBonus = Math.abs(momentum) > 0.02 ? 5 : 0
    const riskRewardBonus = riskReward > 2 ? 10 : riskReward < 1 ? -10 : 0

    return Math.max(0, Math.min(100, confidenceScore + volatilityPenalty + momentumBonus + riskRewardBonus))
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.2

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252)
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 2) return 0
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    return (lastPrice - firstPrice) / firstPrice
  }

  // Public methods for monitoring
  getCurrentSession(): TradingSession | null {
    return this.currentSession
  }

  isEngineRunning(): boolean {
    return this.isRunning
  }

  getMarketDataStatus(): { symbol: string; dataPoints: number; lastUpdate: Date }[] {
    return Array.from(this.marketDataCache.entries()).map(([symbol, data]) => ({
      symbol,
      dataPoints: data.length,
      lastUpdate: data.length > 0 ? data[data.length - 1].timestamp : new Date(0)
    }))
  }
}