import { MarketData, TradeSignal } from "@/types/trading"
import { MeanReversionStrategy } from "./MeanReversionStrategy"
import { calculateRSI } from '@/lib/utils/technicalIndicators'
import { logger } from '@/lib/utils/logger'

/**
 * Enhanced Mean Reversion Strategy
 * Improves upon the base strategy with dynamic thresholds and volatility awareness
 */
export class EnhancedMeanReversionStrategy extends MeanReversionStrategy {
  name = 'Enhanced Mean Reversion Strategy'
  type = 'ENHANCED_MEAN_REVERSION'
  description = 'Dynamic mean reversion with volatility regime adaptation'

  async analyze(data: MarketData[]): Promise<TradeSignal> {
    try {
      if (data.length < 50) {
        return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for enhanced analysis', riskScore: 0.5 }
      }

      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const prices = sortedData.map(d => d.close)

      // 1. Assess current volatility regime
      const volatilityRegime = this.assessVolatilityRegime(prices)

      // 2. Adjust z-score thresholds based on volatility
      const dynamicThreshold = this.getDynamicThreshold(volatilityRegime)

      // 3. Calculate z-score with dynamic lookback
      const lookback = volatilityRegime === 'HIGH' ? 30 : volatilityRegime === 'MEDIUM' ? 20 : 15
      const zScore = this.calculateZScore(prices, lookback)

      // 4. Check for mean reversion exhaustion
      const isExhausted = this.checkMeanReversionExhaustion(prices)

      // 5. Calculate RSI for confirmation
      const rsiValues = calculateRSI(prices, 14)
      const currentRSI = rsiValues[rsiValues.length - 1]

      // 6. Enhanced entry logic
      if (!isExhausted && Math.abs(zScore) >= dynamicThreshold) {
        return this.generateEnhancedSignal(zScore, currentRSI, volatilityRegime, prices[prices.length - 1])
      }

      return {
        action: 'HOLD',
        confidence: 0.3,
        reason: `Enhanced mean reversion holding: Z-score ${zScore.toFixed(2)}, Volatility: ${volatilityRegime}`,
        riskScore: 0.3
      }

    } catch (error) {
      logger.error(`Enhanced Mean Reversion Strategy error: ${error}`)
      return { action: 'HOLD', confidence: 0, reason: `Analysis error: ${error}`, riskScore: 1.0 }
    }
  }

  private assessVolatilityRegime(prices: number[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const recentReturns = returns.slice(-20)
    const variance = recentReturns.reduce((acc, r) => acc + r * r, 0) / recentReturns.length
    const volatility = Math.sqrt(variance * 252) // Annualized volatility

    if (volatility < 0.15) return 'LOW'
    if (volatility < 0.30) return 'MEDIUM'
    return 'HIGH'
  }

  private getDynamicThreshold(volatilityRegime: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    return {
      LOW: 1.5,     // Lower threshold in low volatility
      MEDIUM: 2.0,  // Standard threshold
      HIGH: 2.5     // Higher threshold in high volatility
    }[volatilityRegime]
  }

  private checkMeanReversionExhaustion(prices: number[]): boolean {
    // Check if price has been mean-reverting for too long
    // Avoid catching falling knives in trending markets
    const recentTrend = this.calculateTrend(prices.slice(-20))
    const momentum = this.calculateMomentum(prices.slice(-10))

    return Math.abs(momentum) > 0.15 // Strong momentum = exhausted mean reversion
  }

  private calculateTrend(prices: number[]): number {
    // Linear regression slope as trend indicator
    const n = prices.length
    const xSum = (n * (n - 1)) / 2
    const ySum = prices.reduce((sum, price) => sum + price, 0)
    const xySum = prices.reduce((sum, price, i) => sum + price * i, 0)
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
    const avgPrice = ySum / n

    return slope / avgPrice // Normalized slope
  }

  private calculateMomentum(prices: number[]): number {
    // Rate of change momentum
    if (prices.length < 2) return 0
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    return (lastPrice - firstPrice) / firstPrice
  }

  private generateEnhancedSignal(
    zScore: number,
    rsi: number,
    volatilityRegime: 'LOW' | 'MEDIUM' | 'HIGH',
    currentPrice: number
  ): TradeSignal {
    const action = zScore < 0 ? 'BUY' : 'SELL'

    // Calculate confidence based on multiple factors
    let confidence = 0.5

    // Z-score strength
    const zScoreStrength = Math.min(1.0, Math.abs(zScore) / 3.0)
    confidence += zScoreStrength * 0.3

    // RSI confirmation
    if (action === 'BUY' && rsi <= 30) {
      confidence += 0.2
    } else if (action === 'SELL' && rsi >= 70) {
      confidence += 0.2
    }

    // Volatility regime adjustment
    if (volatilityRegime === 'LOW') {
      confidence += 0.1 // Higher confidence in low volatility
    } else if (volatilityRegime === 'HIGH') {
      confidence -= 0.1 // Lower confidence in high volatility
    }

    confidence = Math.min(0.95, Math.max(0.1, confidence))

    // Dynamic stop loss and take profit based on volatility
    const stopLossMultiplier = volatilityRegime === 'HIGH' ? 0.03 : volatilityRegime === 'MEDIUM' ? 0.02 : 0.015
    const takeProfitMultiplier = volatilityRegime === 'HIGH' ? 0.04 : volatilityRegime === 'MEDIUM' ? 0.03 : 0.025

    return {
      action,
      confidence,
      reason: `Enhanced ${action}: Z=${zScore.toFixed(2)}, RSI=${rsi.toFixed(1)}, Vol=${volatilityRegime}`,
      riskScore: this.calculateEnhancedRiskScore(zScore, rsi, volatilityRegime, confidence),
      stopLoss: action === 'BUY'
        ? currentPrice * (1 - stopLossMultiplier)
        : currentPrice * (1 + stopLossMultiplier),
      takeProfit: action === 'BUY'
        ? currentPrice * (1 + takeProfitMultiplier)
        : currentPrice * (1 - takeProfitMultiplier)
    }
  }

  private calculateEnhancedRiskScore(
    zScore: number,
    rsi: number,
    volatilityRegime: 'LOW' | 'MEDIUM' | 'HIGH',
    confidence: number
  ): number {
    let riskScore = 0.5

    // Volatility regime risk
    if (volatilityRegime === 'HIGH') {
      riskScore += 0.2
    } else if (volatilityRegime === 'LOW') {
      riskScore -= 0.1
    }

    // Extreme values risk
    if (Math.abs(zScore) > 3) {
      riskScore += 0.15
    }

    // RSI confirmation reduces risk
    const rsiExtreme = rsi <= 30 || rsi >= 70
    if (rsiExtreme) {
      riskScore -= 0.15
    }

    // Confidence adjustment
    riskScore -= (confidence - 0.5) * 0.3

    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  private calculateZScore(prices: number[], period: number): number {
    const recentPrices = prices.slice(-period)
    const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length

    const variance = recentPrices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / recentPrices.length
    const standardDeviation = Math.sqrt(variance)

    const currentPrice = prices[prices.length - 1]
    return standardDeviation > 0 ? (currentPrice - mean) / standardDeviation : 0
  }
}