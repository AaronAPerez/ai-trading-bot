import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Crypto markets are always open - no need for API call
    const status = {
      is_open: true,
      market_type: 'crypto',
      next_close: null,
      next_open: null,
      message: 'Crypto markets are open 24/7'
    }

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
