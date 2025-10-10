'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/auth-utils'

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
  isLoading: boolean
  error: string | null
}

interface AIBotActivityHook extends AIBotActivityState {
  toggleOrderExecution: () => Promise<void>
  refreshActivity: () => Promise<void>
  addCustomActivity: (activity: Partial<BotActivityLog>) => Promise<void>
}

interface UseAIBotActivityOptions {
  refreshInterval?: number
  maxActivities?: number
}

export function useAIBotActivity({
  refreshInterval = 5000,
  maxActivities = 20
}: UseAIBotActivityOptions = {}): AIBotActivityHook {
  const [state, setState] = useState<AIBotActivityState>({
    activities: [],
    metrics: null,
    orderExecution: null,
    isLoading: false,
    error: null
  })

  // Fetch real bot activity data from API
  const fetchBotActivity = useCallback(async () => {
    try {
      const userId = getCurrentUserId()

      // Fetch bot data from API endpoint instead of direct Supabase access
      const response = await fetch(`/api/ai-bot?userId=${userId}&limit=${maxActivities}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch bot activity: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch bot activity')
      }

      const { activities: apiActivities, metrics: apiMetrics } = result.data

      // Transform API data to match interface
      const activities = apiActivities.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        type: log.type as 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info',
        symbol: log.symbol || undefined,
        message: log.message,
        details: log.details || undefined,
        confidence: log.confidence || undefined,
        status: log.status as 'active' | 'completed' | 'failed',
        executionTime: log.executionTime || undefined
      }))

      const botMetrics = apiMetrics ? {
        symbolsScanned: apiMetrics.symbolsScanned || 0,
        analysisCompleted: apiMetrics.analysisCompleted || 0,
        recommendationsGenerated: apiMetrics.recommendationsGenerated || 0,
        tradesExecuted: apiMetrics.tradesExecuted || 0,
        lastActivityTime: apiMetrics.lastActivityTime || new Date().toISOString(),
        currentSymbol: apiMetrics.currentSymbol || null,
        nextScanIn: apiMetrics.nextScanIn || 30,
        avgAnalysisTime: apiMetrics.avgAnalysisTime || 0,
        successRate: apiMetrics.successRate || 0,
        uptime: apiMetrics.uptime || 0,
        totalProcessingTime: apiMetrics.totalProcessingTime || 0,
        errorCount: apiMetrics.errorCount || 0
      } : null

      setState(prev => ({
        ...prev,
        activities,
        metrics: botMetrics,
        error: null
      }))

    } catch (err) {
      console.error('Failed to fetch bot activity from API:', err)
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch activity'
      }))
    }
  }, [maxActivities])


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

  return {
    ...state,
    toggleOrderExecution,
    refreshActivity,
    addCustomActivity
  }
}

export default useAIBotActivity