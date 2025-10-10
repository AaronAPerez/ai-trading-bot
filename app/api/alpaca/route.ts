import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    const apiKey = process.env.APCA_API_KEY_ID
    const apiSecret = process.env.APCA_API_SECRET_KEY
    const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'Alpaca API credentials not configured',
        positions: [],
        account: null,
        orders: []
      }, { status: 500 })
    }

    const headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'accept': 'application/json'
    }

    switch (action) {
      case 'positions': {
        const response = await fetch(`${baseUrl}/v2/positions`, { headers })
        if (!response.ok) {
          return NextResponse.json({ success: false, positions: [] })
        }
        const positions = await response.json()
        return NextResponse.json({ success: true, positions: positions || [] })
      }

      case 'account': {
        const response = await fetch(`${baseUrl}/v2/account`, { headers })
        if (!response.ok) {
          return NextResponse.json({ success: false, error: 'Failed to fetch account' }, { status: response.status })
        }
        const account = await response.json()
        return NextResponse.json({ success: true, account })
      }

      case 'orders': {
        const status = searchParams.get('status') || 'all'
        const limit = searchParams.get('limit') || '50'
        const response = await fetch(`${baseUrl}/v2/orders?status=${status}&limit=${limit}`, { headers })
        if (!response.ok) {
          return NextResponse.json({ success: false, orders: [] })
        }
        const orders = await response.json()
        return NextResponse.json({ success: true, orders: orders || [] })
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Alpaca API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      positions: [],
      orders: []
    }, { status: 500 })
  }
}