import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'

/**
 * Check if an order exists in the database
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      )
    }

    // Check if order exists in database
    const { data, error } = await supabaseService.client
      .from('orders')
      .select('id')
      .eq('order_id', orderId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking order:', error)
      return NextResponse.json(
        { exists: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exists: !!data,
      order_id: orderId
    })
  } catch (error) {
    console.error('Error in order check:', error)
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
