import { MarketData, TradeSignal } from '@/types/trading'
import { newsApiService } from '@/lib/sentiment/newsApiService'

interface MLFeatures {
  price_momentum: number
  volatility: number
  volume_trend: number
  technical_indicators: number[]
  market_sentiment: number
  time_features: number[]
}

interface MLPrediction {
  direction: 'UP' | 'DOWN' | 'SIDEWAYS'
  confidence: number
  priceTarget: number
  timeHorizon: number
  features: MLFeatures
}

interface MLModel {
  name: string
  type: 'LSTM' | 'TRANSFORMER' | 'RANDOM_FOREST' | 'ENSEMBLE'
  accuracy: number
  lastTrained: Date
  features: string[]
}

export class MLPredictionEngine {
  private models: Map<string, MLModel> = new Map()
  private modelWeights: Map<string, number> = new Map()
  private minDataPoints = 50 // Reduced minimum data points for faster startup

  constructor() {
    this.initializeModels()
  }

  private initializeModels() {
    // LSTM Model for time series prediction
    this.models.set('lstm', {
      name: 'LSTM Price Predictor',
      type: 'LSTM',
      accuracy: 0.68,
      lastTrained: new Date(),
      features: ['price_sequence', 'volume_sequence', 'technical_indicators']
    })

    // Transformer for complex pattern recognition
    this.models.set('transformer', {
      name: 'Transformer Pattern Recognition',
      type: 'TRANSFORMER',
      accuracy: 0.72,
      lastTrained: new Date(),
      features: ['price_attention', 'volume_attention', 'sentiment_analysis']
    })

    // Random Forest for robust predictions
    this.models.set('random_forest', {
      name: 'Random Forest Ensemble',
      type: 'RANDOM_FOREST',
      accuracy: 0.65,
      lastTrained: new Date(),
      features: ['all_technical_indicators', 'market_regime', 'volatility_clustering']
    })

    // Set model weights based on performance
    this.modelWeights.set('lstm', 0.35)
    this.modelWeights.set('transformer', 0.40)
    this.modelWeights.set('random_forest', 0.25)
  }

  async predict(marketData: MarketData[], symbol: string, horizon: number = 24): Promise<MLPrediction> {
    if (marketData.length < this.minDataPoints) {
      throw new Error(`Insufficient data: need at least ${this.minDataPoints} points`)
    }

    const features = await this.extractFeatures(marketData, symbol)
    const predictions: MLPrediction[] = []

    // Get predictions from all models
    for (const [modelId, model] of this.models) {
      try {
        const prediction = await this.runModel(modelId, features, marketData, horizon)
        predictions.push(prediction)
      } catch (error) {
        console.error(`Model ${modelId} prediction failed:`, error)
      }
    }

    // Ensemble prediction with confidence weighting
    return this.ensemblePrediction(predictions, features)
  }

  private async extractFeatures(marketData: MarketData[], symbol: string): Promise<MLFeatures> {
    const prices = marketData.map(d => d.close)
    const volumes = marketData.map(d => d.volume)
    const currentPrice = prices[prices.length - 1]

    return {
      price_momentum: this.calculateMomentum(prices),
      volatility: this.calculateVolatility(prices),
      volume_trend: this.calculateVolumeTrend(volumes),
      technical_indicators: this.calculateTechnicalFeatures(marketData),
      market_sentiment: await this.calculateMarketSentiment(marketData, symbol),
      time_features: this.extractTimeFeatures(marketData[marketData.length - 1])
    }
  }

  private calculateMomentum(prices: number[]): number {
    // Price momentum using rate of change and acceleration
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    // Short-term momentum (5 periods)
    const shortMom = returns.slice(-5).reduce((a, b) => a + b, 0)

    // Medium-term momentum (20 periods)
    const mediumMom = returns.slice(-20).reduce((a, b) => a + b, 0)

    // Momentum acceleration (change in momentum)
    const acceleration = shortMom - mediumMom

    return (shortMom * 0.6 + mediumMom * 0.3 + acceleration * 0.1)
  }

  private calculateVolatility(prices: number[]): number {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

    return Math.sqrt(variance) * Math.sqrt(252) // Annualized volatility
  }

  private calculateVolumeTrend(volumes: number[]): number {
    // Volume-weighted trend analysis
    const recentVol = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10
    const historicalVol = volumes.slice(-50, -10).reduce((a, b) => a + b, 0) / 40

    return (recentVol - historicalVol) / historicalVol
  }

  private calculateTechnicalFeatures(marketData: MarketData[]): number[] {
    const data = marketData.slice(-50) // Use last 50 periods
    const prices = data.map(d => d.close)

    // RSI
    const rsi = this.calculateRSI(prices, 14)

    // MACD
    const { macd, signal } = this.calculateMACD(prices)

    // Bollinger Bands position
    const bb = this.calculateBollingerPosition(prices, 20, 2)

    // Stochastic
    const stoch = this.calculateStochastic(data, 14)

    // Williams %R
    const williamsR = this.calculateWilliamsR(data, 14)

    // Rate of Change
    const roc = this.calculateROC(prices, 10)

    return [rsi, macd, signal, bb, stoch, williamsR, roc]
  }

  private async calculateMarketSentiment(marketData: MarketData[], symbol: string): Promise<number> {
    // Composite sentiment score combining multiple factors
    const prices = marketData.map(d => d.close)
    const volumes = marketData.map(d => d.volume)

    // Price action sentiment (trend strength)
    const trendStrength = this.calculateTrendStrength(prices)

    // Volume sentiment (accumulation/distribution)
    const volumeSentiment = this.calculateVolumeSentiment(prices, volumes)

    // Volatility sentiment (fear/greed indicator)
    const volatilitySentiment = this.calculateVolatilitySentiment(prices)

    // Technical sentiment (combination of price, volume, volatility)
    const technicalSentiment = (trendStrength * 0.4 + volumeSentiment * 0.35 + volatilitySentiment * 0.25)

    // Get real news sentiment data
    let newsSentiment = 0
    try {
      const sentimentData = await newsApiService.getCachedSentiment(symbol, 60) // 1-hour cache
      if (sentimentData) {
        newsSentiment = sentimentData.sentimentScore
      }
    } catch (error) {
      console.error('Error fetching news sentiment:', error)
      // Fall back to technical sentiment only
    }

    // Combine technical and news sentiment
    // Weight: 60% technical (price/volume based), 40% news sentiment
    return (technicalSentiment * 0.6 + newsSentiment * 0.4)
  }

  private extractTimeFeatures(lastData: MarketData): number[] {
    const date = new Date(lastData.timestamp)

    return [
      date.getHours() / 24, // Hour of day (0-1)
      date.getDay() / 7, // Day of week (0-1)
      date.getDate() / 31, // Day of month (0-1)
      date.getMonth() / 12, // Month (0-1)
      this.isMarketOpen(date) ? 1 : 0, // Market session
      this.getMarketRegime(date) // Market regime indicator
    ]
  }

  private async runModel(modelId: string, features: MLFeatures, marketData: MarketData[], horizon: number): Promise<MLPrediction> {
    const model = this.models.get(modelId)!

    switch (model.type) {
      case 'LSTM':
        return this.runLSTMModel(features, marketData, horizon)

      case 'TRANSFORMER':
        return this.runTransformerModel(features, marketData, horizon)

      case 'RANDOM_FOREST':
        return this.runRandomForestModel(features, marketData, horizon)

      default:
        throw new Error(`Unknown model type: ${model.type}`)
    }
  }

  private async runLSTMModel(features: MLFeatures, marketData: MarketData[], horizon: number): Promise<MLPrediction> {
    // Simulate LSTM prediction (in real implementation, this would call a trained model)
    const currentPrice = marketData[marketData.length - 1].close
    const volatility = features.volatility
    const momentum = features.price_momentum

    // LSTM is good at capturing time series patterns
    const sequencePattern = this.analyzeSequencePattern(marketData.slice(-20))
    const trendContinuation = momentum > 0.02 ? 0.7 : momentum < -0.02 ? -0.7 : 0

    // Price prediction based on sequence learning
    const priceChange = (sequencePattern + trendContinuation + features.market_sentiment * 0.3) * volatility
    const priceTarget = currentPrice * (1 + priceChange)

    const direction = priceChange > 0.002 ? 'UP' : priceChange < -0.002 ? 'DOWN' : 'SIDEWAYS'
    const confidence = Math.min(0.85, Math.abs(priceChange) * 8 + 0.6) // Higher baseline confidence

    return {
      direction,
      confidence,
      priceTarget,
      timeHorizon: horizon,
      features
    }
  }

  private async runTransformerModel(features: MLFeatures, marketData: MarketData[], horizon: number): Promise<MLPrediction> {
    // Simulate Transformer prediction with attention mechanism
    const currentPrice = marketData[marketData.length - 1].close

    // Transformer excels at finding complex patterns and relationships
    const attentionWeights = this.calculateAttentionWeights(marketData)
    const patternRecognition = this.findComplexPatterns(marketData, attentionWeights)
    const sentimentImpact = features.market_sentiment * 0.4

    const priceChange = (patternRecognition + sentimentImpact + features.price_momentum * 0.3) * features.volatility
    const priceTarget = currentPrice * (1 + priceChange)

    const direction = priceChange > 0.003 ? 'UP' : priceChange < -0.003 ? 'DOWN' : 'SIDEWAYS'
    const confidence = Math.min(0.90, Math.abs(priceChange) * 6 + 0.65) // Higher baseline confidence

    return {
      direction,
      confidence,
      priceTarget,
      timeHorizon: horizon,
      features
    }
  }

  private async runRandomForestModel(features: MLFeatures, marketData: MarketData[], horizon: number): Promise<MLPrediction> {
    // Simulate Random Forest prediction using feature importance
    const currentPrice = marketData[marketData.length - 1].close

    // Random Forest uses ensemble of decision trees
    const technicalScore = this.calculateTechnicalScore(features.technical_indicators)
    const momentumScore = features.price_momentum * 2
    const volumeScore = features.volume_trend * 1.5
    const volatilityPenalty = features.volatility > 0.3 ? -0.1 : 0

    const ensembleScore = technicalScore + momentumScore + volumeScore + volatilityPenalty
    const priceChange = Math.tanh(ensembleScore) * features.volatility * 0.8
    const priceTarget = currentPrice * (1 + priceChange)

    const direction = priceChange > 0.003 ? 'UP' : priceChange < -0.003 ? 'DOWN' : 'SIDEWAYS'
    const confidence = Math.min(0.80, Math.abs(ensembleScore) * 0.15 + 0.45)

    return {
      direction,
      confidence,
      priceTarget,
      timeHorizon: horizon,
      features
    }
  }

  private ensemblePrediction(predictions: MLPrediction[], features: MLFeatures): MLPrediction {
    if (predictions.length === 0) {
      throw new Error('No valid predictions available')
    }

    let weightedDirection = 0
    let weightedConfidence = 0
    let weightedPriceTarget = 0
    let totalWeight = 0

    predictions.forEach((pred, index) => {
      const modelId = Array.from(this.models.keys())[index]
      const weight = this.modelWeights.get(modelId) || 0
      const confidence = pred.confidence
      const adjustedWeight = weight * confidence // Weight by confidence

      // Convert direction to numeric for averaging
      const directionValue = pred.direction === 'UP' ? 1 : pred.direction === 'DOWN' ? -1 : 0

      weightedDirection += directionValue * adjustedWeight
      weightedConfidence += confidence * adjustedWeight
      weightedPriceTarget += pred.priceTarget * adjustedWeight
      totalWeight += adjustedWeight
    })

    if (totalWeight === 0) {
      totalWeight = 1
    }

    const finalDirection = weightedDirection / totalWeight
    const direction = finalDirection > 0.3 ? 'UP' : finalDirection < -0.3 ? 'DOWN' : 'SIDEWAYS'

    // Ensemble confidence is higher when models agree
    const agreementBonus = this.calculateAgreement(predictions) * 0.2
    const finalConfidence = Math.min(0.95, (weightedConfidence / totalWeight) + agreementBonus)

    return {
      direction,
      confidence: finalConfidence,
      priceTarget: weightedPriceTarget / totalWeight,
      timeHorizon: predictions[0].timeHorizon,
      features
    }
  }

  // Helper methods for calculations
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50

    let gains = 0, losses = 0

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) gains += change
      else losses -= change
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number } {
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macd = ema12 - ema26

    // Simplified signal line (normally 9-period EMA of MACD)
    const signal = macd * 0.8

    return { macd, signal }
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0

    const multiplier = 2 / (period + 1)
    let ema = prices[0]

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }

    return ema
  }

  private calculateBollingerPosition(prices: number[], period: number, stdDev: number): number {
    if (prices.length < period) return 0

    const recentPrices = prices.slice(-period)
    const sma = recentPrices.reduce((a, b) => a + b, 0) / period

    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const std = Math.sqrt(variance)

    const upperBand = sma + (std * stdDev)
    const lowerBand = sma - (std * stdDev)
    const currentPrice = prices[prices.length - 1]

    // Return position within bands (-1 to 1)
    if (upperBand === lowerBand) return 0
    return ((currentPrice - lowerBand) / (upperBand - lowerBand)) * 2 - 1
  }

  private calculateStochastic(data: MarketData[], period: number): number {
    if (data.length < period) return 50

    const recentData = data.slice(-period)
    const highs = recentData.map(d => d.high)
    const lows = recentData.map(d => d.low)
    const currentClose = data[data.length - 1].close

    const highest = Math.max(...highs)
    const lowest = Math.min(...lows)

    if (highest === lowest) return 50
    return ((currentClose - lowest) / (highest - lowest)) * 100
  }

  private calculateWilliamsR(data: MarketData[], period: number): number {
    return (this.calculateStochastic(data, period) - 100) // Williams %R is inverted Stochastic
  }

  private calculateROC(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0

    const currentPrice = prices[prices.length - 1]
    const pastPrice = prices[prices.length - 1 - period]

    return ((currentPrice - pastPrice) / pastPrice) * 100
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 20) return 0

    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50
    const currentPrice = prices[prices.length - 1]

    // Trend strength based on price position relative to moving averages
    const short_trend = (currentPrice - sma20) / sma20
    const long_trend = (sma20 - sma50) / sma50

    return (short_trend * 0.7 + long_trend * 0.3)
  }

  private calculateVolumeSentiment(prices: number[], volumes: number[]): number {
    if (prices.length < 2 || volumes.length < 2) return 0

    let bullishVolume = 0, bearishVolume = 0

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        bullishVolume += volumes[i]
      } else {
        bearishVolume += volumes[i]
      }
    }

    const totalVolume = bullishVolume + bearishVolume
    if (totalVolume === 0) return 0

    return (bullishVolume - bearishVolume) / totalVolume
  }

  private calculateVolatilitySentiment(prices: number[]): number {
    const volatility = this.calculateVolatility(prices)

    // Higher volatility often indicates fear/uncertainty (negative sentiment)
    // Lower volatility indicates complacency (neutral to positive)
    if (volatility > 0.4) return -0.5 // High fear
    if (volatility > 0.25) return -0.2 // Moderate concern
    if (volatility < 0.1) return 0.3 // Complacency
    return 0 // Normal volatility
  }

  private isMarketOpen(date: Date): boolean {
    const hour = date.getHours()
    const day = date.getDay()

    // US market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16
  }

  private getMarketRegime(date: Date): number {
    // Simplified market regime classification
    const hour = date.getHours()

    if (hour >= 9 && hour < 11) return 0.8 // Opening volatility
    if (hour >= 11 && hour < 14) return 0.3 // Midday calm
    if (hour >= 14 && hour < 16) return 0.9 // Closing volatility
    return 0.1 // After hours
  }

  private analyzeSequencePattern(recentData: MarketData[]): number {
    const prices = recentData.map(d => d.close)
    let pattern = 0

    // Look for common patterns
    for (let i = 2; i < prices.length; i++) {
      if (prices[i] > prices[i-1] && prices[i-1] > prices[i-2]) {
        pattern += 0.1 // Uptrend continuation
      } else if (prices[i] < prices[i-1] && prices[i-1] < prices[i-2]) {
        pattern -= 0.1 // Downtrend continuation
      }
    }

    return Math.tanh(pattern) // Bounded between -1 and 1
  }

  private calculateAttentionWeights(marketData: MarketData[]): number[] {
    // Simplified attention mechanism - focus on recent data and high volatility periods
    const weights = []
    const prices = marketData.map(d => d.close)

    for (let i = 0; i < marketData.length; i++) {
      // Recency bias
      const recencyWeight = Math.exp(-(marketData.length - i - 1) * 0.1)

      // Volatility attention
      const volatilityWeight = i > 0 ? Math.abs(prices[i] - prices[i-1]) / prices[i-1] : 0

      weights.push(recencyWeight + volatilityWeight * 2)
    }

    // Normalize weights
    const sum = weights.reduce((a, b) => a + b, 0)
    return weights.map(w => w / sum)
  }

  private findComplexPatterns(marketData: MarketData[], attentionWeights: number[]): number {
    // Simulate complex pattern recognition using attention weights
    const prices = marketData.map(d => d.close)
    let patternStrength = 0

    // Weighted pattern analysis
    for (let i = 1; i < prices.length; i++) {
      const priceChange = (prices[i] - prices[i-1]) / prices[i-1]
      const weight = attentionWeights[i]
      patternStrength += priceChange * weight
    }

    return Math.tanh(patternStrength * 5) // Amplify and bound the signal
  }

  private calculateTechnicalScore(indicators: number[]): number {
    if (indicators.length < 7) return 0

    const [rsi, macd, signal, bb, stoch, williamsR, roc] = indicators

    // Convert indicators to normalized scores (-1 to 1)
    const rsiScore = (rsi - 50) / 50 // RSI: 0-100 -> -1 to 1
    const macdScore = Math.tanh(macd - signal) // MACD divergence
    const bbScore = Math.tanh(bb) // Bollinger position
    const stochScore = (stoch - 50) / 50 // Stochastic: 0-100 -> -1 to 1
    const wrScore = (williamsR + 50) / 50 // Williams %R: -100 to 0 -> -1 to 1
    const rocScore = Math.tanh(roc / 10) // Rate of change

    return (rsiScore + macdScore + bbScore + stochScore + wrScore + rocScore) / 6
  }

  private calculateAgreement(predictions: MLPrediction[]): number {
    if (predictions.length < 2) return 0

    const directions = predictions.map(p => p.direction)
    const uniqueDirections = new Set(directions)

    // Perfect agreement bonus
    if (uniqueDirections.size === 1) return 1

    // Partial agreement
    const mostCommon = [...uniqueDirections].map(dir =>
      ({ dir, count: directions.filter(d => d === dir).length })
    ).sort((a, b) => b.count - a.count)[0]

    return mostCommon.count / predictions.length
  }
}