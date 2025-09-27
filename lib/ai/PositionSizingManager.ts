/**
 * Enhanced Position Sizing Manager
 * Implements the position sizing fixes from position_sizing_fix.ts
 */

export interface PositionSizeConfig {
  maxPositionPercent: number
  basePositionPercent: number
  minOrderValue: number
  maxOrderValue: number
  buyingPowerBuffer: number
  conservativeMode?: boolean // Ultra-conservative mode from quick_fix_patch
}

export interface PositionSizeResult {
  positionSize: number
  positionPercent: number
  reasoning: string
  withinLimits: boolean
}

export class PositionSizingManager {
  private config: PositionSizeConfig

  constructor(config?: Partial<PositionSizeConfig>) {
    this.config = {
      maxPositionPercent: 0.15, // 15% max (reduced to 10% in conservative mode)
      basePositionPercent: 0.05, // 5% base (reduced to 3% in conservative mode)
      minOrderValue: 25,
      maxOrderValue: 1000, // Reduced to 200 in conservative mode
      buyingPowerBuffer: 0.05, // 5% buffer
      conservativeMode: false, // Default to normal mode
      ...config
    }

    // Apply conservative mode adjustments from quick_fix_patch.ts
    if (this.config.conservativeMode) {
      this.config.maxPositionPercent = Math.min(this.config.maxPositionPercent, 0.10) // Max 10%
      this.config.basePositionPercent = Math.min(this.config.basePositionPercent, 0.03) // Base 3%
      this.config.maxOrderValue = Math.min(this.config.maxOrderValue, 200) // Max $200
      this.config.buyingPowerBuffer = Math.max(this.config.buyingPowerBuffer, 0.05) // At least 5% buffer
      console.log('🛡️ Conservative mode enabled - using ultra-safe position sizing limits')
    }
  }

  calculatePositionSize(
    confidence: number,
    symbol: string,
    availableBuyingPower: number,
    currentPrice?: number
  ): PositionSizeResult {
    console.log(`💰 Calculating position size for ${symbol}: confidence=${confidence}%, buyingPower=$${availableBuyingPower}`)

    // Validate inputs
    if (availableBuyingPower < this.config.minOrderValue) {
      return {
        positionSize: 0,
        positionPercent: 0,
        reasoning: `Insufficient buying power: $${availableBuyingPower} (minimum $${this.config.minOrderValue} required)`,
        withinLimits: false
      }
    }

    // Enhanced confidence adjustment with conservative mode support
    let adjustedPercent: number

    if (this.config.conservativeMode) {
      // Use quick_fix_patch approach: confidence bonus only above 60%
      const confidenceBonus = Math.max(0, (confidence - 60) / 100) * 0.07 // Up to 7% bonus
      adjustedPercent = Math.min(this.config.basePositionPercent + confidenceBonus, this.config.maxPositionPercent)
    } else {
      // Original approach: confidence adjustment from 50%
      const confidenceMultiplier = Math.max(0, (confidence - 50) / 100) // 0 to 0.5 multiplier
      adjustedPercent = Math.min(
        this.config.basePositionPercent + (this.config.maxPositionPercent - this.config.basePositionPercent) * confidenceMultiplier,
        this.config.maxPositionPercent
      )
    }

    // Calculate position size
    let positionSize = availableBuyingPower * adjustedPercent

    // Apply minimum and maximum limits
    const maxOrderSize = Math.min(this.config.maxOrderValue, availableBuyingPower * 0.8) // Max $1000 or 80% of buying power

    positionSize = Math.max(this.config.minOrderValue, Math.min(positionSize, maxOrderSize))

    // CRITICAL: Ensure we don't exceed buying power with buffer
    const maxAllowedPosition = availableBuyingPower * (1 - this.config.buyingPowerBuffer)
    positionSize = Math.min(positionSize, maxAllowedPosition)

    // EXTRA SAFETY: Never exceed 20% of buying power (from quick_fix_patch)
    if (this.config.conservativeMode) {
      positionSize = Math.min(positionSize, availableBuyingPower * 0.20)
    }

    // Round to cents
    positionSize = Math.round(positionSize * 100) / 100

    // Calculate actual percentage used
    const actualPercent = positionSize / availableBuyingPower

    const reasoning = [
      `${(confidence).toFixed(1)}% confidence → ${(adjustedPercent * 100).toFixed(1)}% of buying power`,
      `Position size: $${positionSize} (${(actualPercent * 100).toFixed(1)}% of buying power)`,
      `Limits: Min $${this.config.minOrderValue}, Max $${maxOrderSize}`,
      `Buffer: ${(this.config.buyingPowerBuffer * 100).toFixed(1)}% kept in reserve`,
      ...(this.config.conservativeMode ? ['🛡️ Conservative mode active'] : [])
    ].join(' | ')

    console.log(`💰 Position sizing result: ${reasoning}`)

    return {
      positionSize,
      positionPercent: actualPercent,
      reasoning,
      withinLimits: positionSize >= this.config.minOrderValue && positionSize <= maxAllowedPosition
    }
  }

  validatePositionSize(
    positionSize: number,
    availableBuyingPower: number,
    symbol: string
  ): { valid: boolean; reason?: string } {
    if (positionSize < this.config.minOrderValue) {
      return {
        valid: false,
        reason: `Position size $${positionSize} below minimum $${this.config.minOrderValue}`
      }
    }

    if (positionSize > availableBuyingPower * (1 - this.config.buyingPowerBuffer)) {
      return {
        valid: false,
        reason: `Position size $${positionSize} exceeds available buying power $${availableBuyingPower} (with ${(this.config.buyingPowerBuffer * 100)}% buffer)`
      }
    }

    if (positionSize > this.config.maxOrderValue) {
      return {
        valid: false,
        reason: `Position size $${positionSize} exceeds maximum order value $${this.config.maxOrderValue}`
      }
    }

    return { valid: true }
  }

  updateConfig(newConfig: Partial<PositionSizeConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 Position sizing configuration updated:', this.config)
  }

  getConfig(): PositionSizeConfig {
    return { ...this.config }
  }
}