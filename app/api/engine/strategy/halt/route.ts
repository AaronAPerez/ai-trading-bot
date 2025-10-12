import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId = getCurrentUserId()

  const { strategy } = body
  if (!strategy) return NextResponse.json({ error: 'Missing strategy name' }, { status: 400 })

  // Update strategy status in Supabase
  await supabaseService.client.from('strategy_status').upsert({
    user_id: userId,
    strategy,
    status: 'drawdownBreached',
    last_updated: new Date().toISOString()
  })

  // Log action
  await supabaseService.client.from('bot_activity_logs').insert({
    user_id: userId,
    timestamp: new Date().toISOString(),
    type: 'risk',
    symbol: strategy,
    message: `Strategy ${strategy} halted due to drawdown breach`,
    status: 'completed'
  })

  return NextResponse.json({ success: true, strategy })
}