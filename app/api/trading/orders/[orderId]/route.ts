import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

/**
 * GET /api/trading/orders/[orderId]
 * Get a specific order by ID
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: { orderId: string } }) => {
    const { orderId } = params

    console.log(`📋 Fetching order: ${orderId}`)

    try {
      const order = await alpacaClient.getOrder(orderId)

      console.log(`✅ Order fetched: ${order.symbol} ${order.side} ${order.qty}`)

      return NextResponse.json({
        success: true,
        data: {
          order: {
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
            filled_avg_price: order.filled_avg_price
              ? parseFloat(order.filled_avg_price)
              : null,
            created_at: order.created_at,
            updated_at: order.updated_at,
            submitted_at: order.submitted_at,
            filled_at: order.filled_at,
            expired_at: order.expired_at,
            canceled_at: order.canceled_at,
            order_class: order.order_class,
            filled_percent: order.qty
              ? (parseFloat(order.filled_qty) / parseFloat(order.qty)) * 100
              : 0,
            estimated_value: order.filled_avg_price
              ? parseFloat(order.filled_avg_price) * parseFloat(order.qty)
              : 0
          }
        }
      })
    } catch (error) {
      console.error(`❌ Failed to fetch order ${orderId}:`, error)

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch order',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
)

/**
 * DELETE /api/trading/orders/[orderId]
 * Cancel a specific order
 */
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: { orderId: string } }) => {
    const { orderId } = params
    const userId = getCurrentUserId()

    console.log(`🛑 Canceling order: ${orderId}`)

    try {
      const result = await alpacaClient.cancelOrder(orderId)

      console.log(`✅ Order cancelled: ${orderId}`)

      // Log to Supabase
      await supabaseService.logBotActivity(userId, {
        type: 'system',
        message: `Order cancelled: ${orderId}`,
        status: 'completed',
        details: JSON.stringify({
          orderId,
          result
        })
      })

      return NextResponse.json({
        success: true,
        data: {
          message: 'Order cancelled successfully',
          orderId,
          result
        }
      })
    } catch (error) {
      console.error(`❌ Failed to cancel order ${orderId}:`, error)

      // Log error to Supabase
      await supabaseService.logBotActivity(userId, {
        type: 'error',
        message: `Failed to cancel order ${orderId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        status: 'failed',
        details: JSON.stringify({
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to cancel order',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
)
