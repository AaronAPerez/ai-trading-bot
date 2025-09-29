/**
 * Debug Order Execution API Route
 * src/app/api/debug/order-execution/route.ts
 * 
 * @fileoverview Comprehensive debugging for order execution issues
 * @author Aaron A Perez
 * @version 1.0.0 - Debug Tool
 */

import { NextRequest, NextResponse } from 'next/server'

interface DebugReport {
  orderExecutionConfig: {
    enabled: boolean
    minConfidenceForOrder: number
    maxPositionSize: number
    dailyOrderLimit: number
    currentDailyCount: number
  }
  botStatus: {
    isRunning: boolean
    lastActivity: Date | null
    recommendationsGenerated: number
    ordersExecuted: number
  }
  alpacaConnection: {
    status: 'connected' | 'error' | 'not_configured'
    accountInfo?: any
    error?: string
  }
  recentRecommendations: Array<{
    symbol: string
    confidence: number
    recommendation: string
    timestamp: Date
    executionEligible: boolean
    blockingReasons: string[]
  }>
  marketStatus: {
    isOpen: boolean
    nextOpen?: Date
    nextClose?: Date
  }
}

// Mock recent recommendations for debugging
let mockRecommendations = [
  {
    symbol: 'AAPL',
    confidence: 75,
    recommendation: 'BUY',
    timestamp: new Date(),
    executionEligible: true,
    blockingReasons: []
  },
  {
    symbol: 'TSLA', 
    confidence: 65,
    recommendation: 'BUY',
    timestamp: new Date(),
    executionEligible: false,
    blockingReasons: ['Confidence below threshold (65% < 70%)']
  },
  {
    symbol: 'NVDA',
    confidence: 80,
    recommendation: 'SELL',
    timestamp: new Date(),
    executionEligible: true,
    blockingReasons: []
  }
]

export async function GET(request: NextRequest) {
  console.log('🔍 Running comprehensive order execution debug...')

  try {
    const debugReport: DebugReport = {
      orderExecutionConfig: {
        enabled: true, // From your config
        minConfidenceForOrder: 70,
        maxPositionSize: 5000,
        dailyOrderLimit: 100,
        currentDailyCount: 0
      },
      botStatus: {
        isRunning: false, // This might be the issue!
        lastActivity: null,
        recommendationsGenerated: 0,
        ordersExecuted: 0
      },
      alpacaConnection: {
        status: 'not_configured'
      },
      recentRecommendations: mockRecommendations,
      marketStatus: {
        isOpen: false
      }
    }

    // Check Alpaca configuration
    if (process.env.APCA_API_KEY_ID && process.env.APCA_API_SECRET_KEY) {
      try {
        const accountResponse = await fetch(
          `${process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'}/v2/account`,
          {
            headers: {
              'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID,
              'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY,
            }
          }
        )

        if (accountResponse.ok) {
          const account = await accountResponse.json()
          debugReport.alpacaConnection = {
            status: 'connected',
            accountInfo: {
              buying_power: account.buying_power,
              cash: account.cash,
              portfolio_value: account.portfolio_value,
              trading_blocked: account.trading_blocked
            }
          }
        } else {
          debugReport.alpacaConnection = {
            status: 'error',
            error: `HTTP ${accountResponse.status}: ${await accountResponse.text()}`
          }
        }
      } catch (error) {
        debugReport.alpacaConnection = {
          status: 'error',
          error: error.message
        }
      }
    }

    // Check market status
    try {
      const clockResponse = await fetch(
        `${process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'}/v2/clock`,
        {
          headers: {
            'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
            'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
          }
        }
      )

      if (clockResponse.ok) {
        const clock = await clockResponse.json()
        debugReport.marketStatus = {
          isOpen: clock.is_open,
          nextOpen: clock.next_open ? new Date(clock.next_open) : undefined,
          nextClose: clock.next_close ? new Date(clock.next_close) : undefined
        }
      }
    } catch (error) {
      console.warn('Could not fetch market status:', error.message)
    }

    // Generate diagnostic summary
    const issues = []
    const recommendations = []

    if (!debugReport.botStatus.isRunning) {
      issues.push('Bot is not running')
      recommendations.push('Start the trading bot from the dashboard')
    }

    if (debugReport.alpacaConnection.status !== 'connected') {
      issues.push('Alpaca API not connected')
      recommendations.push('Check environment variables: APCA_API_KEY_ID, APCA_API_SECRET_KEY')
    }

    if (debugReport.orderExecutionConfig.minConfidenceForOrder >= 70) {
      issues.push('High confidence threshold may be blocking trades')
      recommendations.push('Consider lowering confidence threshold to 60-65%')
    }

    const eligibleRecommendations = debugReport.recentRecommendations.filter(r => r.executionEligible)
    if (eligibleRecommendations.length === 0 && debugReport.recentRecommendations.length > 0) {
      issues.push('No recommendations meet execution criteria')
      recommendations.push('Review confidence thresholds and risk parameters')
    }

    console.log('📊 Debug Summary:', {
      totalIssues: issues.length,
      alpacaStatus: debugReport.alpacaConnection.status,
      botRunning: debugReport.botStatus.isRunning,
      eligibleTrades: eligibleRecommendations.length
    })

    return NextResponse.json({
      success: true,
      summary: {
        status: issues.length === 0 ? 'healthy' : 'issues_found',
        issuesCount: issues.length,
        issues,
        recommendations
      },
      details: debugReport,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST endpoint to force a test order
export async function POST(request: NextRequest) {
  console.log('🧪 Executing test order for debugging...')

  try {
    const body = await request.json()
    const { 
      symbol = 'AAPL', 
      side = 'buy', 
      notional = 100,
      type = 'market',
      time_in_force = 'day'
    } = body

    console.log('📋 Test order parameters:', { symbol, side, notional, type })

    // Check if we should use paper trading
    const isPaper = process.env.ALPACA_BASE_URL?.includes('paper') || 
                    process.env.NODE_ENV === 'development'

    const testOrder = {
      symbol: symbol.toUpperCase(),
      side: side.toLowerCase(),
      notional: parseFloat(notional),
      type,
      time_in_force
    }

    console.log('🚀 Executing test order:', testOrder)

    const orderResponse = await fetch(
      `${process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'}/v2/orders`,
      {
        method: 'POST',
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testOrder)
      }
    )

    if (orderResponse.ok) {
      const order = await orderResponse.json()
      console.log('✅ Test order successful:', order.id)

      return NextResponse.json({
        success: true,
        message: 'Test order executed successfully',
        order: {
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          status: order.status,
          notional: order.notional,
          created_at: order.created_at
        },
        mode: isPaper ? 'paper' : 'live'
      })
    } else {
      const errorText = await orderResponse.text()
      console.error('❌ Test order failed:', errorText)

      return NextResponse.json({
        success: false,
        error: `Order failed: ${errorText}`,
        statusCode: orderResponse.status
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Test order execution error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}