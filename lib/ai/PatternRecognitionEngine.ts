import { MarketData } from '@/types/trading'
import { tradingStorage } from '@/lib/database/tradingStorage'

interface TechnicalPattern {
  name: string
  type: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  timeframe: number
  characteristics: Record<string, number>
  historicalAccuracy: number
}

interface PatternMatch {
  pattern: TechnicalPattern
  matchScore: number
  priceTarget: number
  stopLoss: number
  timeHorizon: number
  reasoning: string[]
}

interface CandlestickPattern {
  name: string
  type: 'reversal' | 'continuation'
  bullish: boolean
  minCandles: number
  maxCandles: number
}

export class PatternRecognitionEngine {
  private learnedPatterns: Map<string, TechnicalPattern[]> = new Map()
  private candlestickPatterns: CandlestickPattern[] = []

  constructor() {
    this.initializeCandlestickPatterns()
  }

  async analyzePatterns(marketData: MarketData[], symbol: string): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = []

    try {
      // Analyze candlestick patterns
      const candlestickMatches = this.analyzeCandlestickPatterns(marketData)
      patterns.push(...candlestickMatches)

      // Analyze technical patterns
      const technicalMatches = await this.analyzeTechnicalPatterns(marketData, symbol)
      patterns.push(...technicalMatches)

      // Analyze learned patterns from historical data
      const learnedMatches = await this.analyzeLearnedPatterns(marketData, symbol)
      patterns.push(...learnedMatches)

      // Sort by confidence and return top patterns
      return patterns
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5)

    } catch (error) {
      console.error('Error analyzing patterns:', error)
      return []
    }
  }

  async learnFromTradeOutcomes(userId: string): Promise<void> {
    try {
      const learningData = await tradingStorage.getAILearningData(userId)

      // Group by symbol
      const symbolData = new Map<string, any[]>()
      for (const data of learningData) {
        if (!symbolData.has(data.symbol)) {
          symbolData.set(data.symbol, [])
        }
        symbolData.get(data.symbol)?.push(data)
      }

      // Analyze patterns for each symbol
      for (const [symbol, data] of symbolData) {
        await this.extractSuccessfulPatterns(symbol, data)
      }

    } catch (error) {
      console.error('Error learning from trade outcomes:', error)
    }
  }

  private initializeCandlestickPatterns(): void {
    this.candlestickPatterns = [
      { name: 'Hammer', type: 'reversal', bullish: true, minCandles: 1, maxCandles: 1 },
      { name: 'Doji', type: 'reversal', bullish: false, minCandles: 1, maxCandles: 1 },
      { name: 'Engulfing Bullish', type: 'reversal', bullish: true, minCandles: 2, maxCandles: 2 },
      { name: 'Engulfing Bearish', type: 'reversal', bullish: false, minCandles: 2, maxCandles: 2 },
      { name: 'Morning Star', type: 'reversal', bullish: true, minCandles: 3, maxCandles: 3 },
      { name: 'Evening Star', type: 'reversal', bullish: false, minCandles: 3, maxCandles: 3 },
      { name: 'Three White Soldiers', type: 'continuation', bullish: true, minCandles: 3, maxCandles: 3 },
      { name: 'Three Black Crows', type: 'continuation', bullish: false, minCandles: 3, maxCandles: 3 }
    ]
  }

  private analyzeCandlestickPatterns(marketData: MarketData[]): PatternMatch[] {
    const patterns: PatternMatch[] = []
    const candles = marketData.slice(-10) // Analyze last 10 candles

    for (const pattern of this.candlestickPatterns) {
      const match = this.matchCandlestickPattern(candles, pattern)
      if (match) {
        patterns.push(match)
      }
    }

    return patterns
  }

  private matchCandlestickPattern(candles: MarketData[], pattern: CandlestickPattern): PatternMatch | null {
    if (candles.length < pattern.minCandles) return null

    const relevantCandles = candles.slice(-pattern.maxCandles)
    let matchScore = 0

    switch (pattern.name) {
      case 'Hammer':
        matchScore = this.identifyHammer(relevantCandles[0])
        break
      case 'Doji':
        matchScore = this.identifyDoji(relevantCandles[0])
        break
      case 'Engulfing Bullish':
        matchScore = this.identifyBullishEngulfing(relevantCandles)
        break
      case 'Engulfing Bearish':
        matchScore = this.identifyBearishEngulfing(relevantCandles)
        break
      case 'Morning Star':
        matchScore = this.identifyMorningStar(relevantCandles)
        break
      case 'Evening Star':
        matchScore = this.identifyEveningStar(relevantCandles)
        break
      default:
        matchScore = 0
    }

    if (matchScore > 0.6) {
      const currentPrice = candles[candles.length - 1].close
      const volatility = this.calculateVolatility(candles.slice(-20))

      return {
        pattern: {
          name: pattern.name,
          type: pattern.bullish ? 'bullish' : 'bearish',
          confidence: matchScore,
          timeframe: pattern.maxCandles,
          characteristics: { candlestick: 1 },
          historicalAccuracy: 0.65 // Default accuracy
        },
        matchScore,
        priceTarget: pattern.bullish
          ? currentPrice * (1 + volatility * 2)
          : currentPrice * (1 - volatility * 2),
        stopLoss: pattern.bullish
          ? currentPrice * (1 - volatility)
          : currentPrice * (1 + volatility),
        timeHorizon: pattern.maxCandles * 4, // hours
        reasoning: [`${pattern.name} pattern detected with ${(matchScore * 100).toFixed(1)}% confidence`]
      }
    }

    return null
  }

  private async analyzeTechnicalPatterns(marketData: MarketData[], symbol: string): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = []

    // Support and Resistance
    const srPattern = this.identifySupportResistance(marketData)
    if (srPattern) patterns.push(srPattern)

    // Trend Channels
    const channelPattern = this.identifyTrendChannel(marketData)
    if (channelPattern) patterns.push(channelPattern)

    // Triangle Patterns
    const trianglePattern = this.identifyTrianglePattern(marketData)
    if (trianglePattern) patterns.push(trianglePattern)

    // Head and Shoulders
    const hsPattern = this.identifyHeadAndShoulders(marketData)
    if (hsPattern) patterns.push(hsPattern)

    return patterns
  }

  private async analyzeLearnedPatterns(marketData: MarketData[], symbol: string): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = []
    const learnedForSymbol = this.learnedPatterns.get(symbol) || []

    for (const pattern of learnedForSymbol) {
      const match = this.matchLearnedPattern(marketData, pattern)
      if (match) {
        patterns.push(match)
      }
    }

    return patterns
  }

  private async extractSuccessfulPatterns(symbol: string, tradeData: any[]): Promise<void> {
    const successfulTrades = tradeData.filter(t => t.outcome === 'profit' && t.confidence_score > 0.7)

    if (successfulTrades.length < 5) return

    // Extract common characteristics from successful trades
    const patterns: TechnicalPattern[] = []

    // Group by similar market conditions
    const conditionGroups = this.groupByMarketConditions(successfulTrades)

    for (const [conditionKey, trades] of conditionGroups) {
      if (trades.length >= 3) {
        const pattern = this.createPatternFromTrades(conditionKey, trades)
        patterns.push(pattern)
      }
    }

    this.learnedPatterns.set(symbol, patterns)
  }

  private groupByMarketConditions(trades: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()

    for (const trade of trades) {
      const conditions = trade.market_conditions.entry
      const key = this.createConditionKey(conditions)

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)?.push(trade)
    }

    return groups
  }

  private createConditionKey(conditions: any): string {
    return [
      Math.round((conditions.price_momentum || 0) * 10) / 10,
      Math.round((conditions.volatility || 0) * 10) / 10,
      Math.round((conditions.volume_trend || 0) * 10) / 10,
      conditions.market_regime || 'unknown'
    ].join('|')
  }

  private createPatternFromTrades(conditionKey: string, trades: any[]): TechnicalPattern {
    const avgConfidence = trades.reduce((sum, t) => sum + t.confidence_score, 0) / trades.length
    const successRate = trades.filter(t => t.outcome === 'profit').length / trades.length

    return {
      name: `Learned Pattern ${conditionKey}`,
      type: this.determinePatternType(trades),
      confidence: avgConfidence,
      timeframe: this.calculateAvgTimeframe(trades),
      characteristics: this.extractCharacteristics(trades),
      historicalAccuracy: successRate
    }
  }

  private determinePatternType(trades: any[]): 'bullish' | 'bearish' | 'neutral' {
    const avgPnL = trades.reduce((sum, t) => sum + t.profit_loss, 0) / trades.length
    return avgPnL > 0 ? 'bullish' : avgPnL < 0 ? 'bearish' : 'neutral'
  }

  private calculateAvgTimeframe(trades: any[]): number {
    const durations = trades.map(t => t.market_conditions.trade_duration_hours || 24)
    return durations.reduce((sum, d) => sum + d, 0) / durations.length
  }

  private extractCharacteristics(trades: any[]): Record<string, number> {
    const characteristics: Record<string, number> = {}

    // Average technical indicators
    const indicators = ['rsi', 'macd', 'bollinger_position', 'volume_sma_ratio']

    for (const indicator of indicators) {
      const values = trades.map(t => t.technical_indicators[indicator] || 0)
      characteristics[indicator] = values.reduce((sum, v) => sum + v, 0) / values.length
    }

    return characteristics
  }

  private matchLearnedPattern(marketData: MarketData[], pattern: TechnicalPattern): PatternMatch | null {
    const currentConditions = this.extractCurrentConditions(marketData)
    const similarity = this.calculateSimilarity(currentConditions, pattern.characteristics)

    if (similarity > 0.7) {
      const currentPrice = marketData[marketData.length - 1].close
      const volatility = this.calculateVolatility(marketData.slice(-20))

      return {
        pattern,
        matchScore: similarity * pattern.historicalAccuracy,
        priceTarget: pattern.type === 'bullish'
          ? currentPrice * (1 + volatility * 1.5)
          : currentPrice * (1 - volatility * 1.5),
        stopLoss: pattern.type === 'bullish'
          ? currentPrice * (1 - volatility * 0.5)
          : currentPrice * (1 + volatility * 0.5),
        timeHorizon: pattern.timeframe,
        reasoning: [
          `Learned pattern matched with ${(similarity * 100).toFixed(1)}% similarity`,
          `Historical accuracy: ${(pattern.historicalAccuracy * 100).toFixed(1)}%`
        ]
      }
    }

    return null
  }

  private extractCurrentConditions(marketData: MarketData[]): Record<string, number> {
    const prices = marketData.map(d => d.close)
    return {
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      bollinger_position: this.calculateBollingerPosition(prices),
      volume_sma_ratio: this.calculateVolumeSMA(marketData)
    }
  }

  private calculateSimilarity(current: Record<string, number>, pattern: Record<string, number>): number {
    const keys = Object.keys(pattern)
    let totalSimilarity = 0

    for (const key of keys) {
      const currentValue = current[key] || 0
      const patternValue = pattern[key] || 0
      const difference = Math.abs(currentValue - patternValue)
      const maxValue = Math.max(Math.abs(currentValue), Math.abs(patternValue), 1)
      const similarity = 1 - (difference / maxValue)
      totalSimilarity += Math.max(0, similarity)
    }

    return totalSimilarity / keys.length
  }

  // Technical analysis helper methods
  private identifyHammer(candle: MarketData): number {
    const bodySize = Math.abs(candle.close - candle.open)
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low
    const upperShadow = candle.high - Math.max(candle.open, candle.close)
    const totalSize = candle.high - candle.low

    if (totalSize === 0) return 0

    const bodyRatio = bodySize / totalSize
    const lowerShadowRatio = lowerShadow / totalSize

    if (lowerShadowRatio > 0.6 && bodyRatio < 0.3 && upperShadow < bodySize) {
      return 0.8
    }

    return 0
  }

  private identifyDoji(candle: MarketData): number {
    const bodySize = Math.abs(candle.close - candle.open)
    const totalSize = candle.high - candle.low

    if (totalSize === 0) return 0

    const bodyRatio = bodySize / totalSize
    return bodyRatio < 0.1 ? 0.7 : 0
  }

  private identifyBullishEngulfing(candles: MarketData[]): number {
    if (candles.length < 2) return 0

    const [prev, curr] = candles.slice(-2)

    const prevBearish = prev.close < prev.open
    const currBullish = curr.close > curr.open
    const engulfs = curr.close > prev.open && curr.open < prev.close

    return prevBearish && currBullish && engulfs ? 0.75 : 0
  }

  private identifyBearishEngulfing(candles: MarketData[]): number {
    if (candles.length < 2) return 0

    const [prev, curr] = candles.slice(-2)

    const prevBullish = prev.close > prev.open
    const currBearish = curr.close < curr.open
    const engulfs = curr.close < prev.open && curr.open > prev.close

    return prevBullish && currBearish && engulfs ? 0.75 : 0
  }

  private identifyMorningStar(candles: MarketData[]): number {
    if (candles.length < 3) return 0

    const [first, second, third] = candles.slice(-3)

    const firstBearish = first.close < first.open
    const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.5
    const thirdBullish = third.close > third.open
    const gapDown = second.high < first.close
    const gapUp = third.open > second.high

    return firstBearish && secondSmall && thirdBullish && gapDown && gapUp ? 0.8 : 0
  }

  private identifyEveningStar(candles: MarketData[]): number {
    if (candles.length < 3) return 0

    const [first, second, third] = candles.slice(-3)

    const firstBullish = first.close > first.open
    const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.5
    const thirdBearish = third.close < third.open
    const gapUp = second.low > first.close
    const gapDown = third.open < second.low

    return firstBullish && secondSmall && thirdBearish && gapUp && gapDown ? 0.8 : 0
  }

  private identifySupportResistance(marketData: MarketData[]): PatternMatch | null {
    // Simplified support/resistance identification
    const prices = marketData.map(d => d.close)
    const currentPrice = prices[prices.length - 1]

    // Find recent highs and lows
    const highs = this.findLocalMaxima(prices, 5)
    const lows = this.findLocalMinima(prices, 5)

    // Check if current price is near support or resistance
    const nearSupport = lows.some(low => Math.abs(currentPrice - low) / currentPrice < 0.02)
    const nearResistance = highs.some(high => Math.abs(currentPrice - high) / currentPrice < 0.02)

    if (nearSupport || nearResistance) {
      const volatility = this.calculateVolatility(prices.slice(-20))

      return {
        pattern: {
          name: nearSupport ? 'Support Level' : 'Resistance Level',
          type: nearSupport ? 'bullish' : 'bearish',
          confidence: 0.7,
          timeframe: 24,
          characteristics: { support_resistance: 1 },
          historicalAccuracy: 0.6
        },
        matchScore: 0.7,
        priceTarget: nearSupport
          ? currentPrice * (1 + volatility * 2)
          : currentPrice * (1 - volatility * 2),
        stopLoss: nearSupport
          ? currentPrice * (1 - volatility * 0.5)
          : currentPrice * (1 + volatility * 0.5),
        timeHorizon: 24,
        reasoning: [`Price near ${nearSupport ? 'support' : 'resistance'} level`]
      }
    }

    return null
  }

  private identifyTrendChannel(marketData: MarketData[]): PatternMatch | null {
    // Simplified trend channel identification
    const prices = marketData.map(d => d.close)
    const trend = this.calculateTrend(prices.slice(-20))

    if (Math.abs(trend) > 0.02) {
      const currentPrice = prices[prices.length - 1]
      const volatility = this.calculateVolatility(prices.slice(-20))

      return {
        pattern: {
          name: 'Trend Channel',
          type: trend > 0 ? 'bullish' : 'bearish',
          confidence: Math.min(0.8, Math.abs(trend) * 10),
          timeframe: 48,
          characteristics: { trend_strength: trend },
          historicalAccuracy: 0.65
        },
        matchScore: Math.min(0.8, Math.abs(trend) * 10),
        priceTarget: currentPrice * (1 + trend * 2),
        stopLoss: currentPrice * (1 - Math.abs(trend)),
        timeHorizon: 48,
        reasoning: [`Strong ${trend > 0 ? 'upward' : 'downward'} trend channel detected`]
      }
    }

    return null
  }

  private identifyTrianglePattern(marketData: MarketData[]): PatternMatch | null {
    // Simplified triangle pattern detection
    if (marketData.length < 20) return null

    const highs = this.findLocalMaxima(marketData.map(d => d.high), 3)
    const lows = this.findLocalMinima(marketData.map(d => d.low), 3)

    if (highs.length >= 2 && lows.length >= 2) {
      const highTrend = this.calculateTrend(highs.slice(-3))
      const lowTrend = this.calculateTrend(lows.slice(-3))

      // Converging triangle
      if (highTrend < 0 && lowTrend > 0) {
        const currentPrice = marketData[marketData.length - 1].close
        const volatility = this.calculateVolatility(marketData.slice(-20).map(d => d.close))

        return {
          pattern: {
            name: 'Symmetrical Triangle',
            type: 'neutral',
            confidence: 0.6,
            timeframe: 36,
            characteristics: { triangle: 1 },
            historicalAccuracy: 0.55
          },
          matchScore: 0.6,
          priceTarget: currentPrice * (1 + volatility * 3), // Breakout target
          stopLoss: currentPrice * (1 - volatility),
          timeHorizon: 36,
          reasoning: ['Symmetrical triangle pattern - awaiting breakout']
        }
      }
    }

    return null
  }

  private identifyHeadAndShoulders(marketData: MarketData[]): PatternMatch | null {
    // Simplified head and shoulders detection
    if (marketData.length < 30) return null

    const highs = this.findLocalMaxima(marketData.map(d => d.high), 5)

    if (highs.length >= 3) {
      const recentHighs = highs.slice(-3)
      const [leftShoulder, head, rightShoulder] = recentHighs

      // Classic head and shoulders: middle peak higher than shoulders
      if (head > leftShoulder && head > rightShoulder &&
          Math.abs(leftShoulder - rightShoulder) / head < 0.05) {

        const currentPrice = marketData[marketData.length - 1].close
        const neckline = Math.min(leftShoulder, rightShoulder)

        if (currentPrice < neckline) {
          return {
            pattern: {
              name: 'Head and Shoulders',
              type: 'bearish',
              confidence: 0.75,
              timeframe: 72,
              characteristics: { head_shoulders: 1 },
              historicalAccuracy: 0.7
            },
            matchScore: 0.75,
            priceTarget: neckline - (head - neckline), // Target below neckline
            stopLoss: head,
            timeHorizon: 72,
            reasoning: ['Head and shoulders pattern completed with neckline break']
          }
        }
      }
    }

    return null
  }

  // Helper methods
  private findLocalMaxima(data: number[], window: number): number[] {
    const maxima: number[] = []

    for (let i = window; i < data.length - window; i++) {
      let isMaximum = true
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && data[j] >= data[i]) {
          isMaximum = false
          break
        }
      }
      if (isMaximum) {
        maxima.push(data[i])
      }
    }

    return maxima
  }

  private findLocalMinima(data: number[], window: number): number[] {
    const minima: number[] = []

    for (let i = window; i < data.length - window; i++) {
      let isMinimum = true
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && data[j] <= data[i]) {
          isMinimum = false
          break
        }
      }
      if (isMinimum) {
        minima.push(data[i])
      }
    }

    return minima
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0

    const n = prices.length
    const sumX = (n * (n - 1)) / 2
    const sumY = prices.reduce((sum, price) => sum + price, 0)
    const sumXY = prices.reduce((sum, price, i) => sum + i * price, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    return slope / prices[prices.length - 1] // Normalize by current price
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.02

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length

    return Math.sqrt(variance)
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50

    let gains = 0
    let losses = 0

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        gains += change
      } else {
        losses -= change
      }
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100

    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateMACD(prices: number[]): number {
    if (prices.length < 26) return 0

    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)

    return ema12 - ema26
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]

    const multiplier = 2 / (period + 1)
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }

    return ema
  }

  private calculateBollingerPosition(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0.5

    const recentPrices = prices.slice(-period)
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const stdDev = Math.sqrt(variance)

    const upperBand = sma + (2 * stdDev)
    const lowerBand = sma - (2 * stdDev)
    const currentPrice = prices[prices.length - 1]

    if (upperBand === lowerBand) return 0.5

    return (currentPrice - lowerBand) / (upperBand - lowerBand)
  }

  private calculateVolumeSMA(marketData: MarketData[], period: number = 20): number {
    if (marketData.length < period) return 1

    const recentData = marketData.slice(-period)
    const avgVolume = recentData.reduce((sum, data) => sum + data.volume, 0) / period
    const currentVolume = marketData[marketData.length - 1].volume

    return avgVolume > 0 ? currentVolume / avgVolume : 1
  }
}

export const patternRecognitionEngine = new PatternRecognitionEngine()