'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

interface BotActivityLog {
  id: string
  timestamp: string
  type: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
  symbol?: string
  message: string
  details?: string
  confidence?: number
  status: 'active' | 'completed' | 'failed'
  executionTime?: number
}

interface BotMetrics {
  symbolsScanned: number
  analysisCompleted: number
  recommendationsGenerated: number
  tradesExecuted: number
  lastActivityTime: string
  currentSymbol: string | null
  nextScanIn: number
  avgAnalysisTime: number
  successRate: number
  uptime: number
  totalProcessingTime: number
  errorCount: number
}

interface OrderExecution {
  enabled: boolean
  dailyOrderCount: number
  dailyOrderLimit: number
  metrics: {
    totalOrdersExecuted: number
    successfulOrders: number
    failedOrders: number
    totalValue: number
    lastExecutionTime: string | null
  }
  config: {
    minConfidenceForOrder: number
    maxPositionSize: number
    riskPerTrade: number
  }
}

interface AIBotActivityState {
  activities: BotActivityLog[]
  metrics: BotMetrics | null
  orderExecution: OrderExecution | null
  isSimulating: boolean
  isLoading: boolean
  error: string | null
}

interface AIBotActivityHook extends AIBotActivityState {
  startSimulation: () => Promise<void>
  stopSimulation: () => Promise<void>
  toggleOrderExecution: () => Promise<void>
  refreshActivity: () => Promise<void>
  addCustomActivity: (activity: Partial<BotActivityLog>) => Promise<void>
}

interface UseAIBotActivityOptions {
  refreshInterval?: number
  maxActivities?: number
  autoStart?: boolean
}

export function useAIBotActivity({
  refreshInterval = 5000,
  maxActivities = 20,
  autoStart = false
}: UseAIBotActivityOptions = {}): AIBotActivityHook {
  const [state, setState] = useState<AIBotActivityState>({
    activities: [],
    metrics: null,
    orderExecution: null,
    isSimulating: false,
    isLoading: false,
    error: null
  })

  // Fetch real bot activity data from Supabase
  const fetchBotActivity = useCallback(async () => {
    try {
      const userId = getCurrentUserId()

      // Fetch real bot activity logs from Supabase
      const activityLogs = await supabaseService.getBotActivityLogs(userId, maxActivities)

      // Fetch bot metrics
      const metrics = await supabaseService.getBotMetrics(userId)

      // Transform Supabase data to match interface
      const activities = activityLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        type: log.type as 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info',
        symbol: log.symbol || undefined,
        message: log.message,
        details: log.details || undefined,
        confidence: log.metadata?.confidence as number || undefined,
        status: log.status as 'active' | 'completed' | 'failed',
        executionTime: log.execution_time || undefined
      }))

      const botMetrics = metrics ? {
        symbolsScanned: 0, // This would come from aggregating activity logs
        analysisCompleted: activities.filter(a => a.type === 'info').length,
        recommendationsGenerated: metrics.recommendations_generated || 0,
        tradesExecuted: metrics.trades_executed || 0,
        lastActivityTime: activities[0]?.timestamp || new Date().toISOString(),
        currentSymbol: activities.find(a => a.symbol)?.symbol || null,
        nextScanIn: 30,
        avgAnalysisTime: 0,
        successRate: metrics.success_rate || 0,
        uptime: metrics.uptime || 0,
        totalProcessingTime: 0,
        errorCount: activities.filter(a => a.type === 'error').length
      } : null

      setState(prev => ({
        ...prev,
        activities,
        metrics: botMetrics,
        isSimulating: metrics?.is_running || false,
        error: null
      }))

    } catch (err) {
      console.error('Failed to fetch bot activity from Supabase:', err)
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch activity'
      }))
    }
  }, [maxActivities])

  // Start bot activity and log to Supabase
  const startSimulation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const userId = getCurrentUserId()

      // Update bot metrics to indicate it's running
      await supabaseService.updateBotMetrics(userId, {
        is_running: true,
        last_activity: new Date().toISOString()
      })

      // Log start activity
      await supabaseService.logBotActivity({
        user_id: userId,
        timestamp: new Date().toISOString(),
        type: 'system',
        message: 'AI Trading Bot started - monitoring Alpaca API',
        status: 'completed',
        metadata: {
          action: 'start',
          timestamp: new Date().toISOString()
        }
      })

      setState(prev => ({ ...prev, isSimulating: true }))
      // Refresh after starting
      setTimeout(fetchBotActivity, 1000)

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start AI bot'
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [fetchBotActivity])

  // Stop bot activity and log to Supabase
  const stopSimulation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const userId = getCurrentUserId()

      // Update bot metrics to indicate it's stopped
      await supabaseService.updateBotMetrics(userId, {
        is_running: false,
        last_activity: new Date().toISOString()
      })

      // Log stop activity
      await supabaseService.logBotActivity({
        user_id: userId,
        timestamp: new Date().toISOString(),
        type: 'system',
        message: 'AI Trading Bot stopped',
        status: 'completed',
        metadata: {
          action: 'stop',
          timestamp: new Date().toISOString()
        }
      })

      setState(prev => ({ ...prev, isSimulating: false }))
      fetchBotActivity()

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to stop AI bot'
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [fetchBotActivity])

  // Toggle order execution
  const toggleOrderExecution = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const action = state.orderExecution?.enabled ? 'disable-execution' : 'enable-execution'
      const response = await fetch(`/api/ai-bot-activity?action=${action}`)
      const data = await response.json()

      if (data.success) {
        fetchBotActivity()
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || 'Failed to toggle order execution'
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to toggle order execution'
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [state.orderExecution?.enabled, fetchBotActivity])

  // Add custom activity
  const addCustomActivity = useCallback(async (activity: Partial<BotActivityLog>) => {
    try {
      const response = await fetch('/api/ai-bot-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: activity.type || 'info',
          symbol: activity.symbol,
          message: activity.message || 'Custom activity',
          confidence: activity.confidence,
          details: activity.details
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh activities to include the new one
        fetchBotActivity()
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || 'Failed to add custom activity'
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to add custom activity'
      }))
    }
  }, [fetchBotActivity])

  // Refresh activity data
  const refreshActivity = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    await fetchBotActivity()
    setState(prev => ({ ...prev, isLoading: false }))
  }, [fetchBotActivity])

  // Set up polling for real-time updates
  useEffect(() => {
    // Initial load
    fetchBotActivity()

    // Set up polling interval
    const interval = setInterval(fetchBotActivity, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchBotActivity, refreshInterval])

  // Separate effect for auto-start to avoid dependency loops
  useEffect(() => {
    if (autoStart) {
      startSimulation()
    }
  }, [autoStart, startSimulation])

  return {
    ...state,
    startSimulation,
    stopSimulation,
    toggleOrderExecution,
    refreshActivity,
    addCustomActivity
  }
}

export default useAIBotActivity