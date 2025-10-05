import { createServerSupabaseClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'


const supabase = createServerSupabaseClient()

/**
 * GET /api/orders/statistics
 * Get order statistics from Supabase database
 */
export async function GET(request: NextRequest) {
  try {
    // Get total orders count
    const { count: totalOrders, error: totalError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get filled orders count
    const { count: filledOrders, error: filledError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'filled')

    if (filledError) throw filledError

    // Get today's orders
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    if (todayError) throw todayError

    // Get orders by status
    const { data: ordersByStatus, error: statusError } = await supabase
      .from('orders')
      .select('status')

    if (statusError) throw statusError

    // Calculate statistics
    const statusCounts = ordersByStatus?.reduce((acc: any, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {}) || {}

    const fillRate = totalOrders && totalOrders > 0
      ? filledOrders! / totalOrders
      : 0

    // Get total volume
    const { data: volumeData, error: volumeError } = await supabase
      .from('orders')
      .select('filled_qty, filled_avg_price')
      .eq('status', 'filled')

    if (volumeError) throw volumeError

    const totalVolume = volumeData?.reduce((sum, order) => {
      const qty = parseFloat(order.filled_qty || '0')
      const price = parseFloat(order.filled_avg_price || '0')
      return sum + (qty * price)
    }, 0) || 0

    return NextResponse.json({
      success: true,
      statistics: {
        total: totalOrders || 0,
        filled: filledOrders || 0,
        today: todayOrders || 0,
        fillRate,
        totalVolume,
        statusBreakdown: statusCounts,
      },
    })
  } catch (error: any) {
    console.error('Error fetching order statistics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order statistics',
        details: error.message
      },
      { status: 500 }
    )
  }
}
