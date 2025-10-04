import React from "react"
import { create } from "domain"
import { devtools, persist } from 'zustand/middleware';

// ===== ZUSTAND STORE FOR TRADING STATE =====
interface TradingStore {
  tradingMode: 'paper' | 'live'
  maxRiskPerTrade: number
  setTradingMode: (mode: 'paper' | 'live') => void
  setMaxRiskPerTrade: (risk: number) => void
}

export const useTradingStore = create<TradingStore>(
  devtools(
    persist(
      (set) => ({
        tradingMode: 'paper',
        maxRiskPerTrade: 0.02, // 2% of portfolio
        setTradingMode: (mode) => set({ tradingMode: mode }),
        setMaxRiskPerTrade: (risk) => set({ maxRiskPerTrade: risk })
      }),
      { name: 'trading-store' }
    )
  )
)