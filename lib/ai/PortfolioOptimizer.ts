import { Portfolio, Position, MarketData, TradeSignal } from '@/types/trading'

interface OptimizationResult {
  allocations: Map<string, number>
  expectedReturn: number
  expectedRisk: number
  sharpeRatio: number
  rebalanceRecommendations: RebalanceAction[]
  diversificationScore: number
}

interface RebalanceAction {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  currentWeight: number
  targetWeight: number
  adjustmentAmount: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
}

interface AssetStats {
  symbol: string
  expectedReturn: number
  volatility: number
  correlation: Map<string, number>
  sharpeRatio: number
  beta: number
  momentum: number
  quality: number
}

export class PortfolioOptimizer {
  private riskFreeRate = 0.02 // 2% risk-free rate
  private rebalanceThreshold = 0.05 // 5% threshold for rebalancing
  private maxPositionWeight = 0.20 // 20% max position size
  private minPositionWeight = 0.02 // 2% min position size
  private targetNumPositions = 15 // Target number of positions for diversification

  constructor() {}

  async optimizePortfolio(
    portfolio: Portfolio,
    marketData: Map<string, MarketData[]>,
    signals: Map<string, TradeSignal>,
    objective: 'MAX_SHARPE' | 'MIN_RISK' | 'MAX_RETURN' | 'BALANCED' = 'MAX_SHARPE'
  ): Promise<OptimizationResult> {

    // Calculate asset statistics
    const assetStats = await this.calculateAssetStatistics(marketData, signals)

    // Generate optimal allocations based on objective
    const allocations = this.calculateOptimalAllocations(assetStats, objective, portfolio.totalValue)

    // Calculate portfolio metrics
    const portfolioMetrics = this.calculatePortfolioMetrics(allocations, assetStats)

    // Generate rebalancing recommendations
    const rebalanceRecommendations = this.generateRebalanceRecommendations(
      portfolio,
      allocations,
      assetStats
    )

    // Calculate diversification score
    const diversificationScore = this.calculateDiversificationScore(allocations, assetStats)

    return {
      allocations,
      expectedReturn: portfolioMetrics.expectedReturn,
      expectedRisk: portfolioMetrics.expectedRisk,
      sharpeRatio: portfolioMetrics.sharpeRatio,
      rebalanceRecommendations,
      diversificationScore
    }
  }

  private async calculateAssetStatistics(
    marketData: Map<string, MarketData[]>,
    signals: Map<string, TradeSignal>
  ): Promise<Map<string, AssetStats>> {

    const assetStats = new Map<string, AssetStats>()

    for (const [symbol, data] of marketData) {
      if (data.length < 30) continue // Need sufficient data

      const prices = data.map(d => d.close)
      const returns = this.calculateReturns(prices)

      const stats: AssetStats = {
        symbol,
        expectedReturn: this.calculateExpectedReturn(returns, signals.get(symbol)),
        volatility: this.calculateVolatility(returns),
        correlation: new Map(),
        sharpeRatio: 0,
        beta: this.calculateBeta(returns, this.getMarketReturns(marketData)),
        momentum: this.calculateMomentum(prices),
        quality: this.calculateQualityScore(data, signals.get(symbol))
      }

      stats.sharpeRatio = (stats.expectedReturn - this.riskFreeRate) / stats.volatility

      assetStats.set(symbol, stats)
    }

    // Calculate correlation matrix
    this.calculateCorrelationMatrix(assetStats, marketData)

    return assetStats
  }

  private calculateOptimalAllocations(
    assetStats: Map<string, AssetStats>,
    objective: string,
    portfolioValue: number
  ): Map<string, number> {

    const symbols = Array.from(assetStats.keys())
    const n = symbols.length

    if (n === 0) return new Map()

    // Create returns vector and covariance matrix
    const expectedReturns = symbols.map(s => assetStats.get(s)!.expectedReturn)
    const covarianceMatrix = this.buildCovarianceMatrix(assetStats, symbols)

    // Apply optimization algorithm based on objective
    let weights: number[]

    switch (objective) {
      case 'MAX_SHARPE':
        weights = this.maximumSharpeOptimization(expectedReturns, covarianceMatrix)
        break
      case 'MIN_RISK':
        weights = this.minimumVarianceOptimization(covarianceMatrix)
        break
      case 'MAX_RETURN':
        weights = this.maximumReturnOptimization(expectedReturns, assetStats)
        break
      case 'BALANCED':
        weights = this.balancedOptimization(expectedReturns, covarianceMatrix, assetStats)
        break
      default:
        weights = this.maximumSharpeOptimization(expectedReturns, covarianceMatrix)
    }

    // Apply constraints
    weights = this.applyPositionConstraints(weights, assetStats, symbols)

    // Convert to allocation map
    const allocations = new Map<string, number>()
    symbols.forEach((symbol, i) => {
      if (weights[i] > this.minPositionWeight) {
        allocations.set(symbol, weights[i])
      }
    })

    return allocations
  }

  private maximumSharpeOptimization(expectedReturns: number[], covarianceMatrix: number[][]): number[] {
    const n = expectedReturns.length

    // Simplified optimization - in production, use proper quadratic programming
    // This is a heuristic approach that approximates the maximum Sharpe portfolio

    const sharpeRatios = expectedReturns.map((ret, i) => {
      const variance = covarianceMatrix[i][i]
      return variance > 0 ? (ret - this.riskFreeRate) / Math.sqrt(variance) : 0
    })

    // Start with equal weights
    let weights = new Array(n).fill(1 / n)

    // Iteratively adjust weights toward higher Sharpe ratios
    for (let iter = 0; iter < 100; iter++) {
      const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns)
      const portfolioVariance = this.calculatePortfolioVariance(weights, covarianceMatrix)
      const portfolioSharpe = (portfolioReturn - this.riskFreeRate) / Math.sqrt(portfolioVariance)

      // Gradient-based adjustment
      const newWeights = weights.map((w, i) => {
        const marginalSharpe = sharpeRatios[i]
        const adjustment = (marginalSharpe - portfolioSharpe) * 0.01
        return Math.max(0, w + adjustment)
      })

      // Normalize weights
      const sum = newWeights.reduce((a, b) => a + b, 0)
      weights = newWeights.map(w => w / sum)
    }

    return weights
  }

  private minimumVarianceOptimization(covarianceMatrix: number[][]): number[] {
    const n = covarianceMatrix.length

    // Simplified minimum variance - equal weight adjusted by inverse volatility
    const volatilities = covarianceMatrix.map((row, i) => Math.sqrt(row[i]))
    const invVolatilities = volatilities.map(vol => vol > 0 ? 1 / vol : 0)

    const sum = invVolatilities.reduce((a, b) => a + b, 0)
    return invVolatilities.map(invVol => invVol / sum)
  }

  private maximumReturnOptimization(expectedReturns: number[], assetStats: Map<string, AssetStats>): number[] {
    // Weight by expected returns, adjusted for quality
    const symbols = Array.from(assetStats.keys())
    const adjustedReturns = expectedReturns.map((ret, i) => {
      const quality = assetStats.get(symbols[i])!.quality
      return ret * quality // Adjust return by quality score
    })

    const sum = adjustedReturns.reduce((a, b) => a + b, 0)
    return adjustedReturns.map(ret => Math.max(0, ret) / sum)
  }

  private balancedOptimization(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    assetStats: Map<string, AssetStats>
  ): number[] {
    // Combine multiple objectives with equal weighting
    const sharpeWeights = this.maximumSharpeOptimization(expectedReturns, covarianceMatrix)
    const minRiskWeights = this.minimumVarianceOptimization(covarianceMatrix)
    const maxReturnWeights = this.maximumReturnOptimization(expectedReturns, assetStats)

    // Average the three approaches
    return sharpeWeights.map((w, i) => (w + minRiskWeights[i] + maxReturnWeights[i]) / 3)
  }

  private applyPositionConstraints(
    weights: number[],
    assetStats: Map<string, AssetStats>,
    symbols: string[]
  ): number[] {

    // Apply maximum position size constraint
    const constrainedWeights = weights.map(w => Math.min(w, this.maxPositionWeight))

    // Ensure minimum position sizes or zero
    const adjustedWeights = constrainedWeights.map(w =>
      w < this.minPositionWeight ? 0 : w
    )

    // Re-normalize to sum to 1
    const sum = adjustedWeights.reduce((a, b) => a + b, 0)
    return sum > 0 ? adjustedWeights.map(w => w / sum) : adjustedWeights
  }

  private generateRebalanceRecommendations(
    portfolio: Portfolio,
    targetAllocations: Map<string, number>,
    assetStats: Map<string, AssetStats>
  ): RebalanceAction[] {

    const recommendations: RebalanceAction[] = []
    const totalValue = portfolio.totalValue

    // Current allocations
    const currentAllocations = new Map<string, number>()
    portfolio.positions.forEach(pos => {
      const weight = Math.abs(pos.marketValue) / totalValue
      currentAllocations.set(pos.symbol, weight)
    })

    // Check existing positions
    for (const [symbol, targetWeight] of targetAllocations) {
      const currentWeight = currentAllocations.get(symbol) || 0
      const difference = targetWeight - currentWeight

      if (Math.abs(difference) > this.rebalanceThreshold) {
        const adjustmentAmount = difference * totalValue

        recommendations.push({
          symbol,
          action: difference > 0 ? 'BUY' : 'SELL',
          currentWeight,
          targetWeight,
          adjustmentAmount,
          priority: this.calculateRebalancePriority(difference, assetStats.get(symbol)!),
          reason: this.generateRebalanceReason(difference, assetStats.get(symbol)!)
        })
      }
    }

    // Check positions to close (not in target allocation)
    for (const position of portfolio.positions) {
      if (!targetAllocations.has(position.symbol)) {
        const currentWeight = Math.abs(position.marketValue) / totalValue

        recommendations.push({
          symbol: position.symbol,
          action: 'SELL',
          currentWeight,
          targetWeight: 0,
          adjustmentAmount: -position.marketValue,
          priority: 'MEDIUM',
          reason: 'Position not in optimal allocation'
        })
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private calculateDiversificationScore(
    allocations: Map<string, number>,
    assetStats: Map<string, AssetStats>
  ): number {

    const weights = Array.from(allocations.values())
    const n = weights.length

    // Herfindahl-Hirschman Index (lower is more diversified)
    const hhi = weights.reduce((sum, w) => sum + w * w, 0)
    const diversificationFromWeights = 1 - hhi

    // Correlation-adjusted diversification
    let avgCorrelation = 0
    let correlationCount = 0

    const symbols = Array.from(allocations.keys())
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const corr = assetStats.get(symbols[i])!.correlation.get(symbols[j]) || 0
        avgCorrelation += Math.abs(corr)
        correlationCount++
      }
    }

    const correlationDiversification = correlationCount > 0
      ? 1 - (avgCorrelation / correlationCount)
      : 1

    // Combined diversification score (0-100)
    return Math.min(100, (diversificationFromWeights * 0.6 + correlationDiversification * 0.4) * 100)
  }

  // Helper methods for calculations
  private calculateReturns(prices: number[]): number[] {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }
    return returns
  }

  private calculateExpectedReturn(returns: number[], signal?: TradeSignal): number {
    // Base expected return from historical data
    const historicalReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252 // Annualized

    // Adjust based on signal
    if (signal) {
      const signalAdjustment = signal.action === 'BUY' ? signal.confidence * 0.05 :
                              signal.action === 'SELL' ? -signal.confidence * 0.05 : 0
      return historicalReturn + signalAdjustment
    }

    return historicalReturn
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252) // Annualized
  }

  private calculateBeta(assetReturns: number[], marketReturns: number[]): number {
    if (assetReturns.length !== marketReturns.length || assetReturns.length < 20) return 1

    const assetMean = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length
    const marketMean = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length

    let covariance = 0
    let marketVariance = 0

    for (let i = 0; i < assetReturns.length; i++) {
      const assetDiff = assetReturns[i] - assetMean
      const marketDiff = marketReturns[i] - marketMean

      covariance += assetDiff * marketDiff
      marketVariance += marketDiff * marketDiff
    }

    return marketVariance > 0 ? covariance / marketVariance : 1
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 20) return 0

    // 12-month momentum minus 1-month momentum
    const longMomentum = (prices[prices.length - 1] - prices[prices.length - 252]) / prices[prices.length - 252] || 0
    const shortMomentum = (prices[prices.length - 1] - prices[prices.length - 21]) / prices[prices.length - 21] || 0

    return longMomentum - shortMomentum
  }

  private calculateQualityScore(data: MarketData[], signal?: TradeSignal): number {
    // Simplified quality score based on multiple factors
    let qualityScore = 0.5 // Base score

    // Volume consistency (higher is better)
    const volumes = data.slice(-20).map(d => d.volume)
    const volumeCV = this.calculateCoefficientOfVariation(volumes)
    qualityScore += volumeCV < 0.5 ? 0.1 : -0.1

    // Price stability (moderate volatility is good)
    const prices = data.slice(-20).map(d => d.close)
    const priceCV = this.calculateCoefficientOfVariation(prices)
    qualityScore += priceCV > 0.1 && priceCV < 0.3 ? 0.1 : -0.1

    // Signal quality
    if (signal) {
      qualityScore += signal.confidence > 0.7 ? 0.2 : signal.confidence < 0.4 ? -0.2 : 0
    }

    return Math.max(0.1, Math.min(1.0, qualityScore))
  }

  private calculateCorrelationMatrix(
    assetStats: Map<string, AssetStats>,
    marketData: Map<string, MarketData[]>
  ): void {

    const symbols = Array.from(assetStats.keys())

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i]
        const symbol2 = symbols[j]

        const data1 = marketData.get(symbol1)!
        const data2 = marketData.get(symbol2)!

        const correlation = this.calculateCorrelation(
          data1.map(d => d.close),
          data2.map(d => d.close)
        )

        assetStats.get(symbol1)!.correlation.set(symbol2, correlation)
        assetStats.get(symbol2)!.correlation.set(symbol1, correlation)
      }
    }
  }

  private calculateCorrelation(prices1: number[], prices2: number[]): number {
    const minLength = Math.min(prices1.length, prices2.length)
    if (minLength < 20) return 0

    const returns1 = this.calculateReturns(prices1.slice(-minLength))
    const returns2 = this.calculateReturns(prices2.slice(-minLength))

    const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length
    const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length

    let covariance = 0
    let variance1 = 0
    let variance2 = 0

    for (let i = 0; i < returns1.length; i++) {
      const diff1 = returns1[i] - mean1
      const diff2 = returns2[i] - mean2

      covariance += diff1 * diff2
      variance1 += diff1 * diff1
      variance2 += diff2 * diff2
    }

    const denominator = Math.sqrt(variance1 * variance2)
    return denominator > 0 ? covariance / denominator : 0
  }

  private buildCovarianceMatrix(assetStats: Map<string, AssetStats>, symbols: string[]): number[][] {
    const n = symbols.length
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          const volatility = assetStats.get(symbols[i])!.volatility
          matrix[i][j] = volatility * volatility
        } else {
          const vol1 = assetStats.get(symbols[i])!.volatility
          const vol2 = assetStats.get(symbols[j])!.volatility
          const correlation = assetStats.get(symbols[i])!.correlation.get(symbols[j]) || 0
          matrix[i][j] = vol1 * vol2 * correlation
        }
      }
    }

    return matrix
  }

  private calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0)
  }

  private calculatePortfolioVariance(weights: number[], covarianceMatrix: number[][]): number {
    let variance = 0
    const n = weights.length

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j]
      }
    }

    return variance
  }

  private calculatePortfolioMetrics(allocations: Map<string, number>, assetStats: Map<string, AssetStats>) {
    const symbols = Array.from(allocations.keys())
    const weights = symbols.map(s => allocations.get(s)!)
    const expectedReturns = symbols.map(s => assetStats.get(s)!.expectedReturn)
    const covarianceMatrix = this.buildCovarianceMatrix(assetStats, symbols)

    const expectedReturn = this.calculatePortfolioReturn(weights, expectedReturns)
    const expectedRisk = Math.sqrt(this.calculatePortfolioVariance(weights, covarianceMatrix))
    const sharpeRatio = (expectedReturn - this.riskFreeRate) / expectedRisk

    return { expectedReturn, expectedRisk, sharpeRatio }
  }

  private getMarketReturns(marketData: Map<string, MarketData[]>): number[] {
    // Use SPY or a market proxy if available, otherwise create a simple market proxy
    const spyData = marketData.get('SPY')
    if (spyData && spyData.length > 1) {
      return this.calculateReturns(spyData.map(d => d.close))
    }

    // Create market proxy from available assets
    const allPrices: number[][] = []
    for (const [symbol, data] of marketData) {
      if (data.length > 250) { // At least 1 year of data
        allPrices.push(data.map(d => d.close))
      }
    }

    if (allPrices.length === 0) return []

    // Simple equal-weighted market return
    const marketPrices = []
    const minLength = Math.min(...allPrices.map(p => p.length))

    for (let i = 0; i < minLength; i++) {
      const avgPrice = allPrices.reduce((sum, prices) => sum + prices[i], 0) / allPrices.length
      marketPrices.push(avgPrice)
    }

    return this.calculateReturns(marketPrices)
  }

  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    if (mean === 0) return 0

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return stdDev / Math.abs(mean)
  }

  private calculateRebalancePriority(difference: number, assetStats: AssetStats): 'HIGH' | 'MEDIUM' | 'LOW' {
    const absDifference = Math.abs(difference)

    if (absDifference > 0.15) return 'HIGH' // More than 15% difference
    if (absDifference > 0.08) return 'MEDIUM' // More than 8% difference
    return 'LOW'
  }

  private generateRebalanceReason(difference: number, assetStats: AssetStats): string {
    const absDifference = Math.abs(difference)

    if (difference > 0) {
      return `Underweight by ${(absDifference * 100).toFixed(1)}% - strong fundamentals (Sharpe: ${assetStats.sharpeRatio.toFixed(2)})`
    } else {
      return `Overweight by ${(absDifference * 100).toFixed(1)}% - rebalance to optimal allocation`
    }
  }
}