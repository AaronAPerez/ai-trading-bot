import { NextRequest, NextResponse } from 'next/server'
import { errorRecoverySystem } from '@/lib/error/ErrorRecoverySystem'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'analytics'
    const timeWindow = parseInt(searchParams.get('timeWindow') || '24')

    switch (type) {
      case 'analytics':
        const analytics = await errorRecoverySystem.getErrorAnalytics(timeWindow)
        return NextResponse.json({
          analytics,
          timestamp: new Date().toISOString()
        })

      case 'circuit-breakers':
        const circuitBreakers = Array.from(errorRecoverySystem.getCircuitBreakerStatus().entries())
          .map(([service, state]) => ({ service, ...state }))

        return NextResponse.json({
          circuitBreakers,
          timestamp: new Date().toISOString()
        })

      case 'error-history':
        const errorHistory = errorRecoverySystem.getErrorHistory()
          .slice(-50) // Return last 50 errors
          .map(error => ({
            id: error.id,
            timestamp: error.timestamp,
            category: error.category,
            severity: error.severity,
            message: error.message,
            context: error.context,
            attempts: error.attempts,
            resolved: error.resolved,
            recoveryAction: error.recoveryAction
          }))

        return NextResponse.json({
          errorHistory,
          retryQueueSize: errorRecoverySystem.getRetryQueueSize(),
          timestamp: new Date().toISOString()
        })

      case 'health-check':
        const analytics_health = await errorRecoverySystem.getErrorAnalytics(1) // Last hour
        const circuitBreakers_health = Array.from(errorRecoverySystem.getCircuitBreakerStatus().values())

        const healthStatus = {
          status: analytics_health.systemHealth,
          errors: analytics_health.totalErrors,
          recoveryRate: analytics_health.recoveryRate,
          openCircuitBreakers: circuitBreakers_health.filter(cb => cb.state === 'OPEN').length,
          retryQueueSize: errorRecoverySystem.getRetryQueueSize(),
          lastCheck: new Date().toISOString()
        }

        return NextResponse.json(healthStatus)

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: analytics, circuit-breakers, error-history, or health-check' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('System health API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, service } = body

    switch (action) {
      case 'reset_circuit_breaker':
        if (!service) {
          return NextResponse.json(
            { error: 'Service parameter is required for reset_circuit_breaker' },
            { status: 400 }
          )
        }

        errorRecoverySystem.resetCircuitBreaker(service)
        return NextResponse.json({
          success: true,
          message: `Circuit breaker reset for ${service}`
        })

      case 'clear_error_history':
        errorRecoverySystem.clearErrorHistory()
        return NextResponse.json({
          success: true,
          message: 'Error history cleared'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('System health POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}