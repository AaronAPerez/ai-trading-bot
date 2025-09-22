import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Direct fetch implementation using Alpaca Paper Trading API
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
      }
    }

    // Check if we have valid API credentials
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
        { status: 500 }
      )
    }

    console.log('Fetching positions data from Alpaca...')
    const response = await fetch('https://paper-api.alpaca.markets/v2/positions', options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Positions fetch failed:', response.status, errorText)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
          { status: 500 }
        )
      }

      throw new Error(`Positions API failed: ${response.status} ${errorText}`)
    }

    const positionsData = await response.json()
    console.log('Positions data fetched successfully:', positionsData.length, 'positions')

    // Enhanced positions data with formatted fields
    const enhancedPositions = positionsData.map((position: any) => ({
      // Original position data
      ...position,

      // Enhanced calculated fields for frontend compatibility
      symbol: position.symbol,
      quantity: parseFloat(position.qty || 0),
      avgBuyPrice: parseFloat(position.avg_entry_price || 0),
      marketValue: parseFloat(position.market_value || 0),
      unrealizedPnL: parseFloat(position.unrealized_pl || 0),
      unrealizedPnLPercent: parseFloat(position.unrealized_plpc || 0) * 100,
      todayPnL: parseFloat(position.unrealized_intraday_pl || 0),
      todayPnLPercent: parseFloat(position.unrealized_intraday_plpc || 0) * 100,

      // Position details
      side: position.side,
      exchange: position.exchange,
      assetClass: position.asset_class,
      assetId: position.asset_id,

      // Current market data
      currentPrice: parseFloat(position.current_price || position.avg_entry_price || 0),
      lastDayPrice: parseFloat(position.lastday_price || 0),
      changeToday: parseFloat(position.change_today || 0),

      // Display formatting
      displayValue: `$${parseFloat(position.market_value || 0).toLocaleString()}`,
      displayPnL: `${parseFloat(position.unrealized_pl || 0) >= 0 ? '+' : ''}$${parseFloat(position.unrealized_pl || 0).toFixed(2)}`,
      displayPnLPercent: `${parseFloat(position.unrealized_plpc || 0) >= 0 ? '+' : ''}${(parseFloat(position.unrealized_plpc || 0) * 100).toFixed(2)}%`
    }))

    return NextResponse.json(enhancedPositions)

  } catch (error) {
    console.error('Positions API error:', error)

    // Provide specific error messages
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
        { status: 500 }
      )
    }

    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Access forbidden: Check your Alpaca account permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch positions',
        details: error.message
      },
      { status: 500 }
    )
  }
}