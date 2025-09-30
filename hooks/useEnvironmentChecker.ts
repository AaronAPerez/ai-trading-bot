/**
 * Environment Checker Hook
 * Monitors environment health and trading readiness
 */

import { useState, useEffect, useCallback } from 'react'

interface EnvironmentCheckerOptions {
  checkInterval?: number
  enableHealthCheck?: boolean
  enablePerformanceMonitoring?: boolean
}

interface HealthIssue {
  service: string
  message: string
  severity: 'error' | 'warning'
}

interface ValidationResult {
  valid: boolean
  issues: Array<{ field: string; message: string; severity: string }>
  warnings: Array<{ field: string; message: string }>
  services: Array<{ name: string; status: string; responseTime?: number }>
}

interface TradingReadiness {
  ready: boolean
  reason: string
  issues: string[]
}

interface Performance {
  alpacaResponseTime?: number
  supabaseResponseTime?: number
}

interface Health {
  lastChecked?: Date
  services: Record<string, 'healthy' | 'degraded' | 'down' | 'unknown'>
  issues: HealthIssue[]
}

export function useEnvironmentChecker(options: EnvironmentCheckerOptions = {}) {
  const {
    checkInterval = 30000,
    enableHealthCheck = true,
    enablePerformanceMonitoring = false
  } = options

  const [isInitialized, setIsInitialized] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isHealthy, setIsHealthy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [environment] = useState(process.env.NODE_ENV || 'development')
  const [tradingMode] = useState(process.env.NEXT_PUBLIC_TRADING_MODE || 'paper')

  const [health, setHealth] = useState<Health>({
    services: {},
    issues: []
  })

  const [performance, setPerformance] = useState<Performance>({})

  const [tradingReadiness, setTradingReadiness] = useState<TradingReadiness>({
    ready: false,
    reason: 'Checking...',
    issues: []
  })

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  const checkEnvironment = useCallback(async () => {
    setIsValidating(true)
    setError(null)

    try {
      // Check environment variables
      const issues: HealthIssue[] = []
      const services: Record<string, 'healthy' | 'degraded' | 'down' | 'unknown'> = {}

      // Check Alpaca API keys
      const hasAlpacaKey = !!process.env.APCA_API_KEY_ID
      const hasAlpacaSecret = !!process.env.APCA_API_SECRET_KEY

      if (!hasAlpacaKey || !hasAlpacaSecret) {
        issues.push({
          service: 'Alpaca API',
          message: 'Missing API credentials',
          severity: 'error'
        })
        services.alpaca = 'down'
      } else {
        services.alpaca = 'healthy'
      }

      // Check Supabase configuration
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!hasSupabaseUrl || !hasSupabaseKey) {
        issues.push({
          service: 'Supabase',
          message: 'Missing Supabase configuration',
          severity: 'error'
        })
        services.supabase = 'down'
      } else {
        services.supabase = 'healthy'
      }

      // Update health state
      setHealth({
        lastChecked: new Date(),
        services,
        issues
      })

      // Update trading readiness
      const tradingReady = services.alpaca === 'healthy' && services.supabase === 'healthy'
      setTradingReadiness({
        ready: tradingReady,
        reason: tradingReady ? 'All systems operational' : 'Missing required services',
        issues: issues.map(issue => issue.message)
      })

      // Update overall health
      setIsHealthy(issues.filter(i => i.severity === 'error').length === 0)

      // Mock validation result
      setValidationResult({
        valid: tradingReady,
        issues: issues.filter(i => i.severity === 'error').map(i => ({
          field: i.service,
          message: i.message,
          severity: i.severity
        })),
        warnings: issues.filter(i => i.severity === 'warning').map(i => ({
          field: i.service,
          message: i.message
        })),
        services: Object.entries(services).map(([name, status]) => ({
          name,
          status: status === 'healthy' ? 'connected' : 'error'
        }))
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsHealthy(false)
    } finally {
      setIsValidating(false)
      setIsInitialized(true)
    }
  }, [])

  const revalidate = useCallback(() => {
    checkEnvironment()
  }, [checkEnvironment])

  const getServiceStatus = useCallback((service: string): 'healthy' | 'degraded' | 'down' | 'unknown' => {
    return health.services[service] || 'unknown'
  }, [health.services])

  const isAlpacaReady = useCallback(() => {
    return health.services.alpaca === 'healthy'
  }, [health.services.alpaca])

  const isSupabaseReady = useCallback(() => {
    return health.services.supabase === 'healthy'
  }, [health.services.supabase])

  // Initialize and set up interval
  useEffect(() => {
    checkEnvironment()

    if (enableHealthCheck && checkInterval > 0) {
      const interval = setInterval(checkEnvironment, checkInterval)
      return () => clearInterval(interval)
    }
  }, [checkEnvironment, enableHealthCheck, checkInterval])

  return {
    // State
    isInitialized,
    isValidating,
    isHealthy,
    error,
    environment,
    tradingMode,
    health,
    performance,
    tradingReadiness,
    validationResult,

    // Actions
    revalidate,
    getServiceStatus,
    isAlpacaReady,
    isSupabaseReady
  }
}