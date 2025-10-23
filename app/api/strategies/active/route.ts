/**
 * Active Strategy API Route
 * Returns the currently active trading strategy and its performance
 */

import { NextRequest, NextResponse } from 'next/server'

// Get the global strategy engine instance (same one used by ai-bot)
let getGlobalStrategyEngine: any = null

function getStrategyEngine() {
  if (!getGlobalStrategyEngine) {
    try {
      // Try bot-control route first (primary)
      try {
        const botControl = require('../../ai/bot-control/route')
        getGlobalStrategyEngine = botControl.getStrategyEngine || null
      } catch (e) {
        // Fallback to ai-bot route
        const aiBot = require('../../ai-bot/route')
        getGlobalStrategyEngine = aiBot.getGlobalStrategyEngine || null
      }
    } catch (error) {
      console.warn('Could not access strategy engine:', error)
    }
  }
  return getGlobalStrategyEngine?.()
}

// Fallback cache for when engine is not available
let activeStrategyCache: any = null

export async function GET(request: NextRequest) {
  try {
    // Try to get data from the actual AdaptiveStrategyEngine
    const engine = getStrategyEngine()

    if (engine) {
      // First try to get the current strategy being used
      let activeStrategy = engine.getCurrentStrategy?.()

      // If no current strategy, find the most recently used one
      if (!activeStrategy) {
        const performances = engine.getAllPerformances()
        activeStrategy = performances.reduce((best: any, current: any) => {
          if (!best || (current.lastTradeTime && (!best.lastTradeTime || current.lastTradeTime > best.lastTradeTime))) {
            return current
          }
          return best
        }, null)
      }

      if (activeStrategy) {
        const strategyData = {
          strategyId: activeStrategy.strategyId,
          strategyName: activeStrategy.strategyName,
          winRate: activeStrategy.winRate,
          totalTrades: activeStrategy.totalTrades,
          testingMode: activeStrategy.testingMode,
          testTradesCompleted: activeStrategy.testTradesCompleted,
          testTradesRequired: activeStrategy.testTradesRequired,
          totalPnL: activeStrategy.totalPnL,
          lastUpdated: new Date().toISOString()
        }

        // Update cache
        activeStrategyCache = strategyData

        return NextResponse.json({
          success: true,
          data: strategyData,
          timestamp: new Date().toISOString()
        })
      }
    }

    // If we have cached strategy data, return it
    if (activeStrategyCache) {
      return NextResponse.json({
        success: true,
        data: activeStrategyCache,
        timestamp: new Date().toISOString()
      })
    }

    // Default response when no strategy is active
    return NextResponse.json({
      success: true,
      data: {
        strategyId: 'adaptive',
        strategyName: 'Adaptive ML',
        winRate: 0,
        totalTrades: 0,
        testingMode: false,
        testTradesCompleted: 0,
        testTradesRequired: 5
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Active Strategy API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active strategy'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { strategyId, strategyName, winRate, totalTrades, testingMode, testTradesCompleted, testTradesRequired } = body

    // Update the active strategy cache
    activeStrategyCache = {
      strategyId,
      strategyName,
      winRate: winRate || 0,
      totalTrades: totalTrades || 0,
      testingMode: testingMode || false,
      testTradesCompleted: testTradesCompleted || 0,
      testTradesRequired: testTradesRequired || 5,
      lastUpdated: new Date().toISOString()
    }

    console.log('📊 Active strategy updated:', activeStrategyCache)

    return NextResponse.json({
      success: true,
      data: activeStrategyCache,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Active Strategy POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update active strategy'
      },
      { status: 500 }
    )
  }
}
