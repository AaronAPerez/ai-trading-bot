import { supabaseService } from '@/lib/database/supabase-utils'
import { HedgeFundEngine } from './HedgeFundEngine'

export async function runDailyEvaluation(userId: string) {
  const [winRate, drawdown, strategies] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('bot_win_rate_summary')
      .select('win_rate')
      .eq('user_id', userId)
      .single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('bot_drawdown_tracker')
      .select('drawdown')
      .eq('user_id', userId)
      .single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseService.client as any)
      .from('strategy_performance_summary')
      .select('*')
      .eq('user_id', userId)
  ])

  const mode =
    winRate.data?.win_rate > 0.7 && drawdown.data?.drawdown < 0.1
      ? 'live'
      : winRate.data?.win_rate > 0.6
      ? 'paper'
      : 'simulation'

  await supabaseService.client.from('bot_activity_logs').insert({
    user_id: userId,
    timestamp: new Date().toISOString(),
    type: 'system',
    message: `Engine mode switched to ${mode.toUpperCase()}`,
    status: 'completed'
  })

  if (winRate.data?.win_rate < 0.4) {
    await supabaseService.client.from('bot_activity_logs').insert({
      user_id: userId,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'Retraining triggered due to low win rate',
      status: 'completed'
    })
  }

  for (const strategy of strategies.data || []) {
    if (strategy.drawdown > 0.15) {
      await supabaseService.client.from('strategy_status').upsert({
        user_id: userId,
        strategy: strategy.strategy,
        status: 'drawdownBreached',
        last_updated: new Date().toISOString()
      })

      await supabaseService.client.from('bot_activity_logs').insert({
        user_id: userId,
        timestamp: new Date().toISOString(),
        type: 'risk',
        symbol: strategy.strategy,
        message: `Strategy ${strategy.strategy} halted due to drawdown breach`,
        status: 'completed'
      })
    }
  }

  return { mode, strategies: strategies.data }
}