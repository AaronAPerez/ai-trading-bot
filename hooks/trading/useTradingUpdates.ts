import { usePortfolioStore } from "@/store/slices/portfolioSlice"
import { useState, useEffect, useCallback } from "react"
import { useWebSocket } from "../useWebSocket"

/**
 * Hook for real-time trading updates
 */
export const useTradingUpdates = () => {
  const { connectionStatus, sendInternalMessage } = useWebSocket()
  const [orders, setOrders] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])

  const portfolioStore = usePortfolioStore()

  // Listen to order updates from store
  useEffect(() => {
    const unsubscribeOrders = usePortfolioStore.subscribe(
      (state) => state.orders,
      (orders) => {
        setOrders(orders)
      }
    )

    const unsubscribePositions = usePortfolioStore.subscribe(
      (state) => state.positions,
      (positions) => {
        setPositions(positions)
      }
    )

    return () => {
      unsubscribeOrders()
      unsubscribePositions()
    }
  }, [])

  const sendOrderUpdate = useCallback((orderData: any) => {
    return sendInternalMessage({
      type: 'order_update',
      data: orderData,
      timestamp: new Date().toISOString()
    })
  }, [sendInternalMessage])

  return {
    orders,
    positions,
    isConnected: connectionStatus.tradingUpdates,
    sendOrderUpdate
  }
}
