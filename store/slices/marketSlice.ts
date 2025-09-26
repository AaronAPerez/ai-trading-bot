
// ===============================================
// MARKET DATA STORE SLICE
// src/store/slices/marketSlice.ts
// ===============================================

import { MarketData } from "@/types/trading";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface MarketState {
  marketData: Record<string, MarketData>
  priceUpdates: Record<string, { price: number; timestamp: Date; change: number }>
  watchlist: string[]
  selectedSymbol: string | null
  isConnected: boolean
  lastUpdate: Date | null
  subscriptions: Set<string>
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
}

interface MarketActions {
  updateMarketData: (symbol: string, data: MarketData) => void
  updatePrice: (symbol: string, price: number, change?: number) => void
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  setSelectedSymbol: (symbol: string | null) => void
  setConnected: (connected: boolean) => void
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void
  subscribe: (symbol: string) => void
  unsubscribe: (symbol: string) => void
  getLatestPrice: (symbol: string) => number | null
  getPriceChange: (symbol: string) => number | null
}

export type MarketStore = MarketState & MarketActions

const initialMarketState: MarketState = {
  marketData: {},
  priceUpdates: {},
  watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'BTCUSD', 'ETHUSD'],
  selectedSymbol: null,
  isConnected: false,
  lastUpdate: null,
  subscriptions: new Set(),
  connectionStatus: 'disconnected'
}

export const useMarketStore = create<MarketStore>()(
  subscribeWithSelector(
    immer<MarketStore>((set, get) => ({
      ...initialMarketState,

      updateMarketData: (symbol, data) =>
        set((state) => {
          state.marketData[symbol] = data
          state.lastUpdate = new Date()
        }),

      updatePrice: (symbol, price, change = 0) =>
        set((state) => {
          state.priceUpdates[symbol] = {
            price,
            change,
            timestamp: new Date()
          }
          state.lastUpdate = new Date()
        }),

      addToWatchlist: (symbol) =>
        set((state) => {
          if (!state.watchlist.includes(symbol)) {
            state.watchlist.push(symbol)
            // Auto-subscribe to new watchlist symbols
            get().subscribe(symbol)
          }
        }),

      removeFromWatchlist: (symbol) =>
        set((state) => {
          state.watchlist = state.watchlist.filter(s => s !== symbol)
          // Unsubscribe when removed from watchlist
          get().unsubscribe(symbol)
        }),

      setSelectedSymbol: (symbol) =>
        set((state) => {
          state.selectedSymbol = symbol
        }),

      setConnected: (connected) =>
        set((state) => {
          state.isConnected = connected
          state.connectionStatus = connected ? 'connected' : 'disconnected'
        }),

      setConnectionStatus: (status) =>
        set((state) => {
          state.connectionStatus = status
          state.isConnected = status === 'connected'
        }),

      subscribe: (symbol) =>
        set((state) => {
          state.subscriptions.add(symbol)
        }),

      unsubscribe: (symbol) =>
        set((state) => {
          state.subscriptions.delete(symbol)
        }),

      getLatestPrice: (symbol) => {
        const { priceUpdates, marketData } = get()
        return priceUpdates[symbol]?.price || marketData[symbol]?.close || null
      },

      getPriceChange: (symbol) => {
        const { priceUpdates } = get()
        return priceUpdates[symbol]?.change || null
      }
    }))
  )
)

