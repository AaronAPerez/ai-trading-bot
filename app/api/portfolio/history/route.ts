import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch portfolio snapshots from database
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .lte('snapshot_date', endDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })

    if (snapshotsError) {
      console.error('Error fetching portfolio snapshots:', snapshotsError)
      // Return empty array if table doesn't exist or no data
      return NextResponse.json([], { status: 200 })
    }

    // Format the data for the chart
    const history = (snapshots || []).map((snapshot) => ({
      date: snapshot.snapshot_date,
      value: parseFloat(snapshot.total_value || '0'),
      cash: parseFloat(snapshot.cash || '0'),
      equity: parseFloat(snapshot.equity || '0'),
      positions: snapshot.positions_data || [],
    }))

    // If no historical data exists, create a single data point from current time
    if (history.length === 0) {
      // Try to get current account data as fallback
      const { data: account, error: accountError } = await supabase
        .from('alpaca_accounts')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (account && !accountError) {
        history.push({
          date: endDate.toISOString().split('T')[0],
          value: parseFloat(account.equity || '100000'),
          cash: parseFloat(account.cash || '100000'),
          equity: parseFloat(account.equity || '100000'),
          positions: [],
        })
      } else {
        // Return mock starting point if no data at all
        history.push({
          date: endDate.toISOString().split('T')[0],
          value: 100000,
          cash: 100000,
          equity: 100000,
          positions: [],
        })
      }
    }

    return NextResponse.json(history, { status: 200 })
  } catch (error) {
    console.error('Error fetching portfolio history:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch portfolio history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
