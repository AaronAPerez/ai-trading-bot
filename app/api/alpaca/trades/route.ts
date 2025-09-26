import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('📊 Trades API GET request received')

  try {
    // Parse query parameters
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit') || '50'
    const page_token = url.searchParams.get('page_token')
    const asof = url.searchParams.get('asof')
    const until = url.searchParams.get('until')
    const direction = url.searchParams.get('direction') || 'desc'

    console.log('📋 Query parameters:', { limit, page_token, asof, until, direction })

    // Check API credentials
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
      console.error('❌ Missing Alpaca API credentials')
      return NextResponse.json(
        { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
        { status: 500 }
      )
    }

    // Build query string
    const queryParams = new URLSearchParams()
    queryParams.append('limit', limit)
    queryParams.append('direction', direction)
    if (page_token) queryParams.append('page_token', page_token)
    if (asof) queryParams.append('asof', asof)
    if (until) queryParams.append('until', until)

    const queryString = queryParams.toString()
    const apiUrl = `https://paper-api.alpaca.markets/v2/account/activities/FILL${queryString ? '?' + queryString : ''}`

    console.log('🔄 Fetching trades from:', apiUrl)

    // Direct fetch to Alpaca Paper Trading API for trade activities
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
      }
    }

    const response = await fetch(apiUrl, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Trades fetch failed:', response.status, errorText)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
          { status: 500 }
        )
      }

      throw new Error(`Trades API failed: ${response.status} ${errorText}`)
    }

    const tradesData = await response.json()
    console.log('✅ Trades fetched successfully:', tradesData.length, 'trades')

    // Enhanced trades data with calculated fields
    const enhancedTrades = tradesData.map((trade: any) => ({
      // Original trade data
      ...trade,

      // Enhanced fields for frontend compatibility
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: parseFloat(trade.qty || 0),
      price: parseFloat(trade.price || 0),
      value: parseFloat(trade.qty || 0) * parseFloat(trade.price || 0),
      status: 'filled', // Trades are always filled
      type: trade.type || 'market',
      timestamp: new Date(trade.transaction_time),
      fee: parseFloat(trade.commission || 0),

      // Display formatting
      displaySide: trade.side?.toUpperCase(),
      displayType: (trade.type || 'market').toUpperCase(),
      displayValue: `${trade.side?.toUpperCase()} ${trade.qty} ${trade.symbol} @ $${parseFloat(trade.price || 0).toFixed(2)}`,

      // API source
      source: 'alpaca_paper',
      paperTrading: true
    }))

    return NextResponse.json({
      success: true,
      trades: enhancedTrades,
      total: enhancedTrades.length,
      filters: { limit: parseInt(limit), direction, asof, until },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Trades fetch error:', error)

    // Enhanced error reporting
    let errorMessage = 'Failed to fetch trades'
    let errorDetails = error.message || 'Unknown error'

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Authentication failed'
      errorDetails = 'Invalid or missing Alpaca API credentials'
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        originalError: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}