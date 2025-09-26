
// ===============================================
// SPECIALIZED WEBSOCKET HOOKS
// ===============================================

import { useMarketStore } from "@/store/slices/marketSlice";
import { useState, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";

/**
 * Hook for real-time market data updates
 */
export const useRealTimeMarketData = (symbols?: string[]) => {
  const { subscribeToSymbols, unsubscribeFromSymbols, connectionStatus } = useWebSocket()
  const [prices, setPrices] = useState<Record<string, { price: number; timestamp: Date; change: number }>>({})
  
  const marketStore = useMarketStore()

  // Subscribe to symbols on mount
  useEffect(() => {
    if (symbols && symbols.length > 0 && connectionStatus.marketData) {
      subscribeToSymbols(symbols)
      
      return () => {
        unsubscribeFromSymbols(symbols)
      }
    }
  }, [symbols, connectionStatus.marketData, subscribeToSymbols, unsubscribeFromSymbols])

  // Listen to price updates from store
  useEffect(() => {
    const unsubscribe = useMarketStore.subscribe(
      (state) => state.priceUpdates,
      (priceUpdates) => {
        setPrices(priceUpdates)
      }
    )

    return unsubscribe
  }, [])

  return {
    prices,
    isConnected: connectionStatus.marketData || connectionStatus.cryptoData,
    connectionStatus
  }
}