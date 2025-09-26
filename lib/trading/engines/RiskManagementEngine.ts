import { RiskConfig, Portfolio, Position, RiskAssessment, TradeSignal, MarketData } from '../../../types/trading'

interface RiskMetrics {
  portfolioValue: number
  totalExposure: number
  dailyPnL: number
  drawdown: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  var95: number // Value at Risk 95%
  expectedShortfall: number
}

interface PositionRisk {
  symbol: string
  exposure: number
  exposurePercent: number
  unrealizedPnL: number
  unrealizedPercent: number
  riskScore: number
  beta: number
  correlation: number
  timeHeld: number
  stopLossDistance: number
  riskRewardRatio: number
}

interface RiskAlert {
  level: 'INFO' | 'WARNING' | 'CRITICAL'
  type: 'EXPOSURE' | 'DRAWDOWN' | 'CONCENTRATION' | 'CORRELATION' | 'VOLATILITY'
  message: string
  value: number
  threshold: number
  timestamp: Date
  recommendation: string
}

export class RiskManagementEngine {
  private config: RiskConfig
  private isInitialized = false
  private portfolioHistory: Portfolio[] = []
  private riskAlerts: RiskAlert[] = []
  private lastAssessment: RiskAssessment | null = null
  private dailyStartingBalance = 0
  private maxHistoricalValue = 0

  constructor(config: RiskConfig) {
    this.config = {
      maxDailyLoss: 0.03, // 3%
      maxDrawdown: 0.15, // 15%
      maxPositionSize: 0.10, // 10%
      maxSectorExposure: 0.30, // 30%
      maxCorrelation: 0.70, // 70%
      minLiquidity: 100000, // $100k daily volume
      maxLeverage: 1.0, // No leverage
      stopLossRequired: true,
      takeProfitRequired: false,
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🛡️ Initializing Risk Management Engine...')
    
    try {
      // Initialize risk tracking
      await this.loadHistoricalData()
      this.resetDailyCounters()
      
      this.isInitialized = true
      console.log('✅ Risk Management Engine initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Risk Management Engine:', error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Save final risk report
      await this.generateRiskReport()
      this.isInitialized = false
      console.log('🛡️ Risk Management Engine shut down')
    } catch (error) {
      console.error('❌ Error shutting down Risk Management Engine:', error)
    }
  }

  async assessPortfolioRisk(portfolio: Portfolio, positions: Position[]): Promise<RiskAssessment> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Update portfolio history
      this.updatePortfolioHistory(portfolio)

      const riskMetrics = this.calculateRiskMetrics(portfolio, positions)
      const positionRisks = this.assessPositionRisks(positions, portfolio)
      const alerts = this.generateRiskAlerts(riskMetrics, positionRisks)

      const assessment: RiskAssessment = {
        canTrade: this.determineCanTrade(riskMetrics, alerts),
        riskLevel: this.calculateOverallRiskLevel(riskMetrics, alerts),
        reason: this.generateRiskReason(riskMetrics, alerts),
        metrics: riskMetrics,
        positionRisks,
        alerts,
        timestamp: new Date(),
        recommendations: this.generateRecommendations(riskMetrics, positionRisks, alerts)
      }

      this.lastAssessment = assessment
      return assessment

    } catch (error) {
      console.error('❌ Risk assessment failed:', error.message)
      return this.getEmergencyRiskAssessment(error.message)
    }
  }

  async validateTrade(
    signal: TradeSignal, 
    portfolio: Portfolio, 
    positions: Position[],
    marketData: MarketData[]
  ): Promise<{ approved: boolean; reason: string; adjustedSize?: number }> {
    
    const symbol = signal.symbol || marketData[0]?.symbol
    if (!symbol) {
      return { approved: false, reason: 'Invalid symbol' }
    }

    // Calculate proposed position size
    const currentPrice = marketData[marketData.length - 1]?.close || 0
    const proposedValue = portfolio.totalValue * 0.05 // 5% default position
    const proposedShares = Math.floor(proposedValue / currentPrice)

    // Risk checks
    const checks = [
      this.checkPositionSizeLimit(proposedValue, portfolio.totalValue),
      this.checkDailyLossLimit(portfolio),
      this.checkDrawdownLimit(portfolio),
      this.checkConcentrationRisk(symbol, proposedValue, positions, portfolio),
      this.checkCorrelationRisk(symbol, positions),
      this.checkLiquidityRisk(symbol, marketData),
      this.checkVolatilityRisk(marketData),
      this.checkStopLossRequirement(signal)
    ]

    const failedChecks = checks.filter(check => !check.passed)
    
    if (failedChecks.length === 0) {
      return { approved: true, reason: 'All risk checks passed' }
    }

    // Try to adjust position size for failed checks
    const criticalFailures = failedChecks.filter(check => check.severity === 'CRITICAL')
    if (criticalFailures.length > 0) {
      return { 
        approved: false, 
        reason: `Critical risk violations: ${criticalFailures.map(c => c.reason).join(', ')}` 
      }
    }

    // Attempt to adjust for warnings
    const adjustedSize = this.calculateAdjustedPositionSize(failedChecks, proposedValue, portfolio)
    if (adjustedSize > proposedValue * 0.5) { // At least 50% of original size
      return { 
        approved: true, 
        reason: 'Approved with adjusted position size',
        adjustedSize
      }
    }

    return { 
      approved: false, 
      reason: `Risk warnings cannot be resolved: ${failedChecks.map(c => c.reason).join(', ')}` 
    }
  }

  private calculateRiskMetrics(portfolio: Portfolio, positions: Position[]): RiskMetrics {
    const currentValue = portfolio.totalValue
    const dayPnL = portfolio.dayPnL || 0
    
    // Update max historical value
    this.maxHistoricalValue = Math.max(this.maxHistoricalValue, currentValue)
    
    // Calculate drawdown
    const drawdown = this.maxHistoricalValue > 0 ? 
      (this.maxHistoricalValue - currentValue) / this.maxHistoricalValue : 0

    // Calculate total exposure
    const totalExposure = positions.reduce((sum, pos) => 
      sum + Math.abs(pos.marketValue || 0), 0)

    // Calculate portfolio volatility (simplified)
    const volatility = this.calculatePortfolioVolatility()

    // Calculate performance metrics
    const trades = this.getRecentTrades() // Would need to implement trade tracking
    const winRate = this.calculateWinRate(trades)
    const { avgWin, avgLoss } = this.calculateAvgWinLoss(trades)
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

    // Value at Risk (simplified)
    const var95 = currentValue * 0.05 * Math.sqrt(volatility) // 5% worst case

    return {
      portfolioValue: currentValue,
      totalExposure,
      dailyPnL: dayPnL,
      drawdown,
      volatility,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: Math.max(drawdown, this.getMaxHistoricalDrawdown()),
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      var95,
      expectedShortfall: var95 * 1.3 // Simplified Expected Shortfall
    }
  }

  private assessPositionRisks(positions: Position[], portfolio: Portfolio): PositionRisk[] {
    return positions.map(position => {
      const exposure = Math.abs(position.marketValue || 0)
      const exposurePercent = exposure / portfolio.totalValue
      const unrealizedPnL = position.unrealizedPnL || 0
      const unrealizedPercent = position.costBasis ? unrealizedPnL / Math.abs(position.costBasis) : 0

      // Calculate position risk score (0-100)
      const riskScore = this.calculatePositionRiskScore(position, portfolio)

      // Estimate beta and correlation (would need market data for accurate calculation)
      const beta = this.estimateBeta(position.symbol)
      const correlation = this.estimateCorrelation(position.symbol, positions)

      // Calculate time held
      const entryTime = position.entryTime || new Date()
      const timeHeld = (Date.now() - entryTime.getTime()) / (1000 * 60 * 60) // Hours

      return {
        symbol: position.symbol,
        exposure,
        exposurePercent,
        unrealizedPnL,
        unrealizedPercent,
        riskScore,
        beta,
        correlation,
        timeHeld,
        stopLossDistance: this.calculateStopLossDistance(position),
        riskRewardRatio: this.calculateRiskRewardRatio(position)
      }
    })
  }

  private generateRiskAlerts(metrics: RiskMetrics, positionRisks: PositionRisk[]): RiskAlert[] {
    const alerts: RiskAlert[] = []

    // Daily loss alert
    if (Math.abs(metrics.dailyPnL) / metrics.portfolioValue > this.config.maxDailyLoss * 0.7) {
      alerts.push({
        level: metrics.dailyPnL < -metrics.portfolioValue * this.config.maxDailyLoss ? 'CRITICAL' : 'WARNING',
        type: 'DRAWDOWN',
        message: `Daily loss approaching limit: ${((Math.abs(metrics.dailyPnL) / metrics.portfolioValue) * 100).toFixed(2)}%`,
        value: Math.abs(metrics.dailyPnL) / metrics.portfolioValue,
        threshold: this.config.maxDailyLoss,
        timestamp: new Date(),
        recommendation: 'Consider reducing position sizes or closing losing trades'
      })
    }

    // Drawdown alert
    if (metrics.drawdown > this.config.maxDrawdown * 0.6) {
      alerts.push({
        level: metrics.drawdown > this.config.maxDrawdown ? 'CRITICAL' : 'WARNING',
        type: 'DRAWDOWN',
        message: `Portfolio drawdown: ${(metrics.drawdown * 100).toFixed(2)}%`,
        value: metrics.drawdown,
        threshold: this.config.maxDrawdown,
        timestamp: new Date(),
        recommendation: 'Review trading strategy and consider reducing risk'
      })
    }

    // Concentration alerts
    const concentratedPositions = positionRisks.filter(pos => pos.exposurePercent > this.config.maxPositionSize * 0.8)
    if (concentratedPositions.length > 0) {
      alerts.push({
        level: 'WARNING',
        type: 'CONCENTRATION',
        message: `${concentratedPositions.length} positions approaching concentration limit`,
        value: Math.max(...concentratedPositions.map(p => p.exposurePercent)),
        threshold: this.config.maxPositionSize,
        timestamp: new Date(),
        recommendation: 'Consider trimming concentrated positions'
      })
    }

    // High correlation alert
    const highCorrelationPositions = positionRisks.filter(pos => pos.correlation > this.config.maxCorrelation)
    if (highCorrelationPositions.length > 2) {
      alerts.push({
        level: 'WARNING',
        type: 'CORRELATION',
        message: `High correlation detected across ${highCorrelationPositions.length} positions`,
        value: Math.max(...highCorrelationPositions.map(p => p.correlation)),
        threshold: this.config.maxCorrelation,
        timestamp: new Date(),
        recommendation: 'Diversify positions to reduce correlation risk'
      })
    }

    // High volatility alert
    if (metrics.volatility > 0.25) { // 25% annualized volatility
      alerts.push({
        level: 'INFO',
        type: 'VOLATILITY',
        message: `Portfolio volatility elevated: ${(metrics.volatility * 100).toFixed(1)}%`,
        value: metrics.volatility,
        threshold: 0.25,
        timestamp: new Date(),
        recommendation: 'Monitor positions closely during high volatility periods'
      })
    }

    return alerts
  }

  private checkPositionSizeLimit(proposedValue: number, portfolioValue: number): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
    const positionPercent = proposedValue / portfolioValue
    const maxAllowed = this.config.maxPositionSize

    if (positionPercent <= maxAllowed) {
      return { passed: true, reason: 'Position size within limits', severity: 'INFO' }
    }

    return {
      passed: false,
      reason: `Drawdown ${(currentDrawdown * 100).toFixed(2)}% exceeds limit of ${(maxAllowed * 100).toFixed(2)}%`,
      severity: 'CRITICAL'
    }
  }

  private checkConcentrationRisk(
    symbol: string, 
    proposedValue: number, 
    positions: Position[], 
    portfolio: Portfolio
  ): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
    
    // Check individual position concentration
    const positionPercent = proposedValue / portfolio.totalValue
    if (positionPercent > this.config.maxPositionSize) {
      return {
        passed: false,
        reason: `Single position concentration risk: ${(positionPercent * 100).toFixed(2)}%`,
        severity: 'CRITICAL'
      }
    }

    // Check sector concentration (simplified - would need sector mapping)
    const sectorExposure = this.calculateSectorExposure(symbol, positions, proposedValue, portfolio)
    if (sectorExposure > this.config.maxSectorExposure) {
      return {
        passed: false,
        reason: `Sector concentration risk: ${(sectorExposure * 100).toFixed(2)}%`,
        severity: 'WARNING'
      }
    }

    return { passed: true, reason: 'Concentration risk acceptable', severity: 'INFO' }
  }

  private checkCorrelationRisk(
    symbol: string, 
    positions: Position[]
  ): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
    
    const highCorrelationCount = positions.filter(pos => {
      const correlation = this.estimateCorrelation(symbol, [pos])
      return correlation > this.config.maxCorrelation
    }).length

    if (highCorrelationCount <= 2) {
      return { passed: true, reason: 'Correlation risk acceptable', severity: 'INFO' }
    }

    return {
      passed: false,
      reason: `High correlation with ${highCorrelationCount} existing positions`,
      severity: highCorrelationCount > 4 ? 'CRITICAL' : 'WARNING'
    }
  }

  private checkLiquidityRisk(
    symbol: string, 
    marketData: MarketData[]
  ): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
    
    if (marketData.length === 0) {
      return { passed: false, reason: 'No market data available', severity: 'CRITICAL' }
    }

    const avgVolume = marketData.slice(-20).reduce((sum, data) => sum + data.volume, 0) / Math.min(20, marketData.length)
    const currentPrice = marketData[marketData.length - 1].close
    const dollarVolume = avgVolume * currentPrice

    if (dollarVolume >= this.config.minLiquidity) {
      return { passed: true, reason: 'Liquidity adequate', severity: 'INFO' }
    }

    return {
      passed: false,
      reason: `Low liquidity: ${dollarVolume.toLocaleString()} daily volume`,
      severity: dollarVolume < this.config.minLiquidity * 0.5 ? 'CRITICAL' : 'WARNING'
    }
  }

  private checkVolatilityRisk(
    marketData: MarketData[]
  ): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
    
    if (marketData.length < 14) {
      return { passed: false, reason: 'Insufficient data for volatility calculation', severity: 'WARNING' }
    }

    const volatility = this.calculateAssetVolatility(marketData)
    const volatilityThreshold = 0.08 // 8% daily volatility

    if (volatility <= volatilityThreshold) {
      return { passed: true, reason: 'Volatility acceptable', severity: 'INFO' }
    }

    return {
      passed: false,
      reason: `High volatility: ${(volatility * 100).toFixed(2)}% daily`,
      severity: volatility > volatilityThreshold * 2 ? 'CRITICAL' : 'WARNING'
    }
  }

  private checkStopLossRequirement(
    signal: TradeSignal
  ): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
    
    if (!this.config.stopLossRequired) {
      return { passed: true, reason: 'Stop loss not required', severity: 'INFO' }
    }

    const hasStopLoss = signal.metadata?.stopLoss || signal.metadata?.stopPrice
    
    if (hasStopLoss) {
      return { passed: true, reason: 'Stop loss defined', severity: 'INFO' }
    }

    return {
      passed: false,
      reason: 'Stop loss required but not defined',
      severity: 'CRITICAL'
    }
  }

  private calculateAdjustedPositionSize(
    failedChecks: any[], 
    originalSize: number, 
    portfolio: Portfolio
  ): number {
    let adjustedSize = originalSize

    // Reduce size for each failed check
    for (const check of failedChecks) {
      if (check.severity === 'WARNING') {
        adjustedSize *= 0.8 // Reduce by 20%
      } else if (check.severity === 'CRITICAL') {
        adjustedSize *= 0.5 // Reduce by 50%
      }
    }

    // Ensure minimum viable position size
    const minSize = portfolio.totalValue * 0.01 // 1% minimum
    return Math.max(adjustedSize, minSize)
  }

  private calculatePositionRiskScore(position: Position, portfolio: Portfolio): number {
    let riskScore = 0

    // Size risk (0-30 points)
    const sizePercent = Math.abs(position.marketValue || 0) / portfolio.totalValue
    riskScore += Math.min(30, sizePercent * 300) // Linear scaling

    // Unrealized P&L risk (0-25 points)
    const unrealizedPercent = position.costBasis ? 
      Math.abs(position.unrealizedPnL || 0) / Math.abs(position.costBasis) : 0
    riskScore += Math.min(25, unrealizedPercent * 50)

    // Time risk (0-20 points) - positions held too long or too short
    const entryTime = position.entryTime || new Date()
    const hoursHeld = (Date.now() - entryTime.getTime()) / (1000 * 60 * 60)
    if (hoursHeld < 1) { // Very short term
      riskScore += 15
    } else if (hoursHeld > 24 * 30) { // Over a month
      riskScore += 10
    }

    // Volatility risk (0-25 points) - would need market data
    const volatilityRisk = this.estimateSymbolVolatility(position.symbol)
    riskScore += volatilityRisk * 25

    return Math.min(100, riskScore)
  }

  private determineCanTrade(metrics: RiskMetrics, alerts: RiskAlert[]): boolean {
    // Critical alerts prevent trading
    const criticalAlerts = alerts.filter(alert => alert.level === 'CRITICAL')
    if (criticalAlerts.length > 0) {
      return false
    }

    // Daily loss limit check
    const dailyLossPercent = Math.abs(metrics.dailyPnL) / metrics.portfolioValue
    if (dailyLossPercent >= this.config.maxDailyLoss) {
      return false
    }

    // Drawdown limit check
    if (metrics.drawdown >= this.config.maxDrawdown) {
      return false
    }

    // Too many warning alerts
    const warningAlerts = alerts.filter(alert => alert.level === 'WARNING')
    if (warningAlerts.length >= 5) {
      return false
    }

    return true
  }

  private calculateOverallRiskLevel(metrics: RiskMetrics, alerts: RiskAlert[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length
    const warningCount = alerts.filter(a => a.level === 'WARNING').length
    
    if (criticalCount > 0) return 'CRITICAL'
    if (warningCount >= 3) return 'HIGH'
    if (warningCount >= 1 || metrics.drawdown > 0.05) return 'MEDIUM'
    return 'LOW'
  }

  private generateRiskReason(metrics: RiskMetrics, alerts: RiskAlert[]): string {
    if (alerts.length === 0) {
      return 'All risk parameters within acceptable limits'
    }

    const criticalAlerts = alerts.filter(a => a.level === 'CRITICAL')
    if (criticalAlerts.length > 0) {
      return `Critical risks: ${criticalAlerts.map(a => a.type).join(', ')}`
    }

    const warningAlerts = alerts.filter(a => a.level === 'WARNING')
    if (warningAlerts.length > 0) {
      return `Warning conditions: ${warningAlerts.map(a => a.type).join(', ')}`
    }

    return 'Minor risk factors detected'
  }

  private generateRecommendations(
    metrics: RiskMetrics, 
    positionRisks: PositionRisk[], 
    alerts: RiskAlert[]
  ): string[] {
    const recommendations: string[] = []

    // High risk positions
    const highRiskPositions = positionRisks.filter(pos => pos.riskScore > 70)
    if (highRiskPositions.length > 0) {
      recommendations.push(`Consider reducing ${highRiskPositions.length} high-risk positions`)
    }

    // Concentration recommendations
    const concentratedPositions = positionRisks.filter(pos => pos.exposurePercent > 0.08)
    if (concentratedPositions.length > 0) {
      recommendations.push(`Diversify concentrated positions: ${concentratedPositions.map(p => p.symbol).join(', ')}`)
    }

    // Drawdown recommendations
    if (metrics.drawdown > 0.10) {
      recommendations.push('Consider reducing overall position sizes due to elevated drawdown')
    }

    // Performance recommendations
    if (metrics.winRate < 0.4) {
      recommendations.push('Review trading strategy - win rate below optimal threshold')
    }

    if (metrics.profitFactor < 1.2) {
      recommendations.push('Improve risk-reward ratio - profit factor needs enhancement')
    }

    // Alert-based recommendations
    for (const alert of alerts) {
      if (alert.recommendation && !recommendations.includes(alert.recommendation)) {
        recommendations.push(alert.recommendation)
      }
    }

    return recommendations.length > 0 ? recommendations : ['Continue monitoring risk metrics']
  }

  // Utility calculation methods

  private calculatePortfolioVolatility(): number {
    if (this.portfolioHistory.length < 10) return 0.02 // Default 2%

    const returns = []
    for (let i = 1; i < this.portfolioHistory.length; i++) {
      const current = this.portfolioHistory[i].totalValue
      const previous = this.portfolioHistory[i - 1].totalValue
      returns.push((current - previous) / previous)
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance * 252) // Annualized
  }

  private calculateSharpeRatio(): number {
    // Simplified Sharpe ratio calculation
    const portfolioReturn = this.calculateAnnualizedReturn()
    const riskFreeRate = 0.02 // 2% risk-free rate
    const volatility = this.calculatePortfolioVolatility()
    
    return volatility > 0 ? (portfolioReturn - riskFreeRate) / volatility : 0
  }

  private calculateAnnualizedReturn(): number {
    if (this.portfolioHistory.length < 2) return 0

    const initial = this.portfolioHistory[0].totalValue
    const current = this.portfolioHistory[this.portfolioHistory.length - 1].totalValue
    const days = (Date.now() - this.portfolioHistory[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)
    
    if (days < 1) return 0
    
    const totalReturn = (current - initial) / initial
    const annualized = Math.pow(1 + totalReturn, 365 / days) - 1
    
    return annualized
  }

  private calculateSectorExposure(symbol: string, positions: Position[], proposedValue: number, portfolio: Portfolio): number {
    // Simplified sector mapping - in production, would use proper sector classification
    const sector = this.getSectorForSymbol(symbol)
    
    let sectorExposure = proposedValue
    
    for (const position of positions) {
      if (this.getSectorForSymbol(position.symbol) === sector) {
        sectorExposure += Math.abs(position.marketValue || 0)
      }
    }
    
    return sectorExposure / portfolio.totalValue
  }

  private getSectorForSymbol(symbol: string): string {
    // Simplified sector classification
    const techSymbols = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'TSLA']
    const financialSymbols = ['JPM', 'BAC', 'WFC', 'GS']
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'ADAUSD']
    
    if (techSymbols.includes(symbol)) return 'Technology'
    if (financialSymbols.includes(symbol)) return 'Financial'
    if (cryptoSymbols.includes(symbol)) return 'Cryptocurrency'
    
    return 'Other'
  }

  private estimateBeta(symbol: string): number {
    // Simplified beta estimation - would need market data for accurate calculation
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'ADAUSD']
    const volatileStocks = ['TSLA', 'NVDA', 'META']
    const stableStocks = ['AAPL', 'MSFT', 'JNJ']
    
    if (cryptoSymbols.includes(symbol)) return 2.5
    if (volatileStocks.includes(symbol)) return 1.8
    if (stableStocks.includes(symbol)) return 0.9
    
    return 1.0
  }

  private estimateCorrelation(symbol: string, positions: Position[]): number {
    // Simplified correlation estimation
    const sector = this.getSectorForSymbol(symbol)
    
    let maxCorrelation = 0
    for (const position of positions) {
      if (this.getSectorForSymbol(position.symbol) === sector) {
        maxCorrelation = Math.max(maxCorrelation, 0.7) // Same sector correlation
      } else {
        maxCorrelation = Math.max(maxCorrelation, 0.3) // Cross-sector correlation
      }
    }
    
    return maxCorrelation
  }

  private estimateSymbolVolatility(symbol: string): number {
    // Simplified volatility estimation (0-1 scale)
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'ADAUSD']
    const volatileStocks = ['TSLA', 'NVDA', 'META']
    const stableStocks = ['AAPL', 'MSFT', 'JNJ']
    
    if (cryptoSymbols.includes(symbol)) return 0.8
    if (volatileStocks.includes(symbol)) return 0.6
    if (stableStocks.includes(symbol)) return 0.3
    
    return 0.4
  }

  private calculateAssetVolatility(marketData: MarketData[]): number {
    if (marketData.length < 14) return 0.05

    const returns = []
    for (let i = 1; i < Math.min(marketData.length, 21); i++) {
      const current = marketData[marketData.length - i].close
      const previous = marketData[marketData.length - i - 1].close
      returns.push((current - previous) / previous)
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance) // Daily volatility
  }

  private calculateStopLossDistance(position: Position): number {
    // Calculate distance to stop loss as percentage
    const stopLoss = position.stopLoss || 0
    const currentPrice = position.currentPrice || 0
    
    if (stopLoss === 0 || currentPrice === 0) return 0
    
    return Math.abs((currentPrice - stopLoss) / currentPrice)
  }

  private calculateRiskRewardRatio(position: Position): number {
    // Calculate risk-reward ratio
    const entryPrice = position.avgCostPerShare || position.currentPrice || 0
    const stopLoss = position.stopLoss || 0
    const takeProfit = position.takeProfit || 0
    
    if (entryPrice === 0 || stopLoss === 0 || takeProfit === 0) return 0
    
    const risk = Math.abs(entryPrice - stopLoss)
    const reward = Math.abs(takeProfit - entryPrice)
    
    return risk > 0 ? reward / risk : 0
  }

  private getRecentTrades(): any[] {
    // Would implement trade tracking in production
    return []
  }

  private calculateWinRate(trades: any[]): number {
    if (trades.length === 0) return 0.5
    
    const wins = trades.filter(trade => trade.pnl > 0).length
    return wins / trades.length
  }

  private calculateAvgWinLoss(trades: any[]): { avgWin: number; avgLoss: number } {
    if (trades.length === 0) return { avgWin: 0, avgLoss: 0 }
    
    const wins = trades.filter(trade => trade.pnl > 0)
    const losses = trades.filter(trade => trade.pnl < 0)
    
    const avgWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? losses.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0) / losses.length : 0
    
    return { avgWin, avgLoss }
  }

  private getMaxHistoricalDrawdown(): number {
    // Calculate maximum historical drawdown
    let maxDrawdown = 0
    let peak = 0
    
    for (const portfolio of this.portfolioHistory) {
      peak = Math.max(peak, portfolio.totalValue)
      const drawdown = (peak - portfolio.totalValue) / peak
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
    
    return maxDrawdown
  }

  private updatePortfolioHistory(portfolio: Portfolio): void {
    // Add timestamp if not present
    const timestampedPortfolio = {
      ...portfolio,
      timestamp: portfolio.timestamp || new Date()
    }
    
    this.portfolioHistory.push(timestampedPortfolio)
    
    // Keep only last 100 records to prevent memory issues
    if (this.portfolioHistory.length > 100) {
      this.portfolioHistory = this.portfolioHistory.slice(-100)
    }
  }

  private async loadHistoricalData(): Promise<void> {
    // In production, would load from database
    console.log('📊 Loading historical portfolio data...')
  }

  private resetDailyCounters(): void {
    const today = new Date().toDateString()
    const lastReset = localStorage.getItem('risk_last_reset')
    
    if (lastReset !== today) {
      this.dailyStartingBalance = 0
      localStorage.setItem('risk_last_reset', today)
      console.log('🔄 Daily risk counters reset')
    }
  }

  private getEmergencyRiskAssessment(errorMessage: string): RiskAssessment {
    return {
      canTrade: false,
      riskLevel: 'CRITICAL',
      reason: `Risk assessment failed: ${errorMessage}`,
      metrics: this.getEmptyRiskMetrics(),
      positionRisks: [],
      alerts: [{
        level: 'CRITICAL',
        type: 'VOLATILITY',
        message: 'Risk assessment system failure',
        value: 1,
        threshold: 0,
        timestamp: new Date(),
        recommendation: 'Manual review required'
      }],
      timestamp: new Date(),
      recommendations: ['System error - manual intervention required']
    }
  }

  private getEmptyRiskMetrics(): RiskMetrics {
    return {
      portfolioValue: 0,
      totalExposure: 0,
      dailyPnL: 0,
      drawdown: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      var95: 0,
      expectedShortfall: 0
    }
  }

  private async generateRiskReport(): Promise<void> {
    if (!this.lastAssessment) return
    
    console.log('📋 Generating risk report...')
    // Would save detailed risk report to file/database
  }

  // Public methods for monitoring and control

  public getCurrentRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return this.lastAssessment?.riskLevel || 'MEDIUM'
  }

  public getRiskAlerts(): RiskAlert[] {
    return [...this.riskAlerts]
  }

  public getLastAssessment(): RiskAssessment | null {
    return this.lastAssessment
  }

  public updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ Risk management config updated')
  }

  public clearAlerts(): void {
    this.riskAlerts = []
    console.log('🗑️ Risk alerts cleared')
  }

  public isReady(): boolean {
    return this.isInitialized
  }

  public getPortfolioHistory(): Portfolio[] {
    return [...this.portfolioHistory]
  }
}
//       reason: `Position size ${(positionPercent * 100).toFixed(2)}% exceeds limit of ${(maxAllowed * 100).toFixed(2)}%`,
//       severity: positionPercent > maxAllowed * 1.5 ? 'CRITICAL' : 'WARNING'
//     }
//   }

//   private checkDailyLossLimit(portfolio: Portfolio): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
//     const dailyLossPercent = Math.abs(portfolio.dayPnL || 0) / portfolio.totalValue
//     const maxAllowed = this.config.maxDailyLoss

//     if (portfolio.dayPnL >= -portfolio.totalValue * maxAllowed) {
//       return { passed: true, reason: 'Daily loss within limits', severity: 'INFO' }
//     }

//     return {
//       passed: false,
//       reason: `Daily loss ${(dailyLossPercent * 100).toFixed(2)}% exceeds limit of ${(maxAllowed * 100).toFixed(2)}%`,
//       severity: 'CRITICAL'
//     }
//   }

//   private checkDrawdownLimit(portfolio: Portfolio): { passed: boolean; reason: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } {
//     const currentDrawdown = this.maxHistoricalValue > 0 ? 
//       (this.maxHistoricalValue - portfolio.totalValue) / this.maxHistoricalValue : 0
    
//     const maxAllowed = this.config.maxDrawdown

//     if (currentDrawdown <= maxAllowed) {
//       return { passed: true, reason: 'Drawdown within limits', severity: 'INFO' }
//     }

//     return {
//       passed: false