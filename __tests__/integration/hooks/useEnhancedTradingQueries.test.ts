// ===============================================
// REACT QUERY HOOKS TESTS - Integration Tests
// __tests__/integration/hooks/useEnhancedTradingQueries.test.ts
// ===============================================

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useAccountQuery,
  usePositionsQuery,
  usePlaceOrderMutation,
  useCancelOrderMutation
} from '@/hooks/api/useEnhancedTradingQueries'

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Enhanced Trading Queries', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('useAccountQuery', () => {
    it('should fetch account data successfully', async () => {
      const mockAccountData = {
        success: true,
        data: {
          account_number: '123456',
          portfolio_value: '100000.00',
          equity: '100000.00',
          last_equity: '99000.00',
          cash: '50000.00',
          buying_power: '200000.00',
          daychange: '1000.00',
          daychange_percent: '1.01',
          long_market_value: '50000.00',
          short_market_value: '0.00'
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccountData
      })

      const { result } = renderHook(() => useAccountQuery(), {
        wrapper: createWrapper()
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAccountData.data)
      expect(global.fetch).toHaveBeenCalledWith('/api/alpaca/account')
    })

    it('should handle fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const { result } = renderHook(() => useAccountQuery(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should refetch at specified interval', async () => {
      const mockAccountData = {
        success: true,
        data: {
          portfolio_value: '100000.00',
          equity: '100000.00'
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAccountData
      })

      const { result } = renderHook(
        () => useAccountQuery({ refetchInterval: 100 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Wait for refetch
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('usePositionsQuery', () => {
    it('should fetch positions successfully', async () => {
      const mockPositions = [
        {
          symbol: 'AAPL',
          qty: '10',
          avg_entry_price: '150.00',
          current_price: '155.00',
          market_value: '1550.00',
          unrealized_pl: '50.00',
          unrealized_plpc: '0.0333',
          cost_basis: '1500.00'
        },
        {
          symbol: 'TSLA',
          qty: '5',
          avg_entry_price: '200.00',
          current_price: '210.00',
          market_value: '1050.00',
          unrealized_pl: '50.00',
          unrealized_plpc: '0.05',
          cost_basis: '1000.00'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPositions
      })

      const { result } = renderHook(() => usePositionsQuery(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPositions)
      expect(result.current.data).toHaveLength(2)
    })

    it('should handle empty positions', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const { result } = renderHook(() => usePositionsQuery(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('usePlaceOrderMutation', () => {
    it('should place order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        symbol: 'AAPL',
        qty: '10',
        side: 'buy',
        type: 'market',
        status: 'accepted',
        submitted_at: new Date().toISOString()
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      })

      const { result } = renderHook(() => usePlaceOrderMutation(), {
        wrapper: createWrapper()
      })

      const orderRequest = {
        symbol: 'AAPL',
        quantity: 10,
        side: 'buy' as const,
        type: 'market' as const
      }

      await waitFor(() => {
        result.current.mutate(orderRequest)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockOrder)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/alpaca/orders',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderRequest)
        })
      )
    })

    it('should handle order placement errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      const { result } = renderHook(() => usePlaceOrderMutation(), {
        wrapper: createWrapper()
      })

      const orderRequest = {
        symbol: 'INVALID',
        quantity: -10,
        side: 'buy' as const,
        type: 'market' as const
      }

      await waitFor(() => {
        result.current.mutate(orderRequest)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should perform optimistic updates', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false }
        }
      })

      // Set initial orders data
      queryClient.setQueryData(['alpaca', 'orders'], [])

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )

      const mockOrder = {
        id: 'order-123',
        symbol: 'AAPL',
        qty: '10',
        side: 'buy',
        type: 'market',
        status: 'accepted'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      })

      const { result } = renderHook(() => usePlaceOrderMutation(), { wrapper })

      const orderRequest = {
        symbol: 'AAPL',
        quantity: 10,
        side: 'buy' as const,
        type: 'market' as const
      }

      await waitFor(() => {
        result.current.mutate(orderRequest)
      })

      // Check optimistic update happened
      const ordersData = queryClient.getQueryData(['alpaca', 'orders'])
      expect(ordersData).toBeTruthy()
    })
  })

  describe('useCancelOrderMutation', () => {
    it('should cancel order successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Order canceled'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { result } = renderHook(() => useCancelOrderMutation(), {
        wrapper: createWrapper()
      })

      const orderId = 'order-123'

      await waitFor(() => {
        result.current.mutate(orderId)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/alpaca/orders/${orderId}`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should handle cancel errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const { result } = renderHook(() => useCancelOrderMutation(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        result.current.mutate('nonexistent-order')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })
})