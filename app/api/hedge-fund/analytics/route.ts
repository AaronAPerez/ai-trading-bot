import { NextRequest, NextResponse } from 'next/server'
import { HedgeFundEngine } from '@/lib/hedge-fund-engine/HedgeFundEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/hedge-fund/analytics
 *
 * Get comprehensive hedge fund analytics
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

    // Get analytics
    const analytics = engine.getAnalyticsEngine()
    const performanceMetrics = await analytics.getPerformanceMetrics(userId)
    const recentTrades = await analytics.getRecentTrades(userId, 50)
    const activityLogs = await analytics.getActivityLogs(userId, 100)

    // Get learning data
    const learning = engine.getLearningEngine()
    const strategyInsights = await Promise.all([
      learning.getStrategyInsights(userId, 'momentum'),
      learning.getStrategyInsights(userId, 'meanReversion'),
      learning.getStrategyInsights(userId, 'breakout')
    ])

    // Get multi-strategy engine data
    const signal = engine.getSignalEngine()
    const multiStrategyEngine = signal.getMultiStrategyEngine()

    let strategyComparison = null
    if (multiStrategyEngine) {
      strategyComparison = multiStrategyEngine.getStrategyComparison()
    }

    return NextResponse.json({
      performanceMetrics,
      recentTrades,
      activityLogs: activityLogs.slice(0, 20), // Limit to 20 most recent
      strategyInsights: strategyInsights.filter(Boolean),
      strategyComparison,
      summary: {
        totalTrades: performanceMetrics?.totalTrades || 0,
        successRate: performanceMetrics?.successRate || 0,
        totalVolume: performanceMetrics?.totalVolume || 0,
        strategiesActive: strategyComparison?.strategies?.length || 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Analytics fetch failed:', error)
    return NextResponse.json(
      {
        error: error.message || 'Analytics fetch failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
