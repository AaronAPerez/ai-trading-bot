// ===============================================
// TRADING STORE HOOKS - Custom React Hooks
// MIGRATED TO UNIFIED TRADING STORE
// src/hooks/useTrading.ts
// ===============================================

import { useEffect, useCallback, useMemo } from 'react'
import {
  useUnifiedTradingStore,
  usePortfolio as useUnifiedPortfolio,
  usePortfolioActions,
  useAIRecommendations as useUnifiedAIRecommendations,
  useAIActions,
  useMarketActions,
  useMarketQuote,
  useMarketBars,
  useWatchlist
} from '@/store/unifiedTradingStore'
import type {
  AIRecommendation,
  BotConfiguration,
  Position,
  Order,
  TradingMode
} from '@/types/trading'

// ===============================================
// PORTFOLIO HOOKS
// ===============================================

/**
 * Hook for portfolio overview data
 * MIGRATED: Now uses useUnifiedPortfolio from unifiedTradingStore
 */
export const usePortfolio = () => {
  const { positions, performance, isLoading, error } = useUnifiedPortfolio()
  const actions = usePortfolioActions()

  return {
    positions,
    performance,
    isLoading,
    error,
    ...actions
  }
}

/**
 * Hook for individual position tracking
 * MIGRATED: Now uses useUnifiedTradingStore selector
 */
export const usePosition = (symbol: string) => {
  const position = useUnifiedTradingStore((state) =>
    state.getPositionBySymbol(symbol)
  )

  const { updatePosition } = usePortfolioActions()

  const update = useCallback(
    (updates: Partial<Position>) => updatePosition(symbol, updates),
    [symbol, updatePosition]
  )

  return {
    position,
    update,
    exists: !!position,
    pnl: position?.unrealizedPnL || 0,
    pnlPercent: position?.unrealizedPnLPercent || 0
  }
}

/**
 * Hook for order management
 * MIGRATED: Simplified, orders are now managed through API hooks
 * This hook is kept for backward compatibility
 */
export const useOrders = (status?: Order['status']) => {
  // Note: Orders should now be fetched via useOrdersQuery from useEnhancedTradingQueries
  // This is a compatibility wrapper
  const orders = useUnifiedTradingStore((state) => state.orders || [])

  const filteredOrders = useMemo(() =>
    status ? orders.filter(order => order.status === status) : orders,
    [orders, status]
  )

  const openOrders = useMemo(
    () => filteredOrders.filter(order =>
      ['new', 'partially_filled', 'pending_new'].includes(order.status)
    ),
    [filteredOrders]
  )

  const filledOrders = useMemo(
    () => filteredOrders.filter(order => order.status === 'filled'),
    [filteredOrders]
  )

  return {
    orders: filteredOrders,
    openOrders,
    filledOrders,
    openCount: openOrders.length,
    filledCount: filledOrders.length
  }
}

// ===============================================
// AI RECOMMENDATIONS HOOKS
// ===============================================

/**
 * Hook for AI recommendations management
 * MIGRATED: Now uses useUnifiedAIRecommendations from unifiedTradingStore
 */
export const useAIRecommendations = (filters?: {
  symbol?: string
  minConfidence?: number
  action?: 'BUY' | 'SELL'
}) => {
  const { recommendations, isGenerating, error } = useUnifiedAIRecommendations()
  const actions = useAIActions()

  // Filter recommendations based on provided filters
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations

    if (filters?.symbol) {
      filtered = filtered.filter(r => r.symbol === filters.symbol)
    }

    if (filters?.minConfidence) {
      filtered = filtered.filter(r => r.confidence >= filters.minConfidence)
    }

    if (filters?.action) {
      filtered = filtered.filter(r => r.action === filters.action)
    }

    return filtered.sort((a, b) => b.confidence - a.confidence)
  }, [recommendations, filters])

  // Auto-clear expired recommendations every minute
  useEffect(() => {
    const interval = setInterval(actions.clearExpiredRecommendations, 60000)
    return () => clearInterval(interval)
  }, [actions.clearExpiredRecommendations])

  return {
    recommendations: filteredRecommendations,
    allRecommendations: recommendations,
    isGenerating,
    error,
    actions,
    stats: {
      total: recommendations.length,
      active: recommendations.length,
      highConfidence: recommendations.filter(r => r.confidence >= 80).length
    }
  }
}

/**
 * Hook for individual recommendation tracking
 * MIGRATED: Now uses useUnifiedTradingStore selector
 */
export const useRecommendation = (id: string) => {
  const recommendation = useUnifiedTradingStore((state) =>
    state.recommendations.find(r => r.id === id)
  )

  const { updateRecommendation } = useAIActions()

  const isExpired = recommendation ? new Date() > new Date(recommendation.expiresAt) : false

  return {
    recommendation,
    isExpired,
    canExecute: recommendation && !isExpired && recommendation.safetyChecks?.passedRiskCheck,
    update: (updates: Partial<AIRecommendation>) => updateRecommendation(id, updates)
  }
}

// ===============================================
// BOT MANAGEMENT HOOKS
// ===============================================

/**
 * Hook for trading bot management
 * NOTE: Bot control logic remains in the existing botStore (as per migration guide)
 * Import botStore when needed: import { useBotStore } from '@/store/botStore'
 */
export const useTradingBot = () => {
  // Bot hooks should now be imported directly from botStore
  // This is a compatibility wrapper - recommend importing useBotStore directly
  console.warn('useTradingBot: Please migrate to import { useBotStore } from "@/store/botStore" directly')

  return {
    // Placeholder return for backward compatibility
    // Components should be updated to use useBotStore directly
  }
}

/**
 * Hook for bot configuration management
 * NOTE: Bot configuration remains in the existing botStore (as per migration guide)
 */
export const useBotConfiguration = () => {
  console.warn('useBotConfiguration: Please migrate to import { useBotStore } from "@/store/botStore" directly')
  return {}
}

// ===============================================
// MARKET DATA HOOKS
// ===============================================

/**
 * Hook for market data and real-time updates
 * MIGRATED: Now uses unifiedTradingStore market slice
 */
export const useMarketData = (symbols?: string[]) => {
  const watchlist = useWatchlist()
  const marketActions = useMarketActions()
  const marketStatus = useUnifiedTradingStore((state) => ({
    status: state.marketStatus,
    isConnected: state.isConnected
  }))

  // Get data for specific symbols or watchlist
  const targetSymbols = symbols || watchlist

  const symbolData = useMemo(
    () => targetSymbols.map(symbol => {
      const quote = useUnifiedTradingStore.getState().getQuote(symbol)
      return {
        symbol,
        quote,
        price: quote?.lastPrice || 0,
        change: quote?.change || 0
      }
    }),
    [targetSymbols]
  )

  return {
    symbolData,
    watchlist,
    ...marketStatus,
    actions: marketActions
  }
}

/**
 * Hook for individual symbol tracking
 * MIGRATED: Now uses useMarketQuote from unifiedTradingStore
 */
export const useSymbol = (symbol: string) => {
  const quote = useMarketQuote(symbol)

  return {
    symbol,
    quote,
    price: quote?.lastPrice || 0,
    change: quote?.change || 0,
    changePercent: quote?.changePercent || 0,
    lastUpdate: quote?.timestamp,
    isUp: (quote?.change || 0) > 0,
    isDown: (quote?.change || 0) < 0,
    isFlat: (quote?.change || 0) === 0
  }
}

// ===============================================
// TRADING ACTIONS HOOKS
// ===============================================

/**
 * Hook for trading mode management
 * MIGRATED: Simplified for unifiedTradingStore
 */
export const useTradingMode = () => {
  const tradingMode = useUnifiedTradingStore((state) => state.tradingMode || 'PAPER')
  const setTradingMode = useUnifiedTradingStore((state) => state.setTradingMode)

  const isLiveTrading = tradingMode === 'LIVE'
  const isPaperTrading = tradingMode === 'PAPER'

  const toggleMode = useCallback(() => {
    setTradingMode?.(isLiveTrading ? 'PAPER' : 'LIVE')
  }, [isLiveTrading, setTradingMode])

  const switchToLive = useCallback(() => {
    setTradingMode?.('LIVE')
  }, [setTradingMode])

  const switchToPaper = useCallback(() => {
    setTradingMode?.('PAPER')
  }, [setTradingMode])

  return {
    mode: tradingMode,
    isLiveTrading,
    isPaperTrading,
    actions: {
      toggle: toggleMode,
      switchToLive,
      switchToPaper
    }
  }
}

/**
 * Hook for order execution
 * MIGRATED: Order execution should now use usePlaceOrderMutation from useEnhancedTradingQueries
 * This hook is kept for backward compatibility
 */
export const useOrderExecution = () => {
  const tradingMode = useUnifiedTradingStore((state) => state.tradingMode || 'PAPER')

  console.warn('useOrderExecution: Please migrate to usePlaceOrderMutation from @/hooks/api/useEnhancedTradingQueries')

  return {
    tradingMode,
    isLiveMode: tradingMode === 'LIVE'
  }
}

// ===============================================
// REAL-TIME DATA HOOKS
// ===============================================

/**
 * Hook for real-time WebSocket connection management
 * MIGRATED: WebSocket management now handled by lib/services/websocketService
 * Use: import { useWebSocket } from '@/lib/services/websocketService'
 */
export const useRealTimeData = () => {
  console.warn('useRealTimeData: Please migrate to useWebSocket from @/lib/services/websocketService')
  return {
    connectionStatus: 'disconnected' as const,
    isConnected: false,
    isReconnecting: false
  }
}

// ===============================================
// PERFORMANCE MONITORING HOOKS
// ===============================================

/**
 * Hook for performance analytics
 * MIGRATED: Use usePortfolioPerformance from unifiedTradingStore
 */
export const usePerformanceAnalytics = () => {
  const performance = useUnifiedTradingStore((state) => state.performance)

  return {
    portfolio: {
      totalValue: performance?.totalValue || 0,
      dayPnL: performance?.dayPnL || 0,
      totalPnL: performance?.totalPnL || 0,
      winnersCount: performance?.winnersCount || 0,
      losersCount: performance?.losersCount || 0,
      winRate: performance?.winRate || 0
    }
  }
}

/**
 * Hook for error handling across stores
 * MIGRATED: Simplified error handling
 */
export const useGlobalError = () => {
  const error = useUnifiedTradingStore((state) => state.error)

  return {
    hasError: !!error,
    error
  }
}