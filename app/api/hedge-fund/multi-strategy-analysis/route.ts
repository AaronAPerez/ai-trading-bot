import { NextRequest, NextResponse } from 'next/server'
import { MultiStrategyEngine } from '@/lib/strategies/MultiStrategyEngine'


// Global singleton instance
let multiStrategyEngine: MultiStrategyEngine | null = null

function getMultiStrategyEngine(): MultiStrategyEngine {
  if (!multiStrategyEngine) {
    const userId = '00000000-0000-0000-0000-000000000000' // Use system user for now
    multiStrategyEngine = new MultiStrategyEngine(userId, true)
    console.log('🏦 Created MultiStrategyEngine instance for hedge fund mode')
  }
  return multiStrategyEngine
}

/**
 * GET /api/hedge-fund/multi-strategy-analysis
 * Returns multi-strategy comparison for a given symbol
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol') || 'AAPL'

    console.log(`🔍 Multi-strategy analysis requested for ${symbol}`)

    // Get engine instance
    const engine = getMultiStrategyEngine()

    // Fetch market data from Alpaca
    const barsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_ALPACA_API_URL || 'https://paper-api.alpaca.markets'}/v2/stocks/${symbol}/bars?timeframe=1Day&limit=100`,
      {
        headers: {
          'APCA-API-KEY-ID': process.env.NEXT_PUBLIC_APCA_API_KEY_ID || '',
          'APCA-API-SECRET-KEY': process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY || ''
        }
      }
    )

    if (!barsResponse.ok) {
      throw new Error(`Failed to fetch market data from Alpaca: ${barsResponse.statusText}`)
    }

    const barsData = await barsResponse.json()
    const marketData = barsData.bars || []

    if (marketData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No market data available'
      }, { status: 404 })
    }

    console.log(`📊 Fetched ${marketData.length} bars for ${symbol}`)

    // Analyze with all strategies
    const multiStrategySignal = await engine.analyzeAllStrategies(symbol, marketData)

    console.log(`✅ Multi-strategy analysis complete for ${symbol}:`, {
      recommendedAction: multiStrategySignal.recommendedSignal.action,
      consensus: multiStrategySignal.consensus,
      strategiesAnalyzed: multiStrategySignal.allSignals.length
    })

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        timestamp: new Date().toISOString(),
        ...multiStrategySignal
      }
    })

  } catch (error: any) {
    console.error('❌ Multi-strategy analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
