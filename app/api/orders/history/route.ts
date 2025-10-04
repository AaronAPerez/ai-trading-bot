import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseClient'

const supabase = createServerSupabaseClient()

/**
 * GET /api/orders/history
 * Get order history from Supabase database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const symbol = searchParams.get('symbol')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error: any) {
    console.error('Error fetching order history:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order history',
        details: error.message
      },
      { status: 500 }
    )
  }
}
