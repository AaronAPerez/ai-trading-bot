import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * GET /api/ai/metrics
 * Get comprehensive AI trading metrics from Alpaca and Supabase
 */
export const GET = withErrorHandling(async () => {
  const userId = getCurrentUserId()

  try {
    // Fetch data in parallel for better performance
    const [
      alpacaAccount,
      alpacaPositions,
      alpacaOrders,
      learningData,
      botMetrics,
      recentActivity
    ] = await Promise.all([
      // Alpaca real-time data
      alpacaClient.getAccount().catch(() => null),
      alpacaClient.getPositions().catch(() => []),
      alpacaClient.getOrders({ limit: 100, status: 'all' }).catch(() => []),

      // Supabase AI learning data
      supabaseService.getRecentLearningData(userId, 1000).catch(() => []),
      supabaseService.getBotMetrics(userId).catch(() => null),
      supabaseService.getRecentActivity(userId, 50).catch(() => [])
    ])

    // Calculate AI learning metrics
    const totalLearningRecords = learningData.length
    const profitableTrades = learningData.filter((record: any) =>
      record.outcome === 'profit' || record.profit > 0
    ).length
    const accuracy = totalLearningRecords > 0
      ? (profitableTrades / totalLearningRecords) * 100
      : 0

    // Identify unique patterns
    const uniquePatterns = new Set(
      learningData
        .map((record: any) => record.pattern || record.strategy)
        .filter(Boolean)
    ).size

    // Calculate AI performance metrics from Alpaca
    const filledOrders = alpacaOrders.filter((order: any) => order.filled_at)
    const totalTrades = filledOrders.length
    const profitableOrders = filledOrders.filter((order: any) => {
      const filled_avg_price = parseFloat(order.filled_avg_price || '0')
      const limit_price = parseFloat(order.limit_price || filled_avg_price.toString())
      return order.side === 'buy'
        ? filled_avg_price <= limit_price
        : filled_avg_price >= limit_price
    }).length
    const successRate = totalTrades > 0 ? (profitableOrders / totalTrades) * 100 : 0

    // Portfolio metrics
    const totalPnL = alpacaPositions.reduce((sum: number, pos: any) =>
      sum + parseFloat(pos.unrealized_pl || pos.unrealizedPnL || '0'), 0
    )
    const dailyPnL = alpacaAccount ? parseFloat(alpacaAccount.equity) - parseFloat(alpacaAccount.last_equity) : 0

    // Risk score calculation
    const positionCount = alpacaPositions.length
    const portfolioValue = alpacaAccount ? parseFloat(alpacaAccount.portfolio_value || alpacaAccount.equity) : 0
    const maxPositionSize = alpacaPositions.length > 0
      ? Math.max(...alpacaPositions.map((pos: any) =>
          Math.abs(parseFloat(pos.market_value || '0'))
        ))
      : 0
    const concentrationRisk = portfolioValue > 0
      ? (maxPositionSize / portfolioValue) * 100
      : 0
    const riskScore = Math.min(100, concentrationRisk + (positionCount > 20 ? 20 : 0))

    // Invested amount and position details
    const investedAmount = alpacaPositions.reduce((sum: number, pos: any) =>
      sum + Math.abs(parseFloat(pos.market_value || '0')), 0
    )

    const metrics = {
      // AI Learning Metrics (from Supabase)
      learning: {
        accuracy: accuracy,
        patternsIdentified: uniquePatterns,
        dataPointsProcessed: totalLearningRecords,
        isLearningActive: botMetrics?.is_running || false,
        lastUpdate: new Date().toISOString()
      },

      // AI Performance Metrics (from Alpaca + Supabase)
      performance: {
        successRate: successRate / 100, // Convert to 0-1 scale
        tradesExecuted: totalTrades,
        recommendationsGenerated: totalLearningRecords,
        riskScore: Math.round(riskScore)
      },

      // Portfolio Metrics (from Alpaca)
      portfolio: {
        investedAmount: investedAmount,
        positionCount: positionCount,
        totalPnL: totalPnL,
        dailyPnL: dailyPnL
      },

      // Data sources verification
      dataSources: {
        alpaca: !!alpacaAccount,
        supabase: learningData.length > 0 || !!botMetrics,
        reactQuery: true
      },

      // Timestamp
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('❌ Error fetching AI metrics:', error)

    // Return default metrics on error
    return NextResponse.json({
      success: true,
      data: {
        learning: {
          accuracy: 0,
          patternsIdentified: 0,
          dataPointsProcessed: 0,
          isLearningActive: false,
          lastUpdate: new Date().toISOString()
        },
        performance: {
          successRate: 0,
          tradesExecuted: 0,
          recommendationsGenerated: 0,
          riskScore: 0
        },
        portfolio: {
          investedAmount: 0,
          positionCount: 0,
          totalPnL: 0,
          dailyPnL: 0
        },
        dataSources: {
          alpaca: false,
          supabase: false,
          reactQuery: true
        },
        timestamp: new Date().toISOString()
      }
    })
  }
})
