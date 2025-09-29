/**
 * Configuration Validator for AI Trading Bot
 * Validates environment variables and trading configuration
 */

export interface ConfigValidationResult {
  valid: boolean
  issues: string[]
  warnings: string[]
  config: {
    apiKeyExists: boolean
    secretKeyExists: boolean
    tradingMode: 'paper' | 'live' | 'unknown'
    baseUrl: string
  }
}

export class ConfigValidator {
  static validateEnvironment(): ConfigValidationResult {
    const issues: string[] = []
    const warnings: string[] = []

    // Check for correct Alpaca environment variables
    const apiKey = process.env.APCA_API_KEY_ID
    const secretKey = process.env.APCA_API_SECRET_KEY
    const tradingMode = process.env.NEXT_PUBLIC_TRADING_MODE

    // API Key validation
    if (!apiKey) {
      issues.push('Missing APCA_API_KEY_ID environment variable')
    } else if (apiKey.length < 10) {
      issues.push('APCA_API_KEY_ID appears to be invalid (too short)')
    }

    // Secret Key validation
    if (!secretKey) {
      issues.push('Missing APCA_API_SECRET_KEY environment variable')
    } else if (secretKey.length < 20) {
      issues.push('APCA_API_SECRET_KEY appears to be invalid (too short)')
    }

    // Trading mode validation
    let mode: 'paper' | 'live' | 'unknown' = 'unknown'
    if (tradingMode === 'paper') {
      mode = 'paper'
    } else if (tradingMode === 'live') {
      mode = 'live'
      warnings.push('⚠️ LIVE TRADING MODE DETECTED - Real money at risk!')
    } else {
      mode = 'paper' // Default to paper
      warnings.push('Trading mode not specified, defaulting to paper trading')
    }

    // Base URL validation
    const baseUrl = mode === 'paper'
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets'

    // Check for deprecated environment variables
    if (process.env.APCA_API_KEY_ID) {
      warnings.push('Deprecated: APCA_API_KEY_ID found. Use APCA_API_KEY_ID instead')
    }
    if (process.env.APCA_API_SECRET_KEY) {
      warnings.push('Deprecated: APCA_API_SECRET_KEY found. Use APCA_API_SECRET_KEY instead')
    }

    // Ensure paper trading for safety
    if (mode !== 'paper') {
      issues.push('For safety, only paper trading is currently supported')
    }

    const config = {
      apiKeyExists: !!apiKey,
      secretKeyExists: !!secretKey,
      tradingMode: mode,
      baseUrl
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      config
    }
  }

  static validatePositionSizingConfig(config: any): string[] {
    const issues: string[] = []

    if (!config.maxPositionPercent || config.maxPositionPercent <= 0 || config.maxPositionPercent > 1) {
      issues.push('maxPositionPercent must be between 0 and 1')
    }

    if (!config.basePositionPercent || config.basePositionPercent <= 0 || config.basePositionPercent > config.maxPositionPercent) {
      issues.push('basePositionPercent must be between 0 and maxPositionPercent')
    }

    if (!config.minOrderValue || config.minOrderValue < 1) {
      issues.push('minOrderValue must be at least $1')
    }

    if (!config.maxOrderValue || config.maxOrderValue < config.minOrderValue) {
      issues.push('maxOrderValue must be greater than minOrderValue')
    }

    if (!config.buyingPowerBuffer || config.buyingPowerBuffer < 0 || config.buyingPowerBuffer > 0.5) {
      issues.push('buyingPowerBuffer must be between 0 and 0.5')
    }

    return issues
  }

  static validateTradingConfig(config: any): string[] {
    const issues: string[] = []

    if (!config.confidenceThresholds) {
      issues.push('Missing confidenceThresholds configuration')
    } else {
      const ct = config.confidenceThresholds
      if (ct.minimum < 0.5 || ct.minimum > 1) {
        issues.push('confidenceThresholds.minimum must be between 0.5 and 1')
      }
      if (ct.conservative < ct.minimum || ct.conservative > 1) {
        issues.push('confidenceThresholds.conservative must be between minimum and 1')
      }
      if (ct.aggressive < ct.conservative || ct.aggressive > 1) {
        issues.push('confidenceThresholds.aggressive must be between conservative and 1')
      }
    }

    if (!config.riskControls) {
      issues.push('Missing riskControls configuration')
    } else {
      const rc = config.riskControls
      if (rc.maxDailyTrades < 1 || rc.maxDailyTrades > 500) {
        issues.push('riskControls.maxDailyTrades must be between 1 and 500')
      }
      if (rc.maxOpenPositions < 1 || rc.maxOpenPositions > 100) {
        issues.push('riskControls.maxOpenPositions must be between 1 and 100')
      }
      if (rc.maxDailyLoss < 0.01 || rc.maxDailyLoss > 0.2) {
        issues.push('riskControls.maxDailyLoss must be between 0.01 and 0.2')
      }
    }

    return issues
  }

  static logValidationResult(result: ConfigValidationResult): void {
    console.log('🔧 Configuration Validation Results:')

    if (result.valid) {
      console.log('✅ Configuration is valid')
    } else {
      console.log('❌ Configuration validation failed')
      result.issues.forEach(issue => console.log(`   ❌ ${issue}`))
    }

    if (result.warnings.length > 0) {
      console.log('⚠️ Warnings:')
      result.warnings.forEach(warning => console.log(`   ⚠️ ${warning}`))
    }

    console.log('📊 Configuration summary:', {
      apiKeyConfigured: result.config.apiKeyExists,
      secretKeyConfigured: result.config.secretKeyExists,
      tradingMode: result.config.tradingMode,
      baseUrl: result.config.baseUrl
    })
  }

  static getRecommendedEnvironmentVariables(): string {
    return `
# Required Alpaca API credentials
APCA_API_KEY_ID=your_APCA_API_KEY_ID_here
APCA_API_SECRET_KEY=your_APCA_API_SECRET_KEY_here

# Trading mode (paper or live) - ONLY use paper for safety
NEXT_PUBLIC_TRADING_MODE=paper

# Optional: Override base URL (defaults to paper trading)
# ALPACA_BASE_URL=https://paper-api.alpaca.markets
`
  }
}