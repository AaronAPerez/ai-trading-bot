import { createServerSupabaseClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'


const supabase = createServerSupabaseClient()

/**
 * POST /api/orders/save
 * Save order to Supabase database
 */
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    // Validate required fields
    if (!orderData.order_id || !orderData.symbol || !orderData.side) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, symbol, side' },
        { status: 400 }
      )
    }

    // Check if order already exists in trade_history
    const { data: existingOrder } = await supabase
      .from('trade_history')
      .select('*')
      .eq('order_id', orderData.order_id)
      .single()

    if (existingOrder) {
      // Update existing order
      const { data, error } = await supabase
        .from('trade_history')
        .update({
          status: orderData.status,
          quantity: orderData.filled_qty || orderData.qty,
          price: orderData.filled_avg_price || orderData.limit_price,
          value: (orderData.filled_avg_price || orderData.limit_price) * (orderData.filled_qty || orderData.qty),
          timestamp: orderData.filled_at || orderData.updated_at || new Date().toISOString(),
          pnl: orderData.pnl,
          fees: orderData.fees
        })
        .eq('order_id', orderData.order_id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully',
        data,
      })
    } else {
      // Insert new order into trade_history
      const { data, error } = await supabase
        .from('trade_history')
        .insert([{
          order_id: orderData.order_id,
          symbol: orderData.symbol,
          side: orderData.side,
          price: orderData.filled_avg_price || orderData.limit_price || 0,
          quantity: orderData.filled_qty || orderData.qty || 0,
          value: (orderData.filled_avg_price || orderData.limit_price || 0) * (orderData.filled_qty || orderData.qty || 0),
          status: orderData.status,
          timestamp: orderData.filled_at || orderData.created_at || new Date().toISOString(),
          strategy: orderData.strategy || null,
          pnl: orderData.pnl || null,
          fees: orderData.fees || null,
          ai_confidence: orderData.ai_confidence || null,
          user_id: orderData.user_id || '00000000-0000-0000-0000-000000000000'
        }])
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Order saved successfully',
        data,
      })
    }
  } catch (error: any) {
    console.error('Error saving order to database:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save order to database',
        details: error.message
      },
      { status: 500 }
    )
  }
}
