import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'

/**
 * POST /api/database/cleanup
 * Trigger database cleanup to free up space
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_all_old_data')

    if (error) {
      console.error('Database cleanup error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully',
      results: data
    })
  } catch (error) {
    console.error('Cleanup request error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup database' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/database/cleanup
 * Get database statistics and usage
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Get database statistics
    const { data, error } = await supabase.rpc('get_database_stats')

    if (error) {
      console.error('Database stats error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Calculate total size
    let totalBytes = 0
    const stats = data || []

    // Parse sizes and calculate total
    const parsedStats = stats.map((table: any) => {
      const sizeMatch = table.total_size?.match(/(\d+)\s*([A-Z]+)/)
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1])
        const unit = sizeMatch[2]
        const multiplier = unit === 'MB' ? 1024 * 1024 : unit === 'GB' ? 1024 * 1024 * 1024 : unit === 'kB' ? 1024 : 1
        totalBytes += value * multiplier
      }
      return table
    })

    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2)
    const percentUsed = ((parseFloat(totalMB) / 500) * 100).toFixed(2)

    return NextResponse.json({
      success: true,
      data: {
        tables: parsedStats,
        summary: {
          totalSize: `${totalMB} MB`,
          limit: '500 MB',
          percentUsed: `${percentUsed}%`,
          remainingSpace: `${(500 - parseFloat(totalMB)).toFixed(2)} MB`,
          needsCleanup: parseFloat(percentUsed) > 80
        }
      }
    })
  } catch (error) {
    console.error('Stats request error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get database stats' },
      { status: 500 }
    )
  }
}
