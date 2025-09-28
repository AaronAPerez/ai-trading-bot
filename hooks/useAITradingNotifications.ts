"use client"

import { useState, useCallback, useEffect } from 'react'
import { TradingNotification } from '@/components/notifications/AITradingNotifications'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

interface TradeData {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  pnl?: number
  confidence?: number
}

interface UseAITradingNotificationsProps {
  maxNotifications?: number
  autoHideDuration?: number
  userId?: string
  enablePolling?: boolean
  pollingInterval?: number
}

export default function useAITradingNotifications({
  maxNotifications = 5,
  autoHideDuration = 8000,
  userId = getCurrentUserId(),
  enablePolling = false, // Default to no polling
  pollingInterval = 60000 // 1 minute instead of 30 seconds
}: UseAITradingNotificationsProps = {}) {
  const [notifications, setNotifications] = useState<TradingNotification[]>([])
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date())

  // Fetch real trading notifications from Supabase - OPTIMIZED with throttling
  const fetchRealTradeNotifications = useCallback(async () => {
    // Only fetch if enablePolling is true and sufficient time has passed
    if (!enablePolling) {
      console.log('🚫 Trade notifications polling disabled')
      return
    }

    try {
      console.log('📊 Fetching trade notifications (throttled)')

      // Get recent trades from the last 5 minutes only
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const recentTrades = await supabaseService.getTradeHistory(userId, 10, fiveMinutesAgo)

      // Filter for trades that happened since last fetch
      const newTrades = recentTrades.filter(trade => {
        const tradeTime = new Date(trade.filled_at || trade.created_at)
        return tradeTime > lastFetchTime && trade.status === 'FILLED'
      })

      // Convert trades to notifications without calling addTradeNotification to avoid loops
      const newNotifications = newTrades.map(trade => ({
        id: `real-trade-${trade.id}`,
        type: trade.side as 'buy' | 'sell',
        symbol: trade.symbol,
        quantity: trade.quantity,
        price: trade.price,
        amount: trade.value,
        pnl: trade.pnl,
        timestamp: new Date(trade.filled_at || trade.created_at),
        confidence: trade.confidence || undefined
      }))

      if (newNotifications.length > 0) {
        console.log(`📈 Found ${newNotifications.length} new trade notifications`)
        setNotifications(prev => {
          const updated = [...newNotifications, ...prev].slice(0, maxNotifications)
          return updated
        })
      }

      setLastFetchTime(new Date())
    } catch (error) {
      console.error('Failed to fetch real trade notifications:', error)
    }
  }, [userId, lastFetchTime, maxNotifications, enablePolling])

  // Add new trading notification
  const addTradeNotification = useCallback((trade: TradeData) => {
    const notification: TradingNotification = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: trade.side,
      symbol: trade.symbol,
      quantity: trade.quantity,
      price: trade.price,
      amount: trade.quantity * trade.price,
      pnl: trade.pnl,
      timestamp: new Date(),
      confidence: trade.confidence
    }

    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications)
      return updated
    })

    // Log for debugging
    console.log('🤖 AI Trading Notification:', {
      type: trade.side.toUpperCase(),
      symbol: trade.symbol,
      quantity: trade.quantity,
      price: trade.price,
      amount: notification.amount,
      pnl: trade.pnl
    })

    // Play a subtle notification sound (optional - browser dependent)
    try {
      if (trade.symbol !== 'SYSTEM' && 'Audio' in window) {
        // Create a very short beep sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = trade.side === 'buy' ? 800 : 600 // Different tone for buy/sell
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
      }
    } catch (error) {
      // Silently fail if audio is not supported
    }
  }, [maxNotifications])

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Simulate AI trading activity for demo purposes
  const simulateAITrading = useCallback(() => {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META', 'NVDA']
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
    const isBuy = Math.random() > 0.5
    const quantity = Math.floor(Math.random() * 100) + 1
    const price = Math.random() * 300 + 50
    const confidence = 0.6 + Math.random() * 0.35 // 60-95%

    let pnl: number | undefined
    if (!isBuy) {
      // For sell orders, calculate some P&L
      const costBasis = price * (0.95 + Math.random() * 0.1) // ±5% from current price
      pnl = (price - costBasis) * quantity
    }

    addTradeNotification({
      symbol: randomSymbol,
      side: isBuy ? 'buy' : 'sell',
      quantity,
      price,
      pnl,
      confidence
    })
  }, [addTradeNotification])

  // Listen for real AI trading events and fetch real data
  useEffect(() => {
    let tradeCheckInterval: NodeJS.Timeout | undefined

    // Only fetch and poll if explicitly enabled
    if (enablePolling) {
      console.log(`🔄 AI Trading Notifications: Polling enabled every ${pollingInterval}ms`)
      // Fetch immediately when polling is enabled
      fetchRealTradeNotifications()
      tradeCheckInterval = setInterval(fetchRealTradeNotifications, pollingInterval)
    }

    // This would typically listen to WebSocket events or Redux state changes
    const handleTradeEvent = (event: CustomEvent<TradeData>) => {
      addTradeNotification(event.detail)
    }

    // Listen for custom trade events
    window.addEventListener('ai-trade-executed', handleTradeEvent as EventListener)

    return () => {
      if (tradeCheckInterval) {
        clearInterval(tradeCheckInterval)
      }
      window.removeEventListener('ai-trade-executed', handleTradeEvent as EventListener)
    }
  }, [enablePolling, pollingInterval, userId, fetchRealTradeNotifications])

  // Helper function to trigger notifications (for integration with trading bot)
  const notifyTrade = useCallback((trade: TradeData) => {
    // Dispatch custom event for other parts of the app to listen to
    const event = new CustomEvent('ai-trade-executed', {
      detail: trade
    })
    window.dispatchEvent(event)
  }, [])

  return {
    notifications,
    addTradeNotification,
    dismissNotification,
    clearAllNotifications,
    simulateAITrading,
    notifyTrade,
    autoHideDuration
  }
}