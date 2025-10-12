"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

interface TradingEngineState {
  isRunning: boolean
  sessionId: string | null
  startTime: Date | null
  config: any
  error: string | null
}

interface TradingConfig {
  mode?: string
  strategies?: any[]
  riskManagement?: {
    minConfidence?: number
    maxPositionSize?: number
    maxDailyLoss?: number
  }
  executionSettings?: {
    autoExecute?: boolean
    minConfidenceForOrder?: number
  }
}

export const useAITradingEngine = () => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<TradingEngineState>({
    isRunning: false,
    sessionId: null,
    startTime: null,
    config: null,
    error: null
  })

  // Query bot status
  const { data: botStatus, isLoading: isCheckingStatus, refetch: checkStatus } = useQuery({
    queryKey: ['ai-trading-bot-status'],
    queryFn: async () => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'GET'
      })
      if (!response.ok) {
        throw new Error('Failed to check bot status')
      }
      return response.json()
    },
    refetchInterval: 15000, // Check every 15 seconds (reduced from 5s to prevent rate limiting)
    enabled: true
  })

  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: async (config: TradingConfig) => {
      console.log('🚀 Starting AI Trading Bot with config:', config)

      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          config: {
            mode: config.mode || 'BALANCED',
            strategies: config.strategies || [
              { id: 'ml_enhanced', name: 'ML Enhanced', enabled: true, weight: 0.4 },
              { id: 'technical', name: 'Technical Analysis', enabled: true, weight: 0.3 },
              { id: 'sentiment', name: 'Sentiment Analysis', enabled: true, weight: 0.3 }
            ],
            riskManagement: {
              maxPositionSize: 0.05,
              maxDailyLoss: 0.02,
              maxDrawdown: 0.10,
              minConfidence: config.riskManagement?.minConfidence || 0.75,
              stopLossPercent: 0.05,
              takeProfitPercent: 0.10
            },
            executionSettings: {
              autoExecute: config.executionSettings?.autoExecute ?? true,
              minConfidenceForOrder: config.executionSettings?.minConfidenceForOrder || 0.80
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start AI Trading Bot')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('✅ AI Trading Bot started successfully:', data)
      setState(prev => ({
        ...prev,
        isRunning: true,
        sessionId: data.data?.sessionId || null,
        startTime: data.data?.startTime ? new Date(data.data.startTime) : new Date(),
        error: null
      }))
      queryClient.invalidateQueries({ queryKey: ['ai-trading-bot-status'] })
    },
    onError: (error: Error) => {
      console.error('❌ Failed to start AI Trading Bot:', error)
      setState(prev => ({
        ...prev,
        error: error.message,
        isRunning: false
      }))
    }
  })

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async () => {
      console.log('🛑 Stopping AI Trading Bot...')

      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stop'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to stop AI Trading Bot')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('✅ AI Trading Bot stopped successfully:', data)
      setState(prev => ({
        ...prev,
        isRunning: false,
        sessionId: null,
        startTime: null,
        error: null
      }))
      queryClient.invalidateQueries({ queryKey: ['ai-trading-bot-status'] })
    },
    onError: (error: Error) => {
      console.error('❌ Failed to stop AI Trading Bot:', error)
      setState(prev => ({
        ...prev,
        error: error.message
      }))
    }
  })

  // Query recent trades
  const { data: recentTrades, isLoading: isLoadingTrades } = useQuery({
    queryKey: ['recent-trades'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/orders?limit=10&status=all')
      if (!response.ok) {
        throw new Error('Failed to fetch recent trades')
      }
      const data = await response.json()
      return data.orders || []
    },
    refetchInterval: state.isRunning ? 10000 : 30000, // Refresh more often when bot is running
    enabled: true
  })

  // Start bot with default config
  const startBot = useCallback((config: TradingConfig = {}) => {
    startBotMutation.mutate(config)
  }, [startBotMutation])

  // Stop bot
  const stopBot = useCallback(() => {
    stopBotMutation.mutate()
  }, [stopBotMutation])

  // Get current bot status
  const getCurrentStatus = useCallback(() => {
    const serverStatus = botStatus?.data
    return {
      isRunning: state.isRunning || serverStatus?.isRunning || false,
      sessionId: state.sessionId || serverStatus?.sessionId || null,
      startTime: state.startTime || (serverStatus?.startTime ? new Date(serverStatus.startTime) : null),
      uptime: serverStatus?.uptime || 0,
      config: state.config || serverStatus?.config || null,
      alpacaConnected: true,
      supabaseConnected: true,
      autoExecute: serverStatus?.config?.autoExecution || true
    }
  }, [state, botStatus])

  return {
    // State
    ...getCurrentStatus(),
    error: state.error,
    recentTrades: recentTrades || [],

    // Loading states
    isStarting: startBotMutation.isPending,
    isStopping: stopBotMutation.isPending,
    isCheckingStatus,
    isLoadingTrades,

    // Actions
    startBot,
    stopBot,
    checkStatus,

    // Mutations for advanced usage
    startBotMutation,
    stopBotMutation
  }
}