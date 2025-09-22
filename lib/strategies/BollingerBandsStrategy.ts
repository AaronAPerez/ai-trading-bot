import { TradingStrategy, TradeSignal, MarketData, BacktestResult } from '@/types/trading'
import { calculateSMA, calculateBollingerBands } from '@/lib/utils/technicalIndicators'
import { logger } from '@/lib/utils/logger'

/**
 * Bollinger Bands Strategy
 * Mean reversion strategy using statistical price bands
 */
export class BollingerBandsStrategy implements TradingStrategy {
  name = 'Bollinger Bands Strategy'
  type = 'BOLLINGER_BANDS'
  description = 'Mean reversion using Bollinger Bands with squeeze detection'
  timeframe = '1h'
  
  parameters = {
    period: 20,
    standardDeviations: 2,
    oversoldPercentile: 0.05,    // 5% below lower band
    overboughtPercentile: 0.05,  // 5% above upper band
    squeezeThreshold: 0.02,      // Band width threshold for squeeze
    volumeConfirmation: true,
    stopLossPercent: 1.5,
    takeProfitPercent: 3.0,
    minConfidence: 0.4
  }

  constructor(customParams?: Partial<typeof BollingerBandsStrategy.prototype.parameters>) {
    if (customParams) {
      this.parameters = { ...this.parameters, ...customParams }
    }
  }

  async analyze(data: MarketData[]): Promise<TradeSignal> {
    try {
      if (data.length < this.parameters.period + 10) {
        return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for Bollinger Bands', riskScore: 0.5 }
      }

      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const prices = sortedData.map(d => d.close)
      const volumes = sortedData.map(d => d.volume)
      
      const bbResult = calculateBollingerBands(prices, this.parameters.period, this.parameters.standardDeviations)
      if (!bbResult || bbResult.middle.length === 0) {
        
        return { action: 'HOLD', confidence: 0, reason: 'Unable to calculate Bollinger Bands', riskScore: 0.5 }
      }

      const currentPrice = prices[prices.length - 1]
      const currentMiddle = bbResult.middle[bbResult.middle.length - 1]
      const currentUpper = bbResult.upper[bbResult.upper.length - 1]
      const currentLower = bbResult.lower[bbResult.lower.length - 1]
      
      // Calculate band width (volatility measure)
      const bandWidth = (currentUpper - currentLower) / currentMiddle
      const isSqueezing = bandWidth < this.parameters.squeezeThreshold

      // Calculate position within bands
      const bandPosition = (currentPrice - currentLower) / (currentUpper - currentLower)

      let tradeSignal: TradeSignal

      // Mean reversion signals
      if (bandPosition <= this.parameters.oversoldPercentile) {
        // Price near or below lower band - potential buy
        const confidence = this.calculateConfidence(bandPosition, bandWidth, isSqueezing, 'BUY')
        tradeSignal = {
          action: 'BUY',
          confidence,
          reason: `Price oversold: ${(bandPosition * 100).toFixed(1)}% of band range, BB lower: ${currentLower.toFixed(2)}`,
          riskScore: this.calculateRiskScore(bandPosition, bandWidth, confidence)
        }
      } else if (bandPosition >= (1 - this.parameters.overboughtPercentile)) {
        // Price near or above upper band - potential sell
        const confidence = this.calculateConfidence(bandPosition, bandWidth, isSqueezing, 'SELL')
        tradeSignal = {
          action: 'SELL',
          confidence,
          reason: `Price overbought: ${(bandPosition * 100).toFixed(1)}% of band range, BB upper: ${currentUpper.toFixed(2)}`,
          riskScore: this.calculateRiskScore(bandPosition, bandWidth, confidence)
        }
      } else if (isSqueezing) {
        // Bollinger Band squeeze - prepare for breakout
        tradeSignal = {
          action: 'HOLD',
          confidence: 0.6,
          reason: `BB Squeeze detected: band width ${(bandWidth * 100).toFixed(2)}% - awaiting breakout`,
          riskScore: 0.4
        }
      } else {
        // Price in middle zone
        tradeSignal = {
          action: 'HOLD',
          confidence: 0.3,
          reason: `Price in middle zone: ${(bandPosition * 100).toFixed(1)}% of band range`,
          riskScore: 0.3
        }
      }

      // Volume confirmation
      if (this.parameters.volumeConfirmation && tradeSignal.action !== 'HOLD') {
        const volumeConfirmation = this.getVolumeConfirmation(volumes)
        if (!volumeConfirmation.confirmed) {
          tradeSignal.confidence *= 0.7
          tradeSignal.reason += ` | Low volume`
        } else {
          tradeSignal.confidence *= 1.15
          tradeSignal.reason += ` | Volume confirmed`
        }
      }

      // Apply minimum confidence
      if (tradeSignal.confidence < this.parameters.minConfidence) {
        return { action: 'HOLD', confidence: 0, reason: `Low confidence: ${tradeSignal.confidence.toFixed(2)}`, riskScore: 0.2 }
      }

      // Add stop loss and take profit
      tradeSignal.stopLoss = this.calculateStopLoss(currentPrice, tradeSignal.action)
      tradeSignal.takeProfit = this.calculateTakeProfit(currentPrice, tradeSignal.action)

      return tradeSignal

    } catch (error) {
      logger.error(`Bollinger Bands Strategy error: ${error}`)
      return { action: 'HOLD', confidence: 0, reason: `Analysis error: ${error}`, riskScore: 1.0 }
    }
  }

  private calculateConfidence(bandPosition: number, bandWidth: number, isSqueezing: boolean, action: string): number {
    let confidence = 0.5

    // Distance from center increases confidence
    const distanceFromCenter = Math.abs(bandPosition - 0.5)
    confidence += distanceFromCenter * 1.5

    // Wider bands (higher volatility) increase confidence for mean reversion
    confidence += Math.min(0.3, bandWidth * 5)

    // Squeeze conditions
    if (isSqueezing) {
      confidence *= 1.2 // Higher confidence during squeeze
    }

    // Extreme positions get higher confidence
    if (action === 'BUY' && bandPosition < 0.1) {
      confidence *= 1.3
    } else if (action === 'SELL' && bandPosition > 0.9) {
      confidence *= 1.3
    }

    return Math.min(0.95, Math.max(0.1, confidence))
  }

  private getVolumeConfirmation(volumes: number[]) {
    const recentVolumes = volumes.slice(-5)
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    const currentVolume = volumes[volumes.length - 1]
    
    return {
      confirmed: currentVolume > avgVolume * 1.2,
      ratio: currentVolume / avgVolume
    }
  }

  private calculateStopLoss(price: number, action: string): number {
    const multiplier = this.parameters.stopLossPercent / 100
    return action === 'BUY' ? price * (1 - multiplier) : price * (1 + multiplier)
  }

  private calculateTakeProfit(price: number, action: string): number {
    const multiplier = this.parameters.takeProfitPercent / 100
    return action === 'BUY' ? price * (1 + multiplier) : price * (1 - multiplier)
  }

  private calculateRiskScore(bandPosition: number, bandWidth: number, confidence: number): number {
    let riskScore = 0.5 // Base risk score
    
    // Lower risk for positions near band extremes (mean reversion strategy)
    const extremeDistance = Math.abs(bandPosition - 0.5)
    riskScore -= extremeDistance * 0.4
    
    // Higher risk during high volatility (wider bands)
    riskScore += Math.min(0.3, bandWidth * 3)
    
    // Lower risk for higher confidence signals
    riskScore -= (confidence - 0.5) * 0.3
    
    // Ensure risk score stays within bounds
    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  async backtest(historicalData: MarketData[]): Promise<BacktestResult> {
    // Implement backtesting logic
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
    return params.period > 0 && params.standardDeviations > 0
  }
}