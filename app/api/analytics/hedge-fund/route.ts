import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

export async function GET() {
  const userId = getCurrentUserId()

  const [winRate, drawdown, strategies, execution, drawdownHistory, confidenceScatter, symbolHeatmap] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('bot_win_rate_summary')
      .select('*')
      .eq('user_id', userId)
      .single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('bot_drawdown_tracker')
      .select('*')
      .eq('user_id', userId)
      .single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('strategy_performance_summary')
      .select('*')
      .eq('user_id', userId),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('execution_quality_metrics')
      .select('*')
      .eq('user_id', userId),

    supabaseService.client
      .from('trade_history')
      .select('timestamp, pnl')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .limit(100),

    supabaseService.client
      .from('trade_history')
      .select('ai_confidence AS confidence, pnl')
      .eq('user_id', userId)
      .limit(100),

    supabaseService.client
      .from('trade_history')
      .select('symbol, SUM(pnl) AS total_pnl')
      .eq('user_id', userId)
      // .group('symbol')
  ])

  return NextResponse.json({
    winRate: winRate.data,
    drawdown: drawdown.data,
    strategies: strategies.data,
    execution: execution.data,
    drawdownHistory: drawdownHistory.data,
    confidenceScatter: confidenceScatter.data,
    symbolHeatmap: symbolHeatmap.data
  })
}