'use client'

import { useState, useEffect, useCallback } from 'react'

interface BotActivityLog {
  id: string
  timestamp: string
  type: 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info'
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

  // Fetch bot activity data
  const fetchBotActivity = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai-bot-activity?limit=${maxActivities}`)
      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          activities: data.data.activities || [],
          metrics: data.data.metrics,
          orderExecution: data.data.orderExecution,
          isSimulating: data.data.isSimulating,
          error: null
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || 'Failed to fetch bot activity'
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Network error'
      }))
    }
  }, [maxActivities])

  // Start bot activity simulation
  const startSimulation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/ai-bot-activity?action=start-simulation')
      const data = await response.json()

      if (data.success) {
        setState(prev => ({ ...prev, isSimulating: true }))
        // Refresh after starting
        setTimeout(fetchBotActivity, 1000)
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || 'Failed to start simulation'
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start simulation'
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [fetchBotActivity])

  // Stop bot activity simulation
  const stopSimulation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/ai-bot-activity?action=stop-simulation')
      const data = await response.json()

      if (data.success) {
        setState(prev => ({ ...prev, isSimulating: false }))
        fetchBotActivity()
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || 'Failed to stop simulation'
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to stop simulation'
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

    // Auto-start if requested
    if (autoStart) {
      startSimulation()
    }

    // Set up polling interval
    const interval = setInterval(fetchBotActivity, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchBotActivity, refreshInterval, autoStart, startSimulation])

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