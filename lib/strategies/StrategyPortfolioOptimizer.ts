/**
 * Strategy Portfolio Optimizer
 * Dynamically adjusts strategy weights based on market conditions and performance
 */

export interface MarketConditions {
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
  volatility: number
  volume: number
  rsi?: number
}

export interface StrategyMetrics {
  sharpeRatio: number
  winRate: number
  totalTrades: number
  avgReturn: number
  maxDrawdown: number
}

export class StrategyPortfolioOptimizer {
  private minTradesRequired = 10 // Minimum trades before using performance data

  /**
   * Optimize strategy weights based on market conditions and recent performance
   */
  optimizeStrategyWeights(
    marketConditions: MarketConditions,
    strategyPerformance: Map<string, StrategyMetrics>
  ): Map<string, number> {
    const weights = new Map<string, number>()

    // Momentum strategies perform better in trending markets
    if (marketConditions.trend === 'BULLISH' || marketConditions.trend === 'BEARISH') {
      weights.set('momentum', 0.40)
      weights.set('breakout', 0.30)
      weights.set('mean_reversion', 0.15)
      weights.set('ma_crossover', 0.15)
    }
    // Mean reversion strategies excel in ranging markets
    else if (marketConditions.trend === 'SIDEWAYS') {
      weights.set('mean_reversion', 0.40)
      weights.set('enhanced_mean_reversion', 0.25)
      weights.set('bollinger', 0.20)
      weights.set('rsi', 0.15)
    }
    // Default balanced allocation
    else {
      weights.set('mean_reversion', 0.25)
      weights.set('momentum', 0.25)
      weights.set('rsi', 0.20)
      weights.set('ma_crossover', 0.15)
      weights.set('bollinger', 0.15)
    }

    // Adjust weights based on recent performance
    return this.adjustForPerformance(weights, strategyPerformance)
  }

  /**
   * Adjust base weights based on strategy performance metrics
   */
  private adjustForPerformance(
    baseWeights: Map<string, number>,
    performance: Map<string, StrategyMetrics>
  ): Map<string, number> {
    const adjustedWeights = new Map<string, number>()

    baseWeights.forEach((weight, strategy) => {
      const metrics = performance.get(strategy)

      // If no performance data or insufficient trades, reduce weight
      if (!metrics || metrics.totalTrades < this.minTradesRequired) {
        adjustedWeights.set(strategy, weight * 0.5)
        return
      }

      // Calculate performance multiplier based on multiple factors
      let multiplier = 1.0

      // Sharpe ratio adjustment
      if (metrics.sharpeRatio > 1.5) {
        multiplier *= 1.3
      } else if (metrics.sharpeRatio > 1.0) {
        multiplier *= 1.1
      } else if (metrics.sharpeRatio < 0.5) {
        multiplier *= 0.7
      }

      // Win rate adjustment
      if (metrics.winRate > 0.65) {
        multiplier *= 1.1
      } else if (metrics.winRate < 0.45) {
        multiplier *= 0.9
      }

      // Max drawdown penalty
      if (metrics.maxDrawdown > 0.15) {
        multiplier *= 0.8
      }

      // Average return boost
      if (metrics.avgReturn > 0.025) {
        multiplier *= 1.1
      }

      adjustedWeights.set(strategy, weight * multiplier)
    })

    // Normalize weights to sum to 1.0
    return this.normalizeWeights(adjustedWeights)
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(weights: Map<string, number>): Map<string, number> {
    const total = Array.from(weights.values()).reduce((sum, w) => sum + w, 0)

    if (total === 0) {
      // If all weights are zero, use equal weighting
      const equalWeight = 1.0 / weights.size
      const normalized = new Map<string, number>()
      weights.forEach((_, strategy) => normalized.set(strategy, equalWeight))
      return normalized
    }

    const normalized = new Map<string, number>()
    weights.forEach((weight, strategy) => {
      normalized.set(strategy, weight / total)
    })

    return normalized
  }

  /**
   * Assess current market conditions
   */
  assessMarketConditions(prices: number[], volumes: number[], rsi: number): MarketConditions {
    const trend = this.detectTrend(prices)
    const volatility = this.calculateVolatility(prices)
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const currentVolume = volumes[volumes.length - 1]

    return {
      trend,
      volatility,
      volume: currentVolume / avgVolume,
      rsi
    }
  }

  /**
   * Detect market trend
   */
  private detectTrend(prices: number[]): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    if (prices.length < 20) return 'SIDEWAYS'

    const recentPrices = prices.slice(-20)
    const firstHalf = recentPrices.slice(0, 10)
    const secondHalf = recentPrices.slice(10)

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const change = (secondAvg - firstAvg) / firstAvg

    if (change > 0.02) return 'BULLISH'
    if (change < -0.02) return 'BEARISH'
    return 'SIDEWAYS'
  }

  /**
   * Calculate annualized volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const variance = returns.reduce((acc, r) => acc + r * r, 0) / returns.length
    return Math.sqrt(variance * 252) // Annualized
  }
}