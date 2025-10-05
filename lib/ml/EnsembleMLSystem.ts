/**
 * Ensemble Machine Learning System
 * Combines multiple ML models to make better trading decisions
 * Integrates: Reinforcement Learning, Pattern Recognition, Sentiment Analysis
 */

import { ReinforcementLearningAgent } from '@/lib/ai/ReinforcementLearningAgent'
import { PatternRecognitionEngine } from '@/lib/ai/PatternRecognitionEngine'
import { SentimentAnalyzer } from '@/lib/sentiment/SentimentAnalyzer'
import { AILearningSystem } from '@/lib/trading/ml/AILearningSystem'
import { MarketData } from '@/types/trading'


export interface MLPrediction {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  priceTarget: number
  stopLoss: number
  timeHorizon: number
  reasoning: string[]
  modelScores: {
    reinforcementLearning: number
    patternRecognition: number
    sentimentAnalysis: number
    technicalAnalysis: number
  }
  ensemble: {
    votingConsensus: number
    weightedScore: number
    modelAgreement: number
  }
}

export interface MLMetrics {
  overallAccuracy: number
  modelPerformance: {
    reinforcementLearning: {
      qTableSize: number
      explorationRate: number
      averageReward: number
      convergenceStatus: string
    }
    patternRecognition: {
      patternsIdentified: number
      accuracyRate: number
      strongestPatterns: string[]
    }
    sentimentAnalysis: {
      newsArticlesProcessed: number
      averageSentiment: number
      sentimentAccuracy: number
    }
    technicalAnalysis: {
      indicatorsUsed: number
      accuracy: number
      profitableSignals: number
    }
  }
  ensembleMetrics: {
    consensusRate: number
    predictionAccuracy: number
    totalPredictions: number
    profitablePredictions: number
  }
}

export class EnsembleMLSystem {
  private rlAgent: ReinforcementLearningAgent
  private patternEngine: PatternRecognitionEngine
  private sentimentAnalyzer: SentimentAnalyzer
  private learningSystem: AILearningSystem
  private predictionHistory: MLPrediction[] = []

  // Model weights (can be adjusted based on performance)
  private weights = {
    reinforcementLearning: 0.35,
    patternRecognition: 0.30,
    sentimentAnalysis: 0.20,
    technicalAnalysis: 0.15
  }

  constructor() {
    this.rlAgent = new ReinforcementLearningAgent()
    this.patternEngine = new PatternRecognitionEngine()
    this.sentimentAnalyzer = new SentimentAnalyzer()
    this.learningSystem = new AILearningSystem({
      maxHistorySize: 10000,
      learningRate: 0.05
    })
  }

  /**
   * Generate ensemble prediction using all ML models
   */
  async generatePrediction(
    symbol: string,
    marketData: MarketData[],
    currentState: {
      price: number
      volume: number
      volatility: number
      portfolio: {
        cash: number
        position: number
        unrealizedPnL: number
      }
    }
  ): Promise<MLPrediction> {
    try {
      console.log(`🤖 Ensemble ML generating prediction for ${symbol}...`)

      // 1. Get Reinforcement Learning prediction
      const rlPrediction = await this.getReinforcementLearningPrediction(symbol, marketData, currentState)

      // 2. Get Pattern Recognition prediction
      const patternPrediction = await this.getPatternPrediction(symbol, marketData)

      // 3. Get Sentiment Analysis prediction
      const sentimentPrediction = await this.getSentimentPrediction(symbol)

      // 4. Get Technical Analysis prediction
      const technicalPrediction = await this.getTechnicalPrediction(marketData)

      // 5. Combine all predictions using ensemble method
      const ensemblePrediction = 
      this.combinePredictions(
        rlPrediction,
        patternPrediction,
        sentimentPrediction,
        technicalPrediction
      )

      // 6. Store prediction for learning
      this.predictionHistory.push(ensemblePrediction)
      if (this.predictionHistory.length > 1000) {
        this.predictionHistory = this.predictionHistory.slice(-500)
      }

      console.log(`✅ Ensemble prediction: ${ensemblePrediction.action} with ${(ensemblePrediction.confidence * 100).toFixed(1)}% confidence`)

      return ensemblePrediction

    } catch (error) {
      console.error('❌ Error generating ensemble prediction:', error)
      return this.getDefaultPrediction()
    }
  }

  /**
   * Get prediction from Reinforcement Learning agent
   */
  private async getReinforcementLearningPrediction(
    symbol: string,
    marketData: MarketData[],
    currentState: any
  ): Promise<{ action: string; confidence: number; score: number }> {
    try {
      const latest = marketData[marketData.length - 1]
      const tradingState = {
        marketConditions: {
          price: latest.close,
          volume: latest.volume,
          volatility: currentState.volatility,
          momentum: this.calculateMomentum(marketData),
          rsi: this.calculateRSI(marketData),
          macd: this.calculateMACD(marketData),
          sentiment: 0,
          regime: await this.determineMarketRegime(marketData)
        },
        portfolio: currentState.portfolio,
        timeContext: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          marketSession: this.getMarketSession()
        }
      }

      const action = await this.rlAgent.selectAction(tradingState)

      return {
        action: action.type,
        confidence: action.confidence,
        score: action.confidence
      }

    } catch (error) {
      console.error('RL prediction error:', error)
      return { action: 'HOLD', confidence: 0.5, score: 0.5 }
    }
  }

  /**
   * Get prediction from Pattern Recognition
   */
  private async getPatternPrediction(
    symbol: string,
    marketData: MarketData[]
  ): Promise<{ action: string; confidence: number; score: number }> {
    try {
      const patterns = await this.patternEngine.analyzePatterns(marketData, symbol)

      if (patterns.length === 0) {
        return { action: 'HOLD', confidence: 0.5, score: 0.5 }
      }

      const bestPattern = patterns[0]
      const action = bestPattern.pattern.type === 'bullish' ? 'BUY' :
                     bestPattern.pattern.type === 'bearish' ? 'SELL' : 'HOLD'

      return {
        action,
        confidence: bestPattern.matchScore,
        score: bestPattern.matchScore
      }

    } catch (error) {
      console.error('Pattern prediction error:', error)
      return { action: 'HOLD', confidence: 0.5, score: 0.5 }
    }
  }

  /**
   * Get prediction from Sentiment Analysis
   */
  private async getSentimentPrediction(symbol: string): Promise<{ action: string; confidence: number; score: number }> {
    try {
      const articles = await this.sentimentAnalyzer.fetchNewsForSymbol(symbol, '1d')

      if (articles.length === 0) {
        return { action: 'HOLD', confidence: 0.5, score: 0.5 }
      }

      let totalScore = 0
      let articleCount = 0

      for (const article of articles) {
        const sentiment = this.sentimentAnalyzer.analyzeSentiment(
          article.title + ' ' + article.description
        )
        totalScore += sentiment.score
        articleCount++
      }

      const avgScore = totalScore / Math.max(articleCount, 1)

      // Convert sentiment score (-1 to 1) to action
      let action = 'HOLD'
      if (avgScore > 0.3) action = 'BUY'
      else if (avgScore < -0.3) action = 'SELL'

      const confidence = Math.min(0.95, 0.5 + Math.abs(avgScore) * 0.5)

      return {
        action,
        confidence,
        score: (avgScore + 1) / 2 // Convert to 0-1 scale
      }

    } catch (error) {
      console.error('Sentiment prediction error:', error)
      return { action: 'HOLD', confidence: 0.5, score: 0.5 }
    }
  }

  /**
   * Get prediction from Technical Analysis
   */
  private async getTechnicalPrediction(marketData: MarketData[]): Promise<{ action: string; confidence: number; score: number }> {
    try {
      const rsi = this.calculateRSI(marketData)
      const macd = this.calculateMACD(marketData)
      const momentum = this.calculateMomentum(marketData)

      let signals = 0
      let totalSignals = 0

      // RSI signals
      totalSignals++
      if (rsi < 30) signals++ // Oversold - buy signal
      else if (rsi > 70) signals-- // Overbought - sell signal

      // MACD signals
      totalSignals++
      if (macd > 0) signals++ // Positive MACD - buy signal
      else signals--

      // Momentum signals
      totalSignals++
      if (momentum > 0.02) signals++ // Strong momentum - buy
      else if (momentum < -0.02) signals-- // Negative momentum - sell

      const score = (signals / totalSignals + 1) / 2 // Convert to 0-1 scale

      let action = 'HOLD'
      if (score > 0.6) action = 'BUY'
      else if (score < 0.4) action = 'SELL'

      return {
        action,
        confidence: Math.abs(score - 0.5) * 2, // 0.5 = no confidence, 0 or 1 = max confidence
        score
      }

    } catch (error) {
      console.error('Technical prediction error:', error)
      return { action: 'HOLD', confidence: 0.5, score: 0.5 }
    }
  }

  /**
   * Combine predictions from all models using weighted voting
   */
  private combinePredictions(
    rl: { action: string; confidence: number; score: number },
    pattern: { action: string; confidence: number; score: number },
    sentiment: { action: string; confidence: number; score: number },
    technical: { action: string; confidence: number; score: number }
  ): MLPrediction {
    // Calculate weighted score for each action
    const scores = {
      BUY: 0,
      SELL: 0,
      HOLD: 0
    }

    // Add weighted votes
    scores[rl.action as keyof typeof scores] += rl.score * this.weights.reinforcementLearning
    scores[pattern.action as keyof typeof scores] += pattern.score * this.weights.patternRecognition
    scores[sentiment.action as keyof typeof scores] += sentiment.score * this.weights.sentimentAnalysis
    scores[technical.action as keyof typeof scores] += technical.score * this.weights.technicalAnalysis

    // Determine final action
    const finalAction = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'BUY' | 'SELL' | 'HOLD'

    // Calculate model agreement
    const actions = [rl.action, pattern.action, sentiment.action, technical.action]
    const agreement = actions.filter(a => a === finalAction).length / actions.length

    // Calculate weighted confidence
    const weightedConfidence =
      rl.confidence * this.weights.reinforcementLearning +
      pattern.confidence * this.weights.patternRecognition +
      sentiment.confidence * this.weights.sentimentAnalysis +
      technical.confidence * this.weights.technicalAnalysis

    // Adjust confidence based on model agreement
    const adjustedConfidence = weightedConfidence * (0.7 + agreement * 0.3)

    // Generate reasoning
    const reasoning: string[] = []
    if (rl.action === finalAction) reasoning.push(`RL Agent recommends ${finalAction} (${(rl.confidence * 100).toFixed(0)}%)`)
    if (pattern.action === finalAction) reasoning.push(`Pattern Analysis supports ${finalAction} (${(pattern.confidence * 100).toFixed(0)}%)`)
    if (sentiment.action === finalAction) reasoning.push(`Market Sentiment is ${sentiment.action === 'BUY' ? 'positive' : sentiment.action === 'SELL' ? 'negative' : 'neutral'}`)
    if (technical.action === finalAction) reasoning.push(`Technical Indicators favor ${finalAction}`)

    return {
      action: finalAction,
      confidence: Math.min(0.95, adjustedConfidence),
      priceTarget: 0, // Would calculate based on pattern predictions
      stopLoss: 0, // Would calculate based on volatility
      timeHorizon: 24, // 24 hours default
      reasoning,
      modelScores: {
        reinforcementLearning: rl.score,
        patternRecognition: pattern.score,
        sentimentAnalysis: sentiment.score,
        technicalAnalysis: technical.score
      },
      ensemble: {
        votingConsensus: agreement,
        weightedScore: scores[finalAction],
        modelAgreement: agreement
      }
    }
  }

  /**
   * Update model weights based on performance
   */
  async adjustWeights(performanceMetrics: {
    rl: number
    pattern: number
    sentiment: number
    technical: number
  }): Promise<void> {
    const total = performanceMetrics.rl + performanceMetrics.pattern +
                  performanceMetrics.sentiment + performanceMetrics.technical

    if (total > 0) {
      this.weights.reinforcementLearning = performanceMetrics.rl / total
      this.weights.patternRecognition = performanceMetrics.pattern / total
      this.weights.sentimentAnalysis = performanceMetrics.sentiment / total
      this.weights.technicalAnalysis = performanceMetrics.technical / total

      console.log('📊 Updated ensemble weights:', this.weights)
    }
  }

  /**
   * Get comprehensive ML metrics
   */
  async getMetrics(userId: string): Promise<MLMetrics> {
    try {
      const rlMetrics = await this.rlAgent.getQLearningMetrics()
      const learningInsights = this.learningSystem.getLatestInsights()

      return {
        overallAccuracy: learningInsights?.overallAccuracy || 0,
        modelPerformance: {
          reinforcementLearning: {
            qTableSize: rlMetrics.totalStates,
            explorationRate: rlMetrics.explorationRate,
            averageReward: rlMetrics.averageReward,
            convergenceStatus: rlMetrics.convergenceStatus
          },
          patternRecognition: {
            patternsIdentified: learningInsights?.strongestPatterns.length || 0,
            accuracyRate: learningInsights?.overallAccuracy || 0,
            strongestPatterns: learningInsights?.strongestPatterns.map(p => p.pattern) || []
          },
          sentimentAnalysis: {
            newsArticlesProcessed: 0, // Would track this
            averageSentiment: 50,
            sentimentAccuracy: 0
          },
          technicalAnalysis: {
            indicatorsUsed: 5, // RSI, MACD, Momentum, Volume, Volatility
            accuracy: learningInsights?.overallAccuracy || 0,
            profitableSignals: 0
          }
        },
        ensembleMetrics: {
          consensusRate: this.calculateConsensusRate(),
          predictionAccuracy: learningInsights?.overallAccuracy || 0,
          totalPredictions: this.predictionHistory.length,
          profitablePredictions: 0 // Would track actual outcomes
        }
      }

    } catch (error) {
      console.error('Error getting ML metrics:', error)
      return this.getDefaultMetrics()
    }
  }

  /**
   * Train models on new trade outcome
   */
  async learnFromTrade(
    tradeId: string,
    symbol: string,
    entryPrice: number,
    exitPrice: number,
    profitLoss: number,
    prediction: MLPrediction
  ): Promise<void> {
    try {
      // Calculate if prediction was correct
      const priceChange = ((exitPrice - entryPrice) / entryPrice) * 100
      const wasCorrect =
        (prediction.action === 'BUY' && priceChange > 0) ||
        (prediction.action === 'SELL' && priceChange < 0) ||
        (prediction.action === 'HOLD' && Math.abs(priceChange) < 1)

      // Learn from pattern recognition
      await this.patternEngine.learnFromTradeOutcomes(tradeId)

      console.log(`🧠 ML Learning from trade ${tradeId}: ${wasCorrect ? 'Correct' : 'Incorrect'} prediction`)

      // Adjust weights based on which models were most accurate
      if (wasCorrect) {
        const performanceBoost = {
          rl: prediction.modelScores.reinforcementLearning,
          pattern: prediction.modelScores.patternRecognition,
          sentiment: prediction.modelScores.sentimentAnalysis,
          technical: prediction.modelScores.technicalAnalysis
        }
        await this.adjustWeights(performanceBoost)
      }

    } catch (error) {
      console.error('Error learning from trade:', error)
    }
  }

  // Helper methods

  private calculateRSI(marketData: MarketData[], period: number = 14): number {
    if (marketData.length < period + 1) return 50

    const closes = marketData.map(d => d.close)
    let gains = 0
    let losses = 0

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(marketData: MarketData[]): number {
    if (marketData.length < 26) return 0

    const closes = marketData.map(d => d.close)
    const ema12 = this.calculateEMA(closes, 12)
    const ema26 = this.calculateEMA(closes, 26)

    return ema12 - ema26
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0

    const multiplier = 2 / (period + 1)
    let ema = prices[Math.max(0, prices.length - period)]

    for (let i = Math.max(1, prices.length - period + 1); i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }

    return ema
  }

  private calculateMomentum(marketData: MarketData[], period: number = 10): number {
    if (marketData.length < period) return 0

    const current = marketData[marketData.length - 1].close
    const past = marketData[marketData.length - period].close

    return (current - past) / past
  }

  private async determineMarketRegime(marketData: MarketData[]): Promise<'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE'> {
    const momentum = this.calculateMomentum(marketData, 20)
    const volatility = this.calculateVolatility(marketData)

    if (volatility > 0.03) return 'VOLATILE'
    if (momentum > 0.02) return 'BULL'
    if (momentum < -0.02) return 'BEAR'
    return 'SIDEWAYS'
  }

  private calculateVolatility(marketData: MarketData[]): number {
    if (marketData.length < 2) return 0

    const returns = []
    for (let i = 1; i < marketData.length; i++) {
      returns.push((marketData[i].close - marketData[i - 1].close) / marketData[i - 1].close)
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length

    return Math.sqrt(variance)
  }

  private getMarketSession(): 'PRE' | 'OPEN' | 'CLOSE' | 'AFTER' {
    const hour = new Date().getHours()
    if (hour < 9) return 'PRE'
    if (hour >= 9 && hour < 15) return 'OPEN'
    if (hour >= 15 && hour < 16) return 'CLOSE'
    return 'AFTER'
  }

  private calculateConsensusRate(): number {
    if (this.predictionHistory.length === 0) return 0

    const avgAgreement = this.predictionHistory.reduce(
      (sum, pred) => sum + pred.ensemble.modelAgreement, 0
    ) / this.predictionHistory.length

    return avgAgreement
  }

  private getDefaultPrediction(): MLPrediction {
    return {
      action: 'HOLD',
      confidence: 0.5,
      priceTarget: 0,
      stopLoss: 0,
      timeHorizon: 24,
      reasoning: ['Default prediction - insufficient data'],
      modelScores: {
        reinforcementLearning: 0.5,
        patternRecognition: 0.5,
        sentimentAnalysis: 0.5,
        technicalAnalysis: 0.5
      },
      ensemble: {
        votingConsensus: 0,
        weightedScore: 0,
        modelAgreement: 0
      }
    }
  }

  private getDefaultMetrics(): MLMetrics {
    return {
      overallAccuracy: 0,
      modelPerformance: {
        reinforcementLearning: {
          qTableSize: 0,
          explorationRate: 0.1,
          averageReward: 0,
          convergenceStatus: 'INITIALIZING'
        },
        patternRecognition: {
          patternsIdentified: 0,
          accuracyRate: 0,
          strongestPatterns: []
        },
        sentimentAnalysis: {
          newsArticlesProcessed: 0,
          averageSentiment: 50,
          sentimentAccuracy: 0
        },
        technicalAnalysis: {
          indicatorsUsed: 5,
          accuracy: 0,
          profitableSignals: 0
        }
      },
      ensembleMetrics: {
        consensusRate: 0,
        predictionAccuracy: 0,
        totalPredictions: 0,
        profitablePredictions: 0
      }
    }
  }

  /**
   * Export learning data
   */
  exportLearningData(): any {
    return {
      predictionHistory: this.predictionHistory.slice(-100), // Last 100 predictions
      weights: this.weights,
      metrics: {
        consensusRate: this.calculateConsensusRate(),
        totalPredictions: this.predictionHistory.length
      }
    }
  }

  /**
   * Import learning data
   */
  importLearningData(data: any): void {
    if (data.predictionHistory) {
      this.predictionHistory = data.predictionHistory
    }
    if (data.weights) {
      this.weights = data.weights
    }
    console.log('✅ Ensemble ML data imported')
  }
}

// Global singleton instance
export const ensembleMLSystem = new EnsembleMLSystem()
