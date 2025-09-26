// ===============================================
// TRADING STORE SLICES - Modular State Management
// src/store/slices/
// ===============================================

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { 
  Portfolio, 
  Position, 
  AlpacaAccount, 
  Order,
  AIRecommendation,
  BotConfiguration,
  BotMetrics,
  MarketData,
  RiskAssessment
} from '@/types/trading'

// ===============================================
// PORTFOLIO STORE SLICE
// src/store/slices/portfolioSlice.ts
// ===============================================

interface PortfolioState {
  account: AlpacaAccount | null
  portfolio: Portfolio | null
  positions: Position[]
  orders: Order[]
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
}

interface PortfolioActions {
  setAccount: (account: AlpacaAccount) => void
  updatePortfolio: (portfolio: Portfolio) => void
  updatePositions: (positions: Position[]) => void
  updatePosition: (symbol: string, updates: Partial<Position>) => void
  addOrder: (order: Order) => void
  updateOrder: (orderId: string, updates: Partial<Order>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  refreshPortfolio: () => Promise<void>
  calculateMetrics: () => {
    totalValue: number
    dayPnL: number
    totalPnL: number
    winnersCount: number
    losersCount: number
    largestPosition: Position | null
  }
}

export type PortfolioStore = PortfolioState & PortfolioActions

const initialPortfolioState: PortfolioState = {
  account: null,
  portfolio: null,
  positions: [],
  orders: [],
  isLoading: false,
  error: null,
  lastUpdate: null
}

export const usePortfolioStore = create<PortfolioStore>()(
  subscribeWithSelector(
    immer<PortfolioStore>((set, get) => ({
      ...initialPortfolioState,

      setAccount: (account) =>
        set((state) => {
          state.account = account
          state.lastUpdate = new Date()
        }),

      updatePortfolio: (portfolio) =>
        set((state) => {
          state.portfolio = portfolio
          state.lastUpdate = new Date()
        }),

      updatePositions: (positions) =>
        set((state) => {
          state.positions = positions
          state.lastUpdate = new Date()
        }),

      updatePosition: (symbol, updates) =>
        set((state) => {
          const index = state.positions.findIndex(p => p.symbol === symbol)
          if (index >= 0) {
            Object.assign(state.positions[index], updates)
            state.lastUpdate = new Date()
          }
        }),

      addOrder: (order) =>
        set((state) => {
          const existingIndex = state.orders.findIndex(o => o.id === order.id)
          if (existingIndex >= 0) {
            state.orders[existingIndex] = order
          } else {
            state.orders.unshift(order)
          }
          state.lastUpdate = new Date()
        }),

      updateOrder: (orderId, updates) =>
        set((state) => {
          const index = state.orders.findIndex(o => o.id === orderId)
          if (index >= 0) {
            Object.assign(state.orders[index], updates)
            state.lastUpdate = new Date()
          }
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading
        }),

      setError: (error) =>
        set((state) => {
          state.error = error
        }),

      refreshPortfolio: async () => {
        set((state) => {
          state.isLoading = true
          state.error = null
        })

        try {
          // Fetch account data
          const accountResponse = await fetch('/api/alpaca/account')
          if (accountResponse.ok) {
            const account = await accountResponse.json()
            get().setAccount(account)
          }

          // Fetch positions
          const positionsResponse = await fetch('/api/alpaca/positions')
          if (positionsResponse.ok) {
            const positions = await positionsResponse.json()
            get().updatePositions(positions)
          }

          // Fetch recent orders
          const ordersResponse = await fetch('/api/alpaca/orders?limit=50')
          if (ordersResponse.ok) {
            const orders = await ordersResponse.json()
            set((state) => {
              state.orders = orders
            })
          }

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to refresh portfolio'
          })
        } finally {
          set((state) => {
            state.isLoading = false
          })
        }
      },

      calculateMetrics: () => {
        const { positions, account } = get()
        
        const totalValue = account?.equity || 0
        const dayPnL = account?.equity && account?.last_equity 
          ? account.equity - account.last_equity 
          : 0
        
        const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
        const winnersCount = positions.filter(pos => pos.unrealizedPnL > 0).length
        const losersCount = positions.filter(pos => pos.unrealizedPnL < 0).length
        
        const largestPosition = positions.reduce((largest, current) => 
          Math.abs(current.marketValue) > Math.abs(largest?.marketValue || 0) 
            ? current 
            : largest, 
          null as Position | null
        )

        return {
          totalValue,
          dayPnL,
          totalPnL,
          winnersCount,
          losersCount,
          largestPosition
        }
      }
    }))
  )
)
