import { NextRequest, NextResponse } from 'next/server'
import Alpaca from '@alpacahq/alpaca-trade-api'

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

    // Use Alpaca SDK for crypto quotes
    const alpaca = new Alpaca({
      keyId: process.env.APCA_API_KEY_ID!,
      secretKey: process.env.APCA_API_SECRET_KEY!,
      paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper',
      feed: 'iex' // Use IEX feed
    })

    // Convert BTCUSD to BTC/USD format (Alpaca crypto format)
    const formattedSymbol = symbol.replace(/^([A-Z]+)(USD[T]?|BUSD)$/i, '$1/$2')

    try {
      // Try to get crypto quote using Alpaca SDK
      const quote = await alpaca.getCryptoQuote(formattedSymbol, { exchange: 'CBSE' })

      return NextResponse.json({
        quotes: {
          [symbol]: {
            ap: quote.ap || 0,
            bp: quote.bp || 0,
            as: quote.as || 0,
            bs: quote.bs || 0,
            t: quote.t || new Date().toISOString()
          }
        }
      })
    } catch (sdkError) {
      // SDK method not available, using direct API (this is normal for crypto)

      // Fallback: Try direct API call with slash format
      const dataUrl = 'https://data.alpaca.markets'
      const url = `${dataUrl}/v1beta3/crypto/us/latest/quotes?symbols=${formattedSymbol}`

      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }

      // If still fails, return empty quote (graceful degradation)
      console.error(`Crypto quote failed for ${symbol}:`, await response.text())
      return NextResponse.json({
        quotes: {
          [symbol]: {
            ap: 0,
            bp: 0,
            as: 0,
            bs: 0,
            t: new Date().toISOString()
          }
        }
      })
    }
  } catch (error) {
    console.error('Error fetching crypto quote:', error)
    return NextResponse.json(
      {
        quotes: {}
      },
      { status: 200 } // Return 200 with empty data instead of 500
    )
  }
}
