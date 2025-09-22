import { TradingStrategy, TradeSignal, MarketData, BacktestResult } from '@/types/trading'
import { calculateSMA, calculateEMA } from '@/lib/utils/technicalIndicators'
import { logger } from '@/lib/utils/logger'

/**
 * Moving Average Crossover Strategy
 * Classic trend-following strategy using two moving averages
 */
export class MovingAverageCrossoverStrategy implements TradingStrategy {
  name = 'MA Crossover Strategy'
  type = 'MOVING_AVERAGE'
  description = 'Golden/Death cross strategy with trend confirmation'
  timeframe = '1h'
  
  parameters = {
    fastPeriod: 50,
    slowPeriod: 200,
    maType: 'SMA' as 'SMA' | 'EMA',
    trendConfirmationPeriod: 20,
    volumeConfirmation: true,
    minTrendStrength: 0.02,     // 2% minimum price difference
    stopLossPercent: 3.0,
    takeProfitPercent: 6.0,
    minConfidence: 0.5
  }

  constructor(customParams?: Partial<typeof MovingAverageCrossoverStrategy.prototype.parameters>) {
    if (customParams) {
      this.parameters = { ...this.parameters, ...customParams }
    }
  }

  async analyze(data: MarketData[]): Promise<TradeSignal> {
    try {
      if (data.length < this.parameters.slowPeriod + 10) {
        return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for MA crossover', riskScore: 0.5 }
      }

      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const prices = sortedData.map(d => d.close)
      const volumes = sortedData.map(d => d.volume)
      
      // Calculate moving averages
      const fastMA = this.parameters.maType === 'EMA' 
        ? calculateEMA(prices, this.parameters.fastPeriod)
        : calculateSMA(prices, this.parameters.fastPeriod)
      
      const slowMA = this.parameters.maType === 'EMA'
        ? calculateEMA(prices, this.parameters.slowPeriod)
        : calculateSMA(prices, this.parameters.slowPeriod)

      if (fastMA.length === 0 || slowMA.length === 0) {
        return { action: 'HOLD', confidence: 0, reason: 'Unable to calculate moving averages', riskScore: 0.5 }
      }

      const currentFastMA = fastMA[fastMA.length - 1]
      const currentSlowMA = slowMA[slowMA.length - 1]
      const previousFastMA = fastMA[fastMA.length - 2]
      const previousSlowMA = slowMA[slowMA.length - 2]
      
      const currentPrice = prices[prices.length - 1]

      let tradeSignal: TradeSignal

      // Golden Cross: Fast MA crosses above Slow MA (Bullish)
      if (currentFastMA > currentSlowMA && previousFastMA <= previousSlowMA) {
        const confidence = this.calculateCrossoverConfidence(currentFastMA, currentSlowMA, currentPrice, 'BUY')
        tradeSignal = {
          action: 'BUY',
          confidence,
          reason: `Golden Cross: ${this.parameters.maType}${this.parameters.fastPeriod}(${currentFastMA.toFixed(2)}) > ${this.parameters.maType}${this.parameters.slowPeriod}(${currentSlowMA.toFixed(2)})`,
          riskScore: this.calculateRiskScore(currentFastMA, currentSlowMA, currentPrice, confidence)
        }
      }
      // Death Cross: Fast MA crosses below Slow MA (Bearish)
      else if (currentFastMA < currentSlowMA && previousFastMA >= previousSlowMA) {
        const confidence = this.calculateCrossoverConfidence(currentFastMA, currentSlowMA, currentPrice, 'SELL')
        tradeSignal = {
          action: 'SELL',
          confidence,
          reason: `Death Cross: ${this.parameters.maType}${this.parameters.fastPeriod}(${currentFastMA.toFixed(2)}) < ${this.parameters.maType}${this.parameters.slowPeriod}(${currentSlowMA.toFixed(2)})`,
          riskScore: this.calculateRiskScore(currentFastMA, currentSlowMA, currentPrice, confidence)
        }
      }
      // Trend continuation signals
      else if (currentFastMA > currentSlowMA) {
        // Uptrend - look for pullbacks to fast MA
        const distanceFromFastMA = Math.abs(currentPrice - currentFastMA) / currentFastMA
        if (distanceFromFastMA < 0.01 && currentPrice > currentFastMA) {
          tradeSignal = {
            action: 'BUY',
            confidence: 0.6,
            reason: `Uptrend continuation: Price near fast MA support at ${currentFastMA.toFixed(2)}`,
            riskScore: this.calculateRiskScore(currentFastMA, currentSlowMA, currentPrice, 0.6)
          }
        } else {
          tradeSignal = { action: 'HOLD', confidence: 0.4, reason: 'In uptrend but no clear entry', riskScore: 0.3 }
        }
      } else {
        // Downtrend - look for rallies to fast MA
        const distanceFromFastMA = Math.abs(currentPrice - currentFastMA) / currentFastMA
        if (distanceFromFastMA < 0.01 && currentPrice < currentFastMA) {
          tradeSignal = {
            action: 'SELL',
            confidence: 0.6,
            reason: `Downtrend continuation: Price near fast MA resistance at ${currentFastMA.toFixed(2)}`,
            riskScore: this.calculateRiskScore(currentFastMA, currentSlowMA, currentPrice, 0.6)
          }
        } else {
          tradeSignal = { action: 'HOLD', confidence: 0.4, reason: 'In downtrend but no clear entry', riskScore: 0.3 }
        }
      }

      // Apply additional confirmations
      if (tradeSignal.action !== 'HOLD') {
        // Trend strength confirmation
        const trendStrength = this.getTrendStrength(currentFastMA, currentSlowMA)
        if (trendStrength < this.parameters.minTrendStrength) {
          tradeSignal.confidence *= 0.6
          tradeSignal.reason += ` | Weak trend`
        } else {
          tradeSignal.confidence *= 1.2
          tradeSignal.reason += ` | Strong trend`
        }

        // Volume confirmation
        if (this.parameters.volumeConfirmation) {
          const volumeConfirmation = this.getVolumeConfirmation(volumes)
          if (volumeConfirmation.confirmed) {
            tradeSignal.confidence *= 1.1
            tradeSignal.reason += ` | Volume confirmed`
          } else {
            tradeSignal.confidence *= 0.8
            tradeSignal.reason += ` | Low volume`
          }
        }

        // Price position relative to MAs
        const pricePosition = this.getPricePosition(currentPrice, currentFastMA, currentSlowMA)
        tradeSignal.confidence *= pricePosition.multiplier
        tradeSignal.reason += ` | ${pricePosition.description}`
      }

      // Apply minimum confidence threshold
      if (tradeSignal.confidence < this.parameters.minConfidence) {
        return { action: 'HOLD', confidence: 0, reason: `Low confidence: ${tradeSignal.confidence.toFixed(2)}`, riskScore: 0.2 }
      }

      // Add stop loss and take profit
      tradeSignal.stopLoss = this.calculateStopLoss(currentPrice, tradeSignal.action, currentFastMA)
      tradeSignal.takeProfit = this.calculateTakeProfit(currentPrice, tradeSignal.action)

      return tradeSignal

    } catch (error) {
      logger.error(`MA Crossover Strategy error: ${error}`)
      return { action: 'HOLD', confidence: 0, reason: `Analysis error: ${error}`, riskScore: 1.0 }
    }
  }

  private calculateCrossoverConfidence(fastMA: number, slowMA: number, price: number, action: string): number {
    let confidence = 0.7 // Base confidence for crossover

    // Separation between MAs increases confidence
    const separation = Math.abs(fastMA - slowMA) / slowMA
    confidence += Math.min(0.2, separation * 10)

    // Price alignment with signal
    if ((action === 'BUY' && price > fastMA) || (action === 'SELL' && price < fastMA)) {
      confidence += 0.1
    }

    return Math.min(0.95, confidence)
  }

  private getTrendStrength(fastMA: number, slowMA: number): number {
    return Math.abs(fastMA - slowMA) / slowMA
  }

  private getVolumeConfirmation(volumes: number[]) {
    const currentVolume = volumes[volumes.length - 1]
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    
    return {
      confirmed: currentVolume > avgVolume * 1.3,
      ratio: currentVolume / avgVolume
    }
  }

  private getPricePosition(price: number, fastMA: number, slowMA: number) {
    const aboveBothMAs = price > Math.max(fastMA, slowMA)
    const belowBothMAs = price < Math.min(fastMA, slowMA)
    
    if (aboveBothMAs) {
      return { multiplier: 1.1, description: 'Price above both MAs' }
    } else if (belowBothMAs) {
      return { multiplier: 1.1, description: 'Price below both MAs' }
    } else {
      return { multiplier: 0.9, description: 'Price between MAs' }
    }
  }

  private calculateStopLoss(price: number, action: string, fastMA: number): number {
    // Use MA as dynamic stop loss
    const staticStop = action === 'BUY' 
      ? price * (1 - this.parameters.stopLossPercent / 100)
      : price * (1 + this.parameters.stopLossPercent / 100)
    
    const dynamicStop = action === 'BUY' 
      ? Math.min(fastMA * 0.98, staticStop) // 2% below fast MA
      : Math.max(fastMA * 1.02, staticStop) // 2% above fast MA
    
    return dynamicStop
  }

  private calculateTakeProfit(price: number, action: string): number {
    const multiplier = this.parameters.takeProfitPercent / 100
    return action === 'BUY' ? price * (1 + multiplier) : price * (1 - multiplier)
  }

  private calculateRiskScore(fastMA: number, slowMA: number, price: number, confidence: number): number {
    let riskScore = 0.5 // Base risk score
    
    // Risk based on MA separation (closer = higher risk for false signals)
    const separation = Math.abs(fastMA - slowMA) / slowMA
    riskScore -= separation * 2
    
    // Risk based on price position relative to MAs
    const priceDeviation = Math.abs(price - fastMA) / fastMA
    riskScore += priceDeviation * 1.5
    
    // Lower risk for higher confidence signals
    riskScore -= (confidence - 0.5) * 0.3
    
    // Ensure risk score stays within bounds
    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  async backtest(historicalData: MarketData[]): Promise<BacktestResult> {
    // Implement comprehensive backtesting
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
    return params.fastPeriod < params.slowPeriod && params.fastPeriod > 0
  }
}
