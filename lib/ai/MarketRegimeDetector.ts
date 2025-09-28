import { MarketData } from '@/types/trading'
import { tradingStorage } from '@/lib/database/tradingStorage'

export type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE' | 'TRANSITION'

interface RegimeCharacteristics {
  trendStrength: number
  volatility: number
  momentum: number
  volumePattern: number
  duration: number
  confidence: number
}

interface RegimeSignal {
  regime: MarketRegime
  confidence: number
  characteristics: RegimeCharacteristics
  duration: number
  changeSignal: boolean
  adaptedStrategy: string
}

interface HistoricalRegime {
  regime: MarketRegime
  startDate: Date
  endDate?: Date
  characteristics: RegimeCharacteristics
  performance: {
    avgReturn: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
  }
}

export class MarketRegimeDetector {
  private currentRegime: MarketRegime = 'SIDEWAYS'
  private regimeHistory: HistoricalRegime[] = []
  private regimeStartTime: Date = new Date()
  private lookbackPeriod = 50 // bars for regime analysis

  async detectRegime(marketData: MarketData[], symbol: string): Promise<RegimeSignal> {
    try {
      const characteristics = this.calculateRegimeCharacteristics(marketData)
      const detectedRegime = this.classifyRegime(characteristics)
      const confidence = this.calculateConfidence(characteristics, detectedRegime)

      // Check for regime change
      const changeSignal = this.detectRegimeChange(detectedRegime, characteristics)

      if (changeSignal) {
        await this.recordRegimeChange(symbol, detectedRegime, characteristics)
      }

      const adaptedStrategy = this.getAdaptedStrategy(detectedRegime, characteristics)

      return {
        regime: detectedRegime,
        confidence,
        characteristics,
        duration: this.getRegimeDuration(),
        changeSignal,
        adaptedStrategy
      }

    } catch (error) {
      console.error('Error detecting market regime:', error)
      return {
        regime: 'SIDEWAYS',
        confidence: 0.5,
        characteristics: this.getDefaultCharacteristics(),
        duration: 0,
        changeSignal: false,
        adaptedStrategy: 'CONSERVATIVE'
      }
    }
  }

  async getRegimeBasedStrategy(regime: MarketRegime, userId: string): Promise<{
    positionSizing: number
    riskLevel: number
    tradingFrequency: number
    confidenceThreshold: number
    recommendedActions: string[]
  }> {
    try {
      // Get historical performance for this regime
      const historicalPerformance = await this.getHistoricalRegimePerformance(regime, userId)

      switch (regime) {
        case 'BULL':
          return {
            positionSizing: 0.15, // Aggressive position sizing
            riskLevel: 0.12, // Higher risk tolerance
            tradingFrequency: 1.2, // More frequent trading
            confidenceThreshold: 0.65, // Lower threshold for more trades
            recommendedActions: [
              'Increase position sizes',
              'Focus on momentum strategies',
              'Reduce stop-loss margins',
              'Target trending stocks'
            ]
          }

        case 'BEAR':
          return {
            positionSizing: 0.08, // Conservative position sizing
            riskLevel: 0.06, // Lower risk tolerance
            tradingFrequency: 0.7, // Less frequent trading
            confidenceThreshold: 0.8, // Higher threshold for quality trades
            recommendedActions: [
              'Reduce position sizes',
              'Focus on defensive stocks',
              'Implement tight stop-losses',
              'Consider short positions',
              'Increase cash allocation'
            ]
          }

        case 'SIDEWAYS':
          return {
            positionSizing: 0.10, // Moderate position sizing
            riskLevel: 0.08, // Moderate risk
            tradingFrequency: 0.9, // Normal trading frequency
            confidenceThreshold: 0.72, // Standard threshold
            recommendedActions: [
              'Range trading strategies',
              'Mean reversion approaches',
              'Scalping opportunities',
              'Sector rotation'
            ]
          }

        case 'VOLATILE':
          return {
            positionSizing: 0.06, // Small position sizing
            riskLevel: 0.04, // Very low risk
            tradingFrequency: 0.5, // Reduced trading
            confidenceThreshold: 0.85, // Very high threshold
            recommendedActions: [
              'Minimize exposure',
              'Focus on volatility plays',
              'Use options strategies',
              'Wait for clearer signals'
            ]
          }

        case 'TRANSITION':
          return {
            positionSizing: 0.07, // Conservative sizing
            riskLevel: 0.05, // Low risk
            tradingFrequency: 0.6, // Reduced frequency
            confidenceThreshold: 0.82, // High threshold
            recommendedActions: [
              'Wait for regime confirmation',
              'Close uncertain positions',
              'Prepare for new regime',
              'Monitor key indicators'
            ]
          }

        default:
          return this.getRegimeBasedStrategy('SIDEWAYS', userId)
      }
    } catch (error) {
      console.error('Error getting regime-based strategy:', error)
      return this.getRegimeBasedStrategy('SIDEWAYS', userId)
    }
  }

  private calculateRegimeCharacteristics(marketData: MarketData[]): RegimeCharacteristics {
    const prices = marketData.map(d => d.close)
    const volumes = marketData.map(d => d.volume)
    const highs = marketData.map(d => d.high)
    const lows = marketData.map(d => d.low)

    return {
      trendStrength: this.calculateTrendStrength(prices),
      volatility: this.calculateVolatility(prices),
      momentum: this.calculateMomentum(prices),
      volumePattern: this.calculateVolumePattern(prices, volumes),
      duration: this.getRegimeDuration(),
      confidence: 0.8 // Will be calculated separately
    }
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 20) return 0

    // Linear regression slope
    const n = prices.length
    const x = Array.from({length: n}, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = prices.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * prices[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const avgPrice = sumY / n

    // Normalize slope by average price
    const trendStrength = slope / avgPrice

    // R-squared for trend quality
    const yMean = avgPrice
    const yPred = x.map(xi => (sumY / n) + slope * (xi - sumX / n))
    const ssRes = prices.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0)
    const ssTot = prices.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0

    // Combine trend strength with quality
    return trendStrength * Math.sqrt(rSquared)
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

    return Math.sqrt(variance * 252) // Annualized volatility
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 20) return 0

    // Rate of change over multiple periods
    const shortROC = (prices[prices.length - 1] - prices[prices.length - 6]) / prices[prices.length - 6] // 5-period
    const mediumROC = (prices[prices.length - 1] - prices[prices.length - 11]) / prices[prices.length - 11] // 10-period
    const longROC = (prices[prices.length - 1] - prices[prices.length - 21]) / prices[prices.length - 21] // 20-period

    // Weighted momentum score
    return (shortROC * 0.5 + mediumROC * 0.3 + longROC * 0.2)
  }

  private calculateVolumePattern(prices: number[], volumes: number[]): number {
    if (prices.length < 10 || volumes.length < 10) return 0

    // Price-volume correlation
    const priceChanges = []
    const volumeChanges = []

    for (let i = 1; i < Math.min(prices.length, volumes.length); i++) {
      priceChanges.push((prices[i] - prices[i-1]) / prices[i-1])
      volumeChanges.push((volumes[i] - volumes[i-1]) / volumes[i-1])
    }

    // Calculate correlation
    const n = priceChanges.length
    if (n === 0) return 0

    const meanPrice = priceChanges.reduce((a, b) => a + b, 0) / n
    const meanVolume = volumeChanges.reduce((a, b) => a + b, 0) / n

    const numerator = priceChanges.reduce((sum, p, i) =>
      sum + (p - meanPrice) * (volumeChanges[i] - meanVolume), 0)

    const denomPrice = Math.sqrt(priceChanges.reduce((sum, p) =>
      sum + Math.pow(p - meanPrice, 2), 0))

    const denomVolume = Math.sqrt(volumeChanges.reduce((sum, v) =>
      sum + Math.pow(v - meanVolume, 2), 0))

    return denomPrice > 0 && denomVolume > 0 ? numerator / (denomPrice * denomVolume) : 0
  }

  private classifyRegime(characteristics: RegimeCharacteristics): MarketRegime {
    const { trendStrength, volatility, momentum, volumePattern } = characteristics

    // High volatility indicates volatile regime
    if (volatility > 0.4) {
      return 'VOLATILE'
    }

    // Strong upward trend
    if (trendStrength > 0.02 && momentum > 0.03 && volumePattern > 0.3) {
      return 'BULL'
    }

    // Strong downward trend
    if (trendStrength < -0.02 && momentum < -0.03) {
      return 'BEAR'
    }

    // Mixed signals or changing conditions
    if (Math.abs(trendStrength) > 0.01 && volatility > 0.25) {
      return 'TRANSITION'
    }

    // Default to sideways
    return 'SIDEWAYS'
  }

  private calculateConfidence(characteristics: RegimeCharacteristics, regime: MarketRegime): number {
    const { trendStrength, volatility, momentum, volumePattern } = characteristics

    switch (regime) {
      case 'BULL':
        return Math.min(0.95,
          (Math.abs(trendStrength) * 20 +
           Math.abs(momentum) * 15 +
           Math.max(0, volumePattern) * 10 +
           (1 - Math.min(1, volatility / 0.3)) * 5) / 50)

      case 'BEAR':
        return Math.min(0.95,
          (Math.abs(trendStrength) * 20 +
           Math.abs(momentum) * 15 +
           (1 - Math.min(1, volatility / 0.4)) * 15) / 50)

      case 'VOLATILE':
        return Math.min(0.95, volatility / 0.5)

      case 'TRANSITION':
        return 0.6 + Math.min(0.3, volatility / 0.4)

      case 'SIDEWAYS':
      default:
        return 0.7 - Math.min(0.4, Math.abs(trendStrength) * 10)
    }
  }

  private detectRegimeChange(newRegime: MarketRegime, characteristics: RegimeCharacteristics): boolean {
    // Minimum duration before allowing regime change (prevent whipsaws)
    const minDuration = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const currentDuration = Date.now() - this.regimeStartTime.getTime()

    if (currentDuration < minDuration) {
      return false
    }

    // Regime change detection
    if (newRegime !== this.currentRegime) {
      // Require high confidence for regime change
      const confidence = this.calculateConfidence(characteristics, newRegime)
      return confidence > 0.75
    }

    return false
  }

  private async recordRegimeChange(symbol: string, newRegime: MarketRegime, characteristics: RegimeCharacteristics): Promise<void> {
    try {
      // End current regime
      if (this.regimeHistory.length > 0) {
        const currentHistoricalRegime = this.regimeHistory[this.regimeHistory.length - 1]
        if (!currentHistoricalRegime.endDate) {
          currentHistoricalRegime.endDate = new Date()
        }
      }

      // Start new regime
      const newHistoricalRegime: HistoricalRegime = {
        regime: newRegime,
        startDate: new Date(),
        characteristics,
        performance: {
          avgReturn: 0,
          volatility: characteristics.volatility,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      }

      this.regimeHistory.push(newHistoricalRegime)
      this.currentRegime = newRegime
      this.regimeStartTime = new Date()

      // Log regime change
      console.log(`Market regime changed to ${newRegime} for ${symbol}`)

    } catch (error) {
      console.error('Error recording regime change:', error)
    }
  }

  private getAdaptedStrategy(regime: MarketRegime, characteristics: RegimeCharacteristics): string {
    switch (regime) {
      case 'BULL':
        return characteristics.momentum > 0.05 ? 'AGGRESSIVE_GROWTH' : 'MODERATE_GROWTH'

      case 'BEAR':
        return characteristics.volatility > 0.3 ? 'DEFENSIVE_CASH' : 'SELECTIVE_SHORTS'

      case 'SIDEWAYS':
        return characteristics.volumePattern > 0.2 ? 'RANGE_TRADING' : 'MEAN_REVERSION'

      case 'VOLATILE':
        return 'VOLATILITY_CAPTURE'

      case 'TRANSITION':
        return 'WAIT_AND_SEE'

      default:
        return 'CONSERVATIVE'
    }
  }

  private async getHistoricalRegimePerformance(regime: MarketRegime, userId: string): Promise<any> {
    try {
      // Get learning data filtered by regime
      const learningData = await tradingStorage.getAILearningData(userId)
      const regimeData = learningData.filter(d => {
        const marketConditions = d.market_conditions
        return marketConditions.regime === regime
      })

      if (regimeData.length === 0) {
        return { avgReturn: 0, successRate: 0, avgDuration: 0 }
      }

      const totalPnL = regimeData.reduce((sum, d) => sum + d.profit_loss, 0)
      const avgReturn = totalPnL / regimeData.length
      const successRate = regimeData.filter(d => d.profit_loss > 0).length / regimeData.length

      return {
        avgReturn,
        successRate,
        avgDuration: regimeData.length > 0 ?
          regimeData.reduce((sum, d) => sum + (d.market_conditions.trade_duration_hours || 24), 0) / regimeData.length : 24
      }
    } catch (error) {
      console.error('Error getting historical regime performance:', error)
      return { avgReturn: 0, successRate: 0.5, avgDuration: 24 }
    }
  }

  private getRegimeDuration(): number {
    return (Date.now() - this.regimeStartTime.getTime()) / (1000 * 60 * 60) // hours
  }

  private getDefaultCharacteristics(): RegimeCharacteristics {
    return {
      trendStrength: 0,
      volatility: 0.2,
      momentum: 0,
      volumePattern: 0,
      duration: 0,
      confidence: 0.5
    }
  }

  // Public methods for accessing regime state
  getCurrentRegime(): MarketRegime {
    return this.currentRegime
  }

  getRegimeHistory(): HistoricalRegime[] {
    return [...this.regimeHistory]
  }

  async getRegimeAnalytics(userId: string): Promise<{
    currentRegime: MarketRegime
    regimeDuration: number
    regimeConfidence: number
    historicalPerformance: Record<MarketRegime, any>
    recommendedAdjustments: string[]
  }> {
    try {
      const historicalPerformance: Record<MarketRegime, any> = {}
      const regimes: MarketRegime[] = ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE', 'TRANSITION']

      for (const regime of regimes) {
        historicalPerformance[regime] = await this.getHistoricalRegimePerformance(regime, userId)
      }

      const currentStrategy = await this.getRegimeBasedStrategy(this.currentRegime, userId)

      return {
        currentRegime: this.currentRegime,
        regimeDuration: this.getRegimeDuration(),
        regimeConfidence: 0.8, // Would be calculated from current characteristics
        historicalPerformance,
        recommendedAdjustments: currentStrategy.recommendedActions
      }
    } catch (error) {
      console.error('Error getting regime analytics:', error)
      return {
        currentRegime: 'SIDEWAYS',
        regimeDuration: 0,
        regimeConfidence: 0.5,
        historicalPerformance: {},
        recommendedAdjustments: ['Monitor market conditions']
      }
    }
  }
}

export const marketRegimeDetector = new MarketRegimeDetector()