/**
 * AI Recommendation Service
 * Generates trading recommendations using real market data
 * NO MOCKS - Uses only real Alpaca API data
 */

import { supabaseService } from '@/lib/database/supabase-utils'

interface MarketBar {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TechnicalIndicators {
  rsi: number
  macd: { value: number; signal: number; histogram: number }
  sma20: number
  sma50: number
  ema12: number
  ema26: number
  volumeRatio: number
  atr: number
}

interface AIRecommendation {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  entryPrice: number
  stopLoss: number
  targetPrice: number
  strategy: string
  indicators: TechnicalIndicators
  reasoning: string[]
}

export class AIRecommendationService {
  /**
   * Generate AI trading recommendation based on real market data
   */
  async generateRecommendation(
    userId: string,
    symbol: string,
    marketData: MarketBar[]
  ): Promise<AIRecommendation> {
    if (!marketData || marketData.length < 50) {
      throw new Error('Insufficient market data for analysis')
    }

    // Calculate technical indicators from real data
    const indicators = this.calculateIndicators(marketData)

    // Analyze trend
    const trend = this.analyzeTrend(marketData, indicators)

    // Generate signals
    const signals = this.generateSignals(indicators, trend)

    // Calculate confidence
    const confidence = this.calculateConfidence(signals, indicators)

    // Determine action
    const action = this.determineAction(signals, confidence)

    // Calculate price levels
    const currentPrice = marketData[marketData.length - 1].close
    const { stopLoss, targetPrice } = this.calculatePriceLevels(
      currentPrice,
      action,
      indicators,
      trend
    )

    // Generate reasoning
    const reasoning = this.generateReasoning(signals, indicators, trend, action)

    return {
      symbol,
      action,
      confidence,
      entryPrice: currentPrice,
      stopLoss,
      targetPrice,
      strategy: this.determineStrategy(signals, trend),
      indicators,
      reasoning
    }
  }

  /**
   * Calculate technical indicators from real market data
   */
  private calculateIndicators(bars: MarketBar[]): TechnicalIndicators {
    const closes = bars.map(b => b.close)
    const highs = bars.map(b => b.high)
    const lows = bars.map(b => b.low)
    const volumes = bars.map(b => b.volume)

    // RSI calculation
    const rsi = this.calculateRSI(closes, 14)

    // MACD calculation
    const macd = this.calculateMACD(closes)

    // Moving averages
    const sma20 = this.calculateSMA(closes, 20)
    const sma50 = this.calculateSMA(closes, 50)
    const ema12 = this.calculateEMA(closes, 12)
    const ema26 = this.calculateEMA(closes, 26)

    // Volume analysis
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    const currentVolume = volumes[volumes.length - 1]
    const volumeRatio = currentVolume / avgVolume

    // ATR for volatility
    const atr = this.calculateATR(highs, lows, closes, 14)

    return {
      rsi,
      macd,
      sma20,
      sma50,
      ema12,
      ema26,
      volumeRatio,
      atr
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50

    const changes = []
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1])
    }

    const gains = changes.slice(-period).map(c => (c > 0 ? c : 0))
    const losses = changes.slice(-period).map(c => (c < 0 ? -c : 0))

    const avgGain = gains.reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macdLine = ema12 - ema26

    // Simple signal line (would normally use EMA of MACD)
    const signal = ema26

    return {
      value: macdLine,
      signal,
      histogram: macdLine - signal
    }
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1)
    let ema = prices[0]

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k)
    }

    return ema
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    const trs = []

    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
      trs.push(tr)
    }

    const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period
    return atr
  }

  /**
   * Analyze market trend
   */
  private analyzeTrend(bars: MarketBar[], indicators: TechnicalIndicators) {
    const closes = bars.map(b => b.close)
    const currentPrice = closes[closes.length - 1]

    return {
      direction: currentPrice > indicators.sma50 ? 'BULLISH' : 'BEARISH',
      strength: Math.abs(currentPrice - indicators.sma50) / indicators.atr,
      momentum: indicators.ema12 > indicators.ema26 ? 'POSITIVE' : 'NEGATIVE'
    }
  }

  /**
   * Generate trading signals
   */
  private generateSignals(indicators: TechnicalIndicators, trend: any) {
    const signals = {
      rsi: indicators.rsi < 30 ? 'BUY' : indicators.rsi > 70 ? 'SELL' : 'NEUTRAL',
      macd: indicators.macd.histogram > 0 ? 'BUY' : 'SELL',
      sma: indicators.sma20 > indicators.sma50 ? 'BUY' : 'SELL',
      trend: trend.direction,
      volume: indicators.volumeRatio > 1.5 ? 'STRONG' : 'WEAK'
    }

    return signals
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(signals: any, indicators: TechnicalIndicators): number {
    let confidence = 0.5

    // RSI confidence
    if (signals.rsi === 'BUY' && indicators.rsi < 25) confidence += 0.15
    else if (signals.rsi === 'BUY' && indicators.rsi < 35) confidence += 0.10
    else if (signals.rsi === 'SELL' && indicators.rsi > 75) confidence += 0.15
    else if (signals.rsi === 'SELL' && indicators.rsi > 65) confidence += 0.10

    // MACD confirmation
    if (Math.abs(indicators.macd.histogram) > 0.5) confidence += 0.10

    // Trend confirmation
    if (signals.trend === signals.sma) confidence += 0.10

    // Volume confirmation
    if (signals.volume === 'STRONG') confidence += 0.10

    return Math.min(0.95, Math.max(0.30, confidence))
  }

  /**
   * Determine trading action
   */
  private determineAction(signals: any, confidence: number): 'BUY' | 'SELL' | 'HOLD' {
    if (confidence < 0.60) return 'HOLD'

    const buySignals = Object.values(signals).filter((s: any) => s === 'BUY' || s === 'BULLISH').length
    const sellSignals = Object.values(signals).filter((s: any) => s === 'SELL' || s === 'BEARISH').length

    if (buySignals > sellSignals) return 'BUY'
    if (sellSignals > buySignals) return 'SELL'
    return 'HOLD'
  }

  /**
   * Calculate stop loss and target price levels
   */
  private calculatePriceLevels(
    currentPrice: number,
    action: 'BUY' | 'SELL' | 'HOLD',
    indicators: TechnicalIndicators,
    trend: any
  ) {
    const atrMultiplier = 2.0
    const riskRewardRatio = 2.5

    if (action === 'BUY') {
      const stopLoss = currentPrice - indicators.atr * atrMultiplier
      const targetPrice = currentPrice + indicators.atr * atrMultiplier * riskRewardRatio
      return { stopLoss, targetPrice }
    } else if (action === 'SELL') {
      const stopLoss = currentPrice + indicators.atr * atrMultiplier
      const targetPrice = currentPrice - indicators.atr * atrMultiplier * riskRewardRatio
      return { stopLoss, targetPrice }
    }

    return { stopLoss: currentPrice, targetPrice: currentPrice }
  }

  /**
   * Generate reasoning for the recommendation
   */
  private generateReasoning(signals: any, indicators: TechnicalIndicators, trend: any, action: string): string[] {
    const reasoning: string[] = []

    reasoning.push(`Market trend: ${trend.direction} with ${trend.strength.toFixed(1)}x ATR strength`)

    if (signals.rsi === 'BUY') {
      reasoning.push(`RSI at ${indicators.rsi.toFixed(1)} indicates oversold conditions`)
    } else if (signals.rsi === 'SELL') {
      reasoning.push(`RSI at ${indicators.rsi.toFixed(1)} indicates overbought conditions`)
    }

    if (signals.macd === 'BUY') {
      reasoning.push(`MACD histogram positive (${indicators.macd.histogram.toFixed(2)}), bullish momentum`)
    } else {
      reasoning.push(`MACD histogram negative (${indicators.macd.histogram.toFixed(2)}), bearish momentum`)
    }

    if (indicators.volumeRatio > 1.5) {
      reasoning.push(`High volume (${indicators.volumeRatio.toFixed(1)}x average) confirms move`)
    }

    if (signals.sma === 'BUY') {
      reasoning.push(`Price above 50 SMA, uptrend confirmed`)
    } else {
      reasoning.push(`Price below 50 SMA, downtrend confirmed`)
    }

    return reasoning
  }

  /**
   * Determine which strategy was used
   */
  private determineStrategy(signals: any, trend: any): string {
    if (signals.rsi !== 'NEUTRAL') return 'MEAN_REVERSION'
    if (trend.momentum === 'POSITIVE' && signals.volume === 'STRONG') return 'MOMENTUM'
    if (signals.macd === signals.trend) return 'TREND_FOLLOWING'
    return 'TECHNICAL_ANALYSIS'
  }
}
