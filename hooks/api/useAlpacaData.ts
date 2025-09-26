'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


export const alpacaQueryKeys = {
  account: ['alpaca', 'account'] as const,
  positions: ['alpaca', 'positions'] as const,
  orders: ['alpaca', 'orders'] as const,
  trades: ['alpaca', 'trades'] as const,
  marketData: (symbol: string) => ['alpaca', 'marketData', symbol] as const,
}

export function useAlpacaAccount() {
  return useQuery({
    queryKey: alpacaQueryKeys.account,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) throw new Error('Failed to fetch account')
      const data = await response.json()
      return data || {}
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Data is fresh for 5 seconds
  })
}

export function useAlpacaPositions() {
  return useQuery({
    queryKey: alpacaQueryKeys.positions,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/positions')
      if (!response.ok) throw new Error('Failed to fetch positions')
      const data = await response.json()
      return data || []
    },
    refetchInterval: 15000,
  })
}

export function useAlpacaOrders() {
  return useQuery({
    queryKey: alpacaQueryKeys.orders,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      return data.orders
    },
    refetchInterval: 5000,
  })
}

export function useAlpacaTrades() {
  return useQuery({
    queryKey: alpacaQueryKeys.trades,
    queryFn: async () => {
      const response = await fetch('/api/alpaca/trades')
      if (!response.ok) throw new Error('Failed to fetch trades')
      const data = await response.json()
      return data.trades
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Data is fresh for 5 seconds
  })
}

export function useMarketData(symbol: string) {
  return useQuery({
    queryKey: alpacaQueryKeys.marketData(symbol),
    queryFn: async () => {
      const response = await fetch(`/api/alpaca/market-data?symbol=${symbol}`)
      if (!response.ok) throw new Error('Failed to fetch market data')
      const data = await response.json()
      return data.data
    },
    enabled: !!symbol,
    refetchInterval: 30000, // 30 seconds for market data
    staleTime: 15000,
  })
}

export function useExecuteOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (orderRequest: any) => {
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRequest)
      })
      if (!response.ok) throw new Error('Failed to execute order')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alpacaQueryKeys.orders })
      queryClient.invalidateQueries({ queryKey: alpacaQueryKeys.trades })
      queryClient.invalidateQueries({ queryKey: alpacaQueryKeys.positions })
      queryClient.invalidateQueries({ queryKey: alpacaQueryKeys.account })
    },
  })
}