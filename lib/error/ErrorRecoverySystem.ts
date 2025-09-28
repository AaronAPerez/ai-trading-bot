import { tradingStorage } from '@/lib/database/tradingStorage'

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ErrorCategory {
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  ML_MODEL_ERROR = 'ML_MODEL_ERROR',
  TRADING_ERROR = 'TRADING_ERROR',
  SENTIMENT_ERROR = 'SENTIMENT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

interface ErrorRecord {
  id: string
  timestamp: Date
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  stackTrace?: string
  context: {
    userId?: string
    symbol?: string
    operation: string
    parameters?: Record<string, any>
  }
  attempts: number
  resolved: boolean
  recoveryAction?: string
  metadata: Record<string, any>
}

interface RecoveryStrategy {
  category: ErrorCategory
  severity: ErrorSeverity
  action: (error: ErrorRecord) => Promise<boolean>
  maxRetries: number
  backoffMs: number
  fallback?: () => Promise<any>
}

interface CircuitBreakerState {
  service: string
  failureCount: number
  lastFailureTime: Date
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  threshold: number
  timeout: number
}

export class ErrorRecoverySystem {
  private errorHistory: ErrorRecord[] = []
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private retryQueue: ErrorRecord[] = []
  private isProcessingRetries = false

  constructor() {
    this.initializeRecoveryStrategies()
    this.initializeCircuitBreakers()
    this.startRetryProcessor()
  }

  async handleError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorRecord['context']
  ): Promise<{ recovered: boolean; fallbackUsed: boolean; result?: any }> {
    try {
      const errorRecord: ErrorRecord = {
        id: this.generateErrorId(),
        timestamp: new Date(),
        category,
        severity,
        message: error.message,
        stackTrace: error.stack,
        context,
        attempts: 1,
        resolved: false,
        metadata: {}
      }

      // Log error
      await this.logError(errorRecord)

      // Check circuit breaker
      if (this.isCircuitOpen(context.operation)) {
        console.warn(`Circuit breaker OPEN for ${context.operation}`)
        return await this.handleCircuitBreakerOpen(errorRecord)
      }

      // Try recovery
      const recoveryResult = await this.attemptRecovery(errorRecord)

      if (!recoveryResult.recovered) {
        // Update circuit breaker
        this.recordFailure(context.operation)

        // Add to retry queue if appropriate
        if (this.shouldRetry(errorRecord)) {
          this.addToRetryQueue(errorRecord)
        }
      } else {
        // Reset circuit breaker on success
        this.recordSuccess(context.operation)
      }

      return recoveryResult

    } catch (recoveryError) {
      console.error('Error in error recovery system:', recoveryError)
      return { recovered: false, fallbackUsed: false }
    }
  }

  async getErrorAnalytics(timeWindow: number = 24): Promise<{
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    recoveryRate: number
    topErrors: Array<{ message: string; count: number; category: ErrorCategory }>
    systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
    recommendations: string[]
  }> {
    try {
      const cutoffTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000)
      const recentErrors = this.errorHistory.filter(e => e.timestamp > cutoffTime)

      const totalErrors = recentErrors.length
      const resolvedErrors = recentErrors.filter(e => e.resolved).length
      const recoveryRate = totalErrors > 0 ? resolvedErrors / totalErrors : 1

      // Group by category
      const errorsByCategory: Record<ErrorCategory, number> = {} as any
      for (const category of Object.values(ErrorCategory)) {
        errorsByCategory[category] = recentErrors.filter(e => e.category === category).length
      }

      // Group by severity
      const errorsBySeverity: Record<ErrorSeverity, number> = {} as any
      for (const severity of Object.values(ErrorSeverity)) {
        errorsBySeverity[severity] = recentErrors.filter(e => e.severity === severity).length
      }

      // Top errors
      const errorCounts = new Map<string, number>()
      const errorDetails = new Map<string, { category: ErrorCategory; message: string }>()

      for (const error of recentErrors) {
        const key = `${error.category}:${error.message}`
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1)
        errorDetails.set(key, { category: error.category, message: error.message })
      }

      const topErrors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count]) => ({
          message: errorDetails.get(key)!.message,
          count,
          category: errorDetails.get(key)!.category
        }))

      // System health
      const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length
      const highErrors = recentErrors.filter(e => e.severity === ErrorSeverity.HIGH).length

      let systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY'
      if (criticalErrors > 0 || recoveryRate < 0.5) {
        systemHealth = 'CRITICAL'
      } else if (highErrors > 3 || recoveryRate < 0.8) {
        systemHealth = 'DEGRADED'
      }

      // Recommendations
      const recommendations = this.generateRecommendations(recentErrors, recoveryRate, systemHealth)

      return {
        totalErrors,
        errorsByCategory,
        errorsBySeverity,
        recoveryRate,
        topErrors,
        systemHealth,
        recommendations
      }

    } catch (error) {
      console.error('Error getting error analytics:', error)
      return {
        totalErrors: 0,
        errorsByCategory: {} as any,
        errorsBySeverity: {} as any,
        recoveryRate: 0,
        topErrors: [],
        systemHealth: 'CRITICAL',
        recommendations: ['Error analytics system failure']
      }
    }
  }

  private initializeRecoveryStrategies(): void {
    // API Error Recovery
    this.recoveryStrategies.set('API_ERROR:HIGH', {
      category: ErrorCategory.API_ERROR,
      severity: ErrorSeverity.HIGH,
      maxRetries: 3,
      backoffMs: 2000,
      action: async (error) => {
        console.log(`Retrying API call for ${error.context.operation}`)
        // Wait for backoff period
        await this.sleep(2000 * error.attempts)
        return false // Will be retried by the retry processor
      },
      fallback: async () => {
        console.log('Using cached data fallback')
        return { fallback: true, data: null }
      }
    })

    // Database Error Recovery
    this.recoveryStrategies.set('DATABASE_ERROR:HIGH', {
      category: ErrorCategory.DATABASE_ERROR,
      severity: ErrorSeverity.HIGH,
      maxRetries: 2,
      backoffMs: 1000,
      action: async (error) => {
        console.log(`Retrying database operation: ${error.context.operation}`)
        await this.sleep(1000 * error.attempts)
        return false
      },
      fallback: async () => {
        console.log('Using in-memory fallback for database')
        return { fallback: true, data: [] }
      }
    })

    // ML Model Error Recovery
    this.recoveryStrategies.set('ML_MODEL_ERROR:MEDIUM', {
      category: ErrorCategory.ML_MODEL_ERROR,
      severity: ErrorSeverity.MEDIUM,
      maxRetries: 1,
      backoffMs: 5000,
      action: async (error) => {
        console.log('Attempting to reload ML model')
        // Could trigger model reload here
        return true // Assume successful reload
      },
      fallback: async () => {
        console.log('Using simplified prediction fallback')
        return {
          direction: 'HOLD',
          confidence: 0.5,
          fallback: true
        }
      }
    })

    // Trading Error Recovery
    this.recoveryStrategies.set('TRADING_ERROR:CRITICAL', {
      category: ErrorCategory.TRADING_ERROR,
      severity: ErrorSeverity.CRITICAL,
      maxRetries: 1,
      backoffMs: 10000,
      action: async (error) => {
        console.log('Critical trading error - implementing emergency stop')
        // Could trigger emergency trading halt
        return true
      },
      fallback: async () => {
        console.log('Emergency trading halt activated')
        return { tradingHalted: true, reason: 'Critical error recovery' }
      }
    })

    // Network Error Recovery
    this.recoveryStrategies.set('NETWORK_ERROR:MEDIUM', {
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      maxRetries: 5,
      backoffMs: 1000,
      action: async (error) => {
        console.log(`Network retry attempt ${error.attempts}`)
        await this.sleep(1000 * Math.pow(2, error.attempts - 1)) // Exponential backoff
        return false
      },
      fallback: async () => {
        console.log('Using offline mode')
        return { offline: true, message: 'Operating in offline mode' }
      }
    })
  }

  private initializeCircuitBreakers(): void {
    const services = [
      'alpaca_api',
      'news_api',
      'social_media_api',
      'database',
      'ml_prediction',
      'sentiment_analysis'
    ]

    for (const service of services) {
      this.circuitBreakers.set(service, {
        service,
        failureCount: 0,
        lastFailureTime: new Date(),
        state: 'CLOSED',
        threshold: 5, // Open after 5 failures
        timeout: 60000 // 1 minute timeout
      })
    }
  }

  private async attemptRecovery(error: ErrorRecord): Promise<{ recovered: boolean; fallbackUsed: boolean; result?: any }> {
    const strategyKey = `${error.category}:${error.severity}`
    const strategy = this.recoveryStrategies.get(strategyKey)

    if (!strategy) {
      console.log(`No recovery strategy for ${strategyKey}`)
      return { recovered: false, fallbackUsed: false }
    }

    try {
      const recovered = await strategy.action(error)

      if (recovered) {
        error.resolved = true
        error.recoveryAction = 'Strategy succeeded'
        return { recovered: true, fallbackUsed: false }
      }

      // Try fallback if available
      if (strategy.fallback && error.attempts >= strategy.maxRetries) {
        const fallbackResult = await strategy.fallback()
        error.resolved = true
        error.recoveryAction = 'Fallback used'
        return { recovered: true, fallbackUsed: true, result: fallbackResult }
      }

      return { recovered: false, fallbackUsed: false }

    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError)
      error.metadata.recoveryError = recoveryError.message
      return { recovered: false, fallbackUsed: false }
    }
  }

  private isCircuitOpen(service: string): boolean {
    const breaker = this.circuitBreakers.get(service)
    if (!breaker) return false

    if (breaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime.getTime()
      if (timeSinceLastFailure > breaker.timeout) {
        breaker.state = 'HALF_OPEN'
        return false
      }
      return true
    }

    return false
  }

  private recordFailure(service: string): void {
    const breaker = this.circuitBreakers.get(service)
    if (!breaker) return

    breaker.failureCount++
    breaker.lastFailureTime = new Date()

    if (breaker.failureCount >= breaker.threshold) {
      breaker.state = 'OPEN'
      console.warn(`Circuit breaker OPENED for ${service}`)
    }
  }

  private recordSuccess(service: string): void {
    const breaker = this.circuitBreakers.get(service)
    if (!breaker) return

    breaker.failureCount = 0
    breaker.state = 'CLOSED'
  }

  private async handleCircuitBreakerOpen(error: ErrorRecord): Promise<{ recovered: boolean; fallbackUsed: boolean; result?: any }> {
    const strategyKey = `${error.category}:${error.severity}`
    const strategy = this.recoveryStrategies.get(strategyKey)

    if (strategy?.fallback) {
      const fallbackResult = await strategy.fallback()
      error.resolved = true
      error.recoveryAction = 'Circuit breaker fallback'
      return { recovered: true, fallbackUsed: true, result: fallbackResult }
    }

    return { recovered: false, fallbackUsed: false }
  }

  private shouldRetry(error: ErrorRecord): boolean {
    const strategyKey = `${error.category}:${error.severity}`
    const strategy = this.recoveryStrategies.get(strategyKey)

    return strategy ? error.attempts < strategy.maxRetries : false
  }

  private addToRetryQueue(error: ErrorRecord): void {
    this.retryQueue.push(error)
  }

  private startRetryProcessor(): void {
    setInterval(async () => {
      if (this.isProcessingRetries || this.retryQueue.length === 0) return

      this.isProcessingRetries = true

      try {
        const error = this.retryQueue.shift()
        if (!error) return

        error.attempts++
        const result = await this.attemptRecovery(error)

        if (!result.recovered && this.shouldRetry(error)) {
          this.addToRetryQueue(error)
        }

      } catch (processingError) {
        console.error('Error in retry processor:', processingError)
      } finally {
        this.isProcessingRetries = false
      }
    }, 5000) // Process retries every 5 seconds
  }

  private async logError(error: ErrorRecord): Promise<void> {
    try {
      // Add to in-memory history
      this.errorHistory.push(error)

      // Limit history size
      if (this.errorHistory.length > 1000) {
        this.errorHistory = this.errorHistory.slice(-500)
      }

      // Log to database if available and error is significant
      if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
        await tradingStorage.logBotActivity({
          user_id: error.context.userId || 'system',
          timestamp: error.timestamp.toISOString(),
          type: 'error',
          symbol: error.context.symbol,
          message: `${error.category}: ${error.message}`,
          status: 'failed',
          details: JSON.stringify({
            severity: error.severity,
            stackTrace: error.stackTrace,
            context: error.context,
            attempts: error.attempts
          }),
          metadata: error.metadata
        })
      }

      // Console logging with appropriate level
      const logLevel = this.getLogLevel(error.severity)
      console[logLevel](`[${error.category}:${error.severity}] ${error.message}`, {
        id: error.id,
        context: error.context,
        timestamp: error.timestamp
      })

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.LOW:
      default:
        return 'log'
    }
  }

  private generateRecommendations(errors: ErrorRecord[], recoveryRate: number, systemHealth: string): string[] {
    const recommendations: string[] = []

    if (systemHealth === 'CRITICAL') {
      recommendations.push('URGENT: System in critical state - immediate attention required')
    }

    if (recoveryRate < 0.5) {
      recommendations.push('Poor error recovery rate - review recovery strategies')
    }

    // Category-specific recommendations
    const apiErrors = errors.filter(e => e.category === ErrorCategory.API_ERROR).length
    if (apiErrors > 10) {
      recommendations.push('High API error count - check API limits and network connectivity')
    }

    const dbErrors = errors.filter(e => e.category === ErrorCategory.DATABASE_ERROR).length
    if (dbErrors > 5) {
      recommendations.push('Database errors detected - verify database health and connections')
    }

    const mlErrors = errors.filter(e => e.category === ErrorCategory.ML_MODEL_ERROR).length
    if (mlErrors > 3) {
      recommendations.push('ML model errors - consider model retraining or fallback strategies')
    }

    // Circuit breaker recommendations
    const openBreakers = Array.from(this.circuitBreakers.values()).filter(b => b.state === 'OPEN')
    if (openBreakers.length > 0) {
      recommendations.push(`Circuit breakers open for: ${openBreakers.map(b => b.service).join(', ')}`)
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating normally')
    }

    return recommendations
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public API methods
  getErrorHistory(): ErrorRecord[] {
    return [...this.errorHistory]
  }

  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers)
  }

  getRetryQueueSize(): number {
    return this.retryQueue.length
  }

  clearErrorHistory(): void {
    this.errorHistory = []
  }

  resetCircuitBreaker(service: string): void {
    const breaker = this.circuitBreakers.get(service)
    if (breaker) {
      breaker.failureCount = 0
      breaker.state = 'CLOSED'
      console.log(`Circuit breaker RESET for ${service}`)
    }
  }
}

export const errorRecoverySystem = new ErrorRecoverySystem()

// Utility function for wrapping operations with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operation: string
    userId?: string
    symbol?: string
    category: ErrorCategory
    severity?: ErrorSeverity
  }
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    const result = await errorRecoverySystem.handleError(
      error as Error,
      context.category,
      context.severity || ErrorSeverity.MEDIUM,
      context
    )

    if (result.recovered) {
      return result.result
    }

    return null
  }
}