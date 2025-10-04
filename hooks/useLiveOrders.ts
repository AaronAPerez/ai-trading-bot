/**
 * Live Orders Hook - Integration with Alpaca API, Zustand, React Query, and Supabase
 * Fetches real-time order data from Alpaca, syncs with Zustand store, and saves to Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTradingStore } from '@/store/tradingStore'
import { Order } from '@/types/trading'
import { useEffect, useRef } from 'react'

interface AlpacaOrder {
  id: string
  client_order_id: string
  created_at: string
  updated_at: string
  submitted_at: string
  filled_at?: string
  expired_at?: string
  canceled_at?: string
  failed_at?: string
  replaced_at?: string
  asset_id: string
  symbol: string
  asset_class: string
  qty?: string
  notional?: string
  filled_qty: string
  filled_avg_price?: string
  order_class: string
  order_type: string
  type: string
  side: 'buy' | 'sell'
  time_in_force: string
  limit_price?: string
  stop_price?: string
  status: string
  extended_hours: boolean
  legs?: AlpacaOrder[]
  trail_price?: string
  trail_percent?: string
  hwm?: string
}

/**
 * Fetch live orders from Alpaca API
 */
export const useLiveOrders = (options?: {
  status?: 'open' | 'closed' | 'all'
  limit?: number
  refreshInterval?: number
  autoSync?: boolean
}) => {
  const {
    status = 'all',
    limit = 50,
    refreshInterval = 5000, // 5 seconds
    autoSync = true
  } = options || {}

  const queryClient = useQueryClient()
  const { addOrder, updateOrder } = useTradingStore()

  // Fetch orders from Alpaca API
  const ordersQuery = useQuery({
    queryKey: ['live-orders', status, limit],
    queryFn: async (): Promise<AlpacaOrder[]> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(status !== 'all' && { status })
      })

      const response = await fetch(`/api/alpaca/orders?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders from Alpaca API')
      }

      const result = await response.json()
      return result.data || []
    },
    refetchInterval: refreshInterval,
    staleTime: 3000,
    gcTime: 10000,
  })

  // Auto-sync orders to Zustand store when data changes
  useEffect(() => {
    if (autoSync && ordersQuery.data) {
      syncOrdersToStore(ordersQuery.data, addOrder)
    }
  }, [ordersQuery.data, autoSync, addOrder])

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error,
    refetch: ordersQuery.refetch,
  }
}

/**
 * Sync orders to Zustand store
 */
function syncOrdersToStore(alpacaOrders: AlpacaOrder[], addOrder: (order: Order) => void) {
  alpacaOrders.forEach((alpacaOrder) => {
    const order: Order = {
      id: alpacaOrder.id,
      clientOrderId: alpacaOrder.client_order_id,
      symbol: alpacaOrder.symbol,
      side: alpacaOrder.side,
      type: alpacaOrder.type as any,
      qty: alpacaOrder.qty ? parseFloat(alpacaOrder.qty) : undefined,
      notional: alpacaOrder.notional ? parseFloat(alpacaOrder.notional) : undefined,
      filledQty: parseFloat(alpacaOrder.filled_qty || '0'),
      filledAvgPrice: alpacaOrder.filled_avg_price ? parseFloat(alpacaOrder.filled_avg_price) : undefined,
      limitPrice: alpacaOrder.limit_price ? parseFloat(alpacaOrder.limit_price) : undefined,
      stopPrice: alpacaOrder.stop_price ? parseFloat(alpacaOrder.stop_price) : undefined,
      status: alpacaOrder.status,
      timeInForce: alpacaOrder.time_in_force as any,
      orderClass: alpacaOrder.order_class as any,
      createdAt: new Date(alpacaOrder.created_at),
      updatedAt: new Date(alpacaOrder.updated_at),
      submittedAt: new Date(alpacaOrder.submitted_at),
      filledAt: alpacaOrder.filled_at ? new Date(alpacaOrder.filled_at) : undefined,
      expiredAt: alpacaOrder.expired_at ? new Date(alpacaOrder.expired_at) : undefined,
      canceledAt: alpacaOrder.canceled_at ? new Date(alpacaOrder.canceled_at) : undefined,
      extendedHours: alpacaOrder.extended_hours,
    }

    addOrder(order)
  })
}

/**
 * Save order to Supabase database
 */
export const useSaveOrderToDatabase = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: AlpacaOrder) => {
      const response = await fetch('/api/orders/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          qty: order.qty ? parseFloat(order.qty) : null,
          notional: order.notional ? parseFloat(order.notional) : null,
          filled_qty: parseFloat(order.filled_qty || '0'),
          filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
          limit_price: order.limit_price ? parseFloat(order.limit_price) : null,
          stop_price: order.stop_price ? parseFloat(order.stop_price) : null,
          status: order.status,
          time_in_force: order.time_in_force,
          order_class: order.order_class,
          created_at: order.created_at,
          updated_at: order.updated_at,
          submitted_at: order.submitted_at,
          filled_at: order.filled_at,
          extended_hours: order.extended_hours,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save order to database')
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-history'] })
    },
  })
}

/**
 * Get order history from Supabase database
 */
export const useOrderHistory = (options?: {
  limit?: number
  symbol?: string
  startDate?: Date
  endDate?: Date
}) => {
  const { limit = 100, symbol, startDate, endDate } = options || {}

  return useQuery({
    queryKey: ['order-history', limit, symbol, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(symbol && { symbol }),
        ...(startDate && { start_date: startDate.toISOString() }),
        ...(endDate && { end_date: endDate.toISOString() }),
      })

      const response = await fetch(`/api/orders/history?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch order history from database')
      }

      return await response.json()
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Get order statistics from Supabase
 */
export const useOrderStatistics = () => {
  return useQuery({
    queryKey: ['order-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/orders/statistics')
      if (!response.ok) {
        throw new Error('Failed to fetch order statistics')
      }

      const data = await response.json()
      return data
    },
    refetchInterval: 10000, // 10 seconds
    staleTime: 5000,
  })
}

/**
 * Watch for filled orders and sync to database automatically
 * DISABLED BY DEFAULT - Use query parameter to check if order exists in DB instead of client-side tracking
 */
export const useAutoSyncFilledOrders = (options?: { enabled?: boolean }) => {
  const { enabled = false } = options || {} // DISABLED by default to prevent spam
  const { orders } = useLiveOrders({ status: 'filled', refreshInterval: 10000 }) // Only fetch filled orders, slower refresh
  const saveOrderMutation = useSaveOrderToDatabase()
  const { addTradeToHistory } = useTradingStore()

  // Track synced order IDs to prevent duplicate saves (persists across re-renders)
  const syncedOrderIds = useRef<Set<string>>(new Set())
  const isSyncingRef = useRef(false)

  useEffect(() => {
    if (!enabled || !orders || isSyncingRef.current) return

    // Find filled orders that haven't been synced yet
    const filledOrders = orders.filter(order =>
      order.status === 'filled' &&
      order.filled_at &&
      !syncedOrderIds.current.has(order.id)
    )

    // Only process new filled orders
    if (filledOrders.length === 0) return

    console.log(`🔄 Auto-sync: Found ${filledOrders.length} new filled orders to save`)

    // Process orders sequentially to avoid overwhelming the database
    const syncOrders = async () => {
      isSyncingRef.current = true

      for (const order of filledOrders) {
        try {
          // Check if order already exists in database before saving
          const checkResponse = await fetch(`/api/orders/check?order_id=${order.id}`)
          const checkData = await checkResponse.json()

          if (checkData.exists) {
            console.log(`⏭️  Order ${order.id} already exists in database, skipping`)
            syncedOrderIds.current.add(order.id)
            continue
          }

          // Save to database
          await saveOrderMutation.mutateAsync(order)

          // Mark as synced
          syncedOrderIds.current.add(order.id)

          // Add to trade history in Zustand store
          if (order.filled_avg_price && order.filled_qty) {
            addTradeToHistory({
              id: order.id,
              symbol: order.symbol,
              side: order.side,
              quantity: parseFloat(order.filled_qty),
              price: parseFloat(order.filled_avg_price),
              timestamp: new Date(order.filled_at!),
              orderId: order.id,
              value: parseFloat(order.filled_qty) * parseFloat(order.filled_avg_price),
              commission: 0, // Alpaca has commission-free trading
            })
          }

          console.log(`✅ Synced order ${order.id} (${order.symbol})`)
        } catch (error) {
          console.error('Failed to sync filled order:', order.id, error)
        }
      }

      isSyncingRef.current = false
    }

    syncOrders()
  }, [enabled, orders, saveOrderMutation, addTradeToHistory])

  return {
    isSyncing: saveOrderMutation.isPending || isSyncingRef.current,
    error: saveOrderMutation.error,
    syncedCount: syncedOrderIds.current.size,
  }
}

/**
 * Combined hook for complete live orders functionality
 */
export const useCompleteLiveOrders = () => {
  const liveOrders = useLiveOrders({ autoSync: true, refreshInterval: 10000 }) // Slower refresh - 10s instead of 5s
  const orderHistory = useOrderHistory({ limit: 100 })
  const statistics = useOrderStatistics()
  const autoSync = useAutoSyncFilledOrders({ enabled: false }) // DISABLED to prevent spam
  const store = useTradingStore()

  return {
    // Live orders from Alpaca
    liveOrders: liveOrders.orders,
    isLoadingLive: liveOrders.isLoading,

    // Historical orders from Supabase
    orderHistory: orderHistory.data,
    isLoadingHistory: orderHistory.isLoading,

    // Statistics
    statistics: statistics.data,

    // Auto-sync status
    isSyncing: autoSync.isSyncing,

    // Zustand store orders
    storeOrders: store.orders,

    // Refetch functions
    refetchLive: liveOrders.refetch,
    refetchHistory: orderHistory.refetch,
  }
}
