// ===============================================
// COMPLETE TRADING DATA HOOKS
// hooks/useTradingData.ts
// ===============================================

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUnifiedTradingStore } from '@/store/unifiedTradingStore'

// ===============================================
// QUERY KEYS
// ===============================================

export const tradingQueryKeys = {
  account: ['account'] as const,
  positions: ['positions'] as const,
  orders: ['orders'] as const,
  recommendations: (userId: string) => ['recommendations', userId] as const,
  riskReport: (userId: string) => ['risk-report', userId] as const,
  marketQuote: (symbol: string) => ['market-quote', symbol] as const,
  marketBars: (symbol: string, timeframe: string) => ['market-bars', symbol, timeframe] as const,
}

// ===============================================
// ACCOUNT HOOKS
// ===============================================

/**
 * Fetch account data from Alpaca
 */
export function useAccount() {
  return useQuery({
    queryKey: tradingQueryKeys.account,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) {
        throw new Error('Failed to fetch account data')
      }
      const result = await response.json()
      return result.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  })
}

/**
 * Fetch positions from Alpaca
 */
export function usePositions() {
  return useQuery({
    queryKey: tradingQueryKeys.positions,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/positions')
      if (!response.ok) {
        throw new Error('Failed to fetch positions')
      }
      return await response.json()
    },
    refetchInterval: 20000, // Refetch every 20 seconds (reduced from 10s to prevent rate limiting)
    staleTime: 10000,
  })
}

/**
 * Fetch orders from Alpaca
 */
export function useOrders() {
  return useQuery({
    queryKey: tradingQueryKeys.orders,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/orders')
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      return await response.json()
    },
    refetchInterval: 15000, // Refetch every 15 seconds (reduced from 5s to prevent rate limiting)
    staleTime: 10000,
  })
}

// ===============================================
// AI RECOMMENDATION HOOKS
// ===============================================

/**
 * Fetch AI recommendations from database
 */
export function useRecommendations(userId: string) {
  return useQuery({
    queryKey: tradingQueryKeys.recommendations(userId),
    queryFn: async () => {
      const response = await fetch(`/api/ai/recommendations?userId=${userId}&status=PENDING`)
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }
      const data = await response.json()
      return data.recommendations || []
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })
}

/**
 * Generate new AI recommendations
 */
export function useGenerateRecommendations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      symbols,
      strategy
    }: {
      userId: string
      symbols: string[]
      strategy: 'MOMENTUM' | 'MEAN_REVERSION' | 'BREAKOUT' | 'TECHNICAL'
    }) => {
      const response = await fetch('/api/ai/generate-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, symbols, strategy }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate recommendations')
      }

      return await response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch recommendations
      queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.recommendations(variables.userId)
      })
    },
  })
}

// ===============================================
// ORDER EXECUTION HOOKS
// ===============================================

/**
 * Place a new order with optimistic updates and rollback
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderParams: {
      symbol: string
      qty: number
      side: 'buy' | 'sell'
      type: 'market' | 'limit'
      time_in_force: 'day' | 'gtc' | 'ioc' | 'fok'
      limit_price?: number
    }) => {
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderParams),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to place order')
      }

      return await response.json()
    },
    // Optimistic update: immediately update UI before server responds
    onMutate: async (newOrder) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: tradingQueryKeys.orders })

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(tradingQueryKeys.orders)

      // Optimistically update to the new value
      queryClient.setQueryData(tradingQueryKeys.orders, (old: any) => {
        if (!old) return old
        const optimisticOrder = {
          id: `optimistic_${Date.now()}`,
          symbol: newOrder.symbol,
          qty: newOrder.qty,
          side: newOrder.side,
          type: newOrder.type,
          status: 'PENDING_NEW',
          created_at: new Date().toISOString(),
          ...newOrder,
        }
        return [optimisticOrder, ...old]
      })

      // Return context with snapshot for rollback
      return { previousOrders }
    },
    onError: (err, newOrder, context) => {
      // Rollback to previous state on error
      if (context?.previousOrders) {
        queryClient.setQueryData(tradingQueryKeys.orders, context.previousOrders)
      }
      console.error('Order placement failed, rolled back:', err)
    },
    onSuccess: () => {
      // Invalidate and refetch to get server state
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.positions })
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.account })
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.orders })
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.orders })
    },
  })
}

/**
 * Cancel an existing order with optimistic updates and rollback
 */
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/alpaca/orders/${orderId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel order')
      }

      return await response.json()
    },
    // Optimistic update: immediately mark order as cancelled
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: tradingQueryKeys.orders })

      const previousOrders = queryClient.getQueryData(tradingQueryKeys.orders)

      // Optimistically update order status
      queryClient.setQueryData(tradingQueryKeys.orders, (old: any) => {
        if (!old) return old
        return old.map((order: any) =>
          order.id === orderId
            ? { ...order, status: 'PENDING_CANCEL' }
            : order
        )
      })

      return { previousOrders }
    },
    onError: (err, orderId, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(tradingQueryKeys.orders, context.previousOrders)
      }
      console.error('Order cancellation failed, rolled back:', err)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.orders })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.orders })
    },
  })
}

// ===============================================
// RISK MANAGEMENT HOOKS
// ===============================================

/**
 * Assess risk for a potential trade
 */
export function useRiskAssessment() {
  return useMutation({
    mutationFn: async (params: {
      userId: string
      symbol: string
      action: 'BUY' | 'SELL'
      quantity: number
      entryPrice: number
      stopLoss: number
      targetPrice: number
      accountBalance: number
    }) => {
      const response = await fetch('/api/risk/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to assess risk')
      }

      return await response.json()
    },
  })
}

/**
 * Get comprehensive risk report
 */
export function useRiskReport(userId: string) {
  return useQuery({
    queryKey: tradingQueryKeys.riskReport(userId),
    queryFn: async () => {
      const response = await fetch(`/api/risk/report?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch risk report')
      }
      return await response.json()
    },
    enabled: !!userId,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000,
  })
}

// ===============================================
// MARKET DATA HOOKS
// ===============================================

/**
 * Get real-time market quote
 */
export function useMarketQuote(symbol: string) {
  return useQuery({
    queryKey: tradingQueryKeys.marketQuote(symbol),
    queryFn: async () => {
      const response = await fetch(`/api/alpaca/quote?symbol=${symbol}`)
      if (!response.ok) {
        throw new Error('Failed to fetch quote')
      }
      const data = await response.json()
      return data.quote
    },
    enabled: !!symbol,
    refetchInterval: 1000, // Refetch every second for real-time data
    staleTime: 500,
  })
}

/**
 * Get historical market bars
 */
export function useMarketBars(
  symbol: string,
  timeframe: string = '1Day',
  limit: number = 100
) {
  return useQuery({
    queryKey: tradingQueryKeys.marketBars(symbol, timeframe),
    queryFn: async () => {
      const response = await fetch(
        `/api/alpaca/bars?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch bars')
      }
      return await response.json()
    },
    enabled: !!symbol,
    staleTime: 60000, // 1 minute
  })
}

// ===============================================
// BOT METRICS HOOKS
// ===============================================

/**
 * Fetch bot metrics from database
 */
export function useBotMetrics(userId: string) {
  return useQuery({
    queryKey: ['bot-metrics', userId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/bot/metrics?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch bot metrics')
      }
      return await response.json()
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  })
}

/**
 * Fetch portfolio history/snapshots
 */
export function usePortfolioHistory(userId: string, days: number = 30) {
  return useQuery({
    queryKey: ['portfolio-history', userId, days] as const,
    queryFn: async () => {
      const response = await fetch(
        `/api/portfolio/history?userId=${userId}&days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio history')
      }
      return await response.json()
    },
    enabled: !!userId,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000,
  })
}

/**
 * Create portfolio snapshot
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      userId: string
      snapshotDate: string
      accountData: any
      positions: any[]
    }) => {
      const response = await fetch('/api/portfolio/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to create snapshot')
      }

      return await response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate portfolio history
      queryClient.invalidateQueries({
        queryKey: ['portfolio-history', variables.userId]
      })
    },
  })
}

// ===============================================
// COMBINED DASHBOARD HOOK
// ===============================================

/**
 * Get all data needed for the trading dashboard
 */
export function useTradingDashboard(userId: string) {
  const account = useAccount()
  const positions = usePositions()
  const recommendations = useRecommendations(userId)
  const orders = useOrders()
  const botMetrics = useBotMetrics(userId)
  const portfolioHistory = usePortfolioHistory(userId, 7) // Last 7 days

  return {
    account: account.data,
    positions: positions.data,
    recommendations: recommendations.data,
    orders: orders.data,
    botMetrics: botMetrics.data,
    portfolioHistory: portfolioHistory.data,
    isLoading:
      account.isLoading ||
      positions.isLoading ||
      recommendations.isLoading ||
      botMetrics.isLoading,
    isError:
      account.isError ||
      positions.isError ||
      recommendations.isError ||
      botMetrics.isError,
    errors: {
      account: account.error,
      positions: positions.error,
      recommendations: recommendations.error,
      botMetrics: botMetrics.error,
    },
    refetch: () => {
      account.refetch()
      positions.refetch()
      recommendations.refetch()
      orders.refetch()
      botMetrics.refetch()
      portfolioHistory.refetch()
    },
  }
}