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

    // Determine if crypto or stock based on symbol format
    const isCrypto = symbol.includes('/')
    const assetType = isCrypto ? 'crypto' : 'stocks'
    const dataUrl = 'https://data.alpaca.markets'

    // Fetch market data from Alpaca Data API with increased limit
    // Use 1Hour timeframe for more granular data and better signal generation
    const barsResponse = await fetch(
      `${dataUrl}/v2/${assetType}/${symbol}/bars?timeframe=1Hour&limit=200`,
      {
        headers: {
          'APCA-API-KEY-ID': process.env.NEXT_PUBLIC_APCA_API_KEY_ID || '',
          'APCA-API-SECRET-KEY': process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY || ''
        }
      }
    )

    if (!barsResponse.ok) {
      const errorText = await barsResponse.text()
      console.error(`Alpaca API error (${barsResponse.status}):`, errorText)
      throw new Error(`Failed to fetch market data from Alpaca: ${barsResponse.statusText}`)
    }

    const barsData = await barsResponse.json()
    console.log('📊 Raw Alpaca response keys:', Object.keys(barsData))

    // Handle different response formats from Alpaca
    // For stocks: response.bars is an array
    // For crypto: response.bars[symbol] is an array
    let marketData: any[] = []
    if (isCrypto && barsData.bars && barsData.bars[symbol]) {
      marketData = barsData.bars[symbol]
    } else if (Array.isArray(barsData.bars)) {
      marketData = barsData.bars
    } else if (barsData.bars && typeof barsData.bars === 'object') {
      // Fallback: try to get first symbol's data
      const symbols = Object.keys(barsData.bars)
      marketData = symbols.length > 0 ? barsData.bars[symbols[0]] : []
    }

    if (marketData.length === 0) {
      console.warn(`⚠️ No market data found for ${symbol}. Response:`, barsData)
      return NextResponse.json({
        success: false,
        error: 'No market data available'
      }, { status: 404 })
    }

    // Ensure we have sufficient data for technical analysis (minimum 50 bars)
    if (marketData.length < 50) {
      console.warn(`⚠️ Insufficient market data for ${symbol}: ${marketData.length} bars (need 50+)`)
      return NextResponse.json({
        success: false,
        error: `Insufficient market data: ${marketData.length} bars (minimum 50 required for technical analysis)`
      }, { status: 400 })
    }

    console.log(`📊 Fetched ${marketData.length} bars for ${symbol}`)

    // Extract current market data from latest bar
    const latestBar = marketData[marketData.length - 1]
    const previousBar = marketData[marketData.length - 2]
    const priceChange = previousBar ? ((latestBar.c - previousBar.c) / previousBar.c) * 100 : 0

    const marketSummary = {
      currentPrice: latestBar.c,
      open: latestBar.o,
      high: latestBar.h,
      low: latestBar.l,
      volume: latestBar.v,
      change: priceChange,
      timestamp: latestBar.t
    }

    // Analyze with all strategies
    const multiStrategySignal = await engine.analyzeAllStrategies(symbol, marketData)

    console.log(`✅ Multi-strategy analysis complete for ${symbol}:`, {
      recommendedAction: multiStrategySignal.recommendedSignal.action,
      consensus: multiStrategySignal.consensus,
      strategiesAnalyzed: multiStrategySignal.allSignals.length,
      currentPrice: marketSummary.currentPrice
    })

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        timestamp: new Date().toISOString(),
        marketData: marketSummary,
        dataSource: 'alpaca',
        barsAnalyzed: marketData.length,
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
