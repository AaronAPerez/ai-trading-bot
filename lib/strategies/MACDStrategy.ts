import { TradingStrategy, TradeSignal, MarketData, BacktestResult } from '@/types/trading'
import { calculateMACD, calculateEMA } from '@/lib/utils/technicalIndicators'
import { logger } from '@/lib/utils/logger'

/**
 * MACD (Moving Average Convergence Divergence) Strategy
 * Trend-following momentum indicator
 */
export class MACDStrategy implements TradingStrategy {
  name = 'MACD Strategy'
  type = 'MACD'
  description = 'MACD line crossovers with signal line and histogram analysis'
  timeframe = '1h'
  
  parameters = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    histogramThreshold: 0.1,
    trendFilterPeriod: 50,
    minConfidence: 0.3,
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0
  }

  constructor(customParams?: Partial<typeof MACDStrategy.prototype.parameters>) {
    if (customParams) {
      this.parameters = { ...this.parameters, ...customParams }
    }
  }

  async analyze(data: MarketData[]): Promise<TradeSignal> {
    try {
      if (data.length < 50) {
        return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for MACD analysis', riskScore: 0.5 }
      }

      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const prices = sortedData.map(d => d.close)
      
      // Calculate MACD
      const macdResult = this.calculateMACD(prices)
      if (!macdResult || macdResult.macd.length === 0) {
        return { action: 'HOLD', confidence: 0, reason: 'Unable to calculate MACD', riskScore: 0.5 }
      }

      const { macd, signal, histogram } = macdResult
      const currentMACD = macd[macd.length - 1]
      const currentSignal = signal[signal.length - 1]
      const currentHistogram = histogram[histogram.length - 1]
      const previousHistogram = histogram[histogram.length - 2]

      // MACD Signal Logic
      let tradeSignal: TradeSignal

      // Bullish: MACD line crosses above signal line
      if (currentMACD > currentSignal && macd[macd.length - 2] <= signal[signal.length - 2]) {
        const confidence = this.calculateConfidence(currentMACD, currentSignal, currentHistogram, 'BUY')
        tradeSignal = {
          action: 'BUY',
          confidence,
          reason: `MACD bullish crossover: MACD(${currentMACD.toFixed(3)}) > Signal(${currentSignal.toFixed(3)})`,
          riskScore: this.calculateRiskScore(currentMACD, currentSignal, currentHistogram, confidence)
        }
      }
      // Bearish: MACD line crosses below signal line
      else if (currentMACD < currentSignal && macd[macd.length - 2] >= signal[signal.length - 2]) {
        const confidence = this.calculateConfidence(currentMACD, currentSignal, currentHistogram, 'SELL')
        tradeSignal = {
          action: 'SELL',
          confidence,
          reason: `MACD bearish crossover: MACD(${currentMACD.toFixed(3)}) < Signal(${currentSignal.toFixed(3)})`,
          riskScore: this.calculateRiskScore(currentMACD, currentSignal, currentHistogram, confidence)
        }
      }
      // Histogram momentum
      else if (Math.abs(currentHistogram) > this.parameters.histogramThreshold) {
        if (currentHistogram > previousHistogram && currentHistogram > 0) {
          tradeSignal = {
            action: 'BUY',
            confidence: Math.min(0.7, Math.abs(currentHistogram) * 5),
            reason: `MACD histogram increasing momentum: ${currentHistogram.toFixed(3)}`,
            riskScore: Math.min(0.8, Math.abs(currentHistogram) * 3)
          }
        } else if (currentHistogram < previousHistogram && currentHistogram < 0) {
          tradeSignal = {
            action: 'SELL',
            confidence: Math.min(0.7, Math.abs(currentHistogram) * 5),
            reason: `MACD histogram decreasing momentum: ${currentHistogram.toFixed(3)}`,
            riskScore: Math.min(0.8, Math.abs(currentHistogram) * 3)
          }
        } else {
          tradeSignal = { action: 'HOLD', confidence: 0.5, reason: 'MACD mixed signals', riskScore: 0.4 }
        }
      } else {
        tradeSignal = { action: 'HOLD', confidence: 0.5, reason: 'MACD neutral zone', riskScore: 0.3 }
      }

      // Add trend filter
      const trendFilter = this.getTrendFilter(prices)
      if (trendFilter) {
        if ((tradeSignal.action === 'BUY' && !trendFilter.bullish) || 
            (tradeSignal.action === 'SELL' && trendFilter.bullish)) {
          tradeSignal.confidence *= 0.7 // Reduce confidence if against trend
          tradeSignal.reason += ` | Against trend`
        } else if (tradeSignal.action !== 'HOLD') {
          tradeSignal.confidence *= 1.2 // Increase confidence if with trend
          tradeSignal.reason += ` | With trend`
        }
      }

      // Apply minimum confidence threshold
      if (tradeSignal.confidence < this.parameters.minConfidence) {
        return { action: 'HOLD', confidence: 0, reason: `Low confidence: ${tradeSignal.confidence.toFixed(2)}`, riskScore: 0.2 }
      }

      const currentPrice = prices[prices.length - 1]
      tradeSignal.stopLoss = this.calculateStopLoss(currentPrice, tradeSignal.action)
      tradeSignal.takeProfit = this.calculateTakeProfit(currentPrice, tradeSignal.action)

      return tradeSignal

    } catch (error) {
      logger.error(`MACD Strategy error: ${error}`)
      return { action: 'HOLD', confidence: 0, reason: `Analysis error: ${error}`, riskScore: 1.0 }
    }
  }

  private calculateMACD(prices: number[]) {
    const fastEMA = calculateEMA(prices, this.parameters.fastPeriod)
    const slowEMA = calculateEMA(prices, this.parameters.slowPeriod)
    
    if (fastEMA.length === 0 || slowEMA.length === 0) return null

    const macd: number[] = []
    const minLength = Math.min(fastEMA.length, slowEMA.length)
    
    for (let i = 0; i < minLength; i++) {
      macd.push(fastEMA[fastEMA.length - minLength + i] - slowEMA[slowEMA.length - minLength + i])
    }
    
    const signal = calculateEMA(macd, this.parameters.signalPeriod)
    const histogram = macd.slice(-signal.length).map((m, i) => m - signal[i])
    
    return { macd, signal, histogram }
  }

  private calculateConfidence(macd: number, signal: number, histogram: number, action: string): number {
    const separation = Math.abs(macd - signal)
    const histogramStrength = Math.abs(histogram)
    
    let confidence = Math.min(0.9, separation * 10 + histogramStrength * 5)
    
    // Boost confidence for strong histogram
    if (Math.abs(histogram) > this.parameters.histogramThreshold) {
      confidence *= 1.1
    }
    
    return Math.max(0.1, confidence)
  }

  private getTrendFilter(prices: number[]) {
    if (prices.length < this.parameters.trendFilterPeriod) return null
    
    const sma = prices.slice(-this.parameters.trendFilterPeriod).reduce((a, b) => a + b, 0) / this.parameters.trendFilterPeriod
    const currentPrice = prices[prices.length - 1]
    
    return {
      bullish: currentPrice > sma,
      strength: Math.abs(currentPrice - sma) / sma
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

  private calculateRiskScore(macd: number, signal: number, histogram: number, confidence: number): number {
    let riskScore = 0.5 // Base risk score
    
    // Higher risk for weaker signals (smaller separation)
    const separation = Math.abs(macd - signal)
    riskScore -= separation * 2
    
    // Risk based on histogram strength
    const histogramStrength = Math.abs(histogram)
    riskScore -= histogramStrength * 1.5
    
    // Lower risk for higher confidence signals
    riskScore -= (confidence - 0.5) * 0.3
    
    // Ensure risk score stays within bounds
    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  async backtest(historicalData: MarketData[]): Promise<BacktestResult> {
    // Implement backtesting logic similar to RSI strategy
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
    return params.fastPeriod < params.slowPeriod && params.signalPeriod > 0
  }
}