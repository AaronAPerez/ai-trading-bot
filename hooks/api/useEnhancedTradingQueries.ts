// ===============================================
// ENHANCED REACT QUERY HOOKS - Optimistic Updates & Caching
// hooks/api/useEnhancedTradingQueries.ts
// ===============================================

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUnifiedTradingStore } from '@/store/unifiedTradingStore'
import type { Position, PortfolioPerformance } from '@/store/slices/portfolioSlice'
import type { AIRecommendation } from '@/store/slices/aiSlice'

/**
 * Query keys for better cache management
 */
export const queryKeys = {
  account: ['alpaca', 'account'] as const,
  positions: ['alpaca', 'positions'] as const,
  orders: ['alpaca', 'orders'] as const,
  order: (id: string) => ['alpaca', 'order', id] as const,
  marketData: (symbol: string) => ['alpaca', 'marketData', symbol] as const,
  quote: (symbol: string) => ['alpaca', 'quote', symbol] as const,
  bars: (symbol: string, timeframe: string) => ['alpaca', 'bars', symbol, timeframe] as const,
  recommendations: ['ai', 'recommendations'] as const,
  recommendation: (id: string) => ['ai', 'recommendation', id] as const,
  botMetrics: ['bot', 'metrics'] as const,
  botActivity: ['bot', 'activity'] as const
}

/**
 * Hook for fetching account data with Zustand sync
 */
export function useAccountQuery(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) throw new Error('Failed to fetch account')
      const result = await response.json()
      return result.data
    },
    refetchInterval: options?.refetchInterval || 30000, // 30 seconds
    staleTime: 10000, // 10 seconds
    onSuccess: (data) => {
      // Sync with Zustand store - access store directly to avoid hook dependency
      if (data) {
        const performance: PortfolioPerformance = {
          totalValue: parseFloat(data.portfolio_value),
          totalReturn: parseFloat(data.equity) - parseFloat(data.last_equity),
          totalReturnPercent: ((parseFloat(data.equity) - parseFloat(data.last_equity)) / parseFloat(data.last_equity)) * 100,
          dayChange: parseFloat(data.daychange || '0'),
          dayChangePercent: parseFloat(data.daychange_percent || '0'),
          cash: parseFloat(data.cash),
          buyingPower: parseFloat(data.buying_power),
          equity: parseFloat(data.equity),
          lastEquity: parseFloat(data.last_equity),
          longMarketValue: parseFloat(data.long_market_value),
          shortMarketValue: parseFloat(data.short_market_value || '0')
        }
        useUnifiedTradingStore.getState().setPerformance(performance)
      }
    }
  })
}

/**
 * Hook for fetching positions with Zustand sync
 */
export function usePositionsQuery(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.positions,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/positions')
      if (!response.ok) throw new Error('Failed to fetch positions')
      const data = await response.json()
      return data
    },
    refetchInterval: options?.refetchInterval || 10000, // 10 seconds
    staleTime: 5000, // 5 seconds
    onSuccess: (data) => {
      // Sync with Zustand store - access store directly to avoid hook dependency
      if (data && Array.isArray(data)) {
        const positions: Position[] = data.map((pos: any) => ({
          symbol: pos.symbol,
          quantity: parseFloat(pos.qty),
          avgBuyPrice: parseFloat(pos.avg_entry_price),
          currentPrice: parseFloat(pos.current_price),
          marketValue: parseFloat(pos.market_value),
          unrealizedPnL: parseFloat(pos.unrealized_pl),
          unrealizedPnLPercent: parseFloat(pos.unrealized_plpc) * 100,
          side: parseFloat(pos.qty) > 0 ? 'long' : 'short',
          costBasis: parseFloat(pos.cost_basis),
          lastUpdated: new Date()
        }))
        useUnifiedTradingStore.getState().setPositions(positions)
      }
    }
  })
}

/**
 * Hook for fetching real-time market quote
 */
export function useMarketQuoteQuery(symbol: string) {
  return useQuery({
    queryKey: queryKeys.quote(symbol),
    queryFn: async () => {
      const response = await fetch(`/api/alpaca/quote?symbol=${symbol}`)
      if (!response.ok) throw new Error('Failed to fetch quote')
      const data = await response.json()
      return data.quote
    },
    enabled: !!symbol,
    refetchInterval: 1000, // 1 second for real-time updates
    staleTime: 500
  })
}

/**
 * Hook for fetching AI recommendations with Zustand sync
 */
export function useAIRecommendationsQuery() {
  return useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: async () => {
      const response = await fetch('/api/ai/recommendations')
      if (!response.ok) throw new Error('Failed to fetch recommendations')
      const data = await response.json()
      return data.recommendations || []
    },
    refetchInterval: 15000, // 15 seconds
    staleTime: 10000,
    onSuccess: (data) => {
      // Sync with Zustand store - access store directly to avoid hook dependency
      if (data) {
        useUnifiedTradingStore.getState().setRecommendations(data)
      }
    }
  })
}

/**
 * Mutation hook for placing orders with optimistic updates
 */
export function usePlaceOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: {
      symbol: string
      quantity: number
      side: 'buy' | 'sell'
      type: 'market' | 'limit'
      limitPrice?: number
    }) => {
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      })
      if (!response.ok) throw new Error('Failed to place order')
      return response.json()
    },
    onMutate: async (newOrder) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.orders })
      await queryClient.cancelQueries({ queryKey: queryKeys.positions })

      // Snapshot previous values
      const previousOrders = queryClient.getQueryData(queryKeys.orders)
      const previousPositions = queryClient.getQueryData(queryKeys.positions)

      // Optimistically update orders
      queryClient.setQueryData(queryKeys.orders, (old: any) => {
        const optimisticOrder = {
          id: `temp-${Date.now()}`,
          symbol: newOrder.symbol,
          qty: newOrder.quantity,
          side: newOrder.side,
          type: newOrder.type,
          status: 'pending_new',
          submitted_at: new Date().toISOString(),
          filled_avg_price: null
        }
        return old ? [optimisticOrder, ...old] : [optimisticOrder]
      })

      // Return context for rollback
      return { previousOrders, previousPositions }
    },
    onError: (err, newOrder, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(queryKeys.orders, context.previousOrders)
      }
      if (context?.previousPositions) {
        queryClient.setQueryData(queryKeys.positions, context.previousPositions)
      }
    },
    onSuccess: () => {
      // Invalidate and refetch after successful mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.orders })
      queryClient.invalidateQueries({ queryKey: queryKeys.positions })
      queryClient.invalidateQueries({ queryKey: queryKeys.account })
    }
  })
}

/**
 * Mutation hook for canceling orders with optimistic updates
 */
export function useCancelOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/alpaca/orders/${orderId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to cancel order')
      return response.json()
    },
    onMutate: async (orderId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.orders })

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData(queryKeys.orders)

      // Optimistically update
      queryClient.setQueryData(queryKeys.orders, (old: any[]) => {
        if (!old) return []
        return old.map(order =>
          order.id === orderId
            ? { ...order, status: 'pending_cancel' }
            : order
        )
      })

      return { previousOrders }
    },
    onError: (err, orderId, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(queryKeys.orders, context.previousOrders)
      }
    },
    onSuccess: () => {
      // Invalidate after successful mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.orders })
    }
  })
}

/**
 * Mutation hook for executing AI recommendations
 */
export function useExecuteRecommendationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recommendation: AIRecommendation) => {
      useUnifiedTradingStore.getState().markAsExecuting(recommendation.id)

      const response = await fetch('/api/ai/execute-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recommendation)
      })

      if (!response.ok) throw new Error('Failed to execute recommendation')
      return response.json()
    },
    onSuccess: (data, recommendation) => {
      useUnifiedTradingStore.getState().markAsExecuted(recommendation.id)

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders })
      queryClient.invalidateQueries({ queryKey: queryKeys.positions })
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations })
    },
    onError: (err, recommendation) => {
      useUnifiedTradingStore.getState().markAsExecuted(recommendation.id)
    }
  })
}

/**
 * Hook for managing multiple queries with loading states
 */
export function useTradingDashboardData() {
  const account = useAccountQuery({ refetchInterval: 30000 })
  const positions = usePositionsQuery({ refetchInterval: 10000 })
  const recommendations = useAIRecommendationsQuery()

  return {
    account: account.data,
    positions: positions.data,
    recommendations: recommendations.data,
    isLoading: account.isLoading || positions.isLoading || recommendations.isLoading,
    isError: account.isError || positions.isError || recommendations.isError,
    errors: {
      account: account.error,
      positions: positions.error,
      recommendations: recommendations.error
    },
    refetch: () => {
      account.refetch()
      positions.refetch()
      recommendations.refetch()
    }
  }
}