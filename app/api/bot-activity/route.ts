/**
 * Bot Activity API Route
 * Fetches real bot activity logs from Supabase
 * NO MOCKS - Uses only real database data
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = getCurrentUserId()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Fetch real activity logs from Supabase
    const { data: activities, error } = await supabaseService.client
      .from('bot_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch bot activity:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bot activity' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activities: activities || [],
      count: activities?.length || 0
    })

  } catch (error) {
    console.error('Bot activity API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
