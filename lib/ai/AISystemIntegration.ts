import { MarketData } from '@/types/trading'
import { mlTrainingPipeline } from './MLTrainingPipeline'
import { reinforcementLearningAgent } from './ReinforcementLearningAgent'
import { patternRecognitionEngine } from './PatternRecognitionEngine'
import { marketRegimeDetector, MarketRegime } from './MarketRegimeDetector'
import { tradeFeedbackSystem } from './TradeFeedbackSystem'
import { newsApiService } from '@/lib/sentiment/newsApiService'
import { socialMediaService } from '@/lib/sentiment/socialMediaService'
import { errorRecoverySystem, ErrorCategory, ErrorSeverity, withErrorHandling } from '@/lib/error/ErrorRecoverySystem'

interface AIDecision {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning: string[]
  riskScore: number
  positionSize: number
  stopLoss?: number
  takeProfit?: number
  timeHorizon: number
  metadata: {
    regime: MarketRegime
    sentimentScore: number
    patternConfidence: number
    mlConfidence: number
    rlRecommendation: string
    modelUsed: string[]
  }
}

interface AISystemStatus {
  isLearning: boolean
  modelsActive: number
  lastUpdate: Date
  performance: {
    accuracy: number
    profitFactor: number
    sharpeRatio: number
    drawdown: number
  }
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  recommendations: string[]
}

export class AISystemIntegration {
  private isInitialized = false
  private lastDecisionTime = new Date()
  private decisionHistory: AIDecision[] = []

  async initialize(userId: string): Promise<void> {
    try {
      console.log('Initializing AI Trading System...')

      // Check if models need training/retraining
      const shouldRetrain = await mlTrainingPipeline.shouldRetrain(userId)
      if (shouldRetrain.shouldRetrain) {
        console.log('Training ML models...')
        await mlTrainingPipeline.trainModels(userId)
      }

      // Learn from historical trade patterns
      await patternRecognitionEngine.learnFromTradeOutcomes(userId)

      // Update influencer accuracy scores
      await socialMediaService.updateInfluencerAccuracy()

      // Start RL episode for current session
      await reinforcementLearningAgent.startEpisode('SYSTEM', 'SIDEWAYS')

      this.isInitialized = true
      console.log('AI Trading System initialized successfully')

    } catch (error) {
      await errorRecoverySystem.handleError(
        error as Error,
        ErrorCategory.SYSTEM_ERROR,
        ErrorSeverity.HIGH,
        { operation: 'ai_system_initialization', userId }
      )
      throw error
    }
  }

  async makeTradeDecision(
    marketData: MarketData[],
    symbol: string,
    userId: string
  ): Promise<AIDecision> {
    if (!this.isInitialized) {
      await this.initialize(userId)
    }

    return await withErrorHandling(
      async () => {
        // 1. Detect market regime
        const regimeSignal = await marketRegimeDetector.detectRegime(marketData, symbol)

        // 2. Get sentiment analysis
        const [newsSentiment, socialSentiment] = await Promise.all([
          newsApiService.getCachedSentiment(symbol),
          socialMediaService.getCombinedSentiment(symbol)
        ])

        const combinedSentiment = (newsSentiment?.sentimentScore || 0) * 0.6 +
                                 (socialSentiment?.combinedSentiment || 0) * 0.4

        // 3. Pattern recognition
        const patterns = await patternRecognitionEngine.analyzePatterns(marketData, symbol)
        const topPattern = patterns[0]

        // 4. ML prediction
        const mlPrediction = await mlTrainingPipeline.getPrediction({
          technicalIndicators: {
            rsi: this.calculateRSI(marketData),
            macd: this.calculateMACD(marketData),
            volatility: this.calculateVolatility(marketData)
          },
          priceFeatures: {
            momentum: this.calculateMomentum(marketData)
          },
          volumeFeatures: {
            trend: this.calculateVolumeTrend(marketData)
          },
          sentimentFeatures: {
            score: combinedSentiment
          },
          temporalFeatures: {
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay()
          },
          regimeFeatures: {
            regime: regimeSignal.regime
          }
        }, symbol)

        // 5. Reinforcement learning recommendation
        const rlState = this.buildRLState(marketData, regimeSignal.regime, combinedSentiment)
        const rlAction = await reinforcementLearningAgent.selectAction(rlState)

        // 6. Get regime-based strategy
        const regimeStrategy = await marketRegimeDetector.getRegimeBasedStrategy(regimeSignal.regime, userId)

        // 7. Combine all signals
        const decision = this.combineSignals({
          regime: regimeSignal,
          sentiment: combinedSentiment,
          pattern: topPattern,
          ml: mlPrediction,
          rl: rlAction,
          strategy: regimeStrategy
        })

        // 8. Record decision
        this.recordDecision(decision)

        // 9. Update RL agent
        if (this.decisionHistory.length > 1) {
          const previousDecision = this.decisionHistory[this.decisionHistory.length - 2]
          const reward = this.calculateReward(previousDecision, marketData)

          await reinforcementLearningAgent.recordStep(rlState, rlAction, reward)
        }

        return decision

      },
      {
        operation: 'ai_trade_decision',
        userId,
        symbol,
        category: ErrorCategory.ML_MODEL_ERROR,
        severity: ErrorSeverity.HIGH
      }
    ) || this.getFallbackDecision(symbol)
  }

  async recordTradeOutcome(
    tradeId: string,
    symbol: string,
    outcome: 'profit' | 'loss' | 'breakeven',
    pnl: number,
    duration: number,
    userId: string
  ): Promise<void> {
    try {
      // Find the corresponding decision
      const decision = this.decisionHistory.find(d =>
        d.metadata.modelUsed.includes(tradeId.substring(0, 8))
      )

      if (!decision) {
        console.warn('No corresponding AI decision found for trade outcome')
        return
      }

      // Create trade result for feedback system
      const tradeResult = {
        tradeId,
        symbol,
        entryPrice: 100, // Would get from actual trade data
        exitPrice: 100 + (pnl / 100), // Simplified calculation
        quantity: decision.positionSize,
        side: decision.action.toLowerCase() as 'buy' | 'sell',
        entryTime: new Date(Date.now() - duration),
        exitTime: new Date(),
        pnl,
        strategy: 'AI_INTEGRATED',
        aiConfidence: decision.confidence,
        marketConditionsAtEntry: {
          regime: decision.metadata.regime,
          sentiment: decision.metadata.sentimentScore
        },
        marketConditionsAtExit: {
          regime: decision.metadata.regime,
          sentiment: decision.metadata.sentimentScore
        }
      }

      // Record in feedback system
      await tradeFeedbackSystem.recordTradeOutcome(tradeResult, userId)

      // End RL episode and start new one
      await reinforcementLearningAgent.endEpisode(pnl)
      await reinforcementLearningAgent.startEpisode(symbol, decision.metadata.regime)

      // Check if models need retraining
      const shouldRetrain = await mlTrainingPipeline.shouldRetrain(userId, symbol)
      if (shouldRetrain.shouldRetrain) {
        console.log('Triggering model retraining based on new trade outcome')
        await mlTrainingPipeline.trainModels(userId, symbol)
      }

    } catch (error) {
      await errorRecoverySystem.handleError(
        error as Error,
        ErrorCategory.SYSTEM_ERROR,
        ErrorSeverity.MEDIUM,
        { operation: 'record_trade_outcome', userId, symbol }
      )
    }
  }

  async getSystemStatus(userId: string): Promise<AISystemStatus> {
    try {
      const [
        learningMetrics,
        modelPerformance,
        errorAnalytics,
        rlMetrics
      ] = await Promise.all([
        tradeFeedbackSystem.getLearningMetrics(userId),
        mlTrainingPipeline.getModelPerformance(),
        errorRecoverySystem.getErrorAnalytics(24),
        reinforcementLearningAgent.getQLearningMetrics()
      ])

      const modelsActive = Object.keys(modelPerformance).length
      const systemHealth = errorAnalytics.systemHealth

      const recommendations = [
        ...errorAnalytics.recommendations,
        ...this.generateAIRecommendations(learningMetrics, rlMetrics)
      ]

      return {
        isLearning: rlMetrics.explorationRate > 0.05,
        modelsActive,
        lastUpdate: this.lastDecisionTime,
        performance: {
          accuracy: learningMetrics.accuracy,
          profitFactor: learningMetrics.profitFactor,
          sharpeRatio: learningMetrics.sharpeRatio,
          drawdown: learningMetrics.maxDrawdown
        },
        systemHealth,
        recommendations
      }

    } catch (error) {
      console.error('Error getting AI system status:', error)
      return {
        isLearning: false,
        modelsActive: 0,
        lastUpdate: new Date(),
        performance: {
          accuracy: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          drawdown: 0
        },
        systemHealth: 'CRITICAL',
        recommendations: ['AI system status check failed']
      }
    }
  }

  private combineSignals(signals: {
    regime: any
    sentiment: number
    pattern: any
    ml: any
    rl: any
    strategy: any
  }): AIDecision {
    // Weight different signals based on confidence and regime
    const weights = this.getSignalWeights(signals.regime.regime)

    // Determine action
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    let confidence = 0

    // ML signal
    const mlScore = this.getActionScore(signals.ml.direction) * weights.ml * signals.ml.confidence

    // Pattern signal
    const patternScore = signals.pattern
      ? this.getActionScore(signals.pattern.pattern.type === 'bullish' ? 'UP' : 'DOWN') * weights.pattern * signals.pattern.matchScore
      : 0

    // Sentiment signal
    const sentimentScore = signals.sentiment * weights.sentiment

    // RL signal
    const rlScore = this.getActionScore(signals.rl.type) * weights.rl * signals.rl.confidence

    // Combine scores
    const totalScore = mlScore + patternScore + sentimentScore + rlScore

    if (totalScore > 0.3) {
      action = 'BUY'
      confidence = Math.min(0.95, totalScore)
    } else if (totalScore < -0.3) {
      action = 'SELL'
      confidence = Math.min(0.95, Math.abs(totalScore))
    } else {
      action = 'HOLD'
      confidence = 0.5
    }

    // Apply regime-based adjustments
    confidence *= signals.strategy.confidenceThreshold

    const positionSize = this.calculatePositionSize(confidence, signals.strategy.positionSizing, signals.strategy.riskLevel)

    return {
      action,
      confidence,
      reasoning: this.buildReasoning(signals, totalScore),
      riskScore: signals.ml.riskScore || signals.strategy.riskLevel,
      positionSize,
      stopLoss: action !== 'HOLD' ? this.calculateStopLoss(action, signals.ml.expectedReturn) : undefined,
      takeProfit: action !== 'HOLD' ? this.calculateTakeProfit(action, signals.ml.expectedReturn) : undefined,
      timeHorizon: signals.pattern?.timeHorizon || 24,
      metadata: {
        regime: signals.regime.regime,
        sentimentScore: signals.sentiment,
        patternConfidence: signals.pattern?.matchScore || 0,
        mlConfidence: signals.ml.confidence,
        rlRecommendation: `${signals.rl.type}:${signals.rl.confidence.toFixed(2)}`,
        modelUsed: [signals.ml.modelUsed, 'pattern_recognition', 'sentiment_analysis', 'reinforcement_learning']
      }
    }
  }

  private getSignalWeights(regime: MarketRegime): Record<string, number> {
    switch (regime) {
      case 'BULL':
        return { ml: 0.4, pattern: 0.3, sentiment: 0.2, rl: 0.1 }
      case 'BEAR':
        return { ml: 0.5, pattern: 0.2, sentiment: 0.2, rl: 0.1 }
      case 'SIDEWAYS':
        return { ml: 0.3, pattern: 0.4, sentiment: 0.2, rl: 0.1 }
      case 'VOLATILE':
        return { ml: 0.2, pattern: 0.3, sentiment: 0.3, rl: 0.2 }
      default:
        return { ml: 0.35, pattern: 0.3, sentiment: 0.25, rl: 0.1 }
    }
  }

  private getActionScore(action: string): number {
    switch (action) {
      case 'BUY':
      case 'UP':
        return 1
      case 'SELL':
      case 'DOWN':
        return -1
      case 'HOLD':
      default:
        return 0
    }
  }

  private buildReasoning(signals: any, totalScore: number): string[] {
    const reasoning: string[] = []

    reasoning.push(`Market regime: ${signals.regime.regime} (${(signals.regime.confidence * 100).toFixed(1)}% confidence)`)

    if (Math.abs(signals.sentiment) > 0.1) {
      reasoning.push(`Sentiment: ${signals.sentiment > 0 ? 'Positive' : 'Negative'} (${(Math.abs(signals.sentiment) * 100).toFixed(1)}%)`)
    }

    if (signals.pattern) {
      reasoning.push(`Pattern: ${signals.pattern.pattern.name} detected (${(signals.pattern.matchScore * 100).toFixed(1)}% match)`)
    }

    reasoning.push(`ML prediction: ${signals.ml.direction} (${(signals.ml.confidence * 100).toFixed(1)}% confidence)`)

    reasoning.push(`Combined signal strength: ${(Math.abs(totalScore) * 100).toFixed(1)}%`)

    return reasoning
  }

  private calculatePositionSize(confidence: number, baseSize: number, riskLevel: number): number {
    return Math.floor(baseSize * confidence * (1 - riskLevel) * 1000) / 1000
  }

  private calculateStopLoss(action: 'BUY' | 'SELL', expectedReturn: number): number {
    const stopLossPercent = Math.max(0.01, Math.abs(expectedReturn) * 0.5)
    return action === 'BUY' ? -stopLossPercent : stopLossPercent
  }

  private calculateTakeProfit(action: 'BUY' | 'SELL', expectedReturn: number): number {
    const takeProfitPercent = Math.max(0.02, Math.abs(expectedReturn) * 2)
    return action === 'BUY' ? takeProfitPercent : -takeProfitPercent
  }

  private buildRLState(marketData: MarketData[], regime: MarketRegime, sentiment: number): any {
    const latest = marketData[marketData.length - 1]
    const now = new Date()

    return {
      marketConditions: {
        price: latest.close,
        volume: latest.volume,
        volatility: this.calculateVolatility(marketData),
        momentum: this.calculateMomentum(marketData),
        rsi: this.calculateRSI(marketData),
        macd: this.calculateMACD(marketData),
        sentiment,
        regime
      },
      portfolio: {
        cash: 10000, // Would get from actual portfolio
        position: 0,
        unrealizedPnL: 0,
        dayTrades: 0
      },
      timeContext: {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        marketSession: this.getMarketSession(now)
      }
    }
  }

  private calculateReward(decision: AIDecision, currentMarketData: MarketData[]): any {
    // Simplified reward calculation
    const priceChange = 0.01 * (Math.random() - 0.5) // Simulated price change

    return reinforcementLearningAgent.calculateReward(
      {
        type: decision.action,
        quantity: decision.positionSize,
        confidence: decision.confidence
      },
      priceChange,
      this.buildRLState(currentMarketData, decision.metadata.regime, decision.metadata.sentimentScore)
    )
  }

  private getFallbackDecision(symbol: string): AIDecision {
    return {
      action: 'HOLD',
      confidence: 0.5,
      reasoning: ['AI system fallback - insufficient data or system error'],
      riskScore: 0.8,
      positionSize: 0,
      timeHorizon: 24,
      metadata: {
        regime: 'SIDEWAYS',
        sentimentScore: 0,
        patternConfidence: 0,
        mlConfidence: 0,
        rlRecommendation: 'FALLBACK',
        modelUsed: ['fallback']
      }
    }
  }

  private recordDecision(decision: AIDecision): void {
    this.decisionHistory.push(decision)
    this.lastDecisionTime = new Date()

    // Limit history
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-50)
    }
  }

  private generateAIRecommendations(learningMetrics: any, rlMetrics: any): string[] {
    const recommendations: string[] = []

    if (learningMetrics.accuracy < 0.6) {
      recommendations.push('AI accuracy below 60% - consider retraining models')
    }

    if (rlMetrics.explorationRate > 0.3) {
      recommendations.push('RL agent in high exploration mode - results may be variable')
    }

    if (learningMetrics.winRate < 0.5) {
      recommendations.push('Win rate below 50% - review trading strategy')
    }

    return recommendations
  }

  private getMarketSession(date: Date): 'PRE' | 'OPEN' | 'CLOSE' | 'AFTER' {
    const hour = date.getHours()
    if (hour < 9) return 'PRE'
    if (hour >= 9 && hour < 16) return 'OPEN'
    if (hour >= 16 && hour < 17) return 'CLOSE'
    return 'AFTER'
  }

  // Technical indicator helpers
  private calculateRSI(marketData: MarketData[]): number {
    // Simplified RSI calculation
    const prices = marketData.map(d => d.close)
    if (prices.length < 14) return 50

    let gains = 0, losses = 0
    for (let i = prices.length - 14; i < prices.length; i++) {
      const change = prices[i] - prices[i-1]
      if (change > 0) gains += change
      else losses -= change
    }

    const avgGain = gains / 14
    const avgLoss = losses / 14
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(marketData: MarketData[]): number {
    // Simplified MACD calculation
    const prices = marketData.map(d => d.close)
    if (prices.length < 26) return 0

    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    return ema12 - ema26
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]

    const multiplier = 2 / (period + 1)
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }

    return ema
  }

  private calculateVolatility(marketData: MarketData[]): number {
    const prices = marketData.map(d => d.close)
    if (prices.length < 2) return 0.02

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

    return Math.sqrt(variance * 252) // Annualized
  }

  private calculateMomentum(marketData: MarketData[]): number {
    const prices = marketData.map(d => d.close)
    if (prices.length < 20) return 0

    const current = prices[prices.length - 1]
    const past = prices[prices.length - 20]
    return (current - past) / past
  }

  private calculateVolumeTrend(marketData: MarketData[]): number {
    if (marketData.length < 10) return 0

    const recentVolume = marketData.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5
    const pastVolume = marketData.slice(-10, -5).reduce((sum, d) => sum + d.volume, 0) / 5

    return pastVolume > 0 ? (recentVolume - pastVolume) / pastVolume : 0
  }

  // Public API
  getDecisionHistory(): AIDecision[] {
    return [...this.decisionHistory]
  }

  isSystemInitialized(): boolean {
    return this.isInitialized
  }

  async reinitializeSystem(userId: string): Promise<void> {
    this.isInitialized = false
    await this.initialize(userId)
  }
}

export const aiSystemIntegration = new AISystemIntegration()