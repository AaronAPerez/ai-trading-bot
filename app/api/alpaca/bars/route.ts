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

    const barsData = await alpacaClient.getBarsV2(symbol, {
      start,
      end,
      limit: parseInt(limit),
      timeframe: timeframe as any
    })

    return NextResponse.json(barsData)
  } catch (error) {
    console.error('Error fetching bars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bars', bars: [] },
      { status: 500 }
    )
  }
}
