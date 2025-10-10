/**
 * Zustand Store for REAL trading data
 * NO MOCKS - Production implementation
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface RealTradingState {
  // Real account data from Alpaca
  account: any | null
  positions: any[]
  orders: any[]
  
  // Real AI recommendations from Supabase
  recommendations: any[]
  
  // Bot state
  botRunning: boolean
  botSessionId: string | null
  
  // Performance metrics (calculated from real trades)
  metrics: {
    totalTrades: number
    winRate: number
    totalPnL: number
    dailyPnL: number
  }
  
  // Actions
  setAccount: (account: any) => void
  setPositions: (positions: any[]) => void
  setOrders: (orders: any[]) => void
  setRecommendations: (recs: any[]) => void
  updateMetrics: (metrics: Partial<RealTradingState['metrics']>) => void
  toggleBot: () => void
  
  // Validation
  dataSource: 'REAL_ALPACA' | 'REAL_SUPABASE'
}

export const useRealTradingStore = create<RealTradingState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        account: null,
        positions: [],
        orders: [],
        recommendations: [],
        botRunning: false,
        botSessionId: null,
        metrics: {
          totalTrades: 0,
          winRate: 0,
          totalPnL: 0,
          dailyPnL: 0
        },
        dataSource: 'REAL_ALPACA',
        
        // Actions - all update with REAL data
        setAccount: (account) => set({ account }),
        setPositions: (positions) => set({ positions }),
        setOrders: (orders) => set({ orders }),
        setRecommendations: (recs) => set({ recommendations: recs }),
        updateMetrics: (metrics) => set((state) => ({
          metrics: { ...state.metrics, ...metrics }
        })),
        toggleBot: () => set((state) => ({
          botRunning: !state.botRunning,
          botSessionId: !state.botRunning ? Date.now().toString() : null
        }))
      }),
      {
        name: 'real-trading-store',
        // Only persist bot state, not live data
        partialize: (state) => ({
          botRunning: state.botRunning,
          metrics: state.metrics
        })
      }
    )
  )
)