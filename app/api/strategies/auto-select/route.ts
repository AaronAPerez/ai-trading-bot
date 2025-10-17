import { NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { getGlobalStrategyEngine } from '@/lib/strategies/GlobalStrategyEngine'

/**
 * Auto-select best performing strategy using Global AdaptiveStrategyEngine
 * GET /api/strategies/auto-select
 *
 * Uses the SAME engine instance as the AI bot for consistent performance tracking
 */

interface StrategyPerformance {
  strategyId: string
  strategyName: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnL: number
  winRate: number
  avgPnL: number
  score: number
  testingMode?: boolean
  testTradesCompleted?: number
  testPassed?: boolean | null
}

export async function GET() {
  try {
    console.log('🔍 Loading strategy performance from Supabase...')

    // Define all available strategies
    const allStrategyDefinitions = [
      { strategyId: 'rsi', strategyName: 'RSI Momentum' },
      { strategyId: 'macd', strategyName: 'MACD Trend Following' },
      { strategyId: 'bollinger', strategyName: 'Bollinger Bands Breakout' },
      { strategyId: 'ma_crossover', strategyName: 'Moving Average Crossover' },
      { strategyId: 'mean_reversion', strategyName: 'Mean Reversion' },
      { strategyId: 'inverse', strategyName: 'Inverse Mode' },
      { strategyId: 'normal', strategyName: 'Normal (No Inverse)' }
    ]

    // Load from Supabase for persistence across server restarts
    const { loadAllStrategyPerformances } = await import('@/lib/strategies/StrategyPerformanceStorage')
    const savedPerformances = await loadAllStrategyPerformances()

    // Merge saved data with all strategy definitions
    // This ensures ALL strategies are shown, even if they have no trades yet
    const allPerformances = allStrategyDefinitions.map(stratDef => {
      const saved = savedPerformances.find(p => p.strategyId === stratDef.strategyId)

      if (saved) {
        // Use saved data from Supabase
        return saved
      } else {
        // Use default empty state for strategies not yet in database
        return {
          ...stratDef,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalPnL: 0,
          winRate: 0,
          avgPnL: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          consecutiveLosses: 0,
          consecutiveWins: 0,
          lastTradeTime: null,
          testingMode: true,
          testTradesCompleted: 0,
          testTradesRequired: 5,
          testPnL: 0,
          testWinRate: 0,
          testPassed: null
        }
      }
    })

    console.log(`📦 Showing all ${allPerformances.length} strategies (${savedPerformances.length} with data from Supabase)`)

    // Convert to API format
    const allStrategies: StrategyPerformance[] = allPerformances.map(perf => ({
      strategyId: perf.strategyId,
      strategyName: perf.strategyName,
      totalTrades: perf.totalTrades,
      winningTrades: perf.winningTrades,
      losingTrades: perf.losingTrades,
      totalPnL: perf.totalPnL,
      winRate: perf.winRate,
      avgPnL: perf.avgPnL,
      score: perf.winRate * 3 + perf.totalPnL * 50, // Composite score
      testingMode: perf.testingMode,
      testTradesCompleted: perf.testTradesCompleted,
      testPassed: perf.testPassed
    }))

    // Sort by P&L (descending)
    allStrategies.sort((a, b) => {
      if (Math.abs(b.totalPnL - a.totalPnL) > 0.01) {
        return b.totalPnL - a.totalPnL
      }
      return b.winRate - a.winRate
    })

    // Get best strategy
    const bestStrategy = allStrategies[0] || {
      strategyId: 'normal',
      strategyName: 'Normal (No Inverse)',
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      winRate: 50,
      avgPnL: 0,
      score: 0,
      testingMode: true,
      testTradesCompleted: 0,
      testPassed: null
    }

    // Get current active strategy (the one with most recent trade)
    const currentStrategy = allPerformances.length > 0
      ? allPerformances.reduce((latest, perf) => {
          if (!latest.lastTradeTime) return perf
          if (!perf.lastTradeTime) return latest
          return new Date(perf.lastTradeTime) > new Date(latest.lastTradeTime) ? perf : latest
        })
      : null

    console.log('📊 Best Strategy:', {
      name: bestStrategy.strategyName,
      winRate: bestStrategy.winRate.toFixed(1) + '%',
      totalPnL: '$' + bestStrategy.totalPnL.toFixed(2),
      trades: bestStrategy.totalTrades,
      testing: bestStrategy.testingMode ? `${bestStrategy.testTradesCompleted}/${5}` : 'Complete',
      passed: bestStrategy.testPassed === null ? 'Pending' : bestStrategy.testPassed ? 'Yes' : 'No',
      testRequired: 5
    })

    if (currentStrategy) {
      console.log('📍 Current Strategy:', {
        name: currentStrategy.strategyName,
        winRate: currentStrategy.winRate.toFixed(1) + '%',
        totalPnL: '$' + currentStrategy.totalPnL.toFixed(2)
      })
    }

    // Generate recommendation
    let recommendation = {
      strategyId: bestStrategy.strategyId,
      strategyName: bestStrategy.strategyName,
      confidence: Math.min(100, Math.max(50, bestStrategy.winRate + 10)),
      reason: bestStrategy.totalPnL >= 0
        ? `Performing well: ${bestStrategy.winRate.toFixed(1)}% win rate, $${bestStrategy.totalPnL.toFixed(2)} profit over ${bestStrategy.totalTrades} trades`
        : `Testing strategy: ${bestStrategy.winRate.toFixed(1)}% win rate, $${bestStrategy.totalPnL.toFixed(2)} over ${bestStrategy.totalTrades} trades`
    }

    // If currently losing badly, recommend switching
    if (bestStrategy.totalPnL < -5 && bestStrategy.totalTrades < 5) {
      recommendation.reason = `Strategy is down $${Math.abs(bestStrategy.totalPnL).toFixed(2)}. Testing new strategies to find profitable approach.`
      recommendation.confidence = 60
    }

    // If strategy is in testing mode
    if (bestStrategy.testingMode) {
      recommendation.reason = `TESTING MODE: ${bestStrategy.testTradesCompleted}/${5} test trades completed. Using small position sizes ($5-$10) to validate profitability before scaling up.`
      recommendation.confidence = 50
    }

    // If strategy passed testing
    if (bestStrategy.testPassed === true && !bestStrategy.testingMode) {
      recommendation.reason = `✅ Strategy PASSED testing with ${bestStrategy.winRate.toFixed(1)}% win rate. Now using larger position sizes ($10-$200) based on performance.`
      recommendation.confidence = Math.min(100, bestStrategy.winRate + 20)
    }

    return NextResponse.json({
      success: true,
      data: {
        bestStrategy,
        allStrategies,
        currentStrategy: currentStrategy ? {
          strategyId: currentStrategy.strategyId,
          strategyName: currentStrategy.strategyName,
          winRate: currentStrategy.winRate,
          totalPnL: currentStrategy.totalPnL,
          testingMode: currentStrategy.testingMode
        } : null,
        recommendation
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error in auto-select strategy:', error)

    // Return default strategy on error
    const defaultStrategy: StrategyPerformance = {
      strategyId: 'normal',
      strategyName: 'Normal (No Inverse)',
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      winRate: 50,
      avgPnL: 0,
      score: 0,
      testingMode: true,
      testTradesCompleted: 0,
      testPassed: null
    }

    return NextResponse.json({
      success: true, // Return success to avoid error UI
      data: {
        bestStrategy: defaultStrategy,
        allStrategies: [defaultStrategy],
        currentStrategy: null,
        recommendation: {
          strategyId: 'normal',
          strategyName: 'Normal (No Inverse)',
          confidence: 50,
          reason: 'Analyzing performance... Start trading to collect data.'
        }
      },
      timestamp: new Date().toISOString()
    })
  }
}
