/**
 * Technical Indicators Utilities
 */

export interface MACDResult {
  macd: number[]
  signal: number[]
  histogram: number[]
}

export interface BollingerBandsResult {
  upper: number[]
  middle: number[]
  lower: number[]
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export const calculateSMA = (prices: number[], period: number): number[] => {
  const result: number[] = []

  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / period)
  }

  return result
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export const calculateEMA = (prices: number[], period: number): number[] => {
  if (prices.length === 0 || period <= 0) return []

  const result: number[] = []
  const multiplier = 2 / (period + 1)

  // First EMA value is SMA
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(ema)

  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
    result.push(ema)
  }

  return result
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export const calculateMACD = (prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDResult => {
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)

  if (fastEMA.length === 0 || slowEMA.length === 0) {
    return { macd: [], signal: [], histogram: [] }
  }

  // Calculate MACD line
  const macd: number[] = []
  const minLength = Math.min(fastEMA.length, slowEMA.length)

  for (let i = 0; i < minLength; i++) {
    const fastValue = fastEMA[fastEMA.length - minLength + i]
    const slowValue = slowEMA[slowEMA.length - minLength + i]
    macd.push(fastValue - slowValue)
  }

  // Calculate signal line (EMA of MACD)
  const signal = calculateEMA(macd, signalPeriod)

  // Calculate histogram
  const histogram = macd.slice(-signal.length).map((m, i) => m - signal[i])

  return { macd, signal, histogram }
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export const calculateRSI = (prices: number[], period: number = 14): number[] => {
  if (prices.length < period + 1) return []

  const result: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  // Calculate initial gains and losses
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // Calculate first RSI using SMA
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  let rs = avgGain / avgLoss
  result.push(100 - (100 / (1 + rs)))

  // Calculate subsequent RSI values using EMA
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    rs = avgGain / avgLoss
    result.push(100 - (100 / (1 + rs)))
  }

  return result
}

/**
 * Calculate Bollinger Bands
 */
export const calculateBollingerBands = (prices: number[], period: number = 20, standardDeviations: number = 2): BollingerBandsResult => {
  const sma = calculateSMA(prices, period)
  const upper: number[] = []
  const middle: number[] = []
  const lower: number[] = []

  for (let i = 0; i < sma.length; i++) {
    const priceWindow = prices.slice(i, i + period)
    const mean = sma[i]

    // Calculate standard deviation
    const variance = priceWindow.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period
    const stdDev = Math.sqrt(variance)

    middle.push(mean)
    upper.push(mean + (standardDeviations * stdDev))
    lower.push(mean - (standardDeviations * stdDev))
  }

  return { upper, middle, lower }
}

/**
 * Calculate Stochastic Oscillator
 */
export const calculateStochastic = (highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3): { k: number[], d: number[] } => {
  const k: number[] = []
  const d: number[] = []

  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1))
    const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1))

    const kValue = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100
    k.push(kValue)
  }

  // Calculate %D (SMA of %K)
  for (let i = dPeriod - 1; i < k.length; i++) {
    const dValue = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod
    d.push(dValue)
  }

  return { k, d }
}

/**
 * Calculate Average True Range (ATR)
 */
export const calculateATR = (highs: number[], lows: number[], closes: number[], period: number = 14): number[] => {
  const trueRanges: number[] = []

  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i]
    const highClose = Math.abs(highs[i] - closes[i - 1])
    const lowClose = Math.abs(lows[i] - closes[i - 1])

    const trueRange = Math.max(highLow, highClose, lowClose)
    trueRanges.push(trueRange)
  }

  return calculateSMA(trueRanges, period)
}

/**
 * Calculate Williams %R
 */
export const calculateWilliamsR = (highs: number[], lows: number[], closes: number[], period: number = 14): number[] => {
  const result: number[] = []

  for (let i = period - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1))
    const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1))

    const williamsR = ((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100
    result.push(williamsR)
  }

  return result
}

/**
 * Calculate Commodity Channel Index (CCI)
 */
export const calculateCCI = (highs: number[], lows: number[], closes: number[], period: number = 20): number[] => {
  const result: number[] = []
  const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3)

  for (let i = period - 1; i < typicalPrices.length; i++) {
    const window = typicalPrices.slice(i - period + 1, i + 1)
    const sma = window.reduce((a, b) => a + b, 0) / period
    const meanDeviation = window.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period

    const cci = (typicalPrices[i] - sma) / (0.015 * meanDeviation)
    result.push(cci)
  }

  return result
}