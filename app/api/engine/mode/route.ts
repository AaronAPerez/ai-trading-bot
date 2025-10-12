import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId = getCurrentUserId()

  const { mode } = body
  if (!mode) return NextResponse.json({ error: 'Missing mode' }, { status: 400 })

  await supabaseService.client.from('bot_activity_logs').insert({
    user_id: userId,
    timestamp: new Date().toISOString(),
    type: 'system',
    message: `Engine mode switched to ${mode}`,
    status: 'completed'
  })

  return NextResponse.json({ success: true, mode })
}