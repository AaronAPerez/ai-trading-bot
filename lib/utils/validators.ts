// ===============================================
// VALIDATE TRADING REQUEST - Complete Implementation
// src/lib/utils/validators.ts
// ===============================================

import { z } from 'zod'
import { EngineType, TradingMode } from '../../types/trading'

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const ConfidenceThresholdSchema = z.object({
  minimum: z.number().min(0).max(1, 'Minimum confidence must be between 0 and 1'),
  conservative: z.number().min(0).max(1, 'Conservative confidence must be between 0 and 1'),
  aggressive: z.number().min(0).max(1, 'Aggressive confidence must be between 0 and 1'),
  maximum: z.number().min(0).max(1, 'Maximum confidence must be between 0 and 1')
}).refine(
  data => data.minimum < data.conservative,
  { message: 'Minimum confidence must be less than conservative' }
).refine(
  data => data.conservative < data.aggressive,
  { message: 'Conservative confidence must be less than aggressive' }
).refine(
  data => data.aggressive < data.maximum,
  { message: 'Aggressive confidence must be less than maximum' }
)

const AIConfigSchema = z.object({
  confidenceThresholds: ConfidenceThresholdSchema,
  strategies: z.array(z.enum(['ML_ENHANCED', 'NEURAL_NETWORK', 'ENSEMBLE', 'TECHNICAL', 'SENTIMENT'])).min(1, 'At least one strategy is required'),
  learningEnabled: z.boolean().default(true)
})

const PositionSizingSchema = z.object({
  baseSize: z.number().min(0.001, 'Base size must be at least 0.1%').max(0.5, 'Base size cannot exceed 50%'),
  maxSize: z.number().min(0.001, 'Max size must be at least 0.1%').max(1, 'Max size cannot exceed 100%'),
  confidenceMultiplier: z.number().min(0.5, 'Confidence multiplier must be at least 0.5').max(5, 'Confidence multiplier cannot exceed 5'),
  riskAdjustmentEnabled: z.boolean().default(true),
  kellyEnabled: z.boolean().default(false)
}).refine(
  data => data.baseSize <= data.maxSize,
  { message: 'Base size must not exceed max size' }
)

const RiskControlsSchema = z.object({
  maxDailyTrades: z.number().int().min(1, 'Must allow at least 1 trade per day').max(1000, 'Daily trades cannot exceed 1000'),
  maxOpenPositions: z.number().int().min(1, 'Must allow at least 1 open position').max(100, 'Open positions cannot exceed 100'),
  maxDailyLoss: z.number().min(0.001, 'Daily loss limit must be at least 0.1%').max(0.5, 'Daily loss limit cannot exceed 50%'),
  cooldownPeriod: z.number().min(0, 'Cooldown period cannot be negative').max(60, 'Cooldown period cannot exceed 60 minutes'),
  maxConcurrentExecutions: z.number().int().min(1, 'Must allow at least 1 concurrent execution').max(10, 'Concurrent executions cannot exceed 10')
})

const ExecutionRulesSchema = z.object({
  marketHoursOnly: z.boolean().default(false),
  avoidEarnings: z.boolean().default(false),
  volumeThreshold: z.number().min(0, 'Volume threshold cannot be negative'),
  spreadThreshold: z.number().min(0, 'Spread threshold cannot be negative').max(1, 'Spread threshold cannot exceed 100%'),
  cryptoTradingEnabled: z.boolean().default(true),
  afterHoursTrading: z.boolean().default(true),
  weekendTrading: z.boolean().default(true),
  slippageProtection: z.boolean().default(true),
  partialFillHandling: z.boolean().default(true)
})

const LearningIntegrationSchema = z.object({
  enabled: z.boolean().default(true),
  adaptiveThresholds: z.boolean().default(true),
  patternAwareness: z.boolean().default(true),
  performanceFeedback: z.boolean().default(true)
})

const ExecutionConfigSchema = z.object({
  autoExecuteEnabled: z.boolean().default(true),
  positionSizing: PositionSizingSchema,
  riskControls: RiskControlsSchema,
  executionRules: ExecutionRulesSchema,
  learningIntegration: LearningIntegrationSchema
})

const RiskConfigSchema = z.object({
  maxDailyLoss: z.number().min(0.001).max(0.5),
  maxDrawdown: z.number().min(0.001).max(1),
  maxPositionSize: z.number().min(0.001).max(1),
  maxSectorExposure: z.number().min(0.001).max(1),
  maxCorrelation: z.number().min(0).max(1),
  stopLossRequired: z.boolean().default(true)
}).refine(
  data => data.maxPositionSize <= data.maxSectorExposure,
  { message: 'Max position size must not exceed max sector exposure' }
)

const MarketConfigSchema = z.object({
  watchlist: z.array(z.string().min(1, 'Symbol cannot be empty').max(10, 'Symbol too long')).default([]),
  updateFrequency: z.number().min(1000, 'Update frequency must be at least 1 second').max(300000, 'Update frequency cannot exceed 5 minutes').default(30000)
})

const TradingEngineConfigSchema = z.object({
  ai: AIConfigSchema,
  execution: ExecutionConfigSchema,
  risk: RiskConfigSchema,
  market: MarketConfigSchema
})

// ===============================================
// REQUEST VALIDATION SCHEMAS
// ===============================================

const TradingRequestSchema = z.object({
  action: z.enum(['start', 'stop', 'status', 'restart', 'update_config', 'get_metrics', 'execution_control'], {
    message: 'Invalid action. Must be one of: start, stop, status, restart, update_config, get_metrics, execution_control'
  }),
  config: TradingEngineConfigSchema.optional(),
  engineId: z.string().optional(),
  engineType: z.enum(['STANDARD', 'ADVANCED', 'PROFESSIONAL', 'CUSTOM']).optional(),
  tradingMode: z.enum(['PAPER', 'LIVE']).optional(),
  sessionId: z.string().optional(),
  autoStart: z.boolean().default(false),
  persistent: z.boolean().default(true),
  enableLearning: z.boolean().default(true),
  // Execution control specific fields
  executionAction: z.enum(['enable', 'disable', 'update_config']).optional(),
  executionConfig: z.object({
    autoExecuteEnabled: z.boolean(),
    confidenceThresholds: ConfidenceThresholdSchema.optional(),
    positionSizing: PositionSizingSchema.partial().optional(),
    riskControls: RiskControlsSchema.partial().optional()
  }).optional()
})

const OrderRequestSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol too long'),
  quantity: z.number().positive('Quantity must be positive').optional(),
  notional: z.number().positive('Notional amount must be positive').optional(),
  side: z.enum(['buy', 'sell'], { message: 'Side must be either "buy" or "sell"' }),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']).default('market'),
  time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
  limit_price: z.number().positive('Limit price must be positive').optional(),
  stop_price: z.number().positive('Stop price must be positive').optional(),
  client_order_id: z.string().optional(),
  extended_hours: z.boolean().default(false)
}).refine(
  data => data.quantity || data.notional,
  { message: 'Either quantity or notional amount is required' }
).refine(
  data => data.type !== 'limit' || data.limit_price,
  { message: 'Limit price is required for limit orders' }
).refine(
  data => !['stop', 'stop_limit'].includes(data.type) || data.stop_price,
  { message: 'Stop price is required for stop orders' }
)

const MarketDataRequestSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  timeframe: z.enum(['1Min', '5Min', '15Min', '1Hour', '1Day']).default('1Day'),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).default(100)
})

// ===============================================
// VALIDATION INTERFACES
// ===============================================

export interface ValidationResult {
  success: boolean
  data?: any
  error?: string
  details?: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface TradingRequestValidation extends ValidationResult {
  data?: {
    action: string
    config?: TradingEngineConfig
    engineId?: string
    engineType?: EngineType
    tradingMode?: TradingMode
    sessionId?: string
    autoStart?: boolean
    persistent?: boolean
    enableLearning?: boolean
    executionAction?: string
    executionConfig?: any
  }
}

// ===============================================
// MAIN VALIDATION FUNCTIONS
// ===============================================

/**
 * Validate trading request with comprehensive error handling
 */
export function validateTradingRequest(request: any): TradingRequestValidation {
  try {
    console.log('🔍 Validating trading request:', { action: request?.action, hasConfig: !!request?.config })

    // Parse and validate the request
    const result = TradingRequestSchema.safeParse(request)
    
    if (!result.success) {
      const validationErrors = formatZodErrors(result.error)
      console.error('❌ Trading request validation failed:', validationErrors)
      
      return {
        success: false,
        error: 'Invalid trading request',
        details: validationErrors
      }
    }

    const validatedData = result.data

    // Additional business logic validation
    const businessValidation = performBusinessValidation(validatedData)
    if (!businessValidation.success) {
      console.error('❌ Business validation failed:', businessValidation.error)
      return businessValidation
    }

    // Security validation
    const securityValidation = performSecurityValidation(validatedData)
    if (!securityValidation.success) {
      console.error('❌ Security validation failed:', securityValidation.error)
      return securityValidation
    }

    console.log('✅ Trading request validation successful')
    
    return {
      success: true,
      data: validatedData
    }

  } catch (error) {
    console.error('❌ Trading request validation error:', error)
    return {
      success: false,
      error: 'Validation process failed',
      details: [{
        field: 'system',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'VALIDATION_ERROR'
      }]
    }
  }
}

/**
 * Validate order request
 */
export function validateOrderRequest(request: any): ValidationResult {
  try {
    console.log('🔍 Validating order request:', { symbol: request?.symbol, side: request?.side })

    const result = OrderRequestSchema.safeParse(request)
    
    if (!result.success) {
      const validationErrors = formatZodErrors(result.error)
      console.error('❌ Order request validation failed:', validationErrors)
      
      return {
        success: false,
        error: 'Invalid order request',
        details: validationErrors
      }
    }

    // Additional order validation
    const orderValidation = performOrderValidation(result.data)
    if (!orderValidation.success) {
      return orderValidation
    }

    console.log('✅ Order request validation successful')
    
    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    console.error('❌ Order validation error:', error)
    return {
      success: false,
      error: 'Order validation process failed'
    }
  }
}

/**
 * Validate market data request
 */
export function validateMarketDataRequest(request: any): ValidationResult {
  try {
    console.log('🔍 Validating market data request:', { symbol: request?.symbol })

    const result = MarketDataRequestSchema.safeParse(request)
    
    if (!result.success) {
      const validationErrors = formatZodErrors(result.error)
      console.error('❌ Market data request validation failed:', validationErrors)
      
      return {
        success: false,
        error: 'Invalid market data request',
        details: validationErrors
      }
    }

    console.log('✅ Market data request validation successful')
    
    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    console.error('❌ Market data validation error:', error)
    return {
      success: false,
      error: 'Market data validation process failed'
    }
  }
}

/**
 * Validate trading engine configuration
 */
export function validateTradingConfig(config: any): ValidationResult {
  try {
    console.log('🔍 Validating trading engine configuration')

    const result = TradingEngineConfigSchema.safeParse(config)
    
    if (!result.success) {
      const validationErrors = formatZodErrors(result.error)
      console.error('❌ Trading config validation failed:', validationErrors)
      
      return {
        success: false,
        error: 'Invalid trading configuration',
        details: validationErrors
      }
    }

    // Advanced configuration validation
    const advancedValidation = performAdvancedConfigValidation(result.data)
    if (!advancedValidation.success) {
      return advancedValidation
    }

    console.log('✅ Trading configuration validation successful')
    
    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    console.error('❌ Trading config validation error:', error)
    return {
      success: false,
      error: 'Configuration validation process failed'
    }
  }
}

// ===============================================
// SPECIALIZED VALIDATION FUNCTIONS
// ===============================================

/**
 * Perform business logic validation
 */
function performBusinessValidation(data: any): ValidationResult {
  const errors: ValidationError[] = []

  // Validate action-specific requirements
  if (data.action === 'start' && !data.config) {
    errors.push({
      field: 'config',
      message: 'Configuration is required when starting a trading engine',
      code: 'MISSING_CONFIG'
    })
  }

  if (data.action === 'stop' && !data.engineId && !data.sessionId) {
    errors.push({
      field: 'engineId',
      message: 'Engine ID or session ID is required when stopping a trading engine',
      code: 'MISSING_ENGINE_ID'
    })
  }

  if (data.action === 'execution_control' && !data.executionAction) {
    errors.push({
      field: 'executionAction',
      message: 'Execution action is required for execution control requests',
      code: 'MISSING_EXECUTION_ACTION'
    })
  }

  // Validate config consistency
  if (data.config) {
    const config = data.config

    // Check risk vs execution alignment
    if (config.risk.maxPositionSize > config.execution.positionSizing.maxSize) {
      errors.push({
        field: 'config',
        message: 'Risk max position size cannot exceed execution max size',
        code: 'INCONSISTENT_POSITION_SIZES'
      })
    }

    // Check daily trade limits
    if (config.execution.riskControls.maxDailyTrades > 500 && data.tradingMode === 'LIVE') {
      errors.push({
        field: 'maxDailyTrades',
        message: 'Daily trade limit is too high for live trading',
        code: 'EXCESSIVE_TRADE_LIMIT'
      })
    }

    // Check confidence threshold logic
    const thresholds = config.ai.confidenceThresholds
    if (thresholds.minimum > 0.9) {
      errors.push({
        field: 'minimumConfidence',
        message: 'Minimum confidence threshold is too restrictive and may prevent all trades',
        code: 'RESTRICTIVE_THRESHOLD'
      })
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'Business validation failed',
      details: errors
    }
  }

  return { success: true }
}

/**
 * Perform security validation
 */
function performSecurityValidation(data: any): ValidationResult {
  const errors: ValidationError[] = []

  // Check for potentially dangerous configurations
  if (data.config) {
    const config = data.config

    // Risk limits validation
    if (config.risk.maxDailyLoss > 0.1) { // 10%
      errors.push({
        field: 'maxDailyLoss',
        message: 'Daily loss limit exceeds recommended maximum of 10%',
        code: 'EXCESSIVE_RISK'
      })
    }

    if (config.risk.maxDrawdown > 0.3) { // 30%
      errors.push({
        field: 'maxDrawdown',
        message: 'Drawdown limit exceeds recommended maximum of 30%',
        code: 'EXCESSIVE_DRAWDOWN'
      })
    }

    // Position size validation
    if (config.execution.positionSizing.maxSize > 0.2) { // 20%
      errors.push({
        field: 'maxPositionSize',
        message: 'Maximum position size exceeds recommended limit of 20%',
        code: 'EXCESSIVE_POSITION_SIZE'
      })
    }

    // Concurrent execution validation
    if (config.execution.riskControls.maxConcurrentExecutions > 5) {
      errors.push({
        field: 'maxConcurrentExecutions',
        message: 'Too many concurrent executions may overwhelm the system',
        code: 'EXCESSIVE_CONCURRENCY'
      })
    }
  }

  // Validate session/engine ID format
  if (data.sessionId && !/^[a-zA-Z0-9_-]+$/.test(data.sessionId)) {
    errors.push({
      field: 'sessionId',
      message: 'Session ID contains invalid characters',
      code: 'INVALID_SESSION_ID'
    })
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'Security validation failed',
      details: errors
    }
  }

  return { success: true }
}

/**
 * Perform order-specific validation
 */
function performOrderValidation(data: any): ValidationResult {
  const errors: ValidationError[] = []

  // Symbol validation
  if (!isValidSymbol(data.symbol)) {
    errors.push({
      field: 'symbol',
      message: 'Invalid trading symbol format',
      code: 'INVALID_SYMBOL'
    })
  }

  // Quantity/notional validation
  if (data.notional && data.notional < 1) {
    errors.push({
      field: 'notional',
      message: 'Notional amount must be at least $1',
      code: 'MIN_NOTIONAL'
    })
  }

  if (data.quantity && data.quantity < 0.000001) {
    errors.push({
      field: 'quantity',
      message: 'Quantity too small',
      code: 'MIN_QUANTITY'
    })
  }

  // Price validation for limit orders
  if (data.type === 'limit' && data.limit_price <= 0) {
    errors.push({
      field: 'limit_price',
      message: 'Limit price must be positive',
      code: 'INVALID_LIMIT_PRICE'
    })
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'Order validation failed',
      details: errors
    }
  }

  return { success: true }
}

/**
 * Perform advanced configuration validation
 */
function performAdvancedConfigValidation(config: TradingEngineConfig): ValidationResult {
  const errors: ValidationError[] = []

  // AI strategy validation
  const strategies = config.ai.strategies
  if (strategies.includes('ML_ENHANCED') && !config.ai.learningEnabled) {
    errors.push({
      field: 'aiStrategies',
      message: 'ML_ENHANCED strategy requires learning to be enabled',
      code: 'INCONSISTENT_AI_CONFIG'
    })
  }

  // Risk-reward validation
  const { baseSize, maxSize, confidenceMultiplier } = config.execution.positionSizing
  const maxPossibleSize = baseSize * Math.pow(1, confidenceMultiplier)
  if (maxPossibleSize > maxSize * 1.1) { // Allow 10% buffer
    errors.push({
      field: 'positionSizing',
      message: 'Confidence multiplier may cause positions to exceed max size',
      code: 'POSITION_SIZE_OVERFLOW'
    })
  }

  // Market hours vs crypto validation
  if (config.execution.executionRules.marketHoursOnly && config.execution.executionRules.cryptoTradingEnabled) {
    errors.push({
      field: 'executionRules',
      message: 'Market hours restriction conflicts with crypto trading (24/7)',
      code: 'CONFLICTING_TRADING_HOURS'
    })
  }

  // Watchlist validation
  const watchlist = config.market.watchlist
  if (watchlist.length > 100) {
    errors.push({
      field: 'watchlist',
      message: 'Watchlist too large, maximum 100 symbols recommended',
      code: 'EXCESSIVE_WATCHLIST'
    })
  }

  const invalidSymbols = watchlist.filter(symbol => !isValidSymbol(symbol))
  if (invalidSymbols.length > 0) {
    errors.push({
      field: 'watchlist',
      message: `Invalid symbols in watchlist: ${invalidSymbols.join(', ')}`,
      code: 'INVALID_WATCHLIST_SYMBOLS'
    })
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'Advanced configuration validation failed',
      details: errors
    }
  }

  return { success: true }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Format Zod validation errors into a readable format
 */
function formatZodErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.issues.map((error: any) => ({
    field: error.path.join('.'),
    message: error.message,
    code: error.code.toUpperCase(),
    value: error.input
  }))
}

/**
 * Validate trading symbol format
 */
function isValidSymbol(symbol: string): boolean {
  // Stock symbols: 1-5 uppercase letters
  const stockRegex = /^[A-Z]{1,5}$/
  
  // Crypto pairs: XXXUSD format
  const cryptoRegex = /^[A-Z]{3,10}USD$/
  
  // ETF symbols: Usually 3-4 letters
  const etfRegex = /^[A-Z]{2,4}$/
  
  return stockRegex.test(symbol) || cryptoRegex.test(symbol) || etfRegex.test(symbol)
}

/**
 * Sanitize configuration to prevent injection attacks
 */
export function sanitizeConfig(config: any): any {
  if (typeof config !== 'object' || config === null) {
    return config
  }

  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value.replace(/[<>\"'&]/g, '')
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeConfig(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Validate API rate limits
 */
export function validateRateLimit(action: string, userId?: string): ValidationResult {
  // Simplified rate limiting - in production, use Redis or similar
  const rateLimits = {
    start: { requests: 10, window: 60000 }, // 10 requests per minute
    stop: { requests: 20, window: 60000 },  // 20 requests per minute
    status: { requests: 100, window: 60000 }, // 100 requests per minute
    execution_control: { requests: 50, window: 60000 } // 50 requests per minute
  }

  const limit = rateLimits[action as keyof typeof rateLimits]
  if (!limit) {
    return { success: true } // No limit for this action
  }

  // In production, implement actual rate limiting logic here
  // For now, always pass validation
  return { success: true }
}

/**
 * Create default configuration with safe values
 */
export function createDefaultConfig(): TradingEngineConfig {
  return {
    ai: {
      confidenceThresholds: {
        minimum: 0.65,
        conservative: 0.75,
        aggressive: 0.85,
        maximum: 0.95
      },
      strategies: ['ML_ENHANCED', 'TECHNICAL'],
      learningEnabled: true
    },
    execution: {
      autoExecuteEnabled: true,
      positionSizing: {
        baseSize: 0.02, // 2%
        maxSize: 0.08,  // 8%
        confidenceMultiplier: 2.0,
        riskAdjustmentEnabled: true,
        kellyEnabled: false
      },
      riskControls: {
        maxDailyTrades: 25,
        maxOpenPositions: 10,
        maxDailyLoss: 0.03, // 3%
        cooldownPeriod: 5,  // 5 minutes
        maxConcurrentExecutions: 3
      },
      executionRules: {
        marketHoursOnly: false,
        avoidEarnings: false,
        volumeThreshold: 15000,
        spreadThreshold: 0.05, // 5%
        cryptoTradingEnabled: true,
        afterHoursTrading: true,
        weekendTrading: true,
        slippageProtection: true,
        partialFillHandling: true
      },
      learningIntegration: {
        enabled: true,
        adaptiveThresholds: true,
        patternAwareness: true,
        performanceFeedback: true
      }
    },
    risk: {
      maxDailyLoss: 0.03,      // 3%
      maxDrawdown: 0.15,       // 15%
      maxPositionSize: 0.08,   // 8%
      maxSectorExposure: 0.25, // 25%
      maxCorrelation: 0.70,    // 70%
      stopLossRequired: true
    },
    market: {
      watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'BTCUSD', 'ETHUSD'],
      updateFrequency: 30000 // 30 seconds
    }
  }
}

// ===============================================
// EXPORT VALIDATION SCHEMAS FOR USE IN OTHER FILES
// ===============================================

export {
  TradingRequestSchema,
  OrderRequestSchema,
  MarketDataRequestSchema,
  TradingEngineConfigSchema
}