/**
 * Strategy Performance Storage - Supabase Integration
 *
 * Persists AdaptiveStrategyEngine performance data to Supabase
 * so it survives server restarts and API route calls
 */

import { createClient } from '@supabase/supabase-js'
import type { StrategyPerformance } from './AdaptiveStrategyEngine'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: any = null

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
  return supabase
}

const TABLE_NAME = 'strategy_performance'

/**
 * Save strategy performance to Supabase
 * Saves to both current state table AND historical snapshots
 */
export async function saveStrategyPerformance(performance: StrategyPerformance): Promise<void> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, skipping strategy performance save')
      return
    }

    const performanceData = {
      strategy_id: performance.strategyId,
      strategy_name: performance.strategyName,
      total_trades: performance.totalTrades,
      winning_trades: performance.winningTrades,
      losing_trades: performance.losingTrades,
      total_pnl: performance.totalPnL,
      win_rate: performance.winRate,
      avg_pnl: performance.avgPnL,
      sharpe_ratio: performance.sharpeRatio,
      max_drawdown: performance.maxDrawdown,
      consecutive_losses: performance.consecutiveLosses,
      consecutive_wins: performance.consecutiveWins,
      last_trade_time: performance.lastTradeTime,
      testing_mode: performance.testingMode,
      test_trades_completed: performance.testTradesCompleted,
      test_trades_required: performance.testTradesRequired,
      test_pnl: performance.testPnL,
      test_win_rate: performance.testWinRate,
      test_passed: performance.testPassed
    }

    // 1. Update current state table (upsert - keeps only latest)
    const { error: currentError } = await client
      .from(TABLE_NAME)
      .upsert({
        ...performanceData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'strategy_id'
      })

    if (currentError) {
      console.error('❌ Failed to save strategy performance to current table:', currentError)
    }

    // 2. Insert historical snapshot (insert - keeps all history)
    const { error: historyError } = await client
      .from('strategy_performance_history')
      .insert({
        ...performanceData,
        snapshot_time: new Date().toISOString()
      })

    if (historyError) {
      console.error('❌ Failed to save strategy performance to history table:', historyError)
    }

    if (!currentError && !historyError) {
      console.log(`💾 Saved ${performance.strategyName} performance to Supabase (current + history)`)
    }
  } catch (error) {
    console.error('❌ Error saving strategy performance:', error)
  }
}

/**
 * Load all strategy performances from Supabase
 */
export async function loadAllStrategyPerformances(): Promise<StrategyPerformance[]> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, returning empty performance data')
      return []
    }

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .order('total_pnl', { ascending: false })

    if (error) {
      console.error('❌ Failed to load strategy performances:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('📭 No strategy performance data found in Supabase')
      return []
    }

    // Convert database rows to StrategyPerformance objects
    const performances: StrategyPerformance[] = data.map((row: any) => ({
      strategyId: row.strategy_id,
      strategyName: row.strategy_name,
      totalTrades: row.total_trades || 0,
      winningTrades: row.winning_trades || 0,
      losingTrades: row.losing_trades || 0,
      totalPnL: row.total_pnl || 0,
      winRate: row.win_rate || 0,
      avgPnL: row.avg_pnl || 0,
      sharpeRatio: row.sharpe_ratio || 0,
      maxDrawdown: row.max_drawdown || 0,
      consecutiveLosses: row.consecutive_losses || 0,
      consecutiveWins: row.consecutive_wins || 0,
      lastTradeTime: row.last_trade_time ? new Date(row.last_trade_time) : null,
      testingMode: row.testing_mode !== false,
      testTradesCompleted: row.test_trades_completed || 0,
      testTradesRequired: row.test_trades_required || 7,
      testPnL: row.test_pnl || 0,
      testWinRate: row.test_win_rate || 0,
      testPassed: row.test_passed
    }))

    console.log(`📦 Loaded ${performances.length} strategy performances from Supabase`)
    return performances
  } catch (error) {
    console.error('❌ Error loading strategy performances:', error)
    return []
  }
}

/**
 * Load single strategy performance from Supabase
 */
export async function loadStrategyPerformance(strategyId: string): Promise<StrategyPerformance | null> {
  try {
    const client = getSupabase()
    if (!client) return null

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('strategy_id', strategyId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      strategyId: data.strategy_id,
      strategyName: data.strategy_name,
      totalTrades: data.total_trades || 0,
      winningTrades: data.winning_trades || 0,
      losingTrades: data.losing_trades || 0,
      totalPnL: data.total_pnl || 0,
      winRate: data.win_rate || 0,
      avgPnL: data.avg_pnl || 0,
      sharpeRatio: data.sharpe_ratio || 0,
      maxDrawdown: data.max_drawdown || 0,
      consecutiveLosses: data.consecutive_losses || 0,
      consecutiveWins: data.consecutive_wins || 0,
      lastTradeTime: data.last_trade_time ? new Date(data.last_trade_time) : null,
      testingMode: data.testing_mode !== false,
      testTradesCompleted: data.test_trades_completed || 0,
      testTradesRequired: data.test_trades_required || 7,
      testPnL: data.test_pnl || 0,
      testWinRate: data.test_win_rate || 0,
      testPassed: data.test_passed
    }
  } catch (error) {
    console.error(`❌ Error loading strategy ${strategyId}:`, error)
    return null
  }
}

/**
 * Load historical performance for a specific strategy
 * @param strategyId - Strategy ID to load history for
 * @param limit - Number of snapshots to load (default: 100)
 */
export async function loadStrategyPerformanceHistory(
  strategyId: string,
  limit: number = 100
): Promise<StrategyPerformance[]> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, returning empty history')
      return []
    }

    const { data, error } = await client
      .from('strategy_performance_history')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('snapshot_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error(`❌ Failed to load history for ${strategyId}:`, error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Convert database rows to StrategyPerformance objects
    const performances: StrategyPerformance[] = data.map((row: any) => ({
      strategyId: row.strategy_id,
      strategyName: row.strategy_name,
      totalTrades: row.total_trades || 0,
      winningTrades: row.winning_trades || 0,
      losingTrades: row.losing_trades || 0,
      totalPnL: row.total_pnl || 0,
      winRate: row.win_rate || 0,
      avgPnL: row.avg_pnl || 0,
      sharpeRatio: row.sharpe_ratio || 0,
      maxDrawdown: row.max_drawdown || 0,
      consecutiveLosses: row.consecutive_losses || 0,
      consecutiveWins: row.consecutive_wins || 0,
      lastTradeTime: row.last_trade_time ? new Date(row.last_trade_time) : null,
      testingMode: row.testing_mode !== false,
      testTradesCompleted: row.test_trades_completed || 0,
      testTradesRequired: row.test_trades_required || 7,
      testPnL: row.test_pnl || 0,
      testWinRate: row.test_win_rate || 0,
      testPassed: row.test_passed
    }))

    console.log(`📦 Loaded ${performances.length} historical snapshots for ${strategyId}`)
    return performances
  } catch (error) {
    console.error(`❌ Error loading history for ${strategyId}:`, error)
    return []
  }
}

/**
 * Load all historical performance data within a time range
 * @param startDate - Start date for the range
 * @param endDate - End date for the range (default: now)
 */
export async function loadStrategyPerformanceHistoryByDateRange(
  startDate: Date,
  endDate: Date = new Date()
): Promise<StrategyPerformance[]> {
  try {
    const client = getSupabase()
    if (!client) {
      console.warn('⚠️ Supabase not configured, returning empty history')
      return []
    }

    const { data, error } = await client
      .from('strategy_performance_history')
      .select('*')
      .gte('snapshot_time', startDate.toISOString())
      .lte('snapshot_time', endDate.toISOString())
      .order('snapshot_time', { ascending: false })

    if (error) {
      console.error('❌ Failed to load history by date range:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Convert database rows to StrategyPerformance objects
    const performances: StrategyPerformance[] = data.map((row: any) => ({
      strategyId: row.strategy_id,
      strategyName: row.strategy_name,
      totalTrades: row.total_trades || 0,
      winningTrades: row.winning_trades || 0,
      losingTrades: row.losing_trades || 0,
      totalPnL: row.total_pnl || 0,
      winRate: row.win_rate || 0,
      avgPnL: row.avg_pnl || 0,
      sharpeRatio: row.sharpe_ratio || 0,
      maxDrawdown: row.max_drawdown || 0,
      consecutiveLosses: row.consecutive_losses || 0,
      consecutiveWins: row.consecutive_wins || 0,
      lastTradeTime: row.last_trade_time ? new Date(row.last_trade_time) : null,
      testingMode: row.testing_mode !== false,
      testTradesCompleted: row.test_trades_completed || 0,
      testTradesRequired: row.test_trades_required || 7,
      testPnL: row.test_pnl || 0,
      testWinRate: row.test_win_rate || 0,
      testPassed: row.test_passed
    }))

    console.log(`📦 Loaded ${performances.length} historical snapshots from date range`)
    return performances
  } catch (error) {
    console.error('❌ Error loading history by date range:', error)
    return []
  }
}

/**
 * Create the strategy_performance table if it doesn't exist
 */
export async function initializeStrategyPerformanceTable(): Promise<void> {
  console.log('🔧 Strategy performance table should be created via Supabase migration')
  console.log('   Run: supabase/migrations/create_strategy_performance_table.sql')
}
