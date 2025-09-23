import { NextRequest, NextResponse } from 'next/server'

// Direct fetch implementation for Alpaca Orders API
export async function POST(request: NextRequest) {
  console.log('🚀 Orders API POST request received')

  try {
    // Parse request body
    console.log('📖 Parsing order request...')
    const orderData = await request.json()
    console.log('📋 Order data:', JSON.stringify(orderData, null, 2))

    // Validate required fields
    if (!orderData.symbol || !orderData.qty || !orderData.side) {
      console.error('❌ Missing required order fields')
      return NextResponse.json(
        {
          error: 'Missing required order fields',
          required: ['symbol', 'qty', 'side'],
          received: Object.keys(orderData)
        },
        { status: 400 }
      )
    }

    // Validate order values
    if (!['buy', 'sell'].includes(orderData.side?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid side. Must be "buy" or "sell"' },
        { status: 400 }
      )
    }

    if (!orderData.type) {
      orderData.type = 'market'
    }

    if (!orderData.time_in_force) {
      orderData.time_in_force = 'day'
    }

    // Check API credentials
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
      console.error('❌ Missing Alpaca API credentials')
      return NextResponse.json(
        { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
        { status: 500 }
      )
    }

    // Prepare order payload for Alpaca
    const orderPayload = {
      symbol: orderData.symbol.toUpperCase(),
      qty: orderData.qty.toString(),
      side: orderData.side.toLowerCase(),
      type: orderData.type.toLowerCase(),
      time_in_force: orderData.time_in_force.toLowerCase()
    }

    // Add optional fields
    if (orderData.limit_price) {
      orderPayload.limit_price = orderData.limit_price.toString()
    }
    if (orderData.stop_price) {
      orderPayload.stop_price = orderData.stop_price.toString()
    }
    if (orderData.trail_price) {
      orderPayload.trail_price = orderData.trail_price.toString()
    }
    if (orderData.trail_percent) {
      orderPayload.trail_percent = orderData.trail_percent.toString()
    }
    if (orderData.client_order_id) {
      orderPayload.client_order_id = orderData.client_order_id
    }
    if (orderData.extended_hours !== undefined) {
      orderPayload.extended_hours = orderData.extended_hours
    }

    console.log('📊 Final order payload:', JSON.stringify(orderPayload, null, 2))

    // Direct fetch to Alpaca Paper Trading API
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
      },
      body: JSON.stringify(orderPayload)
    }

    console.log('🔄 Submitting order to Alpaca...')
    const response = await fetch('https://paper-api.alpaca.markets/v2/orders', options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Order submission failed:', response.status, errorText)

      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
          { status: 500 }
        )
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Order rejected: Insufficient permissions or account restrictions' },
          { status: 400 }
        )
      }

      if (response.status === 422) {
        return NextResponse.json(
          {
            error: 'Order validation failed',
            details: errorData.message || errorText,
            alpaca_error: errorData
          },
          { status: 400 }
        )
      }

      throw new Error(`Order API failed: ${response.status} ${errorText}`)
    }

    const orderResult = await response.json()
    console.log('✅ Order submitted successfully:', orderResult.id)

    // Enhanced order response with additional fields
    const enhancedOrder = {
      // Original Alpaca response
      ...orderResult,

      // Enhanced fields for frontend compatibility
      orderId: orderResult.id,
      symbol: orderResult.symbol,
      side: orderResult.side,
      quantity: parseFloat(orderResult.qty || 0),
      orderType: orderResult.type,
      status: orderResult.status,
      timeInForce: orderResult.time_in_force,

      // Price information
      limitPrice: orderResult.limit_price ? parseFloat(orderResult.limit_price) : null,
      stopPrice: orderResult.stop_price ? parseFloat(orderResult.stop_price) : null,
      filledPrice: orderResult.filled_avg_price ? parseFloat(orderResult.filled_avg_price) : null,

      // Execution details
      filledQuantity: parseFloat(orderResult.filled_qty || 0),
      remainingQuantity: parseFloat(orderResult.qty || 0) - parseFloat(orderResult.filled_qty || 0),

      // Timestamps
      submittedAt: orderResult.submitted_at,
      createdAt: orderResult.created_at,
      updatedAt: orderResult.updated_at,

      // Display formatting
      displayStatus: orderResult.status?.toUpperCase(),
      displaySide: orderResult.side?.toUpperCase(),
      displayType: orderResult.type?.toUpperCase(),

      // API source
      source: 'alpaca_paper',
      paperTrading: true
    }

    console.log('📈 Order response prepared:', {
      orderId: enhancedOrder.orderId,
      symbol: enhancedOrder.symbol,
      side: enhancedOrder.side,
      status: enhancedOrder.status
    })

    return NextResponse.json({
      success: true,
      order: enhancedOrder,
      message: `${orderResult.side.toUpperCase()} order for ${orderResult.qty} ${orderResult.symbol} submitted successfully`
    })

  } catch (error) {
    console.error('❌ Order creation error:', error)

    // Enhanced error reporting
    let errorMessage = 'Failed to create order'
    let errorDetails = error.message || 'Unknown error'

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Authentication failed'
      errorDetails = 'Invalid or missing Alpaca API credentials'
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      errorMessage = 'Order rejected'
      errorDetails = 'Insufficient permissions or account restrictions'
    } else if (error.message?.includes('422')) {
      errorMessage = 'Order validation failed'
      errorDetails = 'Invalid order parameters or insufficient buying power'
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

export async function GET(request: NextRequest) {
  console.log('📊 Orders API GET request received')

  try {
    // Parse query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status') // open, closed, all
    const limit = url.searchParams.get('limit') || '50'
    const direction = url.searchParams.get('direction') || 'desc' // asc, desc
    const nested = url.searchParams.get('nested') // true for nested orders

    console.log('📋 Query parameters:', { status, limit, direction, nested })

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
    if (status && status !== 'all') queryParams.append('status', status)
    queryParams.append('limit', limit)
    queryParams.append('direction', direction)
    if (nested === 'true') queryParams.append('nested', 'true')

    const queryString = queryParams.toString()
    const apiUrl = `https://paper-api.alpaca.markets/v2/orders${queryString ? '?' + queryString : ''}`

    console.log('🔄 Fetching orders from:', apiUrl)

    // Direct fetch to Alpaca Paper Trading API
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
      console.error('❌ Orders fetch failed:', response.status, errorText)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
          { status: 500 }
        )
      }

      throw new Error(`Orders API failed: ${response.status} ${errorText}`)
    }

    const ordersData = await response.json()
    console.log('✅ Orders fetched successfully:', ordersData.length, 'orders')

    // Enhanced orders data with calculated fields
    const enhancedOrders = ordersData.map((order: any) => ({
      // Original order data
      ...order,

      // Enhanced fields for frontend compatibility
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: parseFloat(order.qty || 0),
      orderType: order.type,
      status: order.status,
      timeInForce: order.time_in_force,

      // Price information
      limitPrice: order.limit_price ? parseFloat(order.limit_price) : null,
      stopPrice: order.stop_price ? parseFloat(order.stop_price) : null,
      filledPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,

      // Execution details
      filledQuantity: parseFloat(order.filled_qty || 0),
      remainingQuantity: parseFloat(order.qty || 0) - parseFloat(order.filled_qty || 0),

      // Timestamps
      submittedAt: order.submitted_at,
      createdAt: order.created_at,
      updatedAt: order.updated_at,

      // Display formatting
      displayStatus: order.status?.toUpperCase(),
      displaySide: order.side?.toUpperCase(),
      displayType: order.type?.toUpperCase(),
      displayValue: `${order.side?.toUpperCase()} ${order.qty} ${order.symbol}`,

      // API source
      source: 'alpaca_paper',
      paperTrading: true
    }))

    return NextResponse.json({
      success: true,
      orders: enhancedOrders,
      total: enhancedOrders.length,
      filters: { status, limit: parseInt(limit), direction, nested },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Orders fetch error:', error)

    // Enhanced error reporting
    let errorMessage = 'Failed to fetch orders'
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
