/**
 * useBotControl - React hook for AI Trading Bot control
 * Integrates with /api/ai/bot-control endpoint
 */

import { useState, useEffect, useCallback } from 'react'
import { BotConfiguration } from '@/types/trading'

interface BotStatus {
  isRunning: boolean
  sessionId: string | null
  startTime: Date | null
  uptime: number
  uptimeFormatted: string
  lastScanTime: Date | null
  scanCount: number
  errorCount: number
  lastError: string | null
  config: {
    mode: string
    strategiesEnabled: number
    autoExecute: boolean
    marketHoursOnly: boolean
  } | null
  status: 'RUNNING' | 'STOPPED'
  health: 'HEALTHY' | 'WARNING' | 'ERROR'
}

interface UseBotControlOptions {
  autoFetchStatus?: boolean
  statusRefreshInterval?: number
}

export function useBotControl(options: UseBotControlOptions = {}) {
  const {
    autoFetchStatus = true,
    statusRefreshInterval = 10000, // 10 seconds
  } = options

  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch bot status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })

      const result = await response.json()

      if (result.success) {
        setBotStatus(result.data)
        setError(null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch bot status')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to fetch bot status:', err)
      return null
    }
  }, [])

  // Start bot
  const startBot = useCallback(async (config?: BotConfiguration) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          ...(config && { config })
        })
      })

      const result = await response.json()

      if (result.success) {
        await fetchStatus()
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || 'Failed to start bot')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to start bot:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [fetchStatus])

  // Stop bot
  const stopBot = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      const result = await response.json()

      if (result.success) {
        await fetchStatus()
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || 'Failed to stop bot')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to stop bot:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [fetchStatus])

  // Restart bot
  const restartBot = useCallback(async (config?: BotConfiguration) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restart',
          ...(config && { config })
        })
      })

      const result = await response.json()

      if (result.success) {
        await fetchStatus()
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || 'Failed to restart bot')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to restart bot:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [fetchStatus])

  // Auto-fetch status on mount and at intervals
  useEffect(() => {
    if (autoFetchStatus) {
      fetchStatus()

      const interval = setInterval(() => {
        fetchStatus()
      }, statusRefreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoFetchStatus, statusRefreshInterval, fetchStatus])

  return {
    // State
    botStatus,
    isLoading,
    error,

    // Computed values
    isRunning: botStatus?.isRunning ?? false,
    uptime: botStatus?.uptime ?? 0,
    uptimeFormatted: botStatus?.uptimeFormatted ?? '0s',
    scanCount: botStatus?.scanCount ?? 0,
    health: botStatus?.health ?? 'HEALTHY',

    // Actions
    startBot,
    stopBot,
    restartBot,
    fetchStatus,
  }
}
