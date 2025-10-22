/**
 * Strategy Database Integration - Complete Supabase Integration
 *
 * Saves AdaptiveStrategyEngine performance data to multiple Supabase tables:
 * 1. trading_strategies - Current strategy performance and config
 * 2. ai_learning_data - Learning from each trade outcome
 * 3. bot_activity_logs - Activity logging for monitoring
 *
 * @author Aaron A Perez
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'
import type { StrategyPerformance } from './AdaptiveStrategyEngine'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: ReturnType<typeof createClient<Database>> | null = null

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient<Database>(supabaseUrl, supabaseKey)
  }
  return supabase
}

// Get user ID (fallback to system user if not available)
// In production, this should be replaced with actual user authentication
async function getUserId(): Promise<string> {
  // Try to get authenticated user ID from Supabase
  try {
    const client = getSupabase()
    if (client) {
      const { data: { user } } = await client.auth.getUser()
      if (user?.id) {
        console.log(`🔐 Using authenticated user ID: ${user.id}`)
        return user.id
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not get authenticated user, using system user')
  }

  // Fallback to consistent system user ID (UUID format for compatibility)
  const systemUserId = '00000000-0000-0000-0000-000000000000'
  console.log(`🔐 Using system user ID: ${systemUserId}`)
  return systemUserId
}

/**
 * Save strategy performance to trading_strategies table
 * Upserts the current state of each strategy
 */
export async function saveStrategyToDatabase(performance: StrategyPerformance): Promise<void> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, skipping strategy save')
      return
    }

    const userId = await getUserId()

    // Prepare data for trading_strategies table
    // Only include fields that exist in the actual Supabase schema
    // NOTE: Database has 'strategy_name' column (NOT 'name')
    const strategyData: any = {
      user_id: userId,
      strategy_name: performance.strategyName, // Database column is 'strategy_name', not 'name'
      strategy_type: performance.strategyId,
      // total_signals: performance.totalTrades, // Column doesn't exist - add it with migration
      successful_signals: performance.winningTrades,
      total_return: performance.totalPnL,
      win_rate: performance.winRate
    }

    console.log(`💾 Saving strategy to database:`, {
      user_id: userId,
      strategy_type: performance.strategyId,
      strategy_name: performance.strategyName,
      // total_signals: performance.totalTrades, // Column doesn't exist yet
      successful_signals: performance.winningTrades,
      total_return: performance.totalPnL,
      win_rate: performance.winRate
    })

    // Upsert to trading_strategies
    const { data, error } = await client
      .from('trading_strategies')
      .upsert(strategyData, {
        onConflict: 'user_id,strategy_type',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('❌ Failed to save strategy to database:', error)
      console.error('   Error details:', JSON.stringify(error, null, 2))

      // Provide helpful error messages
      if (error.code === '42501') {
        console.warn('💡 RLS POLICY: Database security is blocking writes. Trading continues normally.')
        console.warn('💡 Fix: Update Supabase RLS policies or use authenticated user instead of system user.')
      } else if (error.code === 'PGRST204') {
        console.warn('💡 SCHEMA MISMATCH: Database column not found. Check Supabase schema matches code.')
      }
    } else {
      console.log(`✅ Saved ${performance.strategyName} to trading_strategies table`)
      console.log(`   Data saved:`, data)
    }
  } catch (error) {
    console.error('❌ Error saving strategy to database:', error)
  }
}

/**
 * Log trade result to ai_learning_data table
 * Captures learning data from each trade for AI improvement
 */
export async function logTradeLearningData(
  _strategyId: string,
  strategyName: string,
  symbol: string,
  pnl: number,
  confidence: number,
  marketData?: any
): Promise<void> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, skipping learning data')
      return
    }

    const userId = await getUserId()
    // Outcome must match database constraint: 'WIN', 'LOSS', or 'NEUTRAL' (uppercase)
    const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'NEUTRAL'

    // Prepare learning data
    const learningData: Database['public']['Tables']['ai_learning_data']['Insert'] = {
      user_id: userId,
      symbol,
      strategy_used: strategyName,
      confidence_score: confidence,
      outcome,
      profit_loss: pnl,
      market_conditions: marketData ? {
        price: marketData.close || 0,
        volume: marketData.volume || 0,
        timestamp: marketData.timestamp || new Date().toISOString()
      } : {},
      technical_indicators: marketData ? {
        rsi: marketData.rsi || null,
        macd: marketData.macd || null,
        bollinger: marketData.bollinger || null
      } : {},
      sentiment_score: 0.5 // Neutral default
    }

    const { error } = await client
      .from('ai_learning_data')
      .insert(learningData)

    if (error) {
      console.error('❌ Failed to log learning data:', error)
    } else {
      console.log(`📚 Logged learning data: ${symbol} ${outcome} P&L=$${pnl.toFixed(2)}`)
    }
  } catch (error) {
    console.error('❌ Error logging learning data:', error)
  }
}

/**
 * Log bot activity to bot_activity_logs table
 * Tracks all bot actions for monitoring and debugging
 */
export async function logBotActivity(
  type: string,
  message: string,
  symbol?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, skipping activity log')
      return
    }

    const userId = await getUserId()

    const activityLog: Database['public']['Tables']['bot_activity_logs']['Insert'] = {
      user_id: userId,
      type,
      message,
      symbol: symbol || null,
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: metadata || null
    }

    const { error } = await client
      .from('bot_activity_logs')
      .insert(activityLog)

    if (error) {
      console.error('❌ Failed to log bot activity:', error)
    } else {
      console.log(`📝 Logged activity: ${type} - ${message}`)
    }
  } catch (error) {
    console.error('❌ Error logging bot activity:', error)
  }
}

/**
 * Update bot metrics after each trade
 */
export async function updateBotMetrics(
  tradesExecuted: number,
  successRate: number,
  totalPnL: number,
  riskScore: number
): Promise<void> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, skipping metrics update')
      return
    }

    const userId = await getUserId()

    const metricsData: Database['public']['Tables']['bot_metrics']['Insert'] = {
      user_id: userId,
      is_running: true,
      trades_executed: tradesExecuted,
      success_rate: successRate,
      total_pnl: totalPnL,
      daily_pnl: totalPnL, // Simplified - should calculate daily only
      risk_score: riskScore,
      last_activity: new Date().toISOString(),
      uptime: 0, // Calculate from start time
      recommendations_generated: tradesExecuted
    }

    const { error } = await client
      .from('bot_metrics')
      .upsert(metricsData, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ Failed to update bot metrics:', error)
    } else {
      console.log(`📊 Updated bot metrics: ${tradesExecuted} trades, ${successRate.toFixed(1)}% success`)
    }
  } catch (error) {
    console.error('❌ Error updating bot metrics:', error)
  }
}

/**
 * Load all strategies from database
 */
export async function loadStrategiesFromDatabase(): Promise<StrategyPerformance[]> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, returning empty strategies')
      return []
    }

    const userId = await getUserId()

    console.log(`📦 Loading strategies from database for user: ${userId}`)

    const { data, error } = await client
      .from('trading_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('total_return', { ascending: false })

    if (error) {
      console.error('❌ Failed to load strategies:', error)
      console.error('   Error details:', JSON.stringify(error, null, 2))
      return []
    }

    if (!data || data.length === 0) {
      console.log('📭 No strategies found in database for this user')
      return []
    }

    console.log(`📦 Found ${data.length} strategies in database:`, data.map(d => ({
      name: (d as any).strategy_name || (d as any).name,
      type: d.strategy_type,
      trades: (d as any).total_signals,
      winRate: d.win_rate,
      pnl: d.total_return
    })))

    // Convert database rows to StrategyPerformance objects
    const performances: StrategyPerformance[] = data.map((row: any) => ({
      strategyId: row.strategy_type,
      strategyName: row.strategy_name || row.name, // Handle both column names
      totalTrades: row.total_signals || row.successful_signals || 0,
      winningTrades: row.successful_signals || 0,
      losingTrades: (row.total_signals || row.successful_signals || 0) - (row.successful_signals || 0),
      totalPnL: row.total_return || 0,
      winRate: row.win_rate || 0,
      avgPnL: row.total_signals ? (row.total_return || 0) / row.total_signals : 0,
      sharpeRatio: 0, // Not stored in trading_strategies
      maxDrawdown: 0, // Not stored in trading_strategies
      consecutiveLosses: 0,
      consecutiveWins: 0,
      lastTradeTime: row.updated_at ? new Date(row.updated_at) : null,
      testingMode: !row.enabled, // If disabled, assume in testing
      testTradesCompleted: 0,
      testTradesRequired: 5,
      testPnL: 0,
      testWinRate: 0,
      testPassed: row.enabled ? true : null
    }))

    console.log(`📦 Loaded ${performances.length} strategies from database`)
    return performances
  } catch (error) {
    console.error('❌ Error loading strategies:', error)
    return []
  }
}

/**
 * Get recent learning data for analysis
 */
export async function getRecentLearningData(
  symbol?: string,
  limit: number = 100
): Promise<Database['public']['Tables']['ai_learning_data']['Row'][]> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, returning empty learning data')
      return []
    }

    const userId = await getUserId()

    let query = client
      .from('ai_learning_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Failed to load learning data:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('❌ Error loading learning data:', error)
    return []
  }
}

/**
 * Update active strategy display in UI
 */
async function updateActiveStrategyDisplay(performance: StrategyPerformance): Promise<void> {
  try {
    // Update the active strategy API endpoint so the UI shows current data
    const response = await fetch('http://localhost:3000/api/strategies/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyId: performance.strategyId,
        strategyName: performance.strategyName,
        winRate: performance.winRate,
        totalTrades: performance.totalTrades,
        testingMode: performance.testingMode,
        testTradesCompleted: performance.testTradesCompleted,
        testTradesRequired: performance.testTradesRequired,
        totalPnL: performance.totalPnL
      })
    })

    if (response.ok) {
      console.log(`📊 Updated active strategy display: ${performance.strategyName}`)
    }
  } catch (error) {
    // Silently fail - this is just for UI updates
    console.debug('Could not update active strategy display:', error)
  }
}

/**
 * Complete save: Update all tables when a trade is recorded
 */
export async function recordTradeToDatabase(
  performance: StrategyPerformance,
  symbol: string,
  pnl: number,
  confidence: number,
  marketData?: any
): Promise<void> {
  try {
    // 1. Save strategy performance to trading_strategies
    await saveStrategyToDatabase(performance)

    // 2. Log learning data to ai_learning_data
    await logTradeLearningData(
      performance.strategyId,
      performance.strategyName,
      symbol,
      pnl,
      confidence,
      marketData
    )

    // 3. Log activity to bot_activity_logs
    await logBotActivity(
      'trade',
      `Trade executed: ${symbol} ${pnl >= 0 ? 'WIN' : 'LOSS'} P&L=$${pnl.toFixed(2)}`,
      symbol,
      {
        strategyId: performance.strategyId,
        strategyName: performance.strategyName,
        confidence,
        pnl,
        winRate: performance.winRate,
        totalTrades: performance.totalTrades
      }
    )

    // 4. Update bot metrics
    const successRate = performance.totalTrades > 0
      ? (performance.winningTrades / performance.totalTrades) * 100
      : 0

    await updateBotMetrics(
      performance.totalTrades,
      successRate,
      performance.totalPnL,
      50 // Default risk score
    )

    // 5. Update active strategy display in UI
    await updateActiveStrategyDisplay(performance)

    console.log(`✅ Recorded trade to all database tables: ${symbol} P&L=$${pnl.toFixed(2)}`)
  } catch (error) {
    console.error('❌ Error recording trade to database:', error)
  }
}
