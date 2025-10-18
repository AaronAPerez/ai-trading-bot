// src/lib/trading/engines/AIRecommendationEngine.ts

import { MLPredictionEngine } from '@/lib/ai/MLPredictionEngine'
import { TechnicalAnalyzer } from '../analyzers/TechnicalAnalyzer'
import { SentimentAnalyzer } from '../analyzers/SentimentAnalyzer'
import { AlpacaClient } from '../../alpaca/AlpacaClient'
import { AIConfig, AIRecommendation, MarketData, SafetyChecks } from '../../../types/trading'

export class AIRecommendationEngine {
  private mlEngine: MLPredictionEngine
  private technicalAnalyzer: TechnicalAnalyzer
  private sentimentAnalyzer: SentimentAnalyzer
  private watchlist: string[] = []
  private isInitialized = false
  private dailyRecommendationCount = 0
  private lastResetDate = new Date().toDateString()

  constructor(
    private config: AIConfig,
    private alpacaClient: AlpacaClient
  ) {
    this.mlEngine = new MLPredictionEngine(config)
    this.technicalAnalyzer = new TechnicalAnalyzer()
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load watchlist
      this.watchlist = await this.loadWatchlist()
      
      // Initialize ML models
      await this.mlEngine.loadModels()
      
      // Warm up analyzers
      await this.technicalAnalyzer.initialize()
      await this.sentimentAnalyzer.initialize()
      
      this.isInitialized = true
      console.log(`🧠 AI Recommendation Engine initialized with ${this.watchlist.length} symbols`)
    } catch (error) {
      console.error('❌ Failed to initialize AI Recommendation Engine:', error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.mlEngine.shutdown()
      this.isInitialized = false
      console.log('🧠 AI Recommendation Engine shut down')
    } catch (error) {
      console.error('❌ Error shutting down AI Recommendation Engine:', error)
    }
  }

  async generateRecommendations(): Promise<AIRecommendation[]> {
    if (!this.isInitialized) {
      throw new Error('AI Recommendation Engine not initialized')
    }

    // Reset daily counter if new day
    this.resetDailyCounterIfNeeded()

    const recommendations: AIRecommendation[] = []
    
    console.log(`🔍 Analyzing ${this.watchlist.length} symbols for opportunities...`)

    // Process symbols in parallel batches to improve performance
    const batchSize = 5
    for (let i = 0; i < this.watchlist.length; i += batchSize) {
      const batch = this.watchlist.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          return await this.analyzeSymbol(symbol)
        } catch (error) {
          console.error(`❌ Failed to analyze ${symbol}:`, error.message)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      const validRecommendations = batchResults.filter(rec => rec !== null) as AIRecommendation[]
      recommendations.push(...validRecommendations)
    }

    // Sort by AI score (best opportunities first)
    recommendations.sort((a, b) => b.aiScore - a.aiScore)
    
    console.log(`🎯 Generated ${recommendations.length} AI recommendations`)
    return recommendations
  }

  private async analyzeSymbol(symbol: string): Promise<AIRecommendation | null> {
    // Get market data
    const marketData = await this.alpacaClient.getMarketData(symbol)
    if (!marketData || marketData.length < 20) {
      return null
    }

    const currentPrice = marketData[marketData.length - 1].close
    const previousPrice = marketData[marketData.length - 2]?.close || currentPrice

    // Run parallel analysis
    const [mlPrediction, technicalScore, sentimentScore] = await Promise.all([
      this.mlEngine.predict(marketData),
      this.technicalAnalyzer.analyze(marketData),
      this.sentimentAnalyzer.analyzeSymbol(symbol)
    ])

    // Skip if ML prediction is HOLD or low confidence
    if (mlPrediction.direction === 'HOLD' || mlPrediction.confidence < 0.55) {
      return null
    }

    // Calculate composite AI score
    const aiScore = this.calculateAIScore(mlPrediction, technicalScore, sentimentScore, marketData)
    
    // Filter out low-scoring opportunities
    if (aiScore < 65) {
      return null
    }

    // Perform comprehensive safety checks
    const safetyChecks = await this.performSafetyChecks(symbol, currentPrice, mlPrediction, marketData)
    
    if (!safetyChecks.passedRiskCheck) {
      return null
    }

    // Calculate target price and stop loss with dynamic adjustments
    const volatility = this.calculateVolatility(marketData)
    const { targetPrice, stopLoss } = this.calculatePriceTargets(
      currentPrice, 
      mlPrediction.direction, 
      volatility,
      mlPrediction.confidence
    )
  
    // Generate recommendation
   const recommendation: AIRecommendation = {
       id: `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
       symbol,
       action: mlPrediction.direction === 'UP' ? 'BUY' : 'SELL',
       confidence: mlPrediction.confidence,
       currentPrice,
       targetPrice,
       stopLoss,
       reasoning: [
           `🤖 ML: ${mlPrediction.direction} ${(mlPrediction.confidence * 100).toFixed(1)}% confidence`,
           `📊 Technical: ${technicalAnalysis.summary.trend} trend, ${technicalAnalysis.summary.momentum} momentum`,
           `💭 Sentiment: ${sentimentScore.toFixed(1)}/100 (${this.getSentimentLabel(sentimentScore)})`,
           `⚡ Volatility: ${(volatility * 100).toFixed(2)}% (${volatility > 0.05 ? 'High' : 'Normal'})`,
           `🎯 AI Score: ${aiScore.toFixed(1)}/100 (${this.getConfidenceLabel(aiScore)})`
       ],
       riskScore: this.calculateComprehensiveRisk(
           mlPrediction.riskScore,
           volatility,
           sentimentScore,
           technicalAnalysis.signals
       ),
       aiScore,
       timestamp: new Date(),
       expiresAt: new Date(Date.now() + this.getRecommendationTTL(mlPrediction.confidence)),
       safetyChecks,
       executionMetadata: {
           volatility,
           technicalSummary: technicalAnalysis.summary,
           sentimentBreakdown: {
               newsScore: 0, // Would come from sentiment analyzer
               socialScore: 0,
               overallScore: sentimentScore
           },
           mlFeatures: mlPrediction.features || {},
           recommendationSource: 'AI_ML_ENHANCED_V3'
       },
       maxSafeAmount: undefined
   }

  return recommendation
}

  private calculateAIScore(
    mlPrediction: any, 
    technicalScore: number, 
    sentimentScore: number,
    marketData: MarketData[]
  ): number {
     // Enhanced multi-dimensional scoring
  const weights = {
    ml: 0.35,           // ML prediction
    technical: 0.25,    // Technical analysis  
    sentiment: 0.15,    // Market sentiment
    momentum: 0.15,     // Price momentum
    volume: 0.10        // Volume analysis
  }

  const mlScore = mlPrediction.confidence * 100
  const techScore = technicalAnalysis.score
  const momentumScore = this.calculateMomentumScore(marketData)
  const volumeScore = this.calculateVolumeScore(marketData)

  let compositeScore = (
    mlScore * weights.ml +
    techScore * weights.technical +
    sentimentScore * weights.sentiment +
    momentumScore * weights.momentum +
    volumeScore * weights.volume
  )

  // Apply confirmation bonuses
  const confirmedSignals = this.countConfirmedSignals(
    mlPrediction, technicalAnalysis, sentimentScore
  )
  
  if (confirmedSignals >= 3) {
    compositeScore *= 1.15 // 15% bonus for 3+ confirming signals
  } else if (confirmedSignals >= 2) {
    compositeScore *= 1.08 // 8% bonus for 2 confirming signals
  }

  // Apply market condition multiplier
  const marketCondition = this.assessCurrentMarketCondition(marketData)
  const conditionMultiplier = this.getMarketConditionMultiplier(
    marketCondition, mlPrediction.direction
  )
  
  compositeScore *= conditionMultiplier

  return Math.max(0, Math.min(100, compositeScore))
}

  private async performSafetyChecks(
    symbol: string, 
    price: number, 
    prediction: any,
    marketData: MarketData[]
  ): Promise<SafetyChecks> {
    const warnings: string[] = []
    let passedRiskCheck = true

    // Risk score check
    if (prediction.riskScore > 0.4) {
      passedRiskCheck = false
      warnings.push(`High risk score: ${(prediction.riskScore * 100).toFixed(1)}%`)
    }

    // Volatility check
    const volatility = this.calculateVolatility(marketData)
    if (volatility > 0.08) { // 8% daily volatility threshold
      warnings.push(`High volatility: ${(volatility * 100).toFixed(2)}%`)
      if (volatility > 0.12) {
        passedRiskCheck = false
      }
    }

    // Volume check
    const avgVolume = this.calculateAverageVolume(marketData)
    const currentVolume = marketData[marketData.length - 1].volume
    if (currentVolume < avgVolume * 0.5) {
      warnings.push('Low volume detected')
    }

    // Daily recommendation limit check
    const maxDailyRecommendations = 50 // Configurable limit
    if (this.dailyRecommendationCount >= maxDailyRecommendations) {
      passedRiskCheck = false
      warnings.push('Daily recommendation limit reached')
    }

    // Market hours check for non-crypto
    const isCrypto = symbol.includes('USD') && symbol.length === 6
    if (!isCrypto && !this.isMarketHours()) {
      warnings.push('Outside market hours')
    }

    // Price gap check
    if (marketData.length >= 2) {
      const priceGap = Math.abs(marketData[marketData.length - 1].close - marketData[marketData.length - 2].close) / marketData[marketData.length - 2].close
      if (priceGap > 0.05) { // 5% gap
        warnings.push(`Large price gap: ${(priceGap * 100).toFixed(2)}%`)
      }
    }

    return {
      passedRiskCheck,
      withinDailyLimit: this.dailyRecommendationCount < maxDailyRecommendations,
      positionSizeOk: true, // This would be checked at execution time
      correlationCheck: true, // This would check correlation with existing positions
      volumeCheck: currentVolume >= avgVolume * 0.3,
      volatilityCheck: volatility <= 0.12,
      marketHoursCheck: isCrypto || this.isMarketHours(),
      warnings
    }
  }

  private calculatePriceTargets(
    currentPrice: number,
    direction: 'UP' | 'DOWN',
    volatility: number,
    confidence: number
  ): { targetPrice: number; stopLoss: number } {
    // Dynamic target calculation based on volatility and confidence
    const baseTargetMultiplier = direction === 'UP' ? 1.06 : 0.94 // 6% base target
    const baseStopMultiplier = direction === 'UP' ? 0.96 : 1.04   // 4% base stop

    // Adjust targets based on confidence
    const confidenceAdjustment = (confidence - 0.6) * 2 // Scale from 0.6-1.0 to 0-0.8
    const volatilityAdjustment = Math.min(volatility * 10, 0.5) // Cap volatility impact

    let targetMultiplier = baseTargetMultiplier
    let stopMultiplier = baseStopMultiplier

    if (direction === 'UP') {
      targetMultiplier += confidenceAdjustment * 0.02 + volatilityAdjustment * 0.01
      stopMultiplier += confidenceAdjustment * 0.005 // Tighter stop for high confidence
    } else {
      targetMultiplier -= confidenceAdjustment * 0.02 + volatilityAdjustment * 0.01
      stopMultiplier -= confidenceAdjustment * 0.005
    }

    return {
      targetPrice: currentPrice * targetMultiplier,
      stopLoss: currentPrice * stopMultiplier
    }
  }

  private calculateVolatility(marketData: MarketData[], period: number = 14): number {
    if (marketData.length < period + 1) return 0

    const returns = []
    for (let i = marketData.length - period; i < marketData.length; i++) {
      const currentPrice = marketData[i].close
      const previousPrice = marketData[i - 1].close
      returns.push(Math.log(currentPrice / previousPrice))
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance * 252) // Annualized volatility
  }

  private calculateMomentumScore(marketData: MarketData[]): number {
    if (marketData.length < 10) return 50

    const recent = marketData.slice(-5)
    const older = marketData.slice(-10, -5)
    
    const recentAvg = recent.reduce((sum, data) => sum + data.close, 0) / recent.length
    const olderAvg = older.reduce((sum, data) => sum + data.close, 0) / older.length
    
    const momentum = (recentAvg - olderAvg) / olderAvg
    
    // Convert to 0-100 score
    return Math.max(0, Math.min(100, 50 + (momentum * 500)))
  }

  private calculateVolumeScore(marketData: MarketData[]): number {
    if (marketData.length < 10) return 50

    const avgVolume = this.calculateAverageVolume(marketData.slice(-20))
    const currentVolume = marketData[marketData.length - 1].volume
    
    const volumeRatio = currentVolume / avgVolume
    
    // Score based on volume relative to average
    if (volumeRatio > 2) return 100
    if (volumeRatio > 1.5) return 85
    if (volumeRatio > 1.2) return 70
    if (volumeRatio > 0.8) return 50
    if (volumeRatio > 0.5) return 30
    return 15
  }

  private calculateAverageVolume(marketData: MarketData[]): number {
    if (marketData.length === 0) return 0
    return marketData.reduce((sum, data) => sum + data.volume, 0) / marketData.length
  }

  private hasConfirmingSignals(technical: number, sentiment: number, confidence: number): boolean {
    // Check if multiple signals agree
    const technicalBullish = technical > 60
    const sentimentBullish = sentiment > 60
    const highConfidence = confidence > 0.75

    // At least 2 out of 3 should agree
    const agreeingSignals = [technicalBullish, sentimentBullish, highConfidence].filter(Boolean).length
    return agreeingSignals >= 2
  }

  private assessMarketCondition(marketData: MarketData[]): 'bullish' | 'bearish' | 'neutral' {
    if (marketData.length < 20) return 'neutral'

    const recent20 = marketData.slice(-20)
    const recentPrices = recent20.map(d => d.close)
    const trend = this.calculateTrend(recentPrices)

    if (trend > 0.02) return 'bullish'
    if (trend < -0.02) return 'bearish'
    return 'neutral'
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0

    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    
    return (lastPrice - firstPrice) / firstPrice
  }

  private getTechnicalSignal(score: number): string {
    if (score >= 80) return 'Strong Buy'
    if (score >= 65) return 'Buy'
    if (score >= 55) return 'Weak Buy'
    if (score >= 45) return 'Neutral'
    if (score >= 35) return 'Weak Sell'
    if (score >= 20) return 'Sell'
    return 'Strong Sell'
  }

  private getSentimentSignal(score: number): string {
    if (score >= 75) return 'Very Positive'
    if (score >= 60) return 'Positive'
    if (score >= 40) return 'Neutral'
    if (score >= 25) return 'Negative'
    return 'Very Negative'
  }

  private calculateRiskScore(mlRisk: number, volatility: number, sentiment: number): number {
    // Combine multiple risk factors
    const volatilityRisk = Math.min(volatility * 5, 1) // Cap at 1
    const sentimentRisk = sentiment < 30 ? 0.3 : sentiment > 70 ? 0.1 : 0.2
    
    const combinedRisk = (mlRisk * 0.5) + (volatilityRisk * 0.3) + (sentimentRisk * 0.2)
    
    return Math.max(0, Math.min(1, combinedRisk))
  }

  private getRecommendationTTL(confidence: number): number {
    // Higher confidence recommendations last longer
    if (confidence >= 0.9) return 45 * 60 * 1000 // 45 minutes
    if (confidence >= 0.8) return 30 * 60 * 1000 // 30 minutes
    if (confidence >= 0.7) return 20 * 60 * 1000 // 20 minutes
    return 15 * 60 * 1000 // 15 minutes
  }

  private isMarketHours(): boolean {
    const now = new Date()
    const utcHour = now.getUTCHours()
    const utcMinute = now.getUTCMinutes()
    const utcTime = utcHour + utcMinute / 60

    // US Market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
    return utcTime >= 14.5 && utcTime <= 21
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toDateString()
    if (this.lastResetDate !== today) {
      this.dailyRecommendationCount = 0
      this.lastResetDate = today
      console.log('🔄 Daily recommendation counter reset')
    }
  }

  private async loadWatchlist(): Promise<string[]> {
    // Enhanced watchlist with categorization
    const defaultWatchlist = [
      // Large Cap Tech
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
      
      // Financial
      'JPM', 'BAC', 'WFC', 'GS',
      
      // Healthcare
      'JNJ', 'PFE', 'MRNA', 'ABBV',
      
      // Consumer
      'WMT', 'HD', 'MCD', 'NKE',
      
      // Communication
      'DIS', 'NFLX', 'CRM', 'ZOOM',
      
      // Crypto
      'BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOGEUSД', 'MATICUSD',
      
      // ETFs
      'SPY', 'QQQ', 'IWM', 'VTI'
    ]

    // In production, this could be loaded from:
    // - Database configuration
    // - User preferences
    // - Dynamic market scanning
    // - Sector rotation algorithms
    
    return defaultWatchlist
  }

  // Public methods for monitoring and debugging
  public getWatchlist(): string[] {
    return [...this.watchlist]
  }

  public getDailyStats(): { count: number; limit: number; resetDate: string } {
    return {
      count: this.dailyRecommendationCount,
      limit: 50,
      resetDate: this.lastResetDate
    }
  }

  public isReady(): boolean {
    return this.isInitialized
  }

  public async updateWatchlist(newWatchlist: string[]): Promise<void> {
    this.watchlist = [...newWatchlist]
    console.log(`📝 Watchlist updated with ${this.watchlist.length} symbols`)
  }
}
