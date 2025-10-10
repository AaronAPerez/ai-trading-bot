import { Position, RiskConfig } from "@/types/trading"
import { RiskManagementEngine } from "../trading/engines/RiskManagementEngine"

/**
 * Enhanced Risk Management
 * Extends base risk management with advanced features:
 * - Kelly Criterion position sizing
 * - Correlation-based position adjustments
 * - Trailing stop loss implementation
 * - Dynamic profit protection
 */
export class EnhancedRiskManagement extends RiskManagementEngine {
  private readonly maxPositionSizePercent = 0.10 // 10% max per position
  private readonly kellyFraction = 0.25 // Use 25% of Kelly size (fractional Kelly)

  constructor(config: RiskConfig) {
    super(config)
  }

  /**
   * Calculate dynamic position sizing based on:
   * - Account equity
   * - Strategy confidence
   * - Market volatility
   * - Correlation with existing positions
   */
  calculateOptimalPositionSize(params: {
    symbol: string
    confidence: number
    volatility: number
    accountEquity: number
    existingPositions: Position[]
  }): number {
    // Base position size using Kelly Criterion
    const kellySize = this.calculateKellySize(params.confidence, params.volatility, params.accountEquity)

    // Reduce size based on correlation with existing positions
    const correlationAdjustment = this.calculateCorrelationAdjustment(
      params.symbol,
      params.existingPositions
    )

    // Apply volatility scaling
    const volatilityScaling = params.volatility > 0.30 ? 0.7 :  // High vol: reduce 30%
                              params.volatility > 0.20 ? 0.9 :  // Medium vol: reduce 10%
                              1.0                                // Low vol: full size

    // Final position size
    const optimalSize = kellySize * correlationAdjustment * volatilityScaling

    // Never risk more than 2% of account on a single trade
    const maxRiskAmount = params.accountEquity * 0.02

    // Never exceed max position size
    const maxPositionAmount = params.accountEquity * this.maxPositionSizePercent

    return Math.min(optimalSize, maxRiskAmount, maxPositionAmount)
  }

  /**
   * Calculate Kelly Criterion position size
   * Kelly% = W - (1 - W) / R
   * Where W = win rate, R = win/loss ratio
   */
  private calculateKellySize(confidence: number, volatility: number, accountEquity: number): number {
    // Estimate win rate from confidence (simplified)
    const winRate = 0.45 + (confidence * 0.30) // 45%-75% based on confidence

    // Estimate win/loss ratio (1.5:1 to 2.5:1 based on volatility)
    const winLossRatio = volatility < 0.20 ? 2.5 : volatility < 0.30 ? 2.0 : 1.5

    // Kelly percentage
    const kelly = winRate - ((1 - winRate) / winLossRatio)

    // Use fractional Kelly (25%) to reduce risk
    const fractionalKelly = Math.max(0, kelly) * this.kellyFraction

    // Convert to dollar amount
    return accountEquity * fractionalKelly
  }

  /**
   * Calculate correlation adjustment
   * Reduces position size if highly correlated with existing positions
   */
  private calculateCorrelationAdjustment(
    symbol: string,
    existingPositions: Position[]
  ): number {
    if (existingPositions.length === 0) {
      return 1.0 // No adjustment needed
    }

    // Check if we already have this symbol
    const existingPosition = existingPositions.find(p => p.symbol === symbol)
    if (existingPosition) {
      return 0.5 // Reduce size by 50% if adding to existing position
    }

    // Check for same asset class correlation
    const isCrypto = symbol.includes('USD') || symbol.includes('BTC') || symbol.includes('ETH')
    const cryptoPositions = existingPositions.filter(p =>
      p.symbol.includes('USD') || p.symbol.includes('BTC') || p.symbol.includes('ETH')
    )

    if (isCrypto && cryptoPositions.length >= 3) {
      return 0.7 // Reduce size if already heavily exposed to crypto
    }

    // Stock positions
    const stockPositions = existingPositions.filter(p =>
      !p.symbol.includes('USD') && !p.symbol.includes('BTC') && !p.symbol.includes('ETH')
    )

    if (!isCrypto && stockPositions.length >= 5) {
      return 0.8 // Slight reduction for high stock count
    }

    return 1.0 // No adjustment
  }

  /**
   * Implement profit protection with trailing stops
   */
  calculateTrailingStop(params: {
    entryPrice: number
    currentPrice: number
    side: 'LONG' | 'SHORT'
    profitPercent: number
  }): number {
    const profitMove = Math.abs(params.currentPrice - params.entryPrice)

    // Once profit reaches 10%, tighten to 70% trailing stop
    if (params.profitPercent >= 10) {
      const trailAmount = profitMove * 0.7

      return params.side === 'LONG'
        ? params.entryPrice + trailAmount
        : params.entryPrice - trailAmount
    }

    // Once profit reaches 5%, implement 50% trailing stop
    if (params.profitPercent >= 5) {
      const trailAmount = profitMove * 0.5

      return params.side === 'LONG'
        ? params.entryPrice + trailAmount
        : params.entryPrice - trailAmount
    }

    // Below 5% profit, use initial stop loss (2% from entry)
    const initialStopPercent = 0.02

    return params.side === 'LONG'
      ? params.entryPrice * (1 - initialStopPercent)
      : params.entryPrice * (1 + initialStopPercent)
  }

  /**
   * Calculate take profit level with scaled exits
   */
  calculateTakeProfit(params: {
    entryPrice: number
    side: 'LONG' | 'SHORT'
    volatility: number
    confidence: number
  }): number[] {
    // First target: Conservative (2-3%)
    const target1Percent = params.volatility > 0.30 ? 0.03 : 0.02

    // Second target: Moderate (4-5%)
    const target2Percent = params.volatility > 0.30 ? 0.05 : 0.04

    // Third target: Aggressive (6-8%)
    const target3Percent = params.confidence > 0.7 ? 0.08 : 0.06

    if (params.side === 'LONG') {
      return [
        params.entryPrice * (1 + target1Percent),
        params.entryPrice * (1 + target2Percent),
        params.entryPrice * (1 + target3Percent)
      ]
    } else {
      return [
        params.entryPrice * (1 - target1Percent),
        params.entryPrice * (1 - target2Percent),
        params.entryPrice * (1 - target3Percent)
      ]
    }
  }

  /**
   * Determine if position should be closed based on risk
   */
  shouldClosePosition(position: Position, currentPrice: number): {
    shouldClose: boolean
    reason: string
  } {
    const unrealizedPnLPercent = ((currentPrice - parseFloat(position.avg_entry_price)) / parseFloat(position.avg_entry_price)) * 100
    const side: 'LONG' | 'SHORT' = parseFloat(position.qty) > 0 ? 'LONG' : 'SHORT'

    // Check stop loss
    const trailingStop = this.calculateTrailingStop({
      entryPrice: parseFloat(position.avg_entry_price),
      currentPrice,
      side,
      profitPercent: unrealizedPnLPercent
    })

    if (side === 'LONG' && currentPrice <= trailingStop) {
      return { shouldClose: true, reason: 'Trailing stop triggered' }
    }

    if (side === 'SHORT' && currentPrice >= trailingStop) {
      return { shouldClose: true, reason: 'Trailing stop triggered' }
    }

    // Check max loss
    if (unrealizedPnLPercent <= -5) {
      return { shouldClose: true, reason: 'Max loss reached (-5%)' }
    }

    return { shouldClose: false, reason: '' }
  }
}