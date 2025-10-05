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

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderData.order_id)
      .single()

    if (existingOrder) {
      // Update existing order
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: orderData.status,
          filled_qty: orderData.filled_qty,
          filled_avg_price: orderData.filled_avg_price,
          updated_at: orderData.updated_at,
          filled_at: orderData.filled_at,
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
      // Insert new order
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          order_id: orderData.order_id,
          symbol: orderData.symbol,
          side: orderData.side,
          type: orderData.type,
          qty: orderData.qty,
          notional: orderData.notional,
          filled_qty: orderData.filled_qty,
          filled_avg_price: orderData.filled_avg_price,
          limit_price: orderData.limit_price,
          stop_price: orderData.stop_price,
          status: orderData.status,
          time_in_force: orderData.time_in_force,
          order_class: orderData.order_class,
          created_at: orderData.created_at,
          updated_at: orderData.updated_at,
          submitted_at: orderData.submitted_at,
          filled_at: orderData.filled_at,
          extended_hours: orderData.extended_hours,
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
