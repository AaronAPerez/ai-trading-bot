import { useState, useCallback } from 'react'
import { useBotStore } from '@/store/slices/botSlice'
import { useWebSocketContext } from '@/hooks/useWebSocketContext'
import type { BotConfiguration } from '@/types/trading'

export const useTradingBot = () => {
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const botStore = useBotStore()
  const { sendInternalMessage } = useWebSocketContext()

  /**
   * Start the AI trading bot
   */
  const startBot = useCallback(async (config: BotConfiguration) => {
    if (isStarting || botStore.metrics.isRunning) return

    setIsStarting(true)
    setError(null)

    try {
      console.log('🚀 Starting AI Trading Bot...', config)

      // 1. Call the API to start the bot
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

      const result = await response.json()

      if (!response.ok) {
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
      console.error('❌ Failed to start bot:', errorMessage)

      setError(errorMessage)

      // Add error activity
      botStore.addActivity({
        type: 'error',
        message: 'Failed to start AI Trading Bot',
        details: errorMessage
      })

      throw error

    } finally {
      setIsStarting(false)
    }
  }, [isStarting, botStore, sendInternalMessage])

  /**
   * Stop the AI trading bot
   */
  const stopBot = useCallback(async () => {
    if (isStopping || !botStore.metrics.isRunning) return

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
      console.error('❌ Failed to stop bot:', errorMessage)

      setError(errorMessage)

      // Add error activity
      botStore.addActivity({
        type: 'error',
        message: 'Failed to stop AI Trading Bot',
        details: errorMessage
      })

      throw error

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
    clearError: () => setError(null)
  }
}
