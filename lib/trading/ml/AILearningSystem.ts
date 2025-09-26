import { TradeSignal, MarketData, ExecutionResult, AIRecommendation } from '../../../types/trading'

export interface TradeOutcome {
  tradeId: string
  symbol: string
  action: 'BUY' | 'SELL'
  entryTime: Date
  exitTime?: Date
  entryPrice: number
  exitPrice?: number
  confidence: number
  aiScore: number
  positionSize: number
  realizedPnL?: number
  unrealizedPnL?: number
  maxFavorableExcursion?: number
  maxAdverseExcursion?: number
  holdTime?: number // in minutes
  isCorrectPrediction: boolean
  marketCondition: 'BULL' | 'BEAR' | 'SIDEWAYS'
  volatility: number
  volume: number
  strategy: string
  technicalIndicators: Record<string, number>
  sentimentScore: number
  feedbackScore?: number // 1-10 manual feedback
  metadata: Record<string, any>
}

export interface LearningInsights {
  overallAccuracy: number
  confidenceCalibration: number
  strongestPatterns: PatternInsight[]
  weakestPatterns: PatternInsight[]
  optimalConfidenceThreshold: number
  bestPerformingConditions: MarketCondition[]
  recommendedAdjustments: {
    confidenceThresholds: {
      minimum: number
      conservative: number
      aggressive: number
    }
    positionSizing: {
      baseMultiplier: number
      confidenceMultiplier: number
    }
    strategies: {
      mostEffective: string[]
      leastEffective: string[]
    }
  }
  performanceByTimeframe: {
    intraday: PerformanceMetrics
    daily: PerformanceMetrics
    weekly: PerformanceMetrics
  }
  marketRegimePerformance: {
    trending: PerformanceMetrics
    ranging: PerformanceMetrics
    volatile: PerformanceMetrics
  }
}

interface PatternInsight {
  pattern: string
  accuracy: number
  frequency: number
  avgReturn: number
  confidence: number
  marketConditions: string[]
  examples: TradeOutcome[]
}

interface MarketCondition {
  condition: string
  accuracy: number
  tradeCount: number
  avgReturn: number
  winRate: number
}

interface PerformanceMetrics {
  accuracy: number
  winRate: number
  avgReturn: number
  sharpeRatio: number
  maxDrawdown: number
  tradeCount: number
}

interface ModelPerformance {
  modelName: string
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  auc: number
  calibrationScore: number
  lastUpdated: Date
}

export class AILearningSystem {
  private tradeHistory: TradeOutcome[] = []
  private learningHistory: LearningInsights[] = []
  private modelPerformance = new Map<string, ModelPerformance>()
  private isInitialized = false
  private learningEnabled = true
  private feedbackBuffer: Array<{ tradeId: string; feedback: number; timestamp: Date }> = []

  // Pattern recognition patterns
  private readonly RECOGNIZED_PATTERNS = [
    'BREAKOUT_BULLISH', 'BREAKOUT_BEARISH',
    'REVERSAL_SUPPORT', 'REVERSAL_RESISTANCE',
    'MOMENTUM_CONTINUATION', 'MOMENTUM_EXHAUSTION',
    'VOLUME_SPIKE', 'VOLUME_DRY_UP',
    'GAP_UP', 'GAP_DOWN',
    'DOUBLE_TOP', 'DOUBLE_BOTTOM',
    'HEAD_SHOULDERS', 'INVERSE_HEAD_SHOULDERS',
    'TRIANGLE_ASCENDING', 'TRIANGLE_DESCENDING',
    'FLAG_BULL', 'FLAG_BEAR',
    'WEDGE_RISING', 'WEDGE_FALLING'
  ]

  constructor(private config: { maxHistorySize?: number; learningRate?: number } = {}) {
    this.config = {
      maxHistorySize: 10000,
      learningRate: 0.1,
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🧠 Initializing AI Learning System...')
    
    try {
      // Load historical trade data
      await this.loadHistoricalData()
      
      // Initialize model performance tracking
      this.initializeModelTracking()
      
      // Run initial analysis if we have data
      if (this.tradeHistory.length > 10) {
        await this.performInitialAnalysis()
      }

      this.isInitialized = true
      console.log(`✅ AI Learning System initialized with ${this.tradeHistory.length} historical trades`)
    } catch (error) {
      console.error('❌ Failed to initialize AI Learning System:', error)
      // Continue with limited functionality
      this.isInitialized = true
    }
  }

  async trackTradeEntry(
    tradeId: string,
    signal: TradeSignal,
    marketData: MarketData,
    executionPrice: number,
    positionSize: number
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const tradeOutcome: TradeOutcome = {
      tradeId,
      symbol: signal.symbol,
      action: signal.action,
      entryTime: new Date(),
      entryPrice: executionPrice,
      confidence: signal.confidence,
      aiScore: signal.metadata?.aiScore || 0,
      positionSize,
      isCorrectPrediction: false, // Will be updated on exit
      marketCondition: this.assessMarketCondition(marketData),
      volatility: this.calculateVolatility(marketData),
      volume: marketData.volume,
      strategy: signal.strategy,
      technicalIndicators: this.extractTechnicalIndicators(marketData),
      sentimentScore: signal.metadata?.sentimentScore || 50,
      metadata: {
        entryReason: signal.reason,
        marketDataPoints: marketData.length,
        entryTimestamp: new Date().toISOString()
      }
    }

    this.tradeHistory.push(tradeOutcome)
    
    // Limit history size
    if (this.tradeHistory.length > this.config.maxHistorySize!) {
      this.tradeHistory = this.tradeHistory.slice(-this.config.maxHistorySize!)
    }

    console.log(`📝 Trade entry tracked: ${tradeId} - ${signal.action} ${signal.symbol} @ $${executionPrice}`)
  }

     async trackTradeExit(
    tradeId: string,
    exitPrice: number,
    exitTime?: Date
  ): Promise<void> {
    const trade = this.tradeHistory.find(t => t.tradeId === tradeId)
    if (!trade) {
      console.warn(`⚠️ Trade not found for exit tracking: ${tradeId}`)
      return
    }

    const actualExitTime = exitTime || new Date()
    const holdTime = (actualExitTime.getTime() - trade.entryTime.getTime()) / (1000 * 60) // minutes

    // Calculate P&L
    const quantity = trade.positionSize / trade.entryPrice
    const pnl = trade.action === 'BUY' ? 
      (exitPrice - trade.entryPrice) * quantity :
      (trade.entryPrice - exitPrice) * quantity

    // Determine if prediction was correct
    const priceMovement = (exitPrice - trade.entryPrice) / trade.entryPrice
    const isCorrectPrediction = trade.action === 'BUY' ? priceMovement > 0 : priceMovement < 0

    // Update trade outcome
    trade.exitTime = actualExitTime
    trade.exitPrice = exitPrice
    trade.realizedPnL = pnl
    trade.holdTime = holdTime
    trade.isCorrectPrediction = isCorrectPrediction

    console.log(`✅ Trade exit tracked: ${tradeId} - ${isCorrectPrediction ? 'CORRECT' : 'INCORRECT'} prediction, P&L: ${pnl.toFixed(2)}`)

    // Trigger learning update
    if (this.learningEnabled) {
      await this.updateLearningModels([trade])
    }
  }

  async updateFromCycle(
    recommendations: AIRecommendation[],
    executionResults: ExecutionResult[]
  ): Promise<void> {
    if (!this.isInitialized) return

    // Process execution results and update learning
    for (const result of executionResults) {
      if (result.success && result.orderId) {
        // Find corresponding recommendation
        const recommendation = recommendations.find(rec => 
          rec.symbol === result.metadata?.symbol
        )
        
        if (recommendation && result.executionPrice && result.quantity) {
          await this.trackTradeEntry(
            result.orderId,
            {
              symbol: recommendation.symbol,
              action: recommendation.action,
              confidence: recommendation.confidence,
              reason: recommendation.reasoning.join('; '),
              timestamp: new Date(),
              riskScore: recommendation.riskScore,
              strategy: 'AI_CYCLE_EXECUTION',
              metadata: {
                aiScore: recommendation.aiScore,
                sentimentScore: 50 // Would come from sentiment analyzer
              }
            },
            {
              symbol: recommendation.symbol,
              timestamp: new Date(),
              open: result.executionPrice,
              high: result.executionPrice,
              low: result.executionPrice,
              close: result.executionPrice,
              volume: 0,
              length: 1,
              timeframe: '1m'
            },
            result.executionPrice,
            result.quantity * result.executionPrice
          )
        }
      }
    }

    // Perform periodic learning analysis
    if (this.shouldPerformAnalysis()) {
      await this.performLearningAnalysis()
    }
  }

  async performLearningAnalysis(): Promise<LearningInsights> {
    if (!this.isInitialized || this.tradeHistory.length < 10) {
      return this.getDefaultInsights()
    }

    console.log('🔍 Performing AI learning analysis...')

    const completedTrades = this.tradeHistory.filter(t => t.exitTime && t.realizedPnL !== undefined)
    
    if (completedTrades.length < 5) {
      return this.getDefaultInsights()
    }

    // Calculate overall accuracy
    const correctPredictions = completedTrades.filter(t => t.isCorrectPrediction).length
    const overallAccuracy = correctPredictions / completedTrades.length

    // Calculate confidence calibration
    const confidenceCalibration = this.calculateConfidenceCalibration(completedTrades)

    // Identify strongest patterns
    const strongestPatterns = this.identifyStrongestPatterns(completedTrades)
    
    // Identify weakest patterns
    const weakestPatterns = this.identifyWeakestPatterns(completedTrades)

    // Find optimal confidence threshold
    const optimalConfidenceThreshold = this.findOptimalConfidenceThreshold(completedTrades)

    // Analyze best performing conditions
    const bestPerformingConditions = this.analyzeBestPerformingConditions(completedTrades)

    // Performance by timeframe
    const performanceByTimeframe = this.analyzePerformanceByTimeframe(completedTrades)

    // Market regime performance
    const marketRegimePerformance = this.analyzeMarketRegimePerformance(completedTrades)

    // Generate recommendations
    const recommendedAdjustments = this.generateRecommendedAdjustments(
      overallAccuracy,
      confidenceCalibration,
      strongestPatterns,
      weakestPatterns,
      optimalConfidenceThreshold
    )

    const insights: LearningInsights = {
      overallAccuracy,
      confidenceCalibration,
      strongestPatterns,
      weakestPatterns,
      optimalConfidenceThreshold,
      bestPerformingConditions,
      recommendedAdjustments,
      performanceByTimeframe,
      marketRegimePerformance
    }

    this.learningHistory.push(insights)
    
    // Keep only last 50 insights
    if (this.learningHistory.length > 50) {
      this.learningHistory = this.learningHistory.slice(-50)
    }

    console.log(`🧠 Learning analysis complete: ${(overallAccuracy * 100).toFixed(1)}% accuracy, ${strongestPatterns.length} strong patterns identified`)

    return insights
  }

  private calculateConfidenceCalibration(trades: TradeOutcome[]): number {
    // Calculate how well confidence scores match actual performance
    const confidenceBuckets = new Map<string, { correct: number; total: number }>()
    
    for (const trade of trades) {
      const bucket = Math.floor(trade.confidence * 10) / 10 // Round to nearest 0.1
      const bucketKey = bucket.toFixed(1)
      
      if (!confidenceBuckets.has(bucketKey)) {
        confidenceBuckets.set(bucketKey, { correct: 0, total: 0 })
      }
      
      const bucketData = confidenceBuckets.get(bucketKey)!
      bucketData.total++
      if (trade.isCorrectPrediction) {
        bucketData.correct++
      }
    }

    // Calculate calibration score (lower is better)
    let totalCalibrationError = 0
    let totalTrades = 0

    for (const [confidenceStr, data] of confidenceBuckets) {
      const confidence = parseFloat(confidenceStr)
      const accuracy = data.correct / data.total
      const calibrationError = Math.abs(confidence - accuracy)
      
      totalCalibrationError += calibrationError * data.total
      totalTrades += data.total
    }

    return totalTrades > 0 ? 1 - (totalCalibrationError / totalTrades) : 0.5
  }

  private identifyStrongestPatterns(trades: TradeOutcome[]): PatternInsight[] {
    const patternPerformance = new Map<string, {
      correct: number
      total: number
      returns: number[]
      examples: TradeOutcome[]
    }>()

    for (const trade of trades) {
      const patterns = this.identifyTradePatterns(trade)
      
      for (const pattern of patterns) {
        if (!patternPerformance.has(pattern)) {
          patternPerformance.set(pattern, {
            correct: 0,
            total: 0,
            returns: [],
            examples: []
          })
        }
        
        const patternData = patternPerformance.get(pattern)!
        patternData.total++
        patternData.examples.push(trade)
        
        if (trade.isCorrectPrediction) {
          patternData.correct++
        }
        
        if (trade.realizedPnL !== undefined) {
          const returnPercent = trade.realizedPnL / (trade.entryPrice * trade.positionSize / trade.entryPrice)
          patternData.returns.push(returnPercent)
        }
      }
    }

    const insights: PatternInsight[] = []
    
    for (const [pattern, data] of patternPerformance) {
      if (data.total >= 3) { // Minimum sample size
        const accuracy = data.correct / data.total
        const avgReturn = data.returns.length > 0 ? 
          data.returns.reduce((sum, ret) => sum + ret, 0) / data.returns.length : 0
        
        insights.push({
          pattern,
          accuracy,
          frequency: data.total / trades.length,
          avgReturn,
          confidence: Math.min(accuracy, data.total / 10), // Scale by sample size
          marketConditions: [...new Set(data.examples.map(e => e.marketCondition))],
          examples: data.examples.slice(0, 3) // Top 3 examples
        })
      }
    }

    return insights
      .filter(insight => insight.accuracy > 0.6) // Only patterns with >60% accuracy
      .sort((a, b) => (b.accuracy * b.frequency) - (a.accuracy * a.frequency))
      .slice(0, 10) // Top 10 strongest patterns
  }

  private identifyWeakestPatterns(trades: TradeOutcome[]): PatternInsight[] {
    const patternPerformance = new Map<string, {
      correct: number
      total: number
      returns: number[]
      examples: TradeOutcome[]
    }>()

    for (const trade of trades) {
      const patterns = this.identifyTradePatterns(trade)
      
      for (const pattern of patterns) {
        if (!patternPerformance.has(pattern)) {
          patternPerformance.set(pattern, {
            correct: 0,
            total: 0,
            returns: [],
            examples: []
          })
        }
        
        const patternData = patternPerformance.get(pattern)!
        patternData.total++
        patternData.examples.push(trade)
        
        if (trade.isCorrectPrediction) {
          patternData.correct++
        }
        
        if (trade.realizedPnL !== undefined) {
          const returnPercent = trade.realizedPnL / (trade.entryPrice * trade.positionSize / trade.entryPrice)
          patternData.returns.push(returnPercent)
        }
      }
    }

    const insights: PatternInsight[] = []
    
    for (const [pattern, data] of patternPerformance) {
      if (data.total >= 3) { // Minimum sample size
        const accuracy = data.correct / data.total
        const avgReturn = data.returns.length > 0 ? 
          data.returns.reduce((sum, ret) => sum + ret, 0) / data.returns.length : 0
        
        insights.push({
          pattern,
          accuracy,
          frequency: data.total / trades.length,
          avgReturn,
          confidence: Math.min(accuracy, data.total / 10),
          marketConditions: [...new Set(data.examples.map(e => e.marketCondition))],
          examples: data.examples.slice(0, 3)
        })
      }
    }

    return insights
      .filter(insight => insight.accuracy < 0.4) // Only patterns with <40% accuracy
      .sort((a, b) => a.accuracy - b.accuracy) // Worst first
      .slice(0, 5) // Top 5 weakest patterns
  }

  private identifyTradePatterns(trade: TradeOutcome): string[] {
    const patterns: string[] = []

    // Pattern identification based on trade characteristics
    if (trade.confidence > 0.8) {
      patterns.push('HIGH_CONFIDENCE')
    } else if (trade.confidence < 0.6) {
      patterns.push('LOW_CONFIDENCE')
    }

    if (trade.volatility > 0.05) {
      patterns.push('HIGH_VOLATILITY')
    } else if (trade.volatility < 0.02) {
      patterns.push('LOW_VOLATILITY')
    }

    if (trade.volume > 0) {
      // Would need historical volume data for comparison
      patterns.push('NORMAL_VOLUME')
    }

    // Market condition patterns
    patterns.push(`MARKET_${trade.marketCondition}`)

    // Strategy patterns
    patterns.push(`STRATEGY_${trade.strategy}`)

    // Technical indicator patterns (simplified)
    const rsi = trade.technicalIndicators.rsi
    if (rsi && rsi > 70) {
      patterns.push('RSI_OVERBOUGHT')
    } else if (rsi && rsi < 30) {
      patterns.push('RSI_OVERSOLD')
    }

    // Time-based patterns
    const hour = trade.entryTime.getHours()
    if (hour >= 9 && hour <= 11) {
      patterns.push('MORNING_SESSION')
    } else if (hour >= 14 && hour <= 16) {
      patterns.push('AFTERNOON_SESSION')
    }

    return patterns
  }

  private findOptimalConfidenceThreshold(trades: TradeOutcome[]): number {
    let bestThreshold = 0.65
    let bestScore = 0

    for (let threshold = 0.5; threshold <= 0.95; threshold += 0.05) {
      const eligibleTrades = trades.filter(t => t.confidence >= threshold)
      
      if (eligibleTrades.length < 5) continue
      
      const accuracy = eligibleTrades.filter(t => t.isCorrectPrediction).length / eligibleTrades.length
      const avgReturn = eligibleTrades
        .filter(t => t.realizedPnL !== undefined)
        .reduce((sum, t) => sum + (t.realizedPnL! / Math.abs(t.positionSize)), 0) / eligibleTrades.length

      // Combined score: accuracy weighted by return and sample size
      const score = accuracy * 0.7 + (avgReturn > 0 ? 0.3 : 0) * (eligibleTrades.length / trades.length)
      
      if (score > bestScore) {
        bestScore = score
        bestThreshold = threshold
      }
    }

    return bestThreshold
  }

  private analyzeBestPerformingConditions(trades: TradeOutcome[]): MarketCondition[] {
    const conditionGroups = new Map<string, TradeOutcome[]>()

    // Group by market conditions
    for (const trade of trades) {
      const key = trade.marketCondition
      if (!conditionGroups.has(key)) {
        conditionGroups.set(key, [])
      }
      conditionGroups.get(key)!.push(trade)
    }

    const conditions: MarketCondition[] = []

    for (const [condition, conditionTrades] of conditionGroups) {
      if (conditionTrades.length >= 3) {
        const winningTrades = conditionTrades.filter(t => t.isCorrectPrediction)
        const accuracy = winningTrades.length / conditionTrades.length
        const winRate = conditionTrades.filter(t => (t.realizedPnL || 0) > 0).length / conditionTrades.length
        
        const avgReturn = conditionTrades
          .filter(t => t.realizedPnL !== undefined)
          .reduce((sum, t) => sum + (t.realizedPnL! / Math.abs(t.positionSize)), 0) / conditionTrades.length

        conditions.push({
          condition,
          accuracy,
          tradeCount: conditionTrades.length,
          avgReturn,
          winRate
        })
      }
    }

    return conditions
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5)
  }

  private analyzePerformanceByTimeframe(trades: TradeOutcome[]): {
    intraday: PerformanceMetrics
    daily: PerformanceMetrics
    weekly: PerformanceMetrics
  } {
    const intradayTrades = trades.filter(t => (t.holdTime || 0) <= 480) // <= 8 hours
    const dailyTrades = trades.filter(t => (t.holdTime || 0) > 480 && (t.holdTime || 0) <= 2880) // 8h - 2 days
    const weeklyTrades = trades.filter(t => (t.holdTime || 0) > 2880) // > 2 days

    return {
      intraday: this.calculatePerformanceMetrics(intradayTrades),
      daily: this.calculatePerformanceMetrics(dailyTrades),
      weekly: this.calculatePerformanceMetrics(weeklyTrades)
    }
  }

  private analyzeMarketRegimePerformance(trades: TradeOutcome[]): {
    trending: PerformanceMetrics
    ranging: PerformanceMetrics
    volatile: PerformanceMetrics
  } {
    const trendingTrades = trades.filter(t => t.marketCondition === 'BULL' || t.marketCondition === 'BEAR')
    const rangingTrades = trades.filter(t => t.marketCondition === 'SIDEWAYS')
    const volatileTrades = trades.filter(t => t.volatility > 0.04) // High volatility

    return {
      trending: this.calculatePerformanceMetrics(trendingTrades),
      ranging: this.calculatePerformanceMetrics(rangingTrades),
      volatile: this.calculatePerformanceMetrics(volatileTrades)
    }
  }

  private calculatePerformanceMetrics(trades: TradeOutcome[]): PerformanceMetrics {
    if (trades.length === 0) {
      return {
        accuracy: 0,
        winRate: 0,
        avgReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        tradeCount: 0
      }
    }

    const accuracy = trades.filter(t => t.isCorrectPrediction).length / trades.length
    const profitableTrades = trades.filter(t => (t.realizedPnL || 0) > 0)
    const winRate = profitableTrades.length / trades.length

    const returns = trades
      .filter(t => t.realizedPnL !== undefined)
      .map(t => t.realizedPnL! / Math.abs(t.positionSize))
    
    const avgReturn = returns.length > 0 ? returns.reduce((sum, ret) => sum + ret, 0) / returns.length : 0

    // Calculate Sharpe ratio (simplified)
    const returnStdDev = returns.length > 1 ? this.calculateStandardDeviation(returns) : 0
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(returns)

    return {
      accuracy,
      winRate,
      avgReturn,
      sharpeRatio,
      maxDrawdown,
      tradeCount: trades.length
    }
  }

  private generateRecommendedAdjustments(
    accuracy: number,
    calibration: number,
    strongPatterns: PatternInsight[],
    weakPatterns: PatternInsight[],
    optimalThreshold: number
  ): LearningInsights['recommendedAdjustments'] {
    
    const adjustments: LearningInsights['recommendedAdjustments'] = {
      confidenceThresholds: {
        minimum: Math.max(0.55, optimalThreshold - 0.05),
        conservative: Math.max(0.65, optimalThreshold),
        aggressive: Math.min(0.85, optimalThreshold + 0.10)
      },
      positionSizing: {
        baseMultiplier: accuracy > 0.7 ? 1.2 : accuracy < 0.5 ? 0.8 : 1.0,
        confidenceMultiplier: calibration > 0.8 ? 2.5 : calibration < 0.6 ? 1.5 : 2.0
      },
      strategies: {
        mostEffective: strongPatterns.slice(0, 3).map(p => p.pattern),
        leastEffective: weakPatterns.slice(0, 3).map(p => p.pattern)
      }
    }

    return adjustments
  }

  // Utility methods

  private assessMarketCondition(marketData: MarketData): 'BULL' | 'BEAR' | 'SIDEWAYS' {
    // Simplified market condition assessment
    // In practice, would use more sophisticated analysis
    const random = Math.random()
    if (random < 0.4) return 'BULL'
    if (random < 0.8) return 'SIDEWAYS'
    return 'BEAR'
  }

  private calculateVolatility(marketData: MarketData): number {
    // Simplified volatility calculation
    // In practice, would calculate based on price history
    return Math.random() * 0.08 // 0-8% volatility
  }

  private extractTechnicalIndicators(marketData: MarketData): Record<string, number> {
    // Simplified technical indicators extraction
    // In practice, would calculate actual indicators
    return {
      rsi: 30 + Math.random() * 40, // 30-70 RSI range
      macd: -0.5 + Math.random(), // -0.5 to 0.5 MACD
      sma20: marketData.close * (0.95 + Math.random() * 0.1) // ±5% from current price
    }
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / values.length
    return Math.sqrt(variance)
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0
    let peak = 0
    let cumulative = 0

    for (const returnValue of returns) {
      cumulative += returnValue
      peak = Math.max(peak, cumulative)
      const drawdown = (peak - cumulative) / Math.abs(peak)
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }

    return maxDrawdown
  }

  private shouldPerformAnalysis(): boolean {
    // Perform analysis every 50 completed trades or once per hour
    const completedTrades = this.tradeHistory.filter(t => t.exitTime).length
    const lastAnalysis = this.learningHistory[this.learningHistory.length - 1]
    
    if (!lastAnalysis) return completedTrades >= 10
    
    const timeSinceLastAnalysis = Date.now() - new Date(lastAnalysis.recommendedAdjustments.confidenceThresholds.minimum).getTime()
    const hoursSinceLastAnalysis = timeSinceLastAnalysis / (1000 * 60 * 60)
    
    return completedTrades >= 50 || hoursSinceLastAnalysis >= 1
  }

  private async loadHistoricalData(): Promise<void> {
    // In production, would load from database
    console.log('📊 Loading historical trade data...')
  }

  private initializeModelTracking(): void {
    const models = ['ML_ENHANCED', 'NEURAL_NETWORK', 'ENSEMBLE', 'TECHNICAL_ONLY']
    
    for (const model of models) {
      this.modelPerformance.set(model, {
        modelName: model,
        accuracy: 0.6,
        precision: 0.65,
        recall: 0.6,
        f1Score: 0.62,
        auc: 0.7,
        calibrationScore: 0.65,
        lastUpdated: new Date()
      })
    }
  }

  private async performInitialAnalysis(): Promise<void> {
    console.log('🔍 Performing initial learning analysis...')
    await this.performLearningAnalysis()
  }

  private async updateLearningModels(trades: TradeOutcome[]): Promise<void> {
    // Update model performance tracking
    for (const trade of trades) {
      const modelPerf = this.modelPerformance.get(trade.strategy)
      if (modelPerf) {
        // Simple incremental update (in practice, would use more sophisticated methods)
        const learningRate = this.config.learningRate!
        const isCorrect = trade.isCorrectPrediction ? 1 : 0
        
        modelPerf.accuracy = modelPerf.accuracy * (1 - learningRate) + isCorrect * learningRate
        modelPerf.lastUpdated = new Date()
        
        this.modelPerformance.set(trade.strategy, modelPerf)
      }
    }
  }

  private getDefaultInsights(): LearningInsights {
    return {
      overallAccuracy: 0.6,
      confidenceCalibration: 0.65,
      strongestPatterns: [],
      weakestPatterns: [],
      optimalConfidenceThreshold: 0.65,
      bestPerformingConditions: [],
      recommendedAdjustments: {
        confidenceThresholds: {
          minimum: 0.6,
          conservative: 0.7,
          aggressive: 0.8
        },
        positionSizing: {
          baseMultiplier: 1.0,
          confidenceMultiplier: 2.0
        },
        strategies: {
          mostEffective: ['ML_ENHANCED'],
          leastEffective: []
        }
      },
      performanceByTimeframe: {
        intraday: { accuracy: 0.6, winRate: 0.55, avgReturn: 0.01, sharpeRatio: 0.8, maxDrawdown: 0.05, tradeCount: 0 },
        daily: { accuracy: 0.65, winRate: 0.6, avgReturn: 0.02, sharpeRatio: 1.0, maxDrawdown: 0.08, tradeCount: 0 },
        weekly: { accuracy: 0.7, winRate: 0.65, avgReturn: 0.05, sharpeRatio: 1.2, maxDrawdown: 0.12, tradeCount: 0 }
      },
      marketRegimePerformance: {
        trending: { accuracy: 0.7, winRate: 0.65, avgReturn: 0.03, sharpeRatio: 1.1, maxDrawdown: 0.08, tradeCount: 0 },
        ranging: { accuracy: 0.55, winRate: 0.5, avgReturn: 0.005, sharpeRatio: 0.6, maxDrawdown: 0.04, tradeCount: 0 },
        volatile: { accuracy: 0.5, winRate: 0.45, avgReturn: -0.01, sharpeRatio: 0.3, maxDrawdown: 0.15, tradeCount: 0 }
      }
    }
  }

  // Public interface methods

  public async addFeedback(tradeId: string, feedbackScore: number): Promise<void> {
    const trade = this.tradeHistory.find(t => t.tradeId === tradeId)
    if (trade) {
      trade.feedbackScore = Math.max(1, Math.min(10, feedbackScore))
      this.feedbackBuffer.push({
        tradeId,
        feedback: feedbackScore,
        timestamp: new Date()
      })
      console.log(`📝 Feedback added for trade ${tradeId}: ${feedbackScore}/10`)
    }
  }

  public getLatestInsights(): LearningInsights | null {
    return this.learningHistory.length > 0 ? this.learningHistory[this.learningHistory.length - 1] : null
  }

  public getTradeHistory(limit?: number): TradeOutcome[] {
    const trades = [...this.tradeHistory].reverse() // Most recent first
    return limit ? trades.slice(0, limit) : trades
  }

  public getAccuracyTrend(days: number = 30): { date: string; accuracy: number }[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const recentTrades = this.tradeHistory.filter(t => t.entryTime >= cutoffDate && t.exitTime)
    
    // Group by day and calculate daily accuracy
    const dailyAccuracy = new Map<string, { correct: number; total: number }>()
    
    for (const trade of recentTrades) {
      const dateKey = trade.entryTime.toISOString().split('T')[0]
      if (!dailyAccuracy.has(dateKey)) {
        dailyAccuracy.set(dateKey, { correct: 0, total: 0 })
      }
      
      const dayData = dailyAccuracy.get(dateKey)!
      dayData.total++
      if (trade.isCorrectPrediction) {
        dayData.correct++
      }
    }
    
    const trend: { date: string; accuracy: number }[] = []
    for (const [date, data] of dailyAccuracy) {
      trend.push({
        date,
        accuracy: data.total > 0 ? data.correct / data.total : 0
      })
    }
    
    return trend.sort((a, b) => a.date.localeCompare(b.date))
  }

  public getModelPerformance(): ModelPerformance[] {
    return Array.from(this.modelPerformance.values())
  }

  public enableLearning(): void {
    this.learningEnabled = true
    console.log('🧠 AI learning enabled')
  }

  public disableLearning(): void {
    this.learningEnabled = false
    console.log('🧠 AI learning disabled')
  }

  public isReady(): boolean {
    return this.isInitialized
  }

  public getStats(): {
    totalTrades: number
    completedTrades: number
    accuracy: number
    avgHoldTime: number
    learningEnabled: boolean
  } {
    const completedTrades = this.tradeHistory.filter(t => t.exitTime).length
    const correctTrades = this.tradeHistory.filter(t => t.isCorrectPrediction).length
    const accuracy = completedTrades > 0 ? correctTrades / completedTrades : 0
    
    const holdTimes = this.tradeHistory
      .filter(t => t.holdTime !== undefined)
      .map(t => t.holdTime!)
    const avgHoldTime = holdTimes.length > 0 ? 
      holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length : 0

    return {
      totalTrades: this.tradeHistory.length,
      completedTrades,
      accuracy,
      avgHoldTime,
      learningEnabled: this.learningEnabled
    }
  }

  public clearHistory(): void {
    this.tradeHistory = []
    this.learningHistory = []
    this.feedbackBuffer = []
    console.log('🗑️ AI learning history cleared')
  }

  public exportLearningData(): {
    tradeHistory: TradeOutcome[]
    learningHistory: LearningInsights[]
    modelPerformance: ModelPerformance[]
    exportDate: Date
  } {
    return {
      tradeHistory: [...this.tradeHistory],
      learningHistory: [...this.learningHistory],
      modelPerformance: Array.from(this.modelPerformance.values()),
      exportDate: new Date()
    }
  }

  public importLearningData(data: {
    tradeHistory: TradeOutcome[]
    learningHistory: LearningInsights[]
    modelPerformance: ModelPerformance[]
  }): void {
    this.tradeHistory = data.tradeHistory || []
    this.learningHistory = data.learningHistory || []
    
    // Import model performance
    if (data.modelPerformance) {
      this.modelPerformance.clear()
      for (const modelPerf of data.modelPerformance) {
        this.modelPerformance.set(modelPerf.modelName, modelPerf)
      }
    }
    
    console.log(`📥 Learning data imported: ${this.tradeHistory.length} trades, ${this.learningHistory.length} insights`)
  }

  public async generateLearningReport(): Promise<string> {
    const insights = await this.performLearningAnalysis()
    const stats = this.getStats()
    
    const report = `
# AI Learning System Report
Generated: ${new Date().toISOString()}

## Overall Performance
- Total Trades: ${stats.totalTrades}
- Completed Trades: ${stats.completedTrades}
- Overall Accuracy: ${(insights.overallAccuracy * 100).toFixed(1)}%
- Confidence Calibration: ${(insights.confidenceCalibration * 100).toFixed(1)}%
- Average Hold Time: ${stats.avgHoldTime.toFixed(1)} minutes

## Optimal Thresholds
- Recommended Minimum Confidence: ${(insights.optimalConfidenceThreshold * 100).toFixed(1)}%
- Conservative Threshold: ${(insights.recommendedAdjustments.confidenceThresholds.conservative * 100).toFixed(1)}%
- Aggressive Threshold: ${(insights.recommendedAdjustments.confidenceThresholds.aggressive * 100).toFixed(1)}%

## Strongest Patterns (Top 5)
${insights.strongestPatterns.slice(0, 5).map((pattern, i) => 
  `${i + 1}. ${pattern.pattern}: ${(pattern.accuracy * 100).toFixed(1)}% accuracy, ${(pattern.avgReturn * 100).toFixed(2)}% avg return`
).join('\n')}

## Performance by Market Condition
- Trending Markets: ${(insights.marketRegimePerformance.trending.accuracy * 100).toFixed(1)}% accuracy
- Ranging Markets: ${(insights.marketRegimePerformance.ranging.accuracy * 100).toFixed(1)}% accuracy
- Volatile Markets: ${(insights.marketRegimePerformance.volatile.accuracy * 100).toFixed(1)}% accuracy

## Performance by Timeframe
- Intraday (< 8h): ${(insights.performanceByTimeframe.intraday.accuracy * 100).toFixed(1)}% accuracy
- Daily (8h - 2d): ${(insights.performanceByTimeframe.daily.accuracy * 100).toFixed(1)}% accuracy  
- Weekly (> 2d): ${(insights.performanceByTimeframe.weekly.accuracy * 100).toFixed(1)}% accuracy

## Recommendations
${insights.recommendedAdjustments.strategies.mostEffective.length > 0 ? 
  `### Most Effective Strategies
${insights.recommendedAdjustments.strategies.mostEffective.map(s => `- ${s}`).join('\n')}` : ''}

${insights.recommendedAdjustments.strategies.leastEffective.length > 0 ? 
  `### Strategies to Avoid
${insights.recommendedAdjustments.strategies.leastEffective.map(s => `- ${s}`).join('\n')}` : ''}

## Position Sizing Recommendations
- Base Multiplier: ${insights.recommendedAdjustments.positionSizing.baseMultiplier.toFixed(2)}x
- Confidence Multiplier: ${insights.recommendedAdjustments.positionSizing.confidenceMultiplier.toFixed(2)}x

---
*This report was automatically generated by the AI Learning System*
    `.trim()

    return report
  }
}