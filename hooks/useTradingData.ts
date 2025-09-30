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
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
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
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
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
 * Place a new order
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
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.positions })
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.account })
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.orders })
    },
  })
}

/**
 * Cancel an existing order
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
    onSuccess: () => {
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

  return {
    account: account.data,
    positions: positions.data,
    recommendations: recommendations.data,
    orders: orders.data,
    isLoading: account.isLoading || positions.isLoading || recommendations.isLoading,
    isError: account.isError || positions.isError || recommendations.isError,
    errors: {
      account: account.error,
      positions: positions.error,
      recommendations: recommendations.error,
    },
    refetch: () => {
      account.refetch()
      positions.refetch()
      recommendations.refetch()
      orders.refetch()
    },
  }
}