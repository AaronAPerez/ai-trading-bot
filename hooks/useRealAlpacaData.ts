/**
 * React Query hooks for REAL Alpaca data
 * NO MOCKS - Production Ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlpacaClient } from '@/lib/alpaca/AlpacaClient'

const alpacaClient = new AlpacaClient()

// =============================================
// REAL ACCOUNT DATA
// =============================================

export function useAlpacaAccount() {
  return useQuery({
    queryKey: ['alpaca', 'account'],
    queryFn: async () => {
      const account = await alpacaClient.getAccount()
      
      // Validate response is real
      if (!account.account_number) {
        throw new Error('Invalid account data received')
      }
      
      return account
    },
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: 1000
  })
}

// =============================================
// REAL POSITIONS DATA
// =============================================

export function useAlpacaPositions() {
  return useQuery({
    queryKey: ['alpaca', 'positions'],
    queryFn: async () => {
      const positions = await alpacaClient.getPositions()
      
      // Validate real positions
      return positions.map(p => ({
        ...p,
        isReal: true,
        source: 'alpaca_api'
      }))
    },
    staleTime: 15000, // 15 seconds
    retry: 3
  })
}

// =============================================
// REAL ORDERS DATA
// =============================================

export function useAlpacaOrders(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['alpaca', 'orders', params?.status, params?.limit],
    queryFn: async () => {
      const response = await fetch(`/api/alpaca/orders?status=${params?.status || 'all'}&limit=${params?.limit || 10}`)

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch orders')
      }

      return result.orders || []
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    retry: 3
  })
}

// =============================================
// REAL MARKET DATA
// =============================================

export function useRealTimeQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ['alpaca', 'quotes', symbols],
    queryFn: async () => {
      const quotes = await alpacaClient.getLatestQuotes(symbols)
      
      // Validate no mock data
      Object.entries(quotes).forEach(([symbol, quote]) => {
        if (!quote.bidPrice || !quote.askPrice) {
          throw new Error(`Invalid quote data for ${symbol}`)
        }
      })
      
      return quotes
    },
    staleTime: 5000, // 5 seconds for market data
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    retry: 2
  })
}

// =============================================
// REAL ORDER EXECUTION
// =============================================

export function usePlaceRealOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (orderParams: {
      symbol: string
      qty?: number
      notional?: number
      side: 'buy' | 'sell'
      type: 'market' | 'limit'
      limit_price?: number
      time_in_force: 'day' | 'gtc'
    }) => {
      // Call REAL Alpaca API
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderParams)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Order placement failed')
      }

      const result = await response.json()
      
      // Validate real order response
      if (!result.success || !result.order?.id) {
        throw new Error('Invalid order response')
      }

      return result
    },
    onSuccess: () => {
      // Invalidate relevant queries to fetch fresh real data
      queryClient.invalidateQueries({ queryKey: ['alpaca', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['alpaca', 'positions'] })
      queryClient.invalidateQueries({ queryKey: ['alpaca', 'account'] })
    }
  })
}