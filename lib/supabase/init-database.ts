// src/lib/supabase/init-database.ts
import { createClient } from './client'

export const initializeUserDatabase = async (user) => {
  const supabase = createClient()

  // Create initial profile
  const { error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      email: user.email,
      role: 'user'
    })

  // Create initial bot metrics
  await supabase
    .from('bot_metrics')
    .upsert({
      user_id: 'bcc6fb8b-b62c-4d28-a976-fe49614e146d',
      is_running: true,
      uptime: 0,
      trades_executed: 0,
      recommendations_generated: 0,
      success_rate: 0,
      total_pnl: 0,
      daily_pnl: 0,
      risk_score: 0,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
}