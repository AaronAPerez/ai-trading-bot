// ===============================================
// UNIFIED TRADING STORE - Complete Integration
// store/unifiedTradingStore.ts
// ===============================================

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { createPortfolioSlice, PortfolioSlice } from './slices/portfolioSlice'
import { createAISlice, AISlice } from './slices/aiSlice'
import { createMarketSlice, MarketSlice } from './slices/marketSlice'

/**
 * Combined store type with all slices
 * This creates a unified store with modular slices following best practices
 */
export type UnifiedTradingStore = PortfolioSlice & AISlice & MarketSlice

/**
 * Create the unified trading store with all middleware
 * 
 * Middleware stack:
 * 1. immer - Immutable state updates with produce()
 * 2. subscribeWithSelector - Selective reactivity
 * 3. devtools - Redux DevTools integration
 * 4. persist - State persistence to localStorage
 */
export const useUnifiedTradingStore = create<UnifiedTradingStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((...args) => ({
          ...createPortfolioSlice(...args),
          ...createAISlice(...args),
          ...createMarketSlice(...args)
        }))
      ),
      {
        name: 'unified-trading-store',
        partialize: (state) => ({
          // Only persist selected state
          watchlist: state.watchlist,
          selectedSymbol: state.selectedSymbol,
          recommendationHistory: state.recommendationHistory.slice(0, 20) // Keep last 20
        })
      }
    ),
    {
      name: 'AI Trading Bot Store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
)

/**
 * Selective hooks for better performance
 * Only re-render when specific state changes
 */

// Portfolio hooks
export const usePortfolio = () =>
  useUnifiedTradingStore((state) => ({
    positions: state.positions,
    performance: state.performance,
    isLoading: state.isLoading,
    error: state.error
  }))

export const usePosition = (symbol: string) =>
  useUnifiedTradingStore((state) => state.getPositionBySymbol(symbol))

export const usePortfolioPerformance = () =>
  useUnifiedTradingStore((state) => state.performance)

// AI hooks
export const useAIRecommendations = () =>
  useUnifiedTradingStore((state) => ({
    recommendations: state.activeRecommendations,
    isGenerating: state.isGenerating,
    error: state.error
  }))

export const useAIModels = () =>
  useUnifiedTradingStore((state) => state.models)

export const useAIRecommendation = (id: string) =>
  useUnifiedTradingStore((state) =>
    state.recommendations.find(r => r.id === id)
  )

// Market hooks
export const useMarketQuote = (symbol: string) =>
  useUnifiedTradingStore((state) => state.getQuote(symbol))

export const useMarketBars = (symbol: string) =>
  useUnifiedTradingStore((state) => state.getBars(symbol))

export const useWatchlist = () =>
  useUnifiedTradingStore((state) => state.watchlist)

export const useMarketStatus = () =>
  useUnifiedTradingStore((state) => ({
    status: state.marketStatus,
    isConnected: state.isConnected
  }))

// Combined hooks for complex operations
export const usePortfolioWithRecommendations = () =>
  useUnifiedTradingStore((state) => ({
    positions: state.positions,
    recommendations: state.activeRecommendations,
    performance: state.performance
  }))

/**
 * Action hooks - for dispatching actions
 */
export const usePortfolioActions = () =>
  useUnifiedTradingStore((state) => ({
    setPositions: state.setPositions,
    updatePosition: state.updatePosition,
    removePosition: state.removePosition,
    setPerformance: state.setPerformance,
    addSnapshot: state.addSnapshot
  }))

export const useAIActions = () =>
  useUnifiedTradingStore((state) => ({
    addRecommendation: state.addRecommendation,
    updateRecommendation: state.updateRecommendation,
    removeRecommendation: state.removeRecommendation,
    clearExpiredRecommendations: state.clearExpiredRecommendations,
    markAsExecuting: state.markAsExecuting,
    markAsExecuted: state.markAsExecuted
  }))

export const useMarketActions = () =>
  useUnifiedTradingStore((state) => ({
    updateQuote: state.updateQuote,
    updateQuotes: state.updateQuotes,
    addBar: state.addBar,
    updateSentiment: state.updateSentiment,
    addToWatchlist: state.addToWatchlist,
    removeFromWatchlist: state.removeFromWatchlist,
    setSelectedSymbol: state.setSelectedSymbol
  }))