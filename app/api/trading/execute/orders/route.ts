/**
 * Trading Orders Execution API Route
 * Handles order execution for trading operations
 * 
 * @fileoverview API route for executing trading orders via Alpaca
 * @author Aaron A Perez
 * @version 4.0.0 - Production Quality
 */

import { NextRequest, NextResponse } from 'next/server'

// Types for trading orders
interface TradeOrder {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity?: number
  amount?: number
  orderType: 'MARKET' | 'LIMIT'
  limitPrice?: number
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY'
}

interface TradeResult {
  success: boolean
  orderId?: string
  message?: string
  error?: string
  executedPrice?: number
  executedQuantity?: number
  timestamp?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, side, quantity, amount, orderType = 'MARKET', limitPrice, timeInForce = 'GTC' } = body as TradeOrder

    // Validate required fields
    if (!symbol || !side) {
      return NextResponse.json({
        success: false,
        error: 'Symbol and side are required'
      }, { status: 400 })
    }

    if (!quantity && !amount) {
      return NextResponse.json({
        success: false,
        error: 'Either quantity or amount must be specified'
      }, { status: 400 })
    }

    // Demo mode - simulate order execution
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Generate mock execution data
      const mockPrice = Math.random() * 1000 + 50 // Random price between $50-$1050
      const executedQuantity = quantity || Math.floor((amount || 1000) / mockPrice)

      const result: TradeResult = {
        success: true,
        orderId: `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: `${side} order executed successfully`,
        executedPrice: mockPrice,
        executedQuantity,
        timestamp: new Date().toISOString()
      }

      console.log('🎯 Demo Order Executed:', {
        symbol,
        side,
        quantity: executedQuantity,
        price: mockPrice,
        total: executedQuantity * mockPrice
      })

      return NextResponse.json(result)
    }

    // Production mode - integrate with Alpaca API
    try {
      const alpacaResponse = await fetch(`${process.env.ALPACA_BASE_URL}/v2/orders`, {
        method: 'POST',
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol.replace('-USD', ''), // Remove crypto suffix for Alpaca
          qty: quantity,
          notional: amount,
          side: side.toLowerCase(),
          type: orderType.toLowerCase(),
          time_in_force: timeInForce.toLowerCase(),
          limit_price: limitPrice
        })
      })

      if (!alpacaResponse.ok) {
        const errorData = await alpacaResponse.json()
        throw new Error(errorData.message || 'Alpaca API error')
      }

      const alpacaOrder = await alpacaResponse.json()

      const result: TradeResult = {
        success: true,
        orderId: alpacaOrder.id,
        message: 'Order submitted successfully',
        executedPrice: parseFloat(alpacaOrder.filled_avg_price || '0'),
        executedQuantity: parseFloat(alpacaOrder.filled_qty || '0'),
        timestamp: alpacaOrder.created_at
      }

      console.log('📈 Live Order Executed:', result)

      return NextResponse.json(result)

    } catch (alpacaError) {
      console.error('Alpaca API Error:', alpacaError)
      
      return NextResponse.json({
        success: false,
        error: `Trading execution failed: ${alpacaError instanceof Error ? alpacaError.message : 'Unknown error'}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Order execution error:', error)
    
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Return order status or recent orders
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (orderId) {
      // Return specific order status
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        return NextResponse.json({
          success: true,
          order: {
            id: orderId,
            status: 'filled',
            symbol: 'DEMO',
            side: 'buy',
            quantity: 10,
            executedPrice: 150.50,
            timestamp: new Date().toISOString()
          }
        })
      }

      // Production: Get order from Alpaca
      const alpacaResponse = await fetch(`${process.env.ALPACA_BASE_URL}/v2/orders/${orderId}`, {
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || ''
        }
      })

      if (!alpacaResponse.ok) {
        throw new Error('Failed to fetch order status')
      }

      const order = await alpacaResponse.json()
      return NextResponse.json({ success: true, order })
    }

    // Return recent orders
    return NextResponse.json({
      success: true,
      orders: [],
      message: 'No recent orders found'
    })

  } catch (error) {
    console.error('Get orders error:', error)
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch orders: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}