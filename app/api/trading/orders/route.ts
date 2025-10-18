import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

/**
 * GET /api/trading/orders
 * Fetch orders from Alpaca with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log(`📋 Fetching orders with status: ${status}, limit: ${limit}`)

  try {
    // Fetch orders from Alpaca
    const orders = await alpacaClient.getOrders({
      status: status as 'open' | 'closed' | 'all',
      limit,
      direction: 'desc'
    })

    console.log(`✅ Fetched ${orders.length} orders from Alpaca`)

    // Transform orders to include additional metadata
    const transformedOrders = orders.map((order: any) => ({
      id: order.id,
      client_order_id: order.client_order_id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: parseFloat(order.qty),
      filled_qty: parseFloat(order.filled_qty),
      status: order.status,
      time_in_force: order.time_in_force,
      limit_price: order.limit_price ? parseFloat(order.limit_price) : null,
      stop_price: order.stop_price ? parseFloat(order.stop_price) : null,
      filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      created_at: order.created_at,
      updated_at: order.updated_at,
      submitted_at: order.submitted_at,
      filled_at: order.filled_at,
      expired_at: order.expired_at,
      canceled_at: order.canceled_at,
      order_class: order.order_class,
      asset_class: order.asset_class,
      // Calculated fields
      filled_percent: order.qty ? (parseFloat(order.filled_qty) / parseFloat(order.qty)) * 100 : 0,
      estimated_value: order.filled_avg_price
        ? parseFloat(order.filled_avg_price) * parseFloat(order.qty)
        : order.limit_price
        ? parseFloat(order.limit_price) * parseFloat(order.qty)
        : 0,
      is_bot_order: order.client_order_id?.startsWith('bot_') || false
    }))

    return NextResponse.json({
      success: true,
      data: {
        orders: transformedOrders,
        total: transformedOrders.length,
        status,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/trading/orders
 * Create a new order via Alpaca
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const userId = getCurrentUserId()

  const {
    symbol,
    qty,
    notional,
    side,
    type = 'market',
    time_in_force = 'day',
    limit_price,
    stop_price,
    extended_hours = false
  } = body

  console.log(`📝 Creating order: ${side} ${qty || notional} ${symbol}`)

  try {
    // Validate required fields
    if (!symbol || !side) {
      throw new Error('Symbol and side are required')
    }

    if (!qty && !notional) {
      throw new Error('Either qty or notional must be provided')
    }

    // Create order via Alpaca
    const order = await alpacaClient.createOrder({
      symbol,
      qty: qty ? parseFloat(qty) : undefined,
      notional: notional ? parseFloat(notional) : undefined,
      side: side.toLowerCase(),
      type,
      time_in_force,
      limit_price: limit_price ? parseFloat(limit_price) : undefined,
      stop_price: stop_price ? parseFloat(stop_price) : undefined,
      extended_hours,
      client_order_id: `manual_${Date.now()}`
    })

    console.log(`✅ Order created successfully: ${order.id}`)

    // Log to Supabase
    await supabaseService.logBotActivity({
      user_id: userId,
      timestamp: new Date().toISOString(),
      type: 'trade',
      symbol,
      message: `Manual order placed: ${side} ${qty || notional} ${symbol}`,
      status: 'completed',
      details: JSON.stringify({
        orderId: order.id,
        side,
        qty,
        notional,
        type,
        orderStatus: order.status
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          client_order_id: order.client_order_id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          qty: order.qty,
          status: order.status,
          created_at: order.created_at
        }
      }
    })
  } catch (error) {
    console.error('❌ Failed to create order:', error)

    // Log error to Supabase
    await supabaseService.logBotActivity({
      user_id: userId,
      timestamp: new Date().toISOString(),
      type: 'error',
      symbol,
      message: `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'failed',
      details: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        requestBody: body
      })
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/trading/orders
 * Cancel all orders
 */
export const DELETE = withErrorHandling(async () => {
  const userId = getCurrentUserId()

  console.log(`🛑 Canceling all orders...`)

  try {
    const result = await alpacaClient.cancelAllOrders()

    console.log(`✅ All orders cancelled`)

    // Log to Supabase
    await supabaseService.logBotActivity({
      user_id: userId,
      timestamp: new Date().toISOString(),
      type: 'system',
      message: 'All orders cancelled',
      status: 'completed',
      details: JSON.stringify({ result })
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'All orders cancelled',
        result
      }
    })
  } catch (error) {
    console.error('❌ Failed to cancel all orders:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel all orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
