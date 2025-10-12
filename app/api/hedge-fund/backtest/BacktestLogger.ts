import { supabaseService } from '@/lib/database/supabase-utils'
import { BacktestResult } from './types'

export async function logBacktestResult(userId: string, strategy: string, symbol: string, result: BacktestResult) {
  await supabaseService.client.from('backtest_results').insert({
    user_id: userId,
    strategy,
    symbol,
    trades_executed: result.tradesExecuted,
    win_rate: result.winRate,
    total_pnl: result.totalPnl,
    max_drawdown: result.maxDrawdown,
    avg_confidence: result.avgConfidence,
    timestamp: new Date().toISOString()
  })
}