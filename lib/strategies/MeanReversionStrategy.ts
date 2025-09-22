import { TradingStrategy, TradeSignal, MarketData, BacktestResult } from '@/types/trading'
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
      
      // Calculate z-score (price deviation from mean)
      const zScore = this.calculateZScore(prices, this.parameters.lookbackPeriod)
      
      // Calculate RSI for confirmation
      const rsiValues = calculateRSI(prices, this.parameters.rsiPeriod)
      const currentRSI = rsiValues[rsiValues.length - 1]
      
      // Volume analysis
      const volumeConfirmation = this.analyzeVolume(volumes)

      let tradeSignal: TradeSignal

      // Oversold condition: Price significantly below mean
      if (zScore <= -this.parameters.zScoreThreshold && currentRSI <= this.parameters.rsiOversold) {
        const confidence = this.calculateMeanReversionConfidence(zScore, currentRSI, volumeConfirmation, 'BUY')
        tradeSignal = {
          action: 'BUY',
          confidence,
          reason: `Mean reversion BUY: Z-score ${zScore.toFixed(2)}, RSI ${currentRSI.toFixed(1)}`,
          riskScore: this.calculateRiskScore(zScore, currentRSI, confidence)
        }
      }
      // Overbought condition: Price significantly above mean
      else if (zScore >= this.parameters.zScoreThreshold && currentRSI >= this.parameters.rsiOverbought) {
        const confidence = this.calculateMeanReversionConfidence(zScore, currentRSI, volumeConfirmation, 'SELL')
        tradeSignal = {
          action: 'SELL',
          confidence,
          reason: `Mean reversion SELL: Z-score ${zScore.toFixed(2)}, RSI ${currentRSI.toFixed(1)}`,
          riskScore: this.calculateRiskScore(zScore, currentRSI, confidence)
        }
      }
      // Partial signals (one indicator triggered)
      else if (Math.abs(zScore) >= this.parameters.zScoreThreshold * 0.8) {
        const action = zScore < 0 ? 'BUY' : 'SELL'
        tradeSignal = {
          action,
          confidence: 0.4,
          reason: `Weak mean reversion signal: Z-score ${zScore.toFixed(2)}, RSI ${currentRSI.toFixed(1)}`,
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
}