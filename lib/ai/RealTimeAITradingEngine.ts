import { AlpacaClient } from '@/lib/alpaca/client'
import { AlpacaSymbolManager } from '@/lib/symbols/AlpacaSymbolManager'
import { MLPredictionEngine } from './MLPredictionEngine'
import { AdvancedRiskManager } from './AdvancedRiskManager'
import { PortfolioOptimizer } from './PortfolioOptimizer'
import { AutoTradeExecutor, ExecutionConfig } from './AutoTradeExecutor'
import { MarketData, TradeSignal, Portfolio, Position, TradeOrder } from '@/types/trading'
import { ConfigValidator } from '@/lib/config/ConfigValidator'
import { PositionSizingManager } from './PositionSizingManager'

interface AITradingConfig {
  maxPositionsCount: number
  riskPerTrade: number
  minConfidenceThreshold: number
  rebalanceFrequency: number // hours
  watchlist?: string[] // Optional - will use symbol manager if not provided
  watchlistSize?: number // Size for auto-generated watchlist
  watchlistCriteria?: {
    includeETFs?: boolean
    includeCrypto?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    marketCap?: ('mega' | 'large' | 'mid' | 'small')[]
    categories?: string[]
  }
  paperTrading: boolean
  autoExecution?: ExecutionConfig // Auto-execution configuration
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
  getExecutionStats() {
    throw new Error("Method not implemented.")
  }
  stop() {
      throw new Error("Method not implemented.")
  }
  start() {
      throw new Error("Method not implemented.")
  }
  private alpacaClient: AlpacaClient
  private symbolManager: AlpacaSymbolManager
  private mlEngine: MLPredictionEngine
  private riskManager: AdvancedRiskManager
  private portfolioOptimizer: PortfolioOptimizer
  private autoTradeExecutor: AutoTradeExecutor

  private config: AITradingConfig
  private activeWatchlist: string[] = []
  private isRunning = false
  private currentSession: TradingSession | null = null
  private marketDataCache = new Map<string, MarketData[]>()
  private lastRebalanceTime = new Date(0)

  private tradingIntervals = new Map<string, NodeJS.Timeout>()

  constructor(alpacaClient: AlpacaClient, config: AITradingConfig) {
    // ENHANCED: Validate configuration before initialization
    console.log('🔧 Validating AI Trading Engine configuration...')
    const validation = ConfigValidator.validateEnvironment()
    ConfigValidator.logValidationResult(validation)

    if (!validation.valid) {
      console.warn('⚠️ Some configuration values are missing, but trading engine will continue')
    }

    this.alpacaClient = alpacaClient
    this.symbolManager = new AlpacaSymbolManager(alpacaClient)
    this.mlEngine = new MLPredictionEngine()
    this.riskManager = new AdvancedRiskManager()
    this.portfolioOptimizer = new PortfolioOptimizer()

    // Initialize auto trade executor with default config if not provided
    const executionConfig = config.autoExecution || this.getDefaultExecutionConfig()

    // Validate trading configuration (basic validation)
    if (!executionConfig.autoExecuteEnabled) {
      console.warn('⚠️ Auto-execution is disabled')
    }

    this.autoTradeExecutor = new AutoTradeExecutor(executionConfig)

    this.config = config

    console.log('✅ AI Trading Engine initialized with enhanced configuration validation')
  }

  private getDefaultExecutionConfig(): ExecutionConfig {
    return {
      autoExecuteEnabled: true, // ✅ AUTOMATIC EXECUTION ENABLED BY DEFAULT
      confidenceThresholds: {
        minimum: 0.55,      // 55% minimum to consider execution (lowered for more trades)
        conservative: 0.65, // 65% for conservative positions
        aggressive: 0.75,   // 75% for aggressive positions
        maximum: 0.85       // 85% for maximum position size
      },
      positionSizing: {
        baseSize: 0.03,            // 3% base position size (increased)
        maxSize: 0.12,             // 12% maximum position size (increased)
        confidenceMultiplier: 2.5   // Higher confidence multiplier effect
      },
      riskControls: {
        maxDailyTrades: 200,       // Max 200 trades per day (increased for maximum automation)
        maxOpenPositions: 30,      // Max 30 open positions (increased)
        maxDailyLoss: 0.05,        // 5% max daily loss
        cooldownPeriod: 3          // 3 minutes between trades for same symbol (reduced)
      },
      executionRules: {
        marketHoursOnly: false,        // ✅ Allow 24/7 trading for crypto
        avoidEarnings: false,          // Don't avoid earnings
        volumeThreshold: 25000,        // Minimum 25K volume (lowered)
        spreadThreshold: 0.04,         // Maximum 4% spread (increased for more opportunities)
        cryptoTradingEnabled: true,    // ✅ Enable crypto trading
        afterHoursTrading: true,       // ✅ Enable after hours trading
        weekendTrading: true,          // ✅ Enable weekend trading for crypto
        cryptoSpreadThreshold: 0.06    // Higher spread tolerance for crypto (6%)
      }
    }
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

      // Initialize watchlist
      await this.initializeWatchlist()

      // Load initial market data
      await this.loadInitialMarketData()

      // Start main trading loop
      this.startTradingLoop()

      // Start market data updates
      this.startMarketDataUpdates()

      // Start portfolio monitoring
      this.startPortfolioMonitoring()

      // Start AI learning cycle
      this.startLearningCycle()

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
      // Alpaca account properties: account_number, status, currency, buying_power, cash, portfolio_value, etc.
      const accountStatus = account.status || account.account_status || 'UNKNOWN'
      const portfolioValue = account.portfolio_value || account.equity || account.cash || 0
      console.log(`🔗 Connected to Alpaca - Status: ${accountStatus}, Portfolio Value: $${parseFloat(portfolioValue).toLocaleString()}`)
    } catch (error) {
      throw new Error(`Alpaca connection failed: ${(error as Error).message}`)
    }
  }

  private async initializeWatchlist(): Promise<void> {
    console.log('📋 Initializing trading watchlist...')

    if (this.config.watchlist && this.config.watchlist.length > 0) {
      // Use provided watchlist
      this.activeWatchlist = [...this.config.watchlist]
      console.log(`✅ Using provided watchlist: ${this.activeWatchlist.length} symbols`)
    } else {
      // Check if user wants ALL symbols or limited watchlist
      const watchlistSize = this.config.watchlistSize || 50

      if (watchlistSize === -1 || watchlistSize > 1000) {
        // Get ALL available symbols from Alpaca
        console.log('🌐 Fetching ALL available symbols for analysis...')
        const options = {
          includeETFs: this.config.watchlistCriteria?.includeETFs ?? true,
          includeCrypto: this.config.watchlistCriteria?.includeCrypto ?? true
        }

        this.activeWatchlist = await this.symbolManager.getAllAvailableSymbols(options)
        console.log(`✅ Loaded ALL available symbols: ${this.activeWatchlist.length} symbols`)
        console.log(`   ETFs: ${options.includeETFs ? 'Included' : 'Excluded'}`)
        console.log(`   Crypto: ${options.includeCrypto ? 'Included' : 'Excluded'}`)
        console.log(`🎯 AI will analyze the ENTIRE market!`)
      } else {
        // Generate optimal limited watchlist
        const criteria = {
          size: watchlistSize,
          includeETFs: this.config.watchlistCriteria?.includeETFs ?? true,
          includeCrypto: this.config.watchlistCriteria?.includeCrypto ?? true,
          riskLevel: this.config.watchlistCriteria?.riskLevel || 'medium'
        }

        this.activeWatchlist = await this.symbolManager.generateOptimalWatchlist(criteria)
        console.log(`✅ Generated optimal watchlist: ${this.activeWatchlist.length} symbols`)
        console.log(`   Risk Level: ${criteria.riskLevel}`)
        console.log(`   ETFs: ${criteria.includeETFs ? 'Yes' : 'No'}`)
        console.log(`   Crypto: ${criteria.includeCrypto ? 'Yes' : 'No'}`)
      }
    }

    // Log sample of watchlist
    console.log(`📊 Sample symbols: ${this.activeWatchlist.slice(0, 10).join(', ')}...`)
  }

  private async loadInitialMarketData(): Promise<void> {
    console.log(`📈 Loading initial market data for ${this.activeWatchlist.length} symbols...`)

    // Yahoo Finance has no rate limits, so we can load more symbols
    const initialLoadLimit = Math.min(10, this.activeWatchlist.length) // Yahoo Finance can handle more
    const symbolsToLoad = this.activeWatchlist.slice(0, initialLoadLimit)

    if (initialLoadLimit < this.activeWatchlist.length) {
      console.log(`🎯 Loading initial data for top ${initialLoadLimit} symbols (${this.activeWatchlist.length - initialLoadLimit} remaining will load on-demand)`)
    }

    // Yahoo Finance can handle parallel requests
    const batchSize = 3 // Small batches for Yahoo Finance
    let loadedCount = 0
    let errorCount = 0

    for (let i = 0; i < symbolsToLoad.length; i += batchSize) {
      const batch = symbolsToLoad.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(symbolsToLoad.length / batchSize)

      console.log(`📦 Loading batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`)

      // Process batch in parallel with rate limiting
      const batchPromises = batch.map(async (symbol, index) => {
        try {
          // Reduced delay for faster startup
          await new Promise(resolve => setTimeout(resolve, index * 50))

          // Get fewer bars for faster startup (about 1 week of daily data)
          const marketData = await this.fetchMarketData(symbol, '1Day', 50)
          this.marketDataCache.set(symbol, marketData)

          loadedCount++
          if (loadedCount % 10 === 0 || loadedCount === symbolsToLoad.length) {
            console.log(`✓ Loaded data for ${loadedCount}/${symbolsToLoad.length} symbols`)
          }

        } catch (error) {
          errorCount++
          // Only log first few errors to avoid spam
          if (errorCount <= 3) {
            console.warn(`⚠️ Failed to load data for ${symbol}:`, error.message)
          }
          // Continue with startup even if some symbols fail
        }
      })

      await Promise.all(batchPromises)

      // Small delay between batches for Yahoo Finance (no rate limits needed)
      if (i + batchSize < symbolsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay between batches
      }
    }

    console.log(`✅ Initial market data loading complete: ${loadedCount} loaded, ${errorCount} errors`)

    if (this.activeWatchlist.length > initialLoadLimit) {
      console.log(`⏳ Remaining ${this.activeWatchlist.length - initialLoadLimit} symbols will load on-demand during trading`)
    }
  }

  private async fetchMarketData(symbol: string, timeframe: string, limit: number): Promise<MarketData[]> {
    try {
      // Use Alpaca's getBarsV2 method for historical data
      const barsResponse = await this.alpacaClient.getBarsV2(symbol, {
        timeframe,
        limit,
        adjustment: 'raw'
      })

      // Reduced logging for faster startup
      console.log(`📊 Fetched ${symbol} data: ${Array.isArray(barsResponse) ? barsResponse.length : 'processing'} bars`)

      // Handle different response formats from Alpaca API
      let barsData: any[] = []

      if (Array.isArray(barsResponse)) {
        barsData = barsResponse
      } else if (barsResponse && Array.isArray(barsResponse.bars)) {
        barsData = barsResponse.bars
      } else if (barsResponse && barsResponse[symbol] && Array.isArray(barsResponse[symbol])) {
        barsData = barsResponse[symbol]
      } else if (barsResponse && typeof barsResponse === 'object') {
        // Check if it's an iterable object
        try {
          barsData = Array.from(barsResponse)
        } catch {
          console.warn(`⚠️ Unexpected bars response format for ${symbol}:`, typeof barsResponse)
          return []
        }
      }

      if (!Array.isArray(barsData) || barsData.length === 0) {
        console.warn(`⚠️ No valid bars data for ${symbol}`)
        return []
      }

      return barsData.map((bar: any) => ({
        symbol,
        timestamp: new Date(bar.t || bar.timestamp),
        timeframe,
        open: bar.o || bar.open || 0,
        high: bar.h || bar.high || 0,
        low: bar.l || bar.low || 0,
        close: bar.c || bar.close || 0,
        volume: bar.v || bar.volume || 0,
        source: 'alpaca'
      }))
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error)
      return []
    }
  }

  private startTradingLoop(): void {
    // Main AI trading decision loop - runs every 5 minutes during market hours (or 24/7 if crypto enabled)
    const tradingInterval = setInterval(async () => {
      if (!this.isRunning) {
        console.log('⏸️ Trading loop skipped: Engine not running')
        return
      }

      if (!this.isMarketOpen()) {
        console.log('🕐 Trading loop skipped: Market closed and crypto not enabled')
        return
      }

      console.log('⚡ AI Trading Loop executing...')
      try {
        await this.executeAITradingCycle()
        console.log('✅ AI Trading Loop completed successfully')
      } catch (error) {
        console.error('❌ Error in trading cycle:', error)
      }
    }, 1 * 60 * 1000) // 1 minute for faster testing (changed from 5 minutes)

    this.tradingIntervals.set('main', tradingInterval)
    console.log('🔄 AI Trading Loop started - running every 1 minute')
  }

  private startMarketDataUpdates(): void {
    // Update market data every 5 minutes (reduced frequency for large watchlists)
    const dataInterval = setInterval(async () => {
      if (!this.isRunning) return

      // updateMarketData now handles market hours check internally
      await this.updateMarketData()
    }, 5 * 60 * 1000) // 5 minutes (reduced from 1 minute)

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
    console.log(`📊 Market Open Check: ${this.isMarketOpen()} | Crypto Enabled: ${this.config.autoExecution?.executionRules?.cryptoTradingEnabled}`)

    // Get current portfolio
    const portfolio = await this.getCurrentPortfolio()
    const portfolioValue = portfolio.totalValue || 0
    const buyingPower = portfolio.buyingPower || 0
    console.log(`💰 Portfolio: $${portfolioValue.toFixed(2)} | Buying Power: $${buyingPower.toFixed(2)}`)

    // Generate AI trading decisions for all watchlist symbols
    const decisions: AITradingDecision[] = []
    console.log(`🔍 Analyzing ${this.activeWatchlist.length} symbols for trading opportunities...`)

    for (const symbol of this.activeWatchlist) {
      try {
        const decision = await this.generateAITradingDecision(symbol, portfolio)
        if (decision) {
          decisions.push(decision)
          console.log(`📈 ${symbol}: ${decision.action} ${(decision.confidence * 100).toFixed(1)}% confidence | AI Score: ${decision.aiScore.toFixed(2)}`)
        }
      } catch (error) {
        console.error(`Error generating decision for ${symbol}:`, error.message)
      }
    }

    console.log(`🎯 Generated ${decisions.length} trading decisions`)

    // Enhanced filtering and execution pipeline
    const qualifyingDecisions = decisions.filter(decision => {
      // Lower bar for qualification to increase execution rate
      return (
        decision.confidence >= 0.55 && // Lowered from 0.65
        decision.riskScore <= 0.45 &&  // Increased from 0.35
        decision.aiScore >= 65         // Lowered from 70
      )
    }).sort((a, b) => b.aiScore - a.aiScore) // Best AI scores first

    console.log(`🤖 ${qualifyingDecisions.length} decisions qualify for auto-execution`)

    // Execute more trades per cycle for better automation
    const maxExecutionsPerCycle = Math.min(8, qualifyingDecisions.length) // Increased from 5 to 8
    let executedCount = 0
    let evaluatedCount = 0

    for (const decision of qualifyingDecisions) {
      if (executedCount >= maxExecutionsPerCycle) break

      try {
        const signal: TradeSignal = {
          action: decision.action,
          confidence: decision.confidence,
          reason: decision.reasoning.join('; '),
          timestamp: new Date(),
          riskScore: decision.riskScore,
          strategy: 'AI_BOT_AUTO_V2' // Updated strategy name
        }

        console.log(`🔍 Evaluating ${decision.symbol} ${decision.action}: ${(decision.confidence * 100).toFixed(1)}% confidence, AI score: ${decision.aiScore.toFixed(1)}`)

        const executionResult = await this.autoTradeExecutor.evaluateAndExecute(
          signal,
          decision.marketData,
          portfolio,
          decision.aiScore
        )

        evaluatedCount++

        if (executionResult.shouldExecute) {
          executedCount++
          console.log(`✅ AUTO-EXECUTED: ${decision.symbol} ${decision.action} - ${executionResult.reason}`)

          // Update session metrics
          if (this.currentSession) {
            this.currentSession.tradesExecuted++
            this.currentSession.aiPredictions++
          }

          // Add execution delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1500)) // 1.5 second delay

        } else {
          console.log(`⏸️ EXECUTION BLOCKED: ${decision.symbol} - ${executionResult.reason}`)
        }

        if (this.currentSession) {
          this.currentSession.aiPredictions++
        }

      } catch (error) {
        console.error(`❌ Auto-execution evaluation failed for ${decision.symbol}:`, error.message)
      }
    }

    // Enhanced portfolio rebalancing check
    if (executedCount > 0) {
      await this.checkAndRebalancePortfolio(portfolio)
      console.log(`🔄 Portfolio rebalancing check completed after ${executedCount} executions`)
    }

    // Update metrics and logging
    this.autoTradeExecutor.updateDailyPnL(portfolio.dayPnL)

    console.log(`✅ AI cycle complete - Evaluated: ${evaluatedCount}, Executed: ${executedCount}/${maxExecutionsPerCycle}`)
    const dailyPnL = portfolio.dayPnL || 0
    console.log(`📊 Daily stats - Trades: ${this.autoTradeExecutor.getTodayStats().tradesExecuted}, P&L: ${dailyPnL.toFixed(2)}`)
  }

  private async generateAITradingDecision(symbol: string, portfolio: Portfolio): Promise<AITradingDecision | null> {
    const marketData = this.marketDataCache.get(symbol)
    if (!marketData || marketData.length < 15) { // Reduced from 20 to 15
      return null
    }

    try {
      // Generate ML prediction with enhanced parameters
      const mlPrediction = await this.mlEngine.predict(marketData, symbol, 24)

      // More lenient signal generation
      const signal: TradeSignal = {
        action: mlPrediction.direction === 'UP' ? 'BUY' :
                mlPrediction.direction === 'DOWN' ? 'SELL' : 'HOLD',
        confidence: Math.min(0.95, mlPrediction.confidence * 1.1), // Slight confidence boost
        reason: mlPrediction.reasoning || `AI ML prediction: ${mlPrediction.direction}`,
        timestamp: new Date(),
        riskScore: Math.max(0.1, mlPrediction.riskScore * 0.9), // Slight risk reduction
        strategy: 'ML_ENHANCED_BOT'
      }

      // Skip HOLD actions for more active trading
      if (signal.action === 'HOLD') {
        return null
      }

    // Validate trade with risk management
    const riskValidation = await this.riskManager.validateTrade(signal, portfolio, marketData)

    if (!riskValidation.approved) {
      console.log(`❌ Trade rejected for ${symbol}: ${riskValidation.restrictions.join(', ')}`)
      return null
    }

      // Enhanced AI scoring with multiple factors
      const technicalScore = await this.calculateTechnicalScore(marketData) || 60
      const sentimentScore = await this.calculateSentimentScore(symbol) || 60
      const volumeScore = this.calculateVolumeScore(marketData) || 50
      const momentumScore = this.calculateMomentumScore(marketData) || 50

      // Ensure all scores are valid numbers
      const validTechnical = isNaN(technicalScore) ? 60 : technicalScore
      const validSentiment = isNaN(sentimentScore) ? 60 : sentimentScore
      const validVolume = isNaN(volumeScore) ? 50 : volumeScore
      const validMomentum = isNaN(momentumScore) ? 50 : momentumScore
      const validConfidence = isNaN(mlPrediction.confidence) ? 0.6 : mlPrediction.confidence

      const aiScore = (
        validConfidence * 35 +    // ML prediction (35%)
        validTechnical * 0.25 +   // Technical analysis (25%)
        validSentiment * 0.20 +   // Market sentiment (20%)
        validVolume * 0.10 +      // Volume analysis (10%)
        validMomentum * 0.10      // Momentum (10%)
      )

      // Relaxed filtering for higher execution rate
      if (aiScore < 60) { // Lowered from 70
        return null
      }

      const currentPrice = marketData[marketData.length - 1].close
      const volatility = this.calculateVolatility(marketData, 14)

      // Enhanced reasoning with more factors - with safe toFixed calls
      const reasoning = [
        `AI ML ${signal.action}: ${(validConfidence * 100).toFixed(1)}% confidence`,
        `Technical score: ${validTechnical.toFixed(1)}/100`,
        `Sentiment: ${validSentiment.toFixed(1)}/100`,
        `Volume strength: ${validVolume.toFixed(1)}/100`,
        `Momentum: ${validMomentum.toFixed(1)}/100`,
        `14-day volatility: ${((volatility || 0.02) * 100).toFixed(2)}%`
      ]

      return {
        symbol,
        action: signal.action,
        confidence: signal.confidence,
        currentPrice,
        targetPrice: signal.action === 'BUY' ? currentPrice * 1.08 : currentPrice * 0.92,
        stopLoss: signal.action === 'BUY' ? currentPrice * 0.95 : currentPrice * 1.05,
        reasoning,
        riskScore: signal.riskScore,
        aiScore,
        marketData,
        timestamp: new Date()
      }

    } catch (error) {
      console.error(`Error generating AI decision for ${symbol}:`, error.message)
      return null
    }
  }

  // Auto-execution monitoring and control methods
  getAutoExecutionMetrics() {
    return this.autoTradeExecutor.getExecutionMetrics()
  }

  getRecentExecutions(limit = 10) {
    return this.autoTradeExecutor.getRecentExecutions(limit)
  }

  // AI Learning Integration
  async performLearningCycle(): Promise<void> {
    try {
      // Check for completed trades and track exits
      await this.autoTradeExecutor.checkAndTrackTradeExits()

      // Adapt configuration based on learning
      const configChanged = await this.autoTradeExecutor.adaptConfigurationBasedOnLearning()

      if (configChanged) {
        console.log(`🧠 AI Learning: Configuration automatically adapted for improved performance`)
      }
    } catch (error) {
      console.error('AI Learning cycle error:', error.message)
    }
  }

  getLearningInsights() {
    return this.autoTradeExecutor.getLearningInsights()
  }

  getTradeHistory() {
    return this.autoTradeExecutor.getTradeHistory()
  }

  getAccuracyTrend(days: number = 30) {
    return this.autoTradeExecutor.getAccuracyTrend(days)
  }

  getTodayExecutionStats() {
    return this.autoTradeExecutor.getTodayStats()
  }

  // Access to AutoTradeExecutor for manual testing
  getAutoTradeExecutor() {
    return this.autoTradeExecutor
  }

  // Start AI Learning Cycle
  private startLearningCycle(): void {
    // Run learning cycle every 5 minutes
    const learningInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(learningInterval)
        return
      }

      await this.performLearningCycle()
    }, 5 * 60 * 1000) // 5 minutes

    console.log('🧠 AI Learning cycle started - will run every 5 minutes')
  }

  enableAutoExecution() {
    this.autoTradeExecutor.enableExecution()
    console.log('🟢 Auto-execution ENABLED')
  }

  disableAutoExecution() {
    this.autoTradeExecutor.disableExecution()
    console.log('🔴 Auto-execution DISABLED')
  }

  updateExecutionConfig(newConfig: Partial<ExecutionConfig>) {
    this.autoTradeExecutor.updateConfig(newConfig)
    console.log('⚙️ Auto-execution configuration updated')
  }

  private async updateMarketData(): Promise<void> {
    // Skip if market is closed
    if (!this.isMarketOpen()) {
      console.log('📊 Skipping market data update - market is closed')
      return
    }

    console.log(`📊 Updating market data for ${this.activeWatchlist.length} symbols...`)

    // Process symbols in smaller batches to avoid overwhelming the API
    const batchSize = 10
    const totalBatches = Math.ceil(this.activeWatchlist.length / batchSize)
    let updatedCount = 0
    let errorCount = 0

    for (let i = 0; i < this.activeWatchlist.length; i += batchSize) {
      const batch = this.activeWatchlist.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`)

      // Process batch with delay to avoid rate limiting
      const batchPromises = batch.map(async (symbol, index) => {
        try {
          // Small staggered delay within batch
          await new Promise(resolve => setTimeout(resolve, index * 50))

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
            updatedCount++
          }
        } catch (error) {
          errorCount++
          // Only log first few errors to avoid spam
          if (errorCount <= 5) {
            console.error(`Error updating ${symbol}:`, error.message)
          } else if (errorCount === 6) {
            console.error(`... and ${this.activeWatchlist.length - i - index} more errors (suppressed)`)
          }
        }
      })

      await Promise.all(batchPromises)

      // Delay between batches to avoid rate limiting
      if (i + batchSize < this.activeWatchlist.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second between batches
      }
    }

    console.log(`✅ Market data update complete: ${updatedCount} updated, ${errorCount} errors`)
  }

  private async getCurrentPortfolio(): Promise<Portfolio> {
    try {
      const account = await this.alpacaClient.getAccount()
      const positions = await this.alpacaClient.getPositions()

      // FIXED: Use correct Alpaca API property names
      const equity = parseFloat(account.equity || account.portfolio_value || '0')
      const cash = parseFloat(account.cash || account.buying_power || '0')
      const buyingPower = parseFloat(account.buying_power || '0')

      const portfolio: Portfolio = {
        totalValue: equity,
        cashBalance: cash,
        equity: equity,
        buyingPower: buyingPower,
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
          const prediction = await this.mlEngine.predict(marketData, symbol, 24)
          signals.set(symbol, {
            action: prediction.direction === 'UP' ? 'BUY' : prediction.direction === 'DOWN' ? 'SELL' : 'HOLD',
            confidence: prediction.confidence,
            reason: `ML Prediction for rebalancing`,
            riskScore: 1 - prediction.confidence,
            symbol: '',
            timestamp: undefined,
            strategy: ''
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
    // If crypto trading is enabled, market is always open (24/7)
    if (this.config.autoExecution?.executionRules?.cryptoTradingEnabled) {
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
    if (this.config.autoExecution?.executionRules?.afterHoursTrading) {
      // Pre-market: 4:00 AM - 9:30 AM ET
      // After-hours: 4:00 PM - 8:00 PM ET
      const isPreMarket = isWeekday && hour >= 4 && (hour < 9 || (hour === 9 && minute < 30))
      const isAfterHours = isWeekday && hour >= 16 && hour < 20
      isOpen = isOpen || isPreMarket || isAfterHours
    }

    // Weekend trading for crypto
    if (this.config.autoExecution?.executionRules?.weekendTrading && !isWeekday) {
      isOpen = true
    }

    if (!isOpen) {
      const timeStr = etTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })
      console.log(`⏰ Market is closed (ET: ${timeStr}). Checking crypto opportunities...`)
    }

    return isOpen
  }

  private isCryptoSymbol(symbol: string): boolean {
    // Common crypto symbols on Alpaca
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD', 'ADAUSD', 'DOTUSD', 'SOLUSD', 'AVAXUSD', 'MATICUSD', 'SHIBUSD']
    return cryptoSymbols.includes(symbol) || symbol.endsWith('USD') && symbol.length <= 7
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

  getActiveWatchlist(): string[] {
    return [...this.activeWatchlist]
  }

  getWatchlistInfo(): {
    symbols: string[]
    totalSymbols: number
    source: 'provided' | 'generated'
    criteria?: any
  } {
    return {
      symbols: this.activeWatchlist,
      totalSymbols: this.activeWatchlist.length,
      source: this.config.watchlist ? 'provided' : 'generated',
      criteria: this.config.watchlistCriteria
    }
  }

  async updateWatchlist(newConfig: {
    watchlist?: string[]
    watchlistSize?: number
    watchlistCriteria?: any
  }): Promise<void> {
    // Update config
    if (newConfig.watchlist) this.config.watchlist = newConfig.watchlist
    if (newConfig.watchlistSize) this.config.watchlistSize = newConfig.watchlistSize
    if (newConfig.watchlistCriteria) this.config.watchlistCriteria = newConfig.watchlistCriteria

    // Re-initialize watchlist
    await this.initializeWatchlist()

    // Clear old market data and reload
    this.marketDataCache.clear()
    await this.loadInitialMarketData()

    console.log('✅ Watchlist updated successfully')
  }

  // Enhanced scoring methods for improved decision making
  private async calculateTechnicalScore(marketData: MarketData[]): Promise<number> {
    try {
      // Basic technical analysis score (0-100)
      const prices = marketData.slice(-20).map(d => d.close).filter(p => p && !isNaN(p))
      if (prices.length < 2) return 60 // Default neutral score

      const sma20 = prices.reduce((a, b) => a + b, 0) / prices.length
      const currentPrice = prices[prices.length - 1]

      if (!currentPrice || !sma20 || isNaN(currentPrice) || isNaN(sma20)) {
        return 60 // Default neutral score
      }

      // Simple momentum and trend score
      const momentum = prices.length > 1 ? (currentPrice - prices[0]) / prices[0] : 0
      const trendStrength = currentPrice > sma20 ? 70 : 30
      const volatilityScore = this.calculateVolatility(prices) < 0.05 ? 80 : 40

      const result = Math.min(100, Math.max(0, (trendStrength + volatilityScore) / 2 + momentum * 100))
      return isNaN(result) ? 60 : result
    } catch (error) {
      console.error('Error calculating technical score:', error)
      return 60 // Default neutral score on error
    }
  }

  private async calculateSentimentScore(symbol: string): Promise<number> {
    // Simplified sentiment analysis - in real implementation would use news/social media API
    // For now, return neutral-positive sentiment
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'AVAXUSD']
    const techSymbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA']

    if (cryptoSymbols.includes(symbol)) return 65 // Crypto generally bullish sentiment
    if (techSymbols.includes(symbol)) return 75 // Tech stocks positive sentiment
    return 60 // Neutral sentiment for others
  }

  private calculateVolumeScore(marketData: MarketData[]): number {
    try {
      // Volume strength analysis
      const volumes = marketData.slice(-10).map(d => d.volume).filter(v => v && !isNaN(v) && v > 0)
      if (volumes.length < 3) return 50 // Default neutral score

      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
      const recentVolume = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3

      if (!avgVolume || !recentVolume || avgVolume === 0) return 50

      const volumeRatio = recentVolume / avgVolume
      const result = Math.min(100, Math.max(0, volumeRatio * 50)) // Scale to 0-100
      return isNaN(result) ? 50 : result
    } catch (error) {
      console.error('Error calculating volume score:', error)
      return 50 // Default neutral score on error
    }
  }

  private calculateMomentumScore(marketData: MarketData[]): number {
    try {
      // Momentum analysis using price changes
      const prices = marketData.slice(-10).map(d => d.close).filter(p => p && !isNaN(p))
      if (prices.length < 3) return 50

      const currentPrice = prices[prices.length - 1]
      const shortPrice = prices[prices.length - 3]
      const longPrice = prices[0]

      if (!currentPrice || !shortPrice || !longPrice || shortPrice === 0 || longPrice === 0) {
        return 50 // Default neutral score
      }

      const shortMomentum = (currentPrice - shortPrice) / shortPrice
      const longMomentum = (currentPrice - longPrice) / longPrice

      if (isNaN(shortMomentum) || isNaN(longMomentum)) return 50

      const momentum = (shortMomentum * 0.6 + longMomentum * 0.4) * 100
      const result = Math.min(100, Math.max(0, 50 + momentum * 200)) // Center at 50, scale momentum
      return isNaN(result) ? 50 : result
    } catch (error) {
      console.error('Error calculating momentum score:', error)
      return 50 // Default neutral score on error
    }
  }

  private calculateVolatility(prices: number[], period: number = 20): number {
    try {
      const validPrices = prices.filter(p => p && !isNaN(p) && p > 0)
      if (validPrices.length < 2) return 0.02

      const returns = []
      for (let i = 1; i < validPrices.length; i++) {
        const prevPrice = validPrices[i-1]
        const currentPrice = validPrices[i]
        if (prevPrice && prevPrice > 0 && currentPrice && currentPrice > 0) {
          const returnVal = (currentPrice - prevPrice) / prevPrice
          if (!isNaN(returnVal) && isFinite(returnVal)) {
            returns.push(returnVal)
          }
        }
      }

      if (returns.length < 2) return 0.02

      const mean = returns.reduce((a, b) => a + b, 0) / returns.length
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

      const volatility = Math.sqrt(variance)
      return isNaN(volatility) || !isFinite(volatility) ? 0.02 : Math.max(0.001, volatility)
    } catch (error) {
      console.error('Error calculating volatility:', error)
      return 0.02 // Default volatility on error
    }
  }
}