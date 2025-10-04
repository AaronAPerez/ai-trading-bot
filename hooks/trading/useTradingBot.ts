import { useState, useCallback, useEffect } from 'react'
import { useBotStore } from '@/store/slices/botSlice'
import { useWebSocketContext } from '@/hooks/useWebSocketContext'
import type { BotConfiguration } from '@/types/trading'

// Global singleton to track if status has been checked
let globalStatusChecked = false

export const useTradingBot = () => {
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const botStore = useBotStore()
  const { sendInternalMessage } = useWebSocketContext()

  /**
   * Check bot status on mount to sync with server state
   */
  const checkBotStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/bot-control', {
        method: 'GET'
      })

      if (response.ok) {
        const result = await response.json()

        if (result.success && result.data) {
          // Update local store with server state
          botStore.updateMetrics({
            isRunning: result.data.isRunning,
            uptime: result.data.uptime || 0,
            lastActivity: result.data.isRunning ? new Date() : undefined
          })

          if (result.data.isRunning) {
            console.log('🔄 Synced with running bot session:', result.data.sessionId)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to check bot status:', error)
    }
  }, [])

  // Check status on mount only (run once globally)
  useEffect(() => {
    if (!globalStatusChecked) {
      globalStatusChecked = true
      checkBotStatus()
      console.log('🔍 Bot status check initialized (once per session)')
    }
  }, [])

  /**
   * Start the AI trading bot
   */
  const startBot = useCallback(async (config: BotConfiguration) => {
    console.log('🎯 startBot function called, isStarting:', isStarting)

    if (isStarting) {
      console.warn('⚠️ Bot is already starting, ignoring duplicate request')
      return
    }

    console.log('✅ Proceeding with bot start')
    setIsStarting(true)
    setError(null)

    try {
      console.log('🚀 Starting AI Trading Bot...', config)

      // 1. Call the API to start the bot with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'start',
          config: {
            mode: config.mode || 'CONSERVATIVE',
            strategies: config.strategies || [
              { id: 'ml_enhanced', name: 'ML Enhanced', enabled: true, weight: 0.4 },
              { id: 'technical', name: 'Technical Analysis', enabled: true, weight: 0.3 },
              { id: 'sentiment', name: 'Sentiment Analysis', enabled: true, weight: 0.3 }
            ],
            riskManagement: {
              maxPositionSize: 0.05, // 5% max position size
              maxDailyLoss: 0.02,   // 2% max daily loss
              maxDrawdown: 0.10,    // 10% max drawdown
              minConfidence: 0.75,  // 75% minimum confidence
              stopLossPercent: 0.05,
              takeProfitPercent: 0.10
            },
            executionSettings: {
              autoExecute: config.executionSettings?.autoExecute || false,
              minConfidenceForOrder: 0.80,
              maxOrdersPerDay: 20,
              orderSizePercent: 0.02, // 2% of portfolio per trade
              slippageTolerance: 0.01
            },
            watchlist: [
              'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'NFLX'
            ]
          }
        })
      })

      clearTimeout(timeoutId)
      console.log('📡 Response received, status:', response.status)

      const result = await response.json()
      console.log('📦 Response parsed:', result)

      if (!response.ok) {
        // Handle specific case where bot is already running
        if (response.status === 400 && result.error === 'Bot is already running') {
          console.log('🔄 Bot already running on server, syncing local state...', result.data)

          // Update local state with server data if available
          if (result.data) {
            botStore.updateMetrics({
              isRunning: true,
              uptime: result.data.uptime || 0,
              lastActivity: new Date()
            })

            if (result.data.config) {
              console.log('📊 Synced bot config:', result.data.config)
            }
          }

          await checkBotStatus()
          return result
        }
        throw new Error(result.error || `HTTP ${response.status}: Failed to start bot`)
      }

      console.log('✅ Bot started successfully:', result)

      // 2. Update local store
      botStore.updateConfig(config)
      botStore.updateMetrics({
        isRunning: true,
        uptime: 0,
        lastActivity: new Date()
      })

      // 3. Add activity log
      botStore.addActivity({
        type: 'system',
        message: `AI Trading Bot started in ${config.mode} mode`,
        details: `Strategies: ${config.strategies?.length || 3} enabled, Auto-execution: ${config.executionSettings?.autoExecute ? 'ON' : 'OFF'}`
      })

      // 4. Send WebSocket notification (only if connected)
      try {
        if (sendInternalMessage) {
          sendInternalMessage({
            type: 'bot_command',
            data: {
              command: 'start_bot',
              success: true,
              config
            }
          })
        }
      } catch (wsError) {
        console.warn('⚠️ WebSocket not connected, skipping notification:', wsError)
      }

      // 5. Show success notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Trading Bot Started', {
          body: `Bot is now running in ${config.mode} mode`
        })
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      // Handle timeout separately
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⏱️ Request timeout - verifying bot status on server...')

        // Bot might have started on server despite timeout, so check actual state
        try {
          await checkBotStatus()
          console.log('✅ Bot status synced after timeout')
          return // Exit without setting error if status check succeeds
        } catch (statusError) {
          console.error('❌ Status check failed after timeout:', statusError)
          setError('Request timeout - please refresh to see current bot status')
        }
      } else {
        console.error('❌ Failed to start bot:', errorMessage)
        console.error('❌ Full error object:', error)
        setError(errorMessage)
      }

      // Add error activity
      botStore.addActivity({
        type: 'error',
        message: 'Failed to start AI Trading Bot',
        details: errorMessage
      })

      // Don't throw - let the button reset
      // throw error

    } finally {
      console.log('🔧 Finally block: resetting isStarting to false')
      setIsStarting(false)
    }
  }, [isStarting, botStore, sendInternalMessage, checkBotStatus])

  /**
   * Stop the AI trading bot
   */
  const stopBot = useCallback(async () => {
    if (isStopping) return // Allow stop even if not currently marked as running

    setIsStopping(true)
    setError(null)

    try {
      console.log('🛑 Stopping AI Trading Bot...')

      // 1. Call the API to stop the bot
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stop'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to stop bot')
      }

      console.log('✅ Bot stopped successfully:', result)

      // 2. Update local store
      botStore.updateMetrics({
        isRunning: false,
        lastActivity: new Date()
      })

      // 3. Add activity log
      botStore.addActivity({
        type: 'system',
        message: 'AI Trading Bot stopped',
        details: `Total uptime: ${Math.floor(botStore.metrics.uptime / 60)}m, Trades executed: ${botStore.metrics.tradesExecuted}`
      })

      // 4. Send WebSocket notification (only if connected)
      try {
        if (sendInternalMessage) {
          sendInternalMessage({
            type: 'bot_command',
            data: {
              command: 'stop_bot',
              success: true
            }
          })
        }
      } catch (wsError) {
        console.warn('⚠️ WebSocket not connected, skipping notification:', wsError)
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('❌ Failed to stop bot API call:', errorMessage)

      // Even if API fails, still update local state to stop the bot
      console.log('🔧 Forcing local bot state to stopped due to API error')

      botStore.updateMetrics({
        isRunning: false,
        lastActivity: new Date()
      })

      botStore.addActivity({
        type: 'error',
        message: 'Bot stopped with errors',
        details: `API Error: ${errorMessage}, but local state updated`
      })

      // Don't throw error so the dashboard can update its state
      console.log('✅ Bot state forcefully stopped locally')

    } finally {
      setIsStopping(false)
    }
  }, [isStopping, botStore, sendInternalMessage])

  /**
   * Get bot status
   */
  const getBotStatus = useCallback(() => {
    return {
      isRunning: botStore.metrics.isRunning,
      canStart: !botStore.metrics.isRunning && !isStarting,
      canStop: botStore.metrics.isRunning && !isStopping,
      uptime: botStore.metrics.uptime,
      tradesExecuted: botStore.metrics.tradesExecuted,
      successRate: botStore.metrics.successRate,
      lastActivity: botStore.metrics.lastActivity
    }
  }, [botStore.metrics, isStarting, isStopping])

  return {
    // Status
    isStarting,
    isStopping,
    error,
    status: getBotStatus(),
    config: botStore.config,
    metrics: botStore.metrics,
    activityLogs: botStore.activityLogs,

    // Actions
    startBot,
    stopBot,
    checkBotStatus,
    clearError: () => setError(null),

    // Development utilities
    resetStatusCheck: () => { globalStatusChecked = false },

    // Engine placeholder (for compatibility)
    engine: null
  }
}
