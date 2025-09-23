import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get API credentials from environment variables (use the actual env var names)
    const apiKeyId = process.env.APCA_API_KEY_ID || process.env.ALPACA_PAPER_API_KEY_ID
    const apiSecret = process.env.APCA_API_SECRET_KEY || process.env.ALPACA_PAPER_SECRET_KEY
    const baseUrl = 'https://paper-api.alpaca.markets'

    if (!apiKeyId || !apiSecret) {
      return NextResponse.json(
        { error: 'Alpaca API credentials not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(`${baseUrl}/v2/clock`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Alpaca API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Alpaca API error: ${response.status}` },
        { status: response.status }
      )
    }

    const clockData = await response.json()

    return NextResponse.json(clockData)
  } catch (error) {
    console.error('Market clock API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market clock data' },
      { status: 500 }
    )
  }
}