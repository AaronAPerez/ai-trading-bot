import { NextRequest, NextResponse } from 'next/server'
import { alpacaRateLimiter } from '@/lib/alpaca/rate-limiter'

/**
 * Rate Limiter Monitoring API
 *
 * GET /api/alpaca/rate-limiter - Get rate limiter statistics
 * POST /api/alpaca/rate-limiter - Control rate limiter (clear queue, throttle)
 */

export async function GET(request: NextRequest) {
  try {
    const stats = alpacaRateLimiter.getStats()

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        status: stats.isThrottled ? 'throttled' : stats.processing ? 'processing' : 'idle',
        message: stats.isThrottled
          ? `Throttled for ${Math.ceil(stats.throttleTimeRemaining / 1000)} more seconds`
          : stats.processing
            ? 'Processing requests'
            : 'Rate limiter idle'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Rate limiter stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rate limiter stats'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, duration } = body

    switch (action) {
      case 'clear':
        alpacaRateLimiter.clearQueue()
        return NextResponse.json({
          success: true,
          message: 'Rate limiter queue cleared',
          timestamp: new Date().toISOString()
        })

      case 'throttle':
        const throttleDuration = duration || 10000 // Default 10 seconds
        alpacaRateLimiter.throttle(throttleDuration)
        return NextResponse.json({
          success: true,
          message: `Rate limiter throttled for ${throttleDuration}ms`,
          timestamp: new Date().toISOString()
        })

      case 'stats':
        const stats = alpacaRateLimiter.getStats()
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use: clear, throttle, or stats'
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Rate limiter control error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to control rate limiter'
      },
      { status: 500 }
    )
  }
}