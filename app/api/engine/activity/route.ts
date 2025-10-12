import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

export async function GET() {
  const userId = getCurrentUserId()

  const logs = await supabaseService.client
    .from('bot_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(50)

  return NextResponse.json(logs.data)
}