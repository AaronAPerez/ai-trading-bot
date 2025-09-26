import { MarketData, TechnicalIndicators, TechnicalSignal } from '../../../types/trading'

interface TechnicalConfig {
  indicators: {
    sma: { enabled: boolean; periods: number[] }
    ema: { enabled: boolean; periods: number[] }
    rsi: { enabled: boolean; period: number; overbought: number; oversold: number }
    macd: { enabled: boolean; fast: number; slow: number; signal: number }
    bollinger: { enabled: boolean; period: number; standardDeviations: number }
    stochastic: { enabled: boolean; kPeriod: number; dPeriod: number }
    williams: { enabled: boolean; period: number }
    atr: { enabled: boolean; period: number }
    obv: { enabled: boolean }
    adx: { enabled: boolean; period: number }
  }
  weights: {
    trend: number
    momentum: number
    volatility: number
    volume: number
  }
}

interface IndicatorResult {
  name: string
  value: number
  signal: 'BUY' | 'SELL' | 'NEUTRAL'
  strength: number // 0-100
  confidence: number // 0-1
}

export class TechnicalAnalyzer {
  private config: TechnicalConfig
  private isInitialized = false

  constructor(config?: Partial<TechnicalConfig>) {
    this.config = {
      indicators: {
        sma: { enabled: true, periods: [20, 50, 200] },
        ema: { enabled: true, periods: [12, 26, 50] },
        rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
        bollinger: { enabled: true, period: 20, standardDeviations: 2 },
        stochastic: { enabled: true, kPeriod: 14, dPeriod: 3 },
        williams: { enabled: true, period: 14 },
        atr: { enabled: true, period: 14 },
        obv: { enabled: true },
        adx: { enabled: true, period: 14 }
      },
      weights: {
        trend: 0.35,
        momentum: 0.30,
        volatility: 0.20,
        volume: 0.15
      },
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('📊 Initializing Technical Analyzer...')
    
    // Validate configuration
    this.validateConfig()
    
    this.isInitialized = true
    console.log('✅ Technical Analyzer initialized successfully')
  }

  async analyze(marketData: MarketData[]): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (marketData.length < 50) {
      console.warn(`⚠️ Insufficient data for technical analysis: ${marketData.length} bars`)
      return 50 // Neutral score
    }

    try {
      const indicators = await this.calculateAllIndicators(marketData)
      const signals = this.generateSignals(indicators, marketData)
      const compositeScore = this.calculateCompositeScore(signals)
      
      return Math.max(0, Math.min(100, compositeScore))
    } catch (error) {
      console.error('❌ Technical analysis failed:', error.message)
      return 50 // Neutral fallback
    }
  }

  private async calculateAllIndicators(marketData: MarketData[]): Promise<TechnicalIndicators> {
    const indicators: TechnicalIndicators = {}

    // Calculate trend indicators
    if (this.config.indicators.sma.enabled) {
      indicators.sma = this.calculateSMA(marketData, this.config.indicators.sma.periods)
    }

    if (this.config.indicators.ema.enabled) {
      indicators.ema = this.calculateEMA(marketData, this.config.indicators.ema.periods)
    }

    // Calculate momentum indicators
    if (this.config.indicators.rsi.enabled) {
      indicators.rsi = this.calculateRSI(marketData, this.config.indicators.rsi.period)
    }

    if (this.config.indicators.macd.enabled) {
      indicators.macd = this.calculateMACD(marketData, 
        this.config.indicators.macd.fast,
        this.config.indicators.macd.slow,
        this.config.indicators.macd.signal
      )
    }

    if (this.config.indicators.stochastic.enabled) {
      indicators.stochastic = this.calculateStochastic(marketData,
        this.config.indicators.stochastic.kPeriod,
        this.config.indicators.stochastic.dPeriod
      )
    }

    if (this.config.indicators.williams.enabled) {
      indicators.williamsR = this.calculateWilliamsR(marketData, this.config.indicators.williams.period)
    }

    // Calculate volatility indicators
    if (this.config.indicators.bollinger.enabled) {
      indicators.bollinger = this.calculateBollingerBands(marketData,
        this.config.indicators.bollinger.period,
        this.config.indicators.bollinger.standardDeviations
      )
    }

    if (this.config.indicators.atr.enabled) {
      indicators.atr = this.calculateATR(marketData, this.config.indicators.atr.period)
    }

    // Calculate volume indicators
    if (this.config.indicators.obv.enabled) {
      indicators.obv = this.calculateOBV(marketData)
    }

    // Calculate trend strength
    if (this.config.indicators.adx.enabled) {
      indicators.adx = this.calculateADX(marketData, this.config.indicators.adx.period)
    }

    return indicators
  }

  private generateSignals(indicators: TechnicalIndicators, marketData: MarketData[]): IndicatorResult[] {
    const signals: IndicatorResult[] = []
    const currentPrice = marketData[marketData.length - 1].close
    const previousPrice = marketData[marketData.length - 2]?.close || currentPrice

    // SMA Signals
    if (indicators.sma) {
      for (const period of this.config.indicators.sma.periods) {
        const smaValue = indicators.sma[period]
        if (smaValue) {
          const signal = currentPrice > smaValue ? 'BUY' : currentPrice < smaValue ? 'SELL' : 'NEUTRAL'
          const strength = Math.abs((currentPrice - smaValue) / smaValue * 100) * 10
          signals.push({
            name: `SMA${period}`,
            value: smaValue,
            signal,
            strength: Math.min(100, strength),
            confidence: period === 20 ? 0.8 : period === 50 ? 0.9 : 0.7
          })
        }
      }
    }

    // EMA Signals
    if (indicators.ema) {
      for (const period of this.config.indicators.ema.periods) {
        const emaValue = indicators.ema[period]
        if (emaValue) {
          const signal = currentPrice > emaValue ? 'BUY' : currentPrice < emaValue ? 'SELL' : 'NEUTRAL'
          const strength = Math.abs((currentPrice - emaValue) / emaValue * 100) * 10
          signals.push({
            name: `EMA${period}`,
            value: emaValue,
            signal,
            strength: Math.min(100, strength),
            confidence: 0.85
          })
        }
      }
    }

    // RSI Signals
    if (indicators.rsi) {
      const rsi = indicators.rsi
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL'
      let strength = 0

      if (rsi < this.config.indicators.rsi.oversold) {
        signal = 'BUY'
        strength = (this.config.indicators.rsi.oversold - rsi) / this.config.indicators.rsi.oversold * 100
      } else if (rsi > this.config.indicators.rsi.overbought) {
        signal = 'SELL'
        strength = (rsi - this.config.indicators.rsi.overbought) / (100 - this.config.indicators.rsi.overbought) * 100
      } else {
        strength = Math.abs(50 - rsi) / 50 * 100
      }

      signals.push({
        name: 'RSI',
        value: rsi,
        signal,
        strength: Math.min(100, strength),
        confidence: 0.7
      })
    }

    // MACD Signals
    if (indicators.macd) {
      const macd = indicators.macd
      const signal = macd.histogram > 0 ? 'BUY' : macd.histogram < 0 ? 'SELL' : 'NEUTRAL'
      const strength = Math.abs(macd.histogram) * 100

      signals.push({
        name: 'MACD',
        value: macd.macd,
        signal,
        strength: Math.min(100, strength),
        confidence: 0.75
      })
    }

    // Bollinger Bands Signals
    if (indicators.bollinger) {
      const bb = indicators.bollinger
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL'
      let strength = 0

      if (currentPrice <= bb.lower) {
        signal = 'BUY'
        strength = (bb.lower - currentPrice) / bb.lower * 100
      } else if (currentPrice >= bb.upper) {
        signal = 'SELL'
        strength = (currentPrice - bb.upper) / bb.upper * 100
      } else {
        // Position within bands
        const position = (currentPrice - bb.lower) / (bb.upper - bb.lower)
        strength = Math.abs(0.5 - position) * 200 // 0-100 scale
      }

      signals.push({
        name: 'BollingerBands',
        value: (currentPrice - bb.middle) / bb.middle,
        signal,
        strength: Math.min(100, strength * 100),
        confidence: 0.65
      })
    }

    // Stochastic Signals
    if (indicators.stochastic) {
      const stoch = indicators.stochastic
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL'

      if (stoch.k < 20 && stoch.d < 20) {
        signal = 'BUY'
      } else if (stoch.k > 80 && stoch.d > 80) {
        signal = 'SELL'
      }

      signals.push({
        name: 'Stochastic',
        value: stoch.k,
        signal,
        strength: Math.abs(50 - stoch.k),
        confidence: 0.6
      })
    }

    // Williams %R Signals
    if (indicators.williamsR) {
      const wr = indicators.williamsR
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL'

      if (wr < -80) {
        signal = 'BUY'
      } else if (wr > -20) {
        signal = 'SELL'
      }

      signals.push({
        name: 'WilliamsR',
        value: wr,
        signal,
        strength: Math.abs(wr + 50),
        confidence: 0.55
      })
    }

    return signals
  }

  private calculateCompositeScore(signals: IndicatorResult[]): number {
    if (signals.length === 0) return 50

    let trendScore = 0
    let momentumScore = 0
    let volatilityScore = 0
    let volumeScore = 0
    
    let trendCount = 0
    let momentumCount = 0
    let volatilityCount = 0
    let volumeCount = 0

    // Categorize and weight signals
    for (const signal of signals) {
      const weightedScore = this.getWeightedSignalScore(signal)

      if (this.isTrendIndicator(signal.name)) {
        trendScore += weightedScore
        trendCount++
      } else if (this.isMomentumIndicator(signal.name)) {
        momentumScore += weightedScore
        momentumCount++
      } else if (this.isVolatilityIndicator(signal.name)) {
        volatilityScore += weightedScore
        volatilityCount++
      } else if (this.isVolumeIndicator(signal.name)) {
        volumeScore += weightedScore
        volumeCount++
      }
    }

    // Calculate category averages
    const avgTrend = trendCount > 0 ? trendScore / trendCount : 50
    const avgMomentum = momentumCount > 0 ? momentumScore / momentumCount : 50
    const avgVolatility = volatilityCount > 0 ? volatilityScore / volatilityCount : 50
    const avgVolume = volumeCount > 0 ? volumeScore / volumeCount : 50

    // Apply category weights
    const compositeScore = (
      avgTrend * this.config.weights.trend +
      avgMomentum * this.config.weights.momentum +
      avgVolatility * this.config.weights.volatility +
      avgVolume * this.config.weights.volume
    )

    return compositeScore
  }

  private getWeightedSignalScore(signal: IndicatorResult): number {
    let baseScore = 50 // Neutral baseline

    if (signal.signal === 'BUY') {
      baseScore = 50 + (signal.strength * signal.confidence * 0.5)
    } else if (signal.signal === 'SELL') {
      baseScore = 50 - (signal.strength * signal.confidence * 0.5)
    }

    return Math.max(0, Math.min(100, baseScore))
  }

  private isTrendIndicator(name: string): boolean {
    return name.startsWith('SMA') || name.startsWith('EMA') || name === 'ADX'
  }

  private isMomentumIndicator(name: string): boolean {
    return ['RSI', 'MACD', 'Stochastic', 'WilliamsR'].includes(name)
  }

  private isVolatilityIndicator(name: string): boolean {
    return ['BollingerBands', 'ATR'].includes(name)
  }

  private isVolumeIndicator(name: string): boolean {
    return ['OBV'].includes(name)
  }

  // Technical Indicator Calculations

  private calculateSMA(marketData: MarketData[], periods: number[]): Record<number, number> {
    const smaValues: Record<number, number> = {}
    
    for (const period of periods) {
      if (marketData.length >= period) {
        const recentPrices = marketData.slice(-period).map(d => d.close)
        smaValues[period] = recentPrices.reduce((sum, price) => sum + price, 0) / period
      }
    }
    
    return smaValues
  }

  private calculateEMA(marketData: MarketData[], periods: number[]): Record<number, number> {
    const emaValues: Record<number, number> = {}
    
    for (const period of periods) {
      if (marketData.length >= period * 2) { // Need more data for EMA
        const multiplier = 2 / (period + 1)
        let ema = marketData[marketData.length - period].close // Start with SMA
        
        for (let i = marketData.length - period + 1; i < marketData.length; i++) {
          ema = (marketData[i].close * multiplier) + (ema * (1 - multiplier))
        }
        
        emaValues[period] = ema
      }
    }
    
    return emaValues
  }

  private calculateRSI(marketData: MarketData[], period: number): number | null {
    if (marketData.length < period + 1) return null

    let gains = 0
    let losses = 0

    // Calculate initial average gain and loss
    for (let i = marketData.length - period; i < marketData.length; i++) {
      const change = marketData[i].close - marketData[i - 1].close
      if (change > 0) {
        gains += change
      } else {
        losses += Math.abs(change)
      }
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))
    
    return rsi
  }

  private calculateMACD(marketData: MarketData[], fastPeriod: number, slowPeriod: number, signalPeriod: number): any | null {
    if (marketData.length < slowPeriod * 2) return null

    const emaFast = this.calculateEMA(marketData, [fastPeriod])[fastPeriod]
    const emaSlow = this.calculateEMA(marketData, [slowPeriod])[slowPeriod]
    
    if (!emaFast || !emaSlow) return null

    const macdLine = emaFast - emaSlow
    
    // For simplicity, using SMA for signal line instead of EMA
    const signalLine = macdLine // Simplified - should calculate EMA of MACD line
    const histogram = macdLine - signalLine

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    }
  }

  private calculateBollingerBands(marketData: MarketData[], period: number, standardDeviations: number): any | null {
    if (marketData.length < period) return null

    const recentPrices = marketData.slice(-period).map(d => d.close)
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period
    
    // Calculate standard deviation
    const squaredDifferences = recentPrices.map(price => Math.pow(price - sma, 2))
    const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / period
    const stdDev = Math.sqrt(variance)
    
    return {
      upper: sma + (stdDev * standardDeviations),
      middle: sma,
      lower: sma - (stdDev * standardDeviations)
    }
  }

  private calculateStochastic(marketData: MarketData[], kPeriod: number, dPeriod: number): any | null {
    if (marketData.length < kPeriod) return null

    const recentData = marketData.slice(-kPeriod)
    const currentClose = marketData[marketData.length - 1].close
    
    const highestHigh = Math.max(...recentData.map(d => d.high))
    const lowestLow = Math.min(...recentData.map(d => d.low))
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
    
    // Simplified D calculation (should be SMA of K values)
    const d = k // Simplified - should calculate SMA of recent K values
    
    return { k, d }
  }

  private calculateWilliamsR(marketData: MarketData[], period: number): number | null {
    if (marketData.length < period) return null

    const recentData = marketData.slice(-period)
    const currentClose = marketData[marketData.length - 1].close
    
    const highestHigh = Math.max(...recentData.map(d => d.high))
    const lowestLow = Math.min(...recentData.map(d => d.low))
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100
    
    return williamsR
  }

  private calculateATR(marketData: MarketData[], period: number): number | null {
    if (marketData.length < period + 1) return null

    const trueRanges: number[] = []
    
    for (let i = marketData.length - period; i < marketData.length; i++) {
      const high = marketData[i].high
      const low = marketData[i].low
      const previousClose = marketData[i - 1]?.close || marketData[i].close
      
      const tr1 = high - low
      const tr2 = Math.abs(high - previousClose)
      const tr3 = Math.abs(low - previousClose)
      
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
    
    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length
  }

  private calculateOBV(marketData: MarketData[]): number | null {
    if (marketData.length < 2) return null

    let obv = 0
    
    for (let i = 1; i < marketData.length; i++) {
      const currentClose = marketData[i].close
      const previousClose = marketData[i - 1].close
      const volume = marketData[i].volume
      
      if (currentClose > previousClose) {
        obv += volume
      } else if (currentClose < previousClose) {
        obv -= volume
      }
      // No change in OBV if prices are equal
    }
    
    return obv
  }

  private calculateADX(marketData: MarketData[], period: number): number | null {
    if (marketData.length < period * 2) return null

    // Simplified ADX calculation
    let totalDX = 0
    let count = 0
    
    for (let i = marketData.length - period; i < marketData.length; i++) {
      if (i === 0) continue
      
      const current = marketData[i]
      const previous = marketData[i - 1]
      
      const highDiff = current.high - previous.high
      const lowDiff = previous.low - current.low
      
      const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0
      const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
      
      if (tr > 0) {
        const plusDI = (plusDM / tr) * 100
        const minusDI = (minusDM / tr) * 100
        const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
        
        if (!isNaN(dx) && isFinite(dx)) {
          totalDX += dx
          count++
        }
      }
    }
    
    return count > 0 ? totalDX / count : 0
  }

  private validateConfig(): void {
    // Ensure weights sum to 1
    const totalWeight = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0)
    if (Math.abs(totalWeight - 1) > 0.01) {
      console.warn('⚠️ Technical analyzer weights do not sum to 1, normalizing...')
      const factor = 1 / totalWeight
      for (const key in this.config.weights) {
        this.config.weights[key as keyof typeof this.config.weights] *= factor
      }
    }
  }

  // Public methods for monitoring and configuration

  public getDetailedAnalysis(marketData: MarketData[]): Promise<{
    score: number
    indicators: TechnicalIndicators
    signals: IndicatorResult[]
    summary: {
      trend: string
      momentum: string
      volatility: string
      volume: string
    }
  }> {
    return new Promise(async (resolve) => {
      if (!this.isInitialized) await this.initialize()
      
      const indicators = await this.calculateAllIndicators(marketData)
      const signals = this.generateSignals(indicators, marketData)
      const score = this.calculateCompositeScore(signals)
      
      const summary = {
        trend: this.getSignalSummary(signals.filter(s => this.isTrendIndicator(s.name))),
        momentum: this.getSignalSummary(signals.filter(s => this.isMomentumIndicator(s.name))),
        volatility: this.getSignalSummary(signals.filter(s => this.isVolatilityIndicator(s.name))),
        volume: this.getSignalSummary(signals.filter(s => this.isVolumeIndicator(s.name)))
      }
      
      resolve({ score, indicators, signals, summary })
    })
  }

  private getSignalSummary(signals: IndicatorResult[]): string {
    if (signals.length === 0) return 'NEUTRAL'
    
    const buyCount = signals.filter(s => s.signal === 'BUY').length
    const sellCount = signals.filter(s => s.signal === 'SELL').length
    const neutralCount = signals.filter(s => s.signal === 'NEUTRAL').length
    
    if (buyCount > sellCount + neutralCount) return 'BULLISH'
    if (sellCount > buyCount + neutralCount) return 'BEARISH'
    return 'NEUTRAL'
  }

  public updateConfig(newConfig: Partial<TechnicalConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.validateConfig()
    console.log('⚙️ Technical analyzer config updated')
  }

  public getSupportedIndicators(): string[] {
    return [
      'SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands',
      'Stochastic', 'Williams %R', 'ATR', 'OBV', 'ADX'
    ]
  }

  public isReady(): boolean {
    return this.isInitialized
  }
}