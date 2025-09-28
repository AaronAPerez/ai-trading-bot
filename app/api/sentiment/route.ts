import { NextRequest, NextResponse } from 'next/server'
import { newsApiService } from '@/lib/sentiment/newsApiService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const refresh = searchParams.get('refresh') === 'true'

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    let sentiment
    if (refresh) {
      sentiment = await newsApiService.getAndStoreSentiment(symbol.toUpperCase())
    } else {
      sentiment = await newsApiService.getCachedSentiment(symbol.toUpperCase())
    }

    if (!sentiment) {
      return NextResponse.json(
        { error: 'Unable to fetch sentiment data' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      sentiment,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sentiment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols } = body

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      )
    }

    const sentimentData = await Promise.all(
      symbols.map(async (symbol: string) => {
        const sentiment = await newsApiService.getCachedSentiment(symbol.toUpperCase())
        return {
          symbol: symbol.toUpperCase(),
          sentiment
        }
      })
    )

    return NextResponse.json({
      sentiments: sentimentData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Bulk sentiment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}