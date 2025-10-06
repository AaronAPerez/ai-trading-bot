/**
 * USAGE EXAMPLES for fetchBotMetrics wrapper
 *
 * This file demonstrates how to use the conflict-safe Supabase wrapper
 * for bot_metrics operations.
 */

import {
  submitBotMetric,
  fetchBotMetrics,
  updateBotMetrics,
  upsertBotMetricsViaClient
} from './fetchBotMetrics'

// ============================================================================
// Example 1: Submit bot metrics with automatic upsert (recommended)
// ============================================================================
async function example1_submitWithUpsert() {
  const userId = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

  try {
    const result = await submitBotMetric(
      {
        user_id: userId,
        is_running: true,
        uptime: 0,
        trades_executed: 10,
        success_rate: 0.75,
        total_pnl: 150.50,
        last_activity: new Date().toISOString()
      },
      {
        upsert: true, // Will update if exists, insert if not
        conflictColumn: 'user_id',
        returnRecord: true
      }
    )

    console.log('✅ Metrics submitted:', result)
  } catch (error) {
    console.error('❌ Failed to submit metrics:', error)
  }
}

// ============================================================================
// Example 2: Fetch existing bot metrics
// ============================================================================
async function example2_fetchMetrics() {
  const userId = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

  try {
    const metrics = await fetchBotMetrics(userId)

    if (metrics) {
      console.log('✅ Found metrics:', metrics)
      console.log(`   - Trades executed: ${metrics.trades_executed}`)
      console.log(`   - Success rate: ${metrics.success_rate}`)
      console.log(`   - Total P&L: $${metrics.total_pnl}`)
    } else {
      console.log('⚠️ No metrics found for user')
    }
  } catch (error) {
    console.error('❌ Failed to fetch metrics:', error)
  }
}

// ============================================================================
// Example 3: Update specific fields using PATCH
// ============================================================================
async function example3_updateSpecificFields() {
  const userId = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

  try {
    const result = await updateBotMetrics(userId, {
      is_running: false,
      uptime: 3600, // 1 hour
      last_activity: new Date().toISOString()
    })

    console.log('✅ Metrics updated:', result)
  } catch (error) {
    console.error('❌ Failed to update metrics:', error)
  }
}

// ============================================================================
// Example 4: Handle conflicts gracefully with auto-retry
// ============================================================================
async function example4_conflictHandling() {
  const userId = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

  try {
    // First try without upsert (will auto-retry with upsert on conflict)
    const result = await submitBotMetric(
      {
        user_id: userId,
        is_running: true,
        trades_executed: 5
      },
      {
        upsert: false, // Will auto-retry with upsert if conflict (409) occurs
        returnRecord: true
      }
    )

    console.log('✅ Metrics submitted (with auto-retry):', result)
  } catch (error) {
    console.error('❌ Failed even after retry:', error)
  }
}

// ============================================================================
// Example 5: Use client library fallback (when REST API has issues)
// ============================================================================
async function example5_clientLibraryFallback() {
  const userId = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

  try {
    const result = await upsertBotMetricsViaClient({
      user_id: userId,
      is_running: true,
      uptime: 0,
      trades_executed: 0,
      recommendations_generated: 0,
      success_rate: 0,
      total_pnl: 0,
      daily_pnl: 0,
      risk_score: 0
    })

    console.log('✅ Metrics upserted via client:', result)
  } catch (error) {
    console.error('❌ Client library upsert failed:', error)
  }
}

// ============================================================================
// Example 6: Complete workflow - Check, Update, or Create
// ============================================================================
async function example6_completeWorkflow() {
  const userId = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

  try {
    // Step 1: Check if metrics exist
    let metrics = await fetchBotMetrics(userId)

    if (metrics) {
      console.log('📊 Existing metrics found, updating...')

      // Step 2: Update existing metrics
      metrics = await updateBotMetrics(userId, {
        uptime: metrics.uptime + 60, // Add 60 seconds
        trades_executed: metrics.trades_executed + 1,
        last_activity: new Date().toISOString()
      })

      console.log('✅ Metrics updated:', metrics)
    } else {
      console.log('📝 No metrics found, creating new...')

      // Step 3: Create new metrics
      metrics = await submitBotMetric(
        {
          user_id: userId,
          is_running: true,
          uptime: 0,
          trades_executed: 0,
          recommendations_generated: 0,
          success_rate: 0,
          total_pnl: 0,
          daily_pnl: 0,
          risk_score: 0,
          last_activity: new Date().toISOString()
        },
        { upsert: true }
      )

      console.log('✅ Metrics created:', metrics)
    }
  } catch (error) {
    console.error('❌ Workflow failed:', error)
  }
}

// ============================================================================
// Example 7: Usage in API route (Next.js)
// ============================================================================
export async function POST(request: Request) {
  try {
    const { userId, metrics } = await request.json()

    // Validate input
    if (!userId || !metrics) {
      return Response.json(
        { error: 'Missing userId or metrics' },
        { status: 400 }
      )
    }

    // Submit metrics with conflict-safe logic
    const result = await submitBotMetric(
      {
        user_id: userId,
        ...metrics,
        updated_at: new Date().toISOString()
      },
      {
        upsert: true,
        returnRecord: true
      }
    )

    return Response.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Export examples for testing
export const examples = {
  example1_submitWithUpsert,
  example2_fetchMetrics,
  example3_updateSpecificFields,
  example4_conflictHandling,
  example5_clientLibraryFallback,
  example6_completeWorkflow
}
