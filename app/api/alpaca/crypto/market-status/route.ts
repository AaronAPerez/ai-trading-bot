import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

export async function GET(request: NextRequest) {
  try {
    const status = await alpacaClient.getCryptoMarketStatus()

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching crypto market status:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch crypto market status',
        is_open: true, // Crypto is always open
        market_type: 'crypto',
        message: 'Crypto markets are open 24/7'
      },
      { status: 500 }
    )
  }
}
