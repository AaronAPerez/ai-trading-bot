import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const limit = searchParams.get('limit') || '100'
    const timeframe = searchParams.get('timeframe') || '1Day'

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    try {
      const barsData = await alpacaClient.getBarsV2(symbol, {
        start: start || undefined,
        end: end || undefined,
        limit: parseInt(limit),
        timeframe: timeframe as any
      })

      // Return success response
      return NextResponse.json({
        success: true,
        bars: barsData.bars || [],
        symbol,
        next_page_token: barsData.next_page_token
      })
    } catch (alpacaError: any) {
      console.error(`Alpaca bars error for ${symbol}:`, alpacaError.message)

      // Return empty bars instead of error (graceful degradation)
      return NextResponse.json({
        success: true,
        bars: [],
        symbol,
        error: alpacaError.message
      })
    }
  } catch (error) {
    console.error('Error fetching bars:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bars',
        bars: []
      },
      { status: 200 } // Return 200 with error message instead of 500
    )
  }
}
