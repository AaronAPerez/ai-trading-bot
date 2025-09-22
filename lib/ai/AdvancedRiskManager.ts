import { Portfolio, Position, TradeOrder, TradeSignal, MarketData } from '@/types/trading'

interface RiskMetrics {
  portfolioValue: number
  totalRisk: number
  var95: number // Value at Risk 95%
  var99: number // Value at Risk 99%
  sharpeRatio: number
  maxDrawdown: number
  concentration: number
  correlation: number
}

interface RiskAlert {
  type: 'WARNING' | 'CRITICAL' | 'EMERGENCY'
  message: string
  action: 'REDUCE_POSITION' | 'CLOSE_POSITION' | 'STOP_TRADING' | 'MONITOR'
  severity: number // 1-10
  timestamp: Date
}

interface PositionSizing {
  recommendedSize: number
  maxSize: number
  riskAmount: number
  stopLoss: number
  takeProfit: number
  riskRewardRatio: number
}

export class AdvancedRiskManager {
  private maxPortfolioRisk = 0.02 // 2% max portfolio risk per trade
  private maxDailyLoss = 0.05 // 5% max daily loss
  private maxDrawdown = 0.15 // 15% max drawdown
  private maxPositionSize = 0.10 // 10% max position size
  private maxConcentration = 0.25 // 25% max sector concentration
  private minRiskReward = 1.5 // Minimum 1.5:1 risk/reward ratio

  private riskAlerts: RiskAlert[] = []
  private dailyPnL = 0
  private maxDailyPnLSeen = 0

  constructor() {
    this.resetDailyTracking()
  }

  async validateTrade(signal: TradeSignal, portfolio: Portfolio, marketData: MarketData[]): Promise<{
    approved: boolean
    sizing: PositionSizing
    warnings: string[]
    restrictions: string[]
  }> {
    const warnings: string[] = []
    const restrictions: string[] = []

    // Calculate position sizing
    const sizing = this.calculateOptimalPositionSize(signal, portfolio, marketData)

    // Portfolio risk checks
    const portfolioRisk = this.calculatePortfolioRisk(portfolio)
    if (portfolioRisk.totalRisk > 0.15) {
      warnings.push(`High portfolio risk: ${(portfolioRisk.totalRisk * 100).toFixed(1)}%`)
    }

    // Daily loss check
    if (this.dailyPnL < -this.maxDailyLoss * portfolio.totalValue) {
      restrictions.push('Daily loss limit reached - trading suspended')
      return {
        approved: false,
        sizing,
        warnings,
        restrictions
      }
    }

    // Maximum drawdown check
    if (portfolioRisk.maxDrawdown > this.maxDrawdown) {
      restrictions.push(`Drawdown limit exceeded: ${(portfolioRisk.maxDrawdown * 100).toFixed(1)}%`)
      return {
        approved: false,
        sizing,
        warnings,
        restrictions
      }
    }

    // Signal quality checks
    if (signal.confidence < 0.6) {
      warnings.push(`Low signal confidence: ${(signal.confidence * 100).toFixed(1)}%`)
    }

    // Market volatility check
    const volatility = this.calculateMarketVolatility(marketData)
    if (volatility > 0.4) {
      warnings.push('High market volatility detected')
      sizing.recommendedSize *= 0.7 // Reduce position size
    }

    // Risk/reward ratio check
    if (sizing.riskRewardRatio < this.minRiskReward) {
      warnings.push(`Poor risk/reward ratio: ${sizing.riskRewardRatio.toFixed(1)}:1`)
    }

    const approved = restrictions.length === 0 && sizing.recommendedSize > 0

    return {
      approved,
      sizing,
      warnings,
      restrictions
    }
  }

  calculateOptimalPositionSize(signal: TradeSignal, portfolio: Portfolio, marketData: MarketData[]): PositionSizing {
    const currentPrice = marketData[marketData.length - 1].close
    const portfolioValue = portfolio.totalValue

    // Kelly Criterion for optimal position sizing
    const winRate = this.estimateWinRate(signal)
    const avgWin = this.estimateAvgWin(signal, marketData)
    const avgLoss = this.estimateAvgLoss(signal, marketData)

    const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin
    const kellySize = Math.max(0, Math.min(0.25, kellyFraction)) // Cap at 25%

    // Risk-based position sizing
    const volatility = this.calculateMarketVolatility(marketData)
    const riskAdjustedSize = this.maxPortfolioRisk / Math.max(volatility, 0.01)

    // Conservative approach - use smaller of Kelly and risk-based sizing
    let recommendedSize = Math.min(kellySize, riskAdjustedSize)

    // Apply additional constraints
    recommendedSize = Math.min(recommendedSize, this.maxPositionSize)

    // Calculate stop loss and take profit
    const atr = this.calculateATR(marketData, 14)
    const stopLoss = signal.action === 'BUY'
      ? currentPrice - (atr * 2)
      : currentPrice + (atr * 2)

    const riskPerShare = Math.abs(currentPrice - stopLoss)
    const maxShares = (portfolioValue * this.maxPortfolioRisk) / riskPerShare

    recommendedSize = Math.min(recommendedSize, maxShares / portfolioValue)

    // Take profit based on risk/reward ratio
    const takeProfit = signal.action === 'BUY'
      ? currentPrice + (riskPerShare * this.minRiskReward)
      : currentPrice - (riskPerShare * this.minRiskReward)

    const riskAmount = recommendedSize * portfolioValue * (riskPerShare / currentPrice)
    const rewardAmount = recommendedSize * portfolioValue * (Math.abs(takeProfit - currentPrice) / currentPrice)
    const riskRewardRatio = rewardAmount / Math.max(riskAmount, 0.01)

    return {
      recommendedSize: Math.max(0, recommendedSize),
      maxSize: this.maxPositionSize,
      riskAmount,
      stopLoss,
      takeProfit,
      riskRewardRatio
    }
  }

  calculatePortfolioRisk(portfolio: Portfolio): RiskMetrics {
    const positions = portfolio.positions
    const totalValue = portfolio.totalValue

    // Calculate concentration risk
    const concentrations = this.calculateConcentrationRisk(positions, totalValue)

    // Calculate correlation risk
    const correlationRisk = this.calculateCorrelationRisk(positions)

    // Calculate VaR (Value at Risk)
    const var95 = this.calculateVaR(portfolio, 0.05)
    const var99 = this.calculateVaR(portfolio, 0.01)

    // Calculate total portfolio risk
    const totalRisk = Math.sqrt(
      Math.pow(concentrations.maxConcentration, 2) +
      Math.pow(correlationRisk, 2) +
      Math.pow(var95 / totalValue, 2)
    )

    return {
      portfolioValue: totalValue,
      totalRisk,
      var95,
      var99,
      sharpeRatio: this.calculateSharpeRatio(portfolio),
      maxDrawdown: this.calculateMaxDrawdown(portfolio),
      concentration: concentrations.maxConcentration,
      correlation: correlationRisk
    }
  }

  async monitorRealTimeRisk(portfolio: Portfolio, marketData: Map<string, MarketData[]>): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = []

    // Check for rapid portfolio decline
    const currentValue = portfolio.totalValue
    const dayChange = portfolio.dayPnL / currentValue

    if (dayChange < -0.03) { // 3% daily loss
      alerts.push({
        type: 'WARNING',
        message: `Portfolio down ${(dayChange * 100).toFixed(1)}% today`,
        action: 'MONITOR',
        severity: 5,
        timestamp: new Date()
      })
    }

    if (dayChange < -0.05) { // 5% daily loss
      alerts.push({
        type: 'CRITICAL',
        message: `Significant daily loss: ${(dayChange * 100).toFixed(1)}%`,
        action: 'REDUCE_POSITION',
        severity: 8,
        timestamp: new Date()
      })
    }

    // Check individual position risks
    for (const position of portfolio.positions) {
      const positionRisk = await this.assessPositionRisk(position, marketData.get(position.symbol) || [])

      if (positionRisk.severity >= 7) {
        alerts.push({
          type: 'WARNING',
          message: `High risk in ${position.symbol}: ${positionRisk.reason}`,
          action: 'REDUCE_POSITION',
          severity: positionRisk.severity,
          timestamp: new Date()
        })
      }
    }

    // Check market volatility
    for (const [symbol, data] of marketData) {
      const volatility = this.calculateMarketVolatility(data)
      if (volatility > 0.6) {
        alerts.push({
          type: 'WARNING',
          message: `High volatility in ${symbol}: ${(volatility * 100).toFixed(1)}%`,
          action: 'MONITOR',
          severity: 6,
          timestamp: new Date()
        })
      }
    }

    this.riskAlerts.push(...alerts)
    return alerts
  }

  private async assessPositionRisk(position: Position, marketData: MarketData[]): Promise<{
    severity: number
    reason: string
  }> {
    if (marketData.length < 2) {
      return { severity: 5, reason: 'Insufficient data' }
    }

    const currentPrice = position.currentPrice
    const avgPrice = position.avgPrice
    const unrealizedPnL = position.unrealizedPnL
    const positionValue = Math.abs(position.marketValue)

    let severity = 1
    let reasons: string[] = []

    // Check unrealized loss
    const unrealizedLossPercent = unrealizedPnL / positionValue
    if (unrealizedLossPercent < -0.1) {
      severity = Math.max(severity, 7)
      reasons.push(`Large unrealized loss: ${(unrealizedLossPercent * 100).toFixed(1)}%`)
    }

    // Check price momentum
    const recentPrices = marketData.slice(-5).map(d => d.close)
    const momentum = this.calculateMomentum(recentPrices)

    if (position.side === 'LONG' && momentum < -0.05) {
      severity = Math.max(severity, 6)
      reasons.push('Negative momentum in long position')
    } else if (position.side === 'SHORT' && momentum > 0.05) {
      severity = Math.max(severity, 6)
      reasons.push('Positive momentum in short position')
    }

    // Check volatility spike
    const volatility = this.calculateMarketVolatility(marketData)
    if (volatility > 0.5) {
      severity = Math.max(severity, 5)
      reasons.push('High volatility')
    }

    return {
      severity,
      reason: reasons.join(', ') || 'Normal risk'
    }
  }

  // Advanced risk calculations
  private calculateConcentrationRisk(positions: Position[], totalValue: number): {
    maxConcentration: number
    sectorConcentrations: Map<string, number>
  } {
    const sectorConcentrations = new Map<string, number>()
    let maxConcentration = 0

    for (const position of positions) {
      const weight = Math.abs(position.marketValue) / totalValue
      maxConcentration = Math.max(maxConcentration, weight)

      // Simplified sector classification (in real implementation, use proper sector mapping)
      const sector = this.getSector(position.symbol)
      const currentSectorWeight = sectorConcentrations.get(sector) || 0
      sectorConcentrations.set(sector, currentSectorWeight + weight)
    }

    return { maxConcentration, sectorConcentrations }
  }

  private calculateCorrelationRisk(positions: Position[]): number {
    // Simplified correlation calculation
    // In real implementation, use historical correlation matrix
    if (positions.length < 2) return 0

    const techStocks = positions.filter(p => this.getSector(p.symbol) === 'Technology').length
    const totalPositions = positions.length

    // High tech concentration increases correlation risk
    const techConcentration = techStocks / totalPositions
    return techConcentration > 0.5 ? techConcentration * 0.3 : 0.1
  }

  private calculateVaR(portfolio: Portfolio, confidenceLevel: number): number {
    // Simplified VaR calculation using portfolio volatility
    const portfolioVol = 0.15 // Assume 15% annual volatility
    const dailyVol = portfolioVol / Math.sqrt(252)

    // Z-score for confidence level
    const zScore = confidenceLevel === 0.05 ? 1.645 : 2.326

    return portfolio.totalValue * dailyVol * zScore
  }

  private calculateSharpeRatio(portfolio: Portfolio): number {
    // Simplified Sharpe ratio calculation
    const riskFreeRate = 0.02 // 2% risk-free rate
    const portfolioReturn = portfolio.totalReturn
    const portfolioVol = 0.15 // Assume 15% volatility

    return (portfolioReturn - riskFreeRate) / portfolioVol
  }

  private calculateMaxDrawdown(portfolio: Portfolio): number {
    // Simplified max drawdown - in real implementation, track historical equity curve
    return Math.abs(Math.min(0, portfolio.totalPnL / portfolio.totalValue))
  }

  private calculateMarketVolatility(marketData: MarketData[]): number {
    if (marketData.length < 2) return 0.2

    const returns = []
    for (let i = 1; i < marketData.length; i++) {
      const ret = (marketData[i].close - marketData[i-1].close) / marketData[i-1].close
      returns.push(ret)
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

    return Math.sqrt(variance) * Math.sqrt(252) // Annualized volatility
  }

  private calculateATR(marketData: MarketData[], period: number): number {
    if (marketData.length < period + 1) return 0

    const trs: number[] = []
    for (let i = 1; i < marketData.length; i++) {
      const high = marketData[i].high
      const low = marketData[i].low
      const prevClose = marketData[i-1].close

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trs.push(tr)
    }

    return trs.slice(-period).reduce((a, b) => a + b, 0) / period
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 2) return 0

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }

    return returns.reduce((a, b) => a + b, 0) / returns.length
  }

  private estimateWinRate(signal: TradeSignal): number {
    // Estimate win rate based on signal confidence and historical performance
    const baseWinRate = 0.55 // 55% base win rate
    const confidenceBonus = (signal.confidence - 0.5) * 0.2
    return Math.min(0.8, Math.max(0.3, baseWinRate + confidenceBonus))
  }

  private estimateAvgWin(signal: TradeSignal, marketData: MarketData[]): number {
    const volatility = this.calculateMarketVolatility(marketData)
    return volatility * 1.5 // Average win is 1.5x daily volatility
  }

  private estimateAvgLoss(signal: TradeSignal, marketData: MarketData[]): number {
    const volatility = this.calculateMarketVolatility(marketData)
    return volatility * 1.0 // Average loss is 1x daily volatility
  }

  private getSector(symbol: string): string {
    // Simplified sector mapping - in real implementation, use comprehensive database
    const techSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META']
    const financeSymbols = ['JPM', 'BAC', 'WFC', 'GS', 'MS']
    const healthSymbols = ['JNJ', 'PFE', 'UNH', 'MRNA', 'ABT']

    if (techSymbols.includes(symbol)) return 'Technology'
    if (financeSymbols.includes(symbol)) return 'Finance'
    if (healthSymbols.includes(symbol)) return 'Healthcare'
    return 'Other'
  }

  private resetDailyTracking(): void {
    // Reset daily tracking at market open
    this.dailyPnL = 0
    this.maxDailyPnLSeen = 0

    // Clear old alerts (keep only last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    this.riskAlerts = this.riskAlerts.filter(alert => alert.timestamp > oneDayAgo)
  }

  updateDailyPnL(pnl: number): void {
    this.dailyPnL = pnl
    this.maxDailyPnLSeen = Math.max(this.maxDailyPnLSeen, pnl)
  }

  getRiskAlerts(): RiskAlert[] {
    return [...this.riskAlerts]
  }

  getLatestRiskMetrics(portfolio: Portfolio): RiskMetrics {
    return this.calculatePortfolioRisk(portfolio)
  }
}