
// ===============================================
// MARKET DATA STORE SLICE
// src/store/slices/marketSlice.ts
// ===============================================

import { MarketData } from "@/types/trading";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface Quote {
  symbol: string
  lastPrice: number
  bid?: number
  ask?: number
  volume?: number
  change?: number
  changePercent?: number
  timestamp: string
}

export interface Bar {
  symbol: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketSentiment {
  symbol: string
  score: number
  signals: string[]
  timestamp: string
}

interface MarketState {
  quotes: Record<string, Quote>
  bars: Record<string, Bar[]>
  sentiment: Record<string, MarketSentiment>
  marketData: Record<string, MarketData>
  priceUpdates: Record<string, { price: number; timestamp: Date; change: number }>
  watchlist: string[]
  selectedSymbol: string | null
  marketStatus: 'open' | 'closed' | 'pre' | 'post'
  isConnected: boolean
  lastUpdate: Date | null
  subscriptions: Set<string>
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
}

interface MarketActions {
  updateQuote: (symbol: string, quote: Partial<Quote>) => void
  updateQuotes: (quotes: Quote[]) => void
  addBar: (symbol: string, bar: Bar) => void
  updateSentiment: (symbol: string, sentiment: MarketSentiment) => void
  getQuote: (symbol: string) => Quote | undefined
  getBars: (symbol: string) => Bar[]
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

export type MarketSlice = MarketState & MarketActions
export type MarketStore = MarketState & MarketActions

const initialMarketState: MarketState = {
  quotes: {},
  bars: {},
  sentiment: {},
  marketData: {},
  priceUpdates: {},
  watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'BTCUSD', 'ETHUSD'],
  selectedSymbol: null,
  marketStatus: 'closed',
  isConnected: false,
  lastUpdate: null,
  subscriptions: new Set(),
  connectionStatus: 'disconnected'
}

// Slice creator function for unified store
export const createMarketSlice: StateCreator<MarketSlice> = (set, get) => ({
  ...initialMarketState,

  updateQuote: (symbol, quote) =>
    set((state: any) => {
      state.quotes[symbol] = {
        ...state.quotes[symbol],
        ...quote,
        symbol
      }
      state.lastUpdate = new Date()
    }),

  updateQuotes: (quotes) =>
    set((state: any) => {
      quotes.forEach(quote => {
        state.quotes[quote.symbol] = quote
      })
      state.lastUpdate = new Date()
    }),

  addBar: (symbol, bar) =>
    set((state: any) => {
      if (!state.bars[symbol]) {
        state.bars[symbol] = []
      }
      state.bars[symbol].push(bar)
      // Keep only last 1000 bars
      if (state.bars[symbol].length > 1000) {
        state.bars[symbol] = state.bars[symbol].slice(-1000)
      }
      state.lastUpdate = new Date()
    }),

  updateSentiment: (symbol, sentiment) =>
    set((state: any) => {
      state.sentiment[symbol] = sentiment
      state.lastUpdate = new Date()
    }),

  getQuote: (symbol) => {
    return (get() as MarketSlice).quotes[symbol]
  },

  getBars: (symbol) => {
    return (get() as MarketSlice).bars[symbol] || []
  },

  updateMarketData: (symbol, data) =>
    set((state: any) => {
      state.marketData[symbol] = data
      state.lastUpdate = new Date()
    }),

  updatePrice: (symbol, price, change = 0) =>
    set((state: any) => {
      state.priceUpdates[symbol] = {
        price,
        change,
        timestamp: new Date()
      }
      state.lastUpdate = new Date()
    }),

  addToWatchlist: (symbol) =>
    set((state: any) => {
      if (!state.watchlist.includes(symbol)) {
        state.watchlist.push(symbol)
        ;(get() as MarketSlice).subscribe(symbol)
      }
    }),

  removeFromWatchlist: (symbol) =>
    set((state: any) => {
      state.watchlist = state.watchlist.filter((s: string) => s !== symbol)
      ;(get() as MarketSlice).unsubscribe(symbol)
    }),

  setSelectedSymbol: (symbol) =>
    set((state: any) => {
      state.selectedSymbol = symbol
    }),

  setConnected: (connected) =>
    set((state: any) => {
      state.isConnected = connected
      state.connectionStatus = connected ? 'connected' : 'disconnected'
    }),

  setConnectionStatus: (status) =>
    set((state: any) => {
      state.connectionStatus = status
      state.isConnected = status === 'connected'
    }),

  subscribe: (symbol) =>
    set((state: any) => {
      state.subscriptions.add(symbol)
    }),

  unsubscribe: (symbol) =>
    set((state: any) => {
      state.subscriptions.delete(symbol)
    }),

  getLatestPrice: (symbol) => {
    const { priceUpdates, marketData, quotes } = get() as MarketSlice
    return quotes[symbol]?.lastPrice || priceUpdates[symbol]?.price || marketData[symbol]?.close || null
  },

  getPriceChange: (symbol) => {
    const { priceUpdates, quotes } = get() as MarketSlice
    return quotes[symbol]?.change || priceUpdates[symbol]?.change || null
  }
})

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

