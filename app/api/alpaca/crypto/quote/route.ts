import { NextRequest, NextResponse } from 'next/server'

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

    // Use environment variables directly in API route
    const apiKey = process.env.APCA_API_KEY_ID
    const secretKey = process.env.APCA_API_SECRET_KEY

    if (!apiKey || !secretKey) {
      console.error('Missing Alpaca API credentials in environment')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Fetch crypto quote directly from Alpaca
    const dataUrl = 'https://data.alpaca.markets'
    const url = `${dataUrl}/v1beta3/crypto/us/latest/quotes?symbols=${symbol}`

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Alpaca crypto quote error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        {
          error: 'Failed to fetch crypto quote',
          details: errorText,
          quotes: {}
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching crypto quote:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch crypto quote',
        message: error instanceof Error ? error.message : 'Unknown error',
        quotes: {}
      },
      { status: 500 }
    )
  }
}
