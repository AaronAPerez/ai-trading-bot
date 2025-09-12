import { NextRequest, NextResponse } from 'next/server'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()
    
    // Validate order data
    if (!orderData.symbol || !orderData.qty || !orderData.side) {
      return NextResponse.json(
        { error: 'Missing required order fields: symbol, qty, side' },
        { status: 400 }
      )
    }

    const alpacaClient = new AlpacaServerClient()
    const order = await alpacaClient.createOrder({
      symbol: orderData.symbol,
      qty: orderData.qty,
      side: orderData.side,
      type: orderData.type || 'market',
      time_in_force: orderData.time_in_force || 'day',
      limit_price: orderData.limit_price
    })
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'open' | 'closed' | 'all' | null
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const alpacaClient = new AlpacaServerClient()
    const orders = await alpacaClient.getOrders(status || undefined, limit)
    
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
