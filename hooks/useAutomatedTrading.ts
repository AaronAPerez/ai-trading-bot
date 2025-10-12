// ===============================================
// AUTOMATED TRADING HOOKS - React Query Integration
// hooks/useAutomatedTrading.ts
// ===============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import { useBotStore } from '@/store/slices/botSlice'
import type { BotConfiguration, Order, BotActivityLog } from '@/types/trading'

// ===============================================
// MAIN AUTOMATED TRADING HOOK
// ===============================================

/**
 * Comprehensive hook for managing automated trading bot
 */
export const useAutomatedTrading = () => {
  const queryClient = useQueryClient()
  const botStore = useBotStore()

  // ============ FETCH BOT STATUS ============

  const {
    data: botStatusData,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refreshStatus
  } = useQuery({
    queryKey: ['bot-status'],
    queryFn: async () => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bot status')
      }

      return response.json()
    },
    refetchInterval: 15000, // Refresh every 15 seconds (reduced from 5s to prevent rate limiting)
    refetchIntervalInBackground: true,
    staleTime: 3000
  })

  const botStatus = botStatusData?.data || {
    isRunning: false,
    sessionId: null,
    uptime: 0
  }

  // ============ FETCH ACTIVE ORDERS ============

  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refreshOrders
  } = useQuery({
    queryKey: ['bot-orders'],
    queryFn: async () => {
      const response = await fetch('/api/trading/orders?status=open')

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      return response.json()
    },
    refetchInterval: botStatus.isRunning ? 10000 : false, // Only refresh when bot is running (reduced from 3s to prevent rate limiting)
    enabled: botStatus.isRunning
  })

  const activeOrders = ordersData?.data?.orders || []

  // ============ FETCH BOT ACTIVITY ============

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    error: activityError,
    refetch: refreshActivity
  } = useQuery({
    queryKey: ['bot-activity'],
    queryFn: async () => {
      const response = await fetch('/api/bot/activity?limit=50')

      if (!response.ok) {
        throw new Error('Failed to fetch bot activity')
      }

      return response.json()
    },
    refetchInterval: botStatus.isRunning ? 5000 : 30000,
    staleTime: 3000
  })

  const activityLogs = activityData?.data?.activities || []

  // ============ START BOT MUTATION ============

  const startBotMutation = useMutation({
    mutationFn: async (config: BotConfiguration) => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          config
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start bot')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('✅ Bot started successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['bot-status'] })
      queryClient.invalidateQueries({ queryKey: ['bot-activity'] })
      queryClient.invalidateQueries({ queryKey: ['bot-orders'] })

      botStore.updateMetrics({
        isRunning: true,
        lastActivity: new Date()
      })
    },
    onError: (error) => {
      console.error('❌ Failed to start bot:', error)
      botStore.setError((error as Error).message)
    }
  })

  // ============ STOP BOT MUTATION ============

  const stopBotMutation = useMutation({
    mutationFn: async () => {
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
        throw new Error(errorData.error || 'Failed to stop bot')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('✅ Bot stopped successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['bot-status'] })
      queryClient.invalidateQueries({ queryKey: ['bot-activity'] })

      botStore.updateMetrics({
        isRunning: false,
        lastActivity: new Date()
      })
    },
    onError: (error) => {
      console.error('❌ Failed to stop bot:', error)
      botStore.setError((error as Error).message)
    }
  })

  // ============ MANUAL TRADE EXECUTION ============

  const executeManualTradeMutation = useMutation({
    mutationFn: async (params: {
      symbol: string
      side: 'buy' | 'sell'
      quantity: number
      type?: 'market' | 'limit'
      limitPrice?: number
    }) => {
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute trade')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      console.log(`✅ Manual trade executed: ${variables.side} ${variables.quantity} ${variables.symbol}`)
      queryClient.invalidateQueries({ queryKey: ['bot-orders'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      queryClient.invalidateQueries({ queryKey: ['bot-activity'] })
    }
  })

  // ============ CANCEL ORDER MUTATION ============

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/trading/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel order')
      }

      return response.json()
    },
    onSuccess: (data, orderId) => {
      console.log(`✅ Order cancelled: ${orderId}`)
      queryClient.invalidateQueries({ queryKey: ['bot-orders'] })
      queryClient.invalidateQueries({ queryKey: ['bot-activity'] })
    }
  })

  // ============ HELPER FUNCTIONS ============

  const startBot = useCallback(
    (config: BotConfiguration) => {
      return startBotMutation.mutateAsync(config)
    },
    [startBotMutation]
  )

  const stopBot = useCallback(() => {
    return stopBotMutation.mutateAsync()
  }, [stopBotMutation])

  const executeManualTrade = useCallback(
    (params: Parameters<typeof executeManualTradeMutation.mutateAsync>[0]) => {
      return executeManualTradeMutation.mutateAsync(params)
    },
    [executeManualTradeMutation]
  )

  const cancelOrder = useCallback(
    (orderId: string) => {
      return cancelOrderMutation.mutateAsync(orderId)
    },
    [cancelOrderMutation]
  )

  // ============ STATISTICS ============

  const statistics = {
    totalOrders: activeOrders.length,
    pendingOrders: activeOrders.filter((o: Order) =>
      o.status === 'new' || o.status === 'pending_new'
    ).length,
    filledOrders: activeOrders.filter((o: Order) =>
      o.status === 'filled' || o.status === 'partially_filled'
    ).length,
    recentActivities: activityLogs.slice(0, 10),
    uptime: botStatus.uptime,
    isRunning: botStatus.isRunning
  }

  return {
    // Status
    botStatus,
    isRunning: botStatus.isRunning,
    sessionId: botStatus.sessionId,
    uptime: botStatus.uptime,

    // Orders
    activeOrders,
    statistics,

    // Activity
    activityLogs,

    // Loading states
    isLoadingStatus,
    isLoadingOrders,
    isLoadingActivity,
    isStarting: startBotMutation.isPending,
    isStopping: stopBotMutation.isPending,
    isExecuting: executeManualTradeMutation.isPending,

    // Errors
    statusError,
    ordersError,
    activityError,
    startError: startBotMutation.error,
    stopError: stopBotMutation.error,
    executeError: executeManualTradeMutation.error,

    // Actions
    startBot,
    stopBot,
    executeManualTrade,
    cancelOrder,
    refreshStatus,
    refreshOrders,
    refreshActivity
  }
}

// ===============================================
// ORDER MONITORING HOOK
// ===============================================

/**
 * Hook for monitoring order status in real-time
 */
export const useOrderMonitoring = (orderId?: string) => {
  const [orderHistory, setOrderHistory] = useState<Order[]>([])

  const {
    data: orderData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null

      const response = await fetch(`/api/trading/orders/${orderId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch order')
      }

      return response.json()
    },
    enabled: !!orderId,
    refetchInterval: 10000, // Check every 10 seconds (reduced from 2s to prevent rate limiting)
    staleTime: 1000
  })

  const order = orderData?.data?.order

  // Track order status changes
  useEffect(() => {
    if (order) {
      setOrderHistory(prev => {
        const exists = prev.find(o => o.id === order.id && o.status === order.status)
        if (exists) return prev
        return [...prev, order]
      })
    }
  }, [order])

  const isFilled = order?.status === 'filled'
  const isPending = order?.status === 'new' || order?.status === 'pending_new'
  const isCancelled = order?.status === 'canceled'
  const isRejected = order?.status === 'rejected'

  return {
    order,
    orderHistory,
    isFilled,
    isPending,
    isCancelled,
    isRejected,
    isLoading,
    error
  }
}

// ===============================================
// TRADE PERFORMANCE TRACKING
// ===============================================

/**
 * Hook for tracking automated trading performance
 */
export const useTradePerformance = (timeRange: '24h' | '7d' | '30d' = '24h') => {
  const {
    data: performanceData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['trade-performance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/bot/performance?timeRange=${timeRange}`)

      if (!response.ok) {
        throw new Error('Failed to fetch performance data')
      }

      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000
  })

  const performance = performanceData?.data || {
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalPnL: 0,
    winRate: 0,
    averageTradeValue: 0
  }

  const winRate = performance.totalTrades > 0
    ? (performance.successfulTrades / performance.totalTrades) * 100
    : 0

  return {
    performance,
    winRate,
    isLoading,
    error
  }
}

// ===============================================
// BOT CONFIGURATION HOOK
// ===============================================

/**
 * Hook for managing bot configuration
 */
export const useBotConfiguration = () => {
  const [localConfig, setLocalConfig] = useState<BotConfiguration | null>(null)

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<BotConfiguration>) => {
      const response = await fetch('/api/bot/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update configuration')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('✅ Configuration updated:', data)
      setLocalConfig(data.data?.config)
    }
  })

  const updateConfig = useCallback(
    (config: Partial<BotConfiguration>) => {
      return updateConfigMutation.mutateAsync(config)
    },
    [updateConfigMutation]
  )

  return {
    config: localConfig,
    updateConfig,
    isUpdating: updateConfigMutation.isPending,
    updateError: updateConfigMutation.error
  }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

export const tradingUtils = {
  /**
   * Format uptime in human-readable format
   */
  formatUptime: (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  },

  /**
   * Calculate order value
   */
  calculateOrderValue: (order: Order): number => {
    const price = order.filled_avg_price || order.limit_price || 0
    return price * order.qty
  },

  /**
   * Get order status color
   */
  getOrderStatusColor: (status: string): string => {
    const colors: Record<string, string> = {
      filled: 'green',
      partially_filled: 'yellow',
      new: 'blue',
      pending_new: 'blue',
      canceled: 'gray',
      rejected: 'red',
      expired: 'gray'
    }
    return colors[status] || 'gray'
  },

  /**
   * Format activity message
   */
  formatActivityMessage: (activity: BotActivityLog): string => {
    return `[${activity.type.toUpperCase()}] ${activity.message}`
  }
}
