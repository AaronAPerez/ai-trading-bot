import alpaca from '../alpaca'
import { SignalResult } from './SignalEngine'
import { AlpacaAccount, AlpacaPosition, RiskLevel } from '@/types/trading'

export interface RiskContext {
  userId: string
  portfolioValue?: number
  positions?: AlpacaPosition[]
  account?: AlpacaAccount
  metrics?: {
    drawdown?: number
    exposure?: number
    dailyPnL?: number
    volatility?: number
  }
  config?: RiskConfig
}

export interface RiskConfig {
  maxDrawdown: number // Maximum allowable drawdown (0.15 = 15%)
  maxExposure: number // Maximum portfolio exposure (0.5 = 50%)
  maxPositionSize: number // Maximum single position size (0.1 = 10% of portfolio)
  maxDailyLoss: number // Maximum daily loss (0.05 = 5%)
  maxCorrelation: number // Maximum correlation between positions (0.7 = 70%)
  minConfidence: number // Minimum signal confidence (0.6 = 60%)
  maxOpenPositions: number // Maximum number of open positions
  requireStopLoss: boolean // Require stop loss on all trades
  maxLeverage: number // Maximum leverage (2 = 2x)
}

export interface RiskCheck {
  approved: boolean
  reason: string
  riskLevel: RiskLevel
  warnings: string[]
  metrics: {
    drawdown: number
    exposure: number
    positionSize: number
    dailyPnL: number
    openPositions: number
    availableBuyingPower: number
  }
  recommendations: string[]
}

export class RiskEngine {
  private defaultConfig: RiskConfig = {
    maxDrawdown: 0.15, // 15%
    maxExposure: 0.5, // 50%
    maxPositionSize: 0.1, // 10%
    maxDailyLoss: 0.05, // 5%
    maxCorrelation: 0.7, // 70%
    minConfidence: 0.6, // 60%
    maxOpenPositions: 10,
    requireStopLoss: true,
    maxLeverage: 2.0
  }

  constructor(private config?: Partial<RiskConfig>) {
    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config }
    }
  }

  async evaluate(signal: SignalResult, context: RiskContext): Promise<RiskCheck> {
    const warnings: string[] = []
    const recommendations: string[] = []
    const riskConfig = { ...this.defaultConfig, ...context.config }

    try {
      // Get account and position data from Alpaca
      const account = context.account || await this.getAccount()
      const positions = context.positions || await this.getPositions()

      if (!account) {
        return {
          approved: false,
          reason: 'Unable to fetch account data',
          riskLevel: 'CRITICAL',
          warnings: ['Account data unavailable'],
          metrics: this.getEmptyMetrics(),
          recommendations: ['Check Alpaca API connection']
        }
      }

      // Calculate risk metrics
      const portfolioValue = parseFloat(account.portfolio_value)
      const equity = parseFloat(account.equity)
      const lastEquity = parseFloat(account.last_equity)
      const buyingPower = parseFloat(account.buying_power)
      const cash = parseFloat(account.cash)

      const dailyPnL = equity - lastEquity
      const dailyPnLPercent = lastEquity > 0 ? (dailyPnL / lastEquity) : 0

      // Calculate drawdown
      const drawdown = this.calculateDrawdown(positions, portfolioValue)

      // Calculate exposure
      const longMarketValue = parseFloat(account.long_market_value)
      const shortMarketValue = Math.abs(parseFloat(account.short_market_value))
      const totalExposure = longMarketValue + shortMarketValue
      const exposurePercent = portfolioValue > 0 ? (totalExposure / portfolioValue) : 0

      // Calculate position size for new trade (estimate)
      const estimatedPositionSize = this.estimatePositionSize(signal, cash, portfolioValue)
      const positionSizePercent = portfolioValue > 0 ? (estimatedPositionSize / portfolioValue) : 0

      const metrics = {
        drawdown,
        exposure: exposurePercent,
        positionSize: positionSizePercent,
        dailyPnL: dailyPnLPercent,
        openPositions: positions.length,
        availableBuyingPower: buyingPower
      }

      // Risk checks
      const checks = {
        drawdown: drawdown <= riskConfig.maxDrawdown,
        exposure: exposurePercent <= riskConfig.maxExposure,
        positionSize: positionSizePercent <= riskConfig.maxPositionSize,
        dailyLoss: dailyPnLPercent >= -riskConfig.maxDailyLoss,
        confidence: signal.confidence >= riskConfig.minConfidence,
        openPositions: positions.length < riskConfig.maxOpenPositions,
        stopLoss: !riskConfig.requireStopLoss || signal.stopLoss > 0,
        buyingPower: buyingPower > estimatedPositionSize
      }

      // Determine risk level
      let riskLevel: RiskLevel = 'LOW'
      if (drawdown > riskConfig.maxDrawdown * 0.8 || exposurePercent > riskConfig.maxExposure * 0.8) {
        riskLevel = 'HIGH'
      } else if (drawdown > riskConfig.maxDrawdown * 0.6 || exposurePercent > riskConfig.maxExposure * 0.6) {
        riskLevel = 'MEDIUM'
      }

      // Critical conditions
      if (!checks.drawdown) {
        return {
          approved: false,
          reason: `Drawdown breach: ${(drawdown * 100).toFixed(2)}% exceeds max ${(riskConfig.maxDrawdown * 100).toFixed(0)}%`,
          riskLevel: 'CRITICAL',
          warnings: ['Trading suspended due to drawdown'],
          metrics,
          recommendations: ['Reduce position sizes', 'Review stop losses', 'Wait for market recovery']
        }
      }

      if (!checks.exposure) {
        return {
          approved: false,
          reason: `Exposure too high: ${(exposurePercent * 100).toFixed(2)}% exceeds max ${(riskConfig.maxExposure * 100).toFixed(0)}%`,
          riskLevel: 'CRITICAL',
          warnings: ['Portfolio overexposed'],
          metrics,
          recommendations: ['Close some positions', 'Reduce position sizes']
        }
      }

      if (!checks.dailyLoss) {
        return {
          approved: false,
          reason: `Daily loss limit reached: ${(dailyPnLPercent * 100).toFixed(2)}% loss`,
          riskLevel: 'CRITICAL',
          warnings: ['Daily loss limit exceeded'],
          metrics,
          recommendations: ['Stop trading for today', 'Review strategy performance']
        }
      }

      if (!checks.buyingPower) {
        return {
          approved: false,
          reason: 'Insufficient buying power',
          riskLevel: 'HIGH',
          warnings: ['Not enough buying power for this trade'],
          metrics,
          recommendations: ['Reduce position size', 'Close losing positions to free up capital']
        }
      }

      if (!checks.confidence) {
        warnings.push(`Low confidence signal: ${(signal.confidence * 100).toFixed(0)}%`)
        recommendations.push('Consider waiting for stronger signal')
      }

      if (!checks.positionSize) {
        warnings.push(`Position size too large: ${(positionSizePercent * 100).toFixed(2)}%`)
        recommendations.push(`Reduce position to max ${(riskConfig.maxPositionSize * 100).toFixed(0)}%`)
      }

      if (!checks.stopLoss) {
        warnings.push('No stop loss defined')
        recommendations.push('Add stop loss protection')
        if (riskConfig.requireStopLoss) {
          return {
            approved: false,
            reason: 'Stop loss required but not set',
            riskLevel: 'HIGH',
            warnings,
            metrics,
            recommendations
          }
        }
      }

      if (!checks.openPositions) {
        return {
          approved: false,
          reason: `Maximum open positions reached: ${positions.length}`,
          riskLevel: 'MEDIUM',
          warnings: ['Too many open positions'],
          metrics,
          recommendations: ['Close some positions before opening new ones']
        }
      }

      // Additional warnings
      if (signal.action === 'HOLD') {
        return {
          approved: false,
          reason: 'Signal recommends HOLD',
          riskLevel: 'LOW',
          warnings: ['No clear trading signal'],
          metrics,
          recommendations: ['Wait for clearer market conditions']
        }
      }

      if (account.trading_blocked) {
        return {
          approved: false,
          reason: 'Trading blocked on account',
          riskLevel: 'CRITICAL',
          warnings: ['Account trading restrictions'],
          metrics,
          recommendations: ['Contact broker support']
        }
      }

      // All checks passed
      return {
        approved: true,
        reason: 'All risk checks passed',
        riskLevel,
        warnings,
        metrics,
        recommendations: recommendations.length > 0 ? recommendations : ['Trade within normal parameters']
      }

    } catch (error: any) {
      console.error('❌ Risk evaluation failed:', error)
      return {
        approved: false,
        reason: `Risk evaluation error: ${error.message}`,
        riskLevel: 'CRITICAL',
        warnings: ['Unable to complete risk assessment'],
        metrics: this.getEmptyMetrics(),
        recommendations: ['Check system connectivity', 'Retry risk evaluation']
      }
    }
  }

  private async getAccount(): Promise<AlpacaAccount | null> {
    try {
      const account = await alpaca.getAccount()
      return account as AlpacaAccount
    } catch (error) {
      console.error('Failed to fetch account:', error)
      return null
    }
  }

  private async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const positions = await alpaca.getPositions()
      return positions as AlpacaPosition[]
    } catch (error) {
      console.error('Failed to fetch positions:', error)
      return []
    }
  }

  private calculateDrawdown(positions: AlpacaPosition[], portfolioValue: number): number {
    if (positions.length === 0) return 0

    const totalUnrealizedPnL = positions.reduce((sum, pos) => {
      return sum + parseFloat(pos.unrealized_pl.toString())
    }, 0)

    const drawdown = portfolioValue > 0 ? Math.abs(Math.min(0, totalUnrealizedPnL) / portfolioValue) : 0
    return drawdown
  }

  private estimatePositionSize(signal: SignalResult, cash: number, portfolioValue: number): number {
    // Estimate based on signal confidence and available cash
    // Use Kelly Criterion simplified: f = (bp - q) / b where b=1, p=confidence, q=1-confidence
    const kelly = (2 * signal.confidence - 1)
    const kellyFraction = Math.max(0.1, Math.min(kelly, 0.25)) // Cap between 10% and 25%

    const estimatedSize = portfolioValue * kellyFraction
    return Math.min(estimatedSize, cash * 0.8) // Don't use more than 80% of cash
  }

  private getEmptyMetrics() {
    return {
      drawdown: 0,
      exposure: 0,
      positionSize: 0,
      dailyPnL: 0,
      openPositions: 0,
      availableBuyingPower: 0
    }
  }

  /**
   * Update risk configuration
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig }
  }

  /**
   * Get current risk configuration
   */
  getConfig(): RiskConfig {
    return { ...this.defaultConfig }
  }
}