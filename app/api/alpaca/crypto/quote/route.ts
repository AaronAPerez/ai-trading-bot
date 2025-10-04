import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    const quote = await alpacaClient.getCryptoQuote(symbol)

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error fetching crypto quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto quote' },
      { status: 500 }
    )
  }
}
