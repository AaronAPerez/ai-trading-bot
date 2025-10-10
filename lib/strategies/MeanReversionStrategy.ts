import { TradeSignal, MarketData, TradingStrategy } from '@/types/trading';
import { calculateSMA, calculateRSI } from '@/lib/utils/technicalIndicators'
import { logger } from '@/lib/utils/logger'

/**
 * Statistical Mean Reversion Strategy
 * Uses price deviation from moving average with statistical significance
 */
export class MeanReversionStrategy implements TradingStrategy {
  name = 'Mean Reversion Strategy'
  type = 'MEAN_REVERSION'
  description = 'Statistical mean reversion using z-score and RSI confirmation'
  timeframe = '1h'
  
  parameters = {
    lookbackPeriod: 20,
    zScoreThreshold: 2.0,      // Standard deviations from mean
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    minHoldingPeriod: 4,       // Minimum hours to hold position
    maxHoldingPeriod: 48,      // Maximum hours to hold position
    stopLossPercent: 2.0,
    takeProfitPercent: 3.0,
    volumeThreshold: 1.5       // Volume multiplier for confirmation
  }

  constructor(customParams?: Partial<typeof MeanReversionStrategy.prototype.parameters>) {
    if (customParams) {
      this.parameters = { ...this.parameters, ...customParams }
    }
  }

  async analyze(data: MarketData[]): Promise<TradeSignal> {
    try {
      if (data.length < this.parameters.lookbackPeriod + this.parameters.rsiPeriod) {
        return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for mean reversion analysis', riskScore: 0.5 }
      }

      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const prices = sortedData.map(d => d.close)
      const volumes = sortedData.map(d => d.volume)

      const currentPrice = prices[prices.length - 1]

      // ENHANCEMENT: Assess volatility regime for dynamic thresholds
      const volatilityRegime = this.assessVolatilityRegime(prices)
      const dynamicZScoreThreshold = this.getDynamicZScoreThreshold(volatilityRegime)

      // Calculate z-score (price deviation from mean)
      const zScore = this.calculateZScore(prices, this.parameters.lookbackPeriod)

      // ENHANCEMENT: Check for mean reversion exhaustion (avoid catching falling knives)
      const isExhausted = this.checkMeanReversionExhaustion(prices)

      // Calculate RSI for confirmation
      const rsiValues = calculateRSI(prices, this.parameters.rsiPeriod)
      const currentRSI = rsiValues[rsiValues.length - 1]

      // Volume analysis
      const volumeConfirmation = this.analyzeVolume(volumes)

      let tradeSignal: TradeSignal

      // Skip mean reversion in trending markets
      if (isExhausted) {
        return {
          action: 'HOLD',
          confidence: 0.2,
          reason: `Mean reversion exhausted - trending market detected (Vol: ${volatilityRegime})`,
          riskScore: 0.7
        }
      }

      // Oversold condition: Price significantly below mean (using dynamic threshold)
      if (zScore <= -dynamicZScoreThreshold && currentRSI <= this.parameters.rsiOversold) {
        const confidence = this.calculateMeanReversionConfidence(zScore, currentRSI, volumeConfirmation, 'BUY')
        tradeSignal = {
          action: 'BUY',
          confidence,
          reason: `Mean reversion BUY: Z-score ${zScore.toFixed(2)}, RSI ${currentRSI.toFixed(1)}`,
          riskScore: this.calculateRiskScore(zScore, currentRSI, confidence)
        }
      }
      // Overbought condition: Price significantly above mean (using dynamic threshold)
      else if (zScore >= dynamicZScoreThreshold && currentRSI >= this.parameters.rsiOverbought) {
        const confidence = this.calculateMeanReversionConfidence(zScore, currentRSI, volumeConfirmation, 'SELL')
        tradeSignal = {
          action: 'SELL',
          confidence,
          reason: `Mean reversion SELL: Z-score ${zScore.toFixed(2)}, RSI ${currentRSI.toFixed(1)} (Vol: ${volatilityRegime})`,
          riskScore: this.calculateRiskScore(zScore, currentRSI, confidence)
        }
      }
      // Partial signals (one indicator triggered, using dynamic threshold)
      else if (Math.abs(zScore) >= dynamicZScoreThreshold * 0.8) {
        const action = zScore < 0 ? 'BUY' : 'SELL'
        tradeSignal = {
          action,
          confidence: 0.4,
          reason: `Weak mean reversion signal: Z-score ${zScore.toFixed(2)}, RSI ${currentRSI.toFixed(1)} (Vol: ${volatilityRegime})`,
          riskScore: this.calculateRiskScore(zScore, currentRSI, 0.4)
        }
      } else {
        tradeSignal = {
          action: 'HOLD',
          confidence: 0.3,
          reason: `Price near mean: Z-score ${zScore.toFixed(2)}`,
          riskScore: 0.3
        }
      }

      // Apply volume confirmation
      if (tradeSignal.action !== 'HOLD') {
        if (volumeConfirmation.isElevated) {
          tradeSignal.confidence *= 1.2
          tradeSignal.reason += ` | Volume: ${volumeConfirmation.ratio.toFixed(1)}x`
        } else {
          tradeSignal.confidence *= 0.8
          tradeSignal.reason += ` | Low volume`
        }

        // Add timing information
        tradeSignal.reason += ` | Hold: ${this.parameters.minHoldingPeriod}-${this.parameters.maxHoldingPeriod}h`
      }

      // Set risk management levels
      if (tradeSignal.action !== 'HOLD') {
        tradeSignal.stopLoss = this.calculateStopLoss(currentPrice, tradeSignal.action)
        tradeSignal.takeProfit = this.calculateTakeProfit(currentPrice, tradeSignal.action)
      }

      return tradeSignal

    } catch (error) {
      logger.error(`Mean Reversion Strategy error: ${error}`)
      return { action: 'HOLD', confidence: 0, reason: `Analysis error: ${error}`, riskScore: 1.0 }
    }
  }

  private calculateZScore(prices: number[], period: number): number {
    const recentPrices = prices.slice(-period)
    const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    
    const variance = recentPrices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / recentPrices.length
    const standardDeviation = Math.sqrt(variance)
    
    const currentPrice = prices[prices.length - 1]
    return standardDeviation > 0 ? (currentPrice - mean) / standardDeviation : 0
  }

  private analyzeVolume(volumes: number[]) {
    const currentVolume = volumes[volumes.length - 1]
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    const ratio = currentVolume / avgVolume
    
    return {
      isElevated: ratio >= this.parameters.volumeThreshold,
      ratio,
      percentile: this.calculateVolumePercentile(volumes, currentVolume)
    }
  }

  private calculateVolumePercentile(volumes: number[], currentVolume: number): number {
    const sorted = [...volumes.slice(-50)].sort((a, b) => a - b)
    const position = sorted.findIndex(v => v >= currentVolume)
    return position / sorted.length
  }

  private calculateMeanReversionConfidence(zScore: number, rsi: number, volumeConfirmation: any, action: string): number {
    let confidence = 0.5

    // Z-score strength
    const zScoreStrength = Math.min(1.0, Math.abs(zScore) / 3.0)
    confidence += zScoreStrength * 0.3

    // RSI confirmation
    if (action === 'BUY' && rsi <= this.parameters.rsiOversold) {
      confidence += (this.parameters.rsiOversold - rsi) / this.parameters.rsiOversold * 0.2
    } else if (action === 'SELL' && rsi >= this.parameters.rsiOverbought) {
      confidence += (rsi - this.parameters.rsiOverbought) / (100 - this.parameters.rsiOverbought) * 0.2
    }

    // Volume confirmation
    if (volumeConfirmation.isElevated) {
      confidence += 0.1
    }

    // Extreme z-scores get higher confidence
    if (Math.abs(zScore) > 2.5) {
      confidence += 0.15
    }

    return Math.min(0.95, Math.max(0.1, confidence))
  }

  private calculateStopLoss(price: number, action: string): number {
    const multiplier = this.parameters.stopLossPercent / 100
    return action === 'BUY' ? price * (1 - multiplier) : price * (1 + multiplier)
  }

  private calculateTakeProfit(price: number, action: string): number {
    const multiplier = this.parameters.takeProfitPercent / 100
    return action === 'BUY' ? price * (1 + multiplier) : price * (1 - multiplier)
  }

  private calculateRiskScore(zScore: number, rsi: number, confidence: number): number {
    let riskScore = 0.5 // Base risk score
    
    // Risk based on extreme z-score values (more extreme = potentially higher risk)
    const extremeZScore = Math.abs(zScore)
    if (extremeZScore > 3) {
      riskScore += 0.2 // Very extreme values can be riskier
    } else {
      riskScore -= extremeZScore * 0.1 // Moderate extreme values reduce risk
    }
    
    // Risk based on RSI extremes
    const rsiExtreme = rsi <= 30 || rsi >= 70
    if (rsiExtreme) {
      riskScore -= 0.1 // RSI confirmation reduces risk
    }
    
    // Lower risk for higher confidence signals
    riskScore -= (confidence - 0.5) * 0.3
    
    // Ensure risk score stays within bounds
    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  async backtest(historicalData: MarketData[]): Promise<BacktestResult> {
    // Implement backtesting with holding period constraints
    return {
      startDate: new Date(),
      endDate: new Date(),
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      volatility: 0,
      profitFactor: 0,
      avgTrade: 0,
      avgWinningTrade: 0,
      avgLosingTrade: 0,
      trades: [],
      equityCurve: []
    }
  }

  validateParameters(params: Record<string, any>): boolean {
    return params.lookbackPeriod > 0 &&
           params.zScoreThreshold > 0 &&
           params.minHoldingPeriod <= params.maxHoldingPeriod
  }

  // ===================================================
  // ENHANCEMENTS FOR IMPROVED PROFITABILITY
  // ===================================================

  /**
   * Assess current volatility regime to adapt strategy thresholds
   */
  private assessVolatilityRegime(prices: number[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    const volatility = Math.sqrt(variance * 252) // Annualized volatility

    if (volatility < 0.15) return 'LOW'       // <15% volatility
    if (volatility < 0.30) return 'MEDIUM'    // 15-30% volatility
    return 'HIGH'                              // >30% volatility
  }

  /**
   * Get dynamic z-score threshold based on volatility regime
   * Lower threshold in low vol (easier to trigger), higher in high vol (more selective)
   */
  private getDynamicZScoreThreshold(regime: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    const thresholds = {
      LOW: this.parameters.zScoreThreshold * 0.75,    // 1.5 instead of 2.0
      MEDIUM: this.parameters.zScoreThreshold,         // 2.0 (default)
      HIGH: this.parameters.zScoreThreshold * 1.25     // 2.5 instead of 2.0
    }
    return thresholds[regime]
  }

  /**
   * Check if mean reversion is exhausted (trending market detected)
   * Avoid catching falling knives in strong trends
   */
  private checkMeanReversionExhaustion(prices: number[]): boolean {
    // Calculate recent trend strength
    const recentPrices = prices.slice(-20)
    const oldestPrice = recentPrices[0]
    const newestPrice = recentPrices[recentPrices.length - 1]
    const trendPercent = (newestPrice - oldestPrice) / oldestPrice

    // Calculate momentum (rate of change)
    const momentum = prices.slice(-10).reduce((sum, price, i, arr) => {
      if (i === 0) return 0
      return sum + (price - arr[i-1]) / arr[i-1]
    }, 0) / 10

    // Strong momentum or trend indicates exhausted mean reversion
    return Math.abs(momentum) > 0.15 || Math.abs(trendPercent) > 0.20
  }
}