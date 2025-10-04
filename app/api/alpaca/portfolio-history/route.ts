import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '1M'
    const timeframe = searchParams.get('timeframe') || '1D'
    const extended_hours = searchParams.get('extended_hours') === 'true'

    const portfolioHistory = await alpacaClient.getPortfolioHistory({
      period,
      timeframe,
      extended_hours
    })

    return NextResponse.json(portfolioHistory)
  } catch (error) {
    console.error('Error fetching portfolio history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio history', equity: [], timestamp: [] },
      { status: 500 }
    )
  }
}
