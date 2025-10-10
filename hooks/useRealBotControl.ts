/**
 * Real AI Trading Bot Control Hook
 * Uses ONLY real Alpaca API and Supabase data
 * NO MOCKS - Production ready
 */

'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealTradingStore } from '@/store/realTradingStore'

interface BotConfig {
  symbols: string[]
  scanIntervalMinutes: number
  maxConcurrentPositions: number
  autoExecuteOrders: boolean
  minConfidenceThreshold: number
  maxRiskPerTrade: number
  strategies?: string[]
}

interface BotStatus {
  isRunning: boolean
  session: {
    sessionId: string
    startTime: Date
    config: BotConfig
    stats: {
      scansCompleted: number
      recommendationsGenerated: number
      tradesExecuted: number
      tradesSuccessful: number
      tradesFailed: number
      totalPnL: number
      lastScanTime: Date | null
      errors: string[]
    }
  } | null
}

export function useRealBotControl() {
  const queryClient = useQueryClient()
  const setBotRunning = useRealTradingStore(state => state.setBotRunning)
  const setBotConfig = useRealTradingStore(state => state.setBotConfig)

  // Query bot status
  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<BotStatus>({
    queryKey: ['bot', 'status'],
    queryFn: async () => {
      const response = await fetch('/api/ai/real-bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bot status')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch bot status')
      }

      return {
        isRunning: result.isRunning,
        session: result.session
      }
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 3000
  })

  // Start bot mutation
  const startBot = useMutation({
    mutationFn: async (config: BotConfig) => {
      console.log('🚀 Starting REAL AI Trading Bot with config:', config)

      const response = await fetch('/api/ai/real-bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          config
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start bot')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to start bot')
      }

      console.log('✅ Bot started successfully:', result.session)

      return result
    },
    onSuccess: (data) => {
      setBotRunning(true, data.session.sessionId)
      setBotConfig(data.session.config)
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['alpaca', 'account'] })
    },
    onError: (error) => {
      console.error('❌ Failed to start bot:', error)
    }
  })

  // Stop bot mutation
  const stopBot = useMutation({
    mutationFn: async () => {
      console.log('🛑 Stopping AI Trading Bot')

      const response = await fetch('/api/ai/real-bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to stop bot')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to stop bot')
      }

      console.log('✅ Bot stopped successfully')

      return result
    },
    onSuccess: () => {
      setBotRunning(false)
      setBotConfig(null)
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] })
    },
    onError: (error) => {
      console.error('❌ Failed to stop bot:', error)
    }
  })

  // Force scan mutation
  const forceScan = useMutation({
    mutationFn: async () => {
      console.log('🔍 Forcing immediate market scan')

      const response = await fetch('/api/ai/real-bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-scan' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to force scan')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to force scan')
      }

      console.log('✅ Scan completed')

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['alpaca'] })
    },
    onError: (error) => {
      console.error('❌ Failed to force scan:', error)
    }
  })

  return {
    // Status
    status: status?.isRunning || false,
    session: status?.session || null,
    isLoading: statusLoading,
    error: statusError,

    // Mutations (full mutation objects with mutate, mutateAsync, isPending, etc.)
    startBot,
    stopBot,
    forceScan,

    // Loading states
    isStarting: startBot.isPending,
    isStopping: stopBot.isPending,
    isScanning: forceScan.isPending,

    // Errors
    startError: startBot.error,
    stopError: stopBot.error,
    scanError: forceScan.error,

    // Refresh
    refresh: refetchStatus
  }
}
