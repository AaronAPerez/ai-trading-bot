import { NextRequest, NextResponse } from 'next/server'
import { HedgeFundEngine } from '@/lib/hedge-fund-engine/HedgeFundEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/hedge-fund/status
 *
 * Get hedge fund engine status and health
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || 'test-user'
    const mode = (searchParams.get('mode') || 'paper') as 'paper' | 'live'

    // Initialize engine
    const engine = new HedgeFundEngine({
      userId,
      mode
    })

    // Test connections
    const connections = await engine.testConnections()

    // Get engine configuration
    const config = engine.getConfig()

    // Get analytics summary
    const analytics = engine.getAnalyticsEngine()
    const recentTrades = await analytics.getRecentTrades(userId, 10)

    // Get learning insights
    const learning = engine.getLearningEngine()
    const strategyComparison = learning.getStrategyComparison()

    return NextResponse.json({
      status: connections.overallStatus,
      connections,
      config: {
        userId: config.userId,
        mode: config.mode,
        sessionId: config.sessionId
      },
      recentTrades,
      strategyPerformance: strategyComparison,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Status check failed:', error)
    return NextResponse.json(
      {
        error: error.message || 'Status check failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
