// ===============================================
// TRADING STORE HOOKS - Custom React Hooks
// src/hooks/useTrading.ts
// ===============================================

import { useEffect, useCallback, useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { 
  useTradingStore, 
  usePortfolioStore, 
  useAIStore, 
  useBotStore, 
  useMarketStore 
} from '@/store/tradingStore'
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
 */
export const usePortfolio = () => {
  const {
    account,
    portfolio,
    positions,
    orders,
    isLoading,
    error,
    refreshPortfolio,
    calculateMetrics
  } = usePortfolioStore(
    (state) => ({
      account: state.account,
      portfolio: state.portfolio,
      positions: state.positions,
      orders: state.orders,
      isLoading: state.isLoading,
      error: state.error,
      refreshPortfolio: state.refreshPortfolio,
      calculateMetrics: state.calculateMetrics
    }),
    shallow
  )

  const metrics = useMemo(() => calculateMetrics(), [calculateMetrics])

  return {
    account,
    portfolio,
    positions,
    orders,
    metrics,
    isLoading,
    error,
    refresh: refreshPortfolio
  }
}

/**
 * Hook for individual position tracking
 */
export const usePosition = (symbol: string) => {
  const position = usePortfolioStore(
    (state) => state.positions.find(p => p.symbol === symbol)
  )
  
  const updatePosition = usePortfolioStore((state) => state.updatePosition)
  
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
 */
export const useOrders = (status?: Order['status']) => {
  const { orders, addOrder, updateOrder } = usePortfolioStore(
    (state) => ({
      orders: status 
        ? state.orders.filter(order => order.status === status)
        : state.orders,
      addOrder: state.addOrder,
      updateOrder: state.updateOrder
    }),
    shallow
  )

  const openOrders = useMemo(
    () => orders.filter(order => 
      ['new', 'partially_filled', 'pending_new'].includes(order.status)
    ),
    [orders]
  )

  const filledOrders = useMemo(
    () => orders.filter(order => order.status === 'filled'),
    [orders]
  )

  return {
    orders,
    openOrders,
    filledOrders,
    addOrder,
    updateOrder,
    openCount: openOrders.length,
    filledCount: filledOrders.length
  }
}

// ===============================================
// AI RECOMMENDATIONS HOOKS
// ===============================================

/**
 * Hook for AI recommendations management
 */
export const useAIRecommendations = (filters?: {
  symbol?: string
  minConfidence?: number
  action?: 'BUY' | 'SELL'
}) => {
  const {
    recommendations,
    activeRecommendations,
    isGenerating,
    error,
    addRecommendation,
    executeRecommendation,
    generateRecommendation,
    refreshRecommendations,
    clearExpiredRecommendations,
    executingIds
  } = useAIStore(
    (state) => ({
      recommendations: state.recommendations,
      activeRecommendations: state.activeRecommendations,
      isGenerating: state.isGenerating,
      error: state.error,
      addRecommendation: state.addRecommendation,
      executeRecommendation: state.executeRecommendation,
      generateRecommendation: state.generateRecommendation,
      refreshRecommendations: state.refreshRecommendations,
      clearExpiredRecommendations: state.clearExpiredRecommendations,
      executingIds: state.executingIds
    }),
    shallow
  )

  // Filter recommendations based on provided filters
  const filteredRecommendations = useMemo(() => {
    let filtered = activeRecommendations

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
  }, [activeRecommendations, filters])

  // Auto-clear expired recommendations every minute
  useEffect(() => {
    const interval = setInterval(clearExpiredRecommendations, 60000)
    return () => clearInterval(interval)
  }, [clearExpiredRecommendations])

  const executeWithCallback = useCallback(
    async (recommendation: AIRecommendation, onSuccess?: () => void, onError?: (error: Error) => void) => {
      try {
        await executeRecommendation(recommendation)
        onSuccess?.()
      } catch (error) {
        onError?.(error as Error)
      }
    },
    [executeRecommendation]
  )

  return {
    recommendations: filteredRecommendations,
    allRecommendations: recommendations,
    isGenerating,
    error,
    executingIds,
    actions: {
      generate: generateRecommendation,
      execute: executeWithCallback,
      refresh: refreshRecommendations,
      clearExpired: clearExpiredRecommendations
    },
    stats: {
      total: recommendations.length,
      active: activeRecommendations.length,
      highConfidence: activeRecommendations.filter(r => r.confidence >= 80).length,
      executing: executingIds.size
    }
  }
}

/**
 * Hook for individual recommendation tracking
 */
export const useRecommendation = (id: string) => {
  const recommendation = useAIStore(
    (state) => state.recommendations.find(r => r.id === id)
  )
  
  const { updateRecommendation, executeRecommendation, executingIds } = useAIStore(
    (state) => ({
      updateRecommendation: state.updateRecommendation,
      executeRecommendation: state.executeRecommendation,
      executingIds: state.executingIds
    }),
    shallow
  )

  const isExecuting = executingIds.has(id)
  const isExpired = recommendation ? new Date() > new Date(recommendation.expiresAt) : false

  return {
    recommendation,
    isExecuting,
    isExpired,
    canExecute: recommendation && !isExecuting && !isExpired && recommendation.safetyChecks.passedRiskCheck,
    update: (updates: Partial<AIRecommendation>) => updateRecommendation(id, updates),
    execute: () => recommendation && executeRecommendation(recommendation)
  }
}

// ===============================================
// BOT MANAGEMENT HOOKS
// ===============================================

/**
 * Hook for trading bot management
 */
export const useTradingBot = () => {
  const {
    config,
    metrics,
    engineStatus,
    isInitializing,
    error,
    activityLogs,
    startBot,
    stopBot,
    updateConfig,
    updateMetrics,
    addActivity,
    clearLogs
  } = useBotStore(
    (state) => ({
      config: state.config,
      metrics: state.metrics,
      engineStatus: state.engineStatus,
      isInitializing: state.isInitializing,
      error: state.error,
      activityLogs: state.activityLogs.slice(0, 50), // Only recent activities
      startBot: state.startBot,
      stopBot: state.stopBot,
      updateConfig: state.updateConfig,
      updateMetrics: state.updateMetrics,
      addActivity: state.addActivity,
      clearLogs: state.clearLogs
    }),
    shallow
  )

  const isRunning = metrics.isRunning && engineStatus === 'RUNNING'
  const canStart = !isRunning && !isInitializing && engineStatus !== 'ERROR'
  const canStop = isRunning && !isInitializing

  const startWithConfig = useCallback(
    async (botConfig: BotConfiguration, onSuccess?: () => void, onError?: (error: Error) => void) => {
      try {
        await startBot(botConfig)
        onSuccess?.()
      } catch (error) {
        onError?.(error as Error)
      }
    },
    [startBot]
  )

  const stopWithCallback = useCallback(
    async (onSuccess?: () => void, onError?: (error: Error) => void) => {
      try {
        await stopBot()
        onSuccess?.()
      } catch (error) {
        onError?.(error as Error)
      }
    },
    [stopBot]
  )

  // Auto-update uptime every second when bot is running
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      updateMetrics({ uptime: metrics.uptime + 1 })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, metrics.uptime, updateMetrics])

  return {
    config,
    metrics,
    engineStatus,
    isInitializing,
    error,
    activityLogs,
    isRunning,
    canStart,
    canStop,
    actions: {
      start: startWithConfig,
      stop: stopWithCallback,
      updateConfig,
      updateMetrics,
      addActivity,
      clearLogs
    },
    stats: {
      uptime: metrics.uptime,
      tradesExecuted: metrics.tradesExecuted,
      successRate: metrics.successRate,
      totalPnL: metrics.totalPnL,
      dailyPnL: metrics.dailyPnL,
      riskScore: metrics.riskScore
    }
  }
}

/**
 * Hook for bot configuration management
 */
export const useBotConfiguration = () => {
  const { config, updateConfig, engineStatus } = useBotStore(
    (state) => ({
      config: state.config,
      updateConfig: state.updateConfig,
      engineStatus: state.engineStatus
    }),
    shallow
  )

  const isReadOnly = engineStatus === 'RUNNING'

  const updateStrategy = useCallback(
    (strategyId: string, updates: any) => {
      if (!config || isReadOnly) return

      const updatedStrategies = config.strategies.map(strategy =>
        strategy.id === strategyId
          ? { ...strategy, ...updates }
          : strategy
      )

      updateConfig({ strategies: updatedStrategies })
    },
    [config, updateConfig, isReadOnly]
  )

  const toggleStrategy = useCallback(
    (strategyId: string) => {
      if (!config || isReadOnly) return

      const updatedStrategies = config.strategies.map(strategy =>
        strategy.id === strategyId
          ? { ...strategy, enabled: !strategy.enabled }
          : strategy
      )

      updateConfig({ strategies: updatedStrategies })
    },
    [config, updateConfig, isReadOnly]
  )

  return {
    config,
    isReadOnly,
    enabledStrategies: config?.strategies.filter(s => s.enabled) || [],
    disabledStrategies: config?.strategies.filter(s => !s.enabled) || [],
    actions: {
      update: updateConfig,
      updateStrategy,
      toggleStrategy
    }
  }
}

// ===============================================
// MARKET DATA HOOKS
// ===============================================

/**
 * Hook for market data and real-time updates
 */
export const useMarketData = (symbols?: string[]) => {
  const {
    marketData,
    priceUpdates,
    watchlist,
    selectedSymbol,
    isConnected,
    connectionStatus,
    updatePrice,
    setSelectedSymbol,
    addToWatchlist,
    removeFromWatchlist,
    getLatestPrice,
    getPriceChange
  } = useMarketStore(
    (state) => ({
      marketData: state.marketData,
      priceUpdates: state.priceUpdates,
      watchlist: state.watchlist,
      selectedSymbol: state.selectedSymbol,
      isConnected: state.isConnected,
      connectionStatus: state.connectionStatus,
      updatePrice: state.updatePrice,
      setSelectedSymbol: state.setSelectedSymbol,
      addToWatchlist: state.addToWatchlist,
      removeFromWatchlist: state.removeFromWatchlist,
      getLatestPrice: state.getLatestPrice,
      getPriceChange: state.getPriceChange
    }),
    shallow
  )

  // Get data for specific symbols or watchlist
  const targetSymbols = symbols || watchlist

  const symbolData = useMemo(
    () => targetSymbols.map(symbol => ({
      symbol,
      price: getLatestPrice(symbol),
      change: getPriceChange(symbol),
      marketData: marketData[symbol],
      priceUpdate: priceUpdates[symbol]
    })),
    [targetSymbols, getLatestPrice, getPriceChange, marketData, priceUpdates]
  )

  return {
    symbolData,
    watchlist,
    selectedSymbol,
    isConnected,
    connectionStatus,
    actions: {
      updatePrice,
      setSelectedSymbol,
      addToWatchlist,
      removeFromWatchlist,
      getLatestPrice,
      getPriceChange
    }
  }
}

/**
 * Hook for individual symbol tracking
 */
export const useSymbol = (symbol: string) => {
  const { getLatestPrice, getPriceChange, marketData, priceUpdates } = useMarketStore(
    (state) => ({
      getLatestPrice: state.getLatestPrice,
      getPriceChange: state.getPriceChange,
      marketData: state.marketData,
      priceUpdates: state.priceUpdates
    }),
    shallow
  )

  const price = getLatestPrice(symbol)
  const change = getPriceChange(symbol)
  const data = marketData[symbol]
  const update = priceUpdates[symbol]

  return {
    symbol,
    price,
    change,
    changePercent: price && change ? (change / price) * 100 : null,
    marketData: data,
    lastUpdate: update?.timestamp,
    isUp: (change || 0) > 0,
    isDown: (change || 0) < 0,
    isFlat: (change || 0) === 0
  }
}

// ===============================================
// TRADING ACTIONS HOOKS
// ===============================================

/**
 * Hook for trading mode management
 */
export const useTradingMode = () => {
  const { tradingMode, setTradingMode } = useTradingStore(
    (state) => ({
      tradingMode: state.tradingMode,
      setTradingMode: state.setTradingMode
    }),
    shallow
  )

  const isLiveTrading = tradingMode === 'LIVE'
  const isPaperTrading = tradingMode === 'PAPER'

  const toggleMode = useCallback(() => {
    setTradingMode(isLiveTrading ? 'PAPER' : 'LIVE')
  }, [isLiveTrading, setTradingMode])

  const switchToLive = useCallback(() => {
    setTradingMode('LIVE')
  }, [setTradingMode])

  const switchToPaper = useCallback(() => {
    setTradingMode('PAPER')
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
 */
export const useOrderExecution = () => {
  const { addOrder, updateOrder } = usePortfolioStore(
    (state) => ({
      addOrder: state.addOrder,
      updateOrder: state.updateOrder
    }),
    shallow
  )

  const { tradingMode } = useTradingStore((state) => ({
    tradingMode: state.tradingMode
  }))

  const executeOrder = useCallback(
    async (orderRequest: {
      symbol: string
      side: 'buy' | 'sell'
      quantity?: number
      notional?: number
      type: 'market' | 'limit'
      limit_price?: number
    }) => {
      try {
        const response = await fetch('/api/trading/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...orderRequest,
            trading_mode: tradingMode
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to execute order')
        }

        const order = await response.json()
        addOrder(order)
        
        return order
      } catch (error) {
        throw error
      }
    },
    [addOrder, tradingMode]
  )

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        const response = await fetch(`/api/trading/orders/${orderId}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to cancel order')
        }

        updateOrder(orderId, { status: 'canceled' })
        return true
      } catch (error) {
        throw error
      }
    },
    [updateOrder]
  )

  return {
    executeOrder,
    cancelOrder,
    tradingMode,
    isLiveMode: tradingMode === 'LIVE'
  }
}

// ===============================================
// REAL-TIME DATA HOOKS
// ===============================================

/**
 * Hook for real-time WebSocket connection management
 */
export const useRealTimeData = () => {
  const { connectionStatus, setConnectionStatus, updatePrice } = useMarketStore(
    (state) => ({
      connectionStatus: state.connectionStatus,
      setConnectionStatus: state.setConnectionStatus,
      updatePrice: state.updatePrice
    }),
    shallow
  )

  const { watchlist } = useMarketStore((state) => ({ watchlist: state.watchlist }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    const ws = new WebSocket(wsUrl)
    let reconnectTimer: NodeJS.Timeout

    ws.onopen = () => {
      setConnectionStatus('connected')
      console.log('🔗 WebSocket connected')
      
      // Subscribe to watchlist symbols
      watchlist.forEach(symbol => {
        ws.send(JSON.stringify({ type: 'subscribe', symbol }))
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'price_update':
            updatePrice(data.symbol, data.price, data.change)
            break
          case 'market_data':
            // Handle full market data updates
            break
          default:
            console.log('Unknown WebSocket message:', data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      console.log('🔌 WebSocket disconnected')
      
      // Attempt to reconnect after 3 seconds
      reconnectTimer = setTimeout(() => {
        setConnectionStatus('reconnecting')
        // The useEffect will create a new connection
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('reconnecting')
    }

    return () => {
      clearTimeout(reconnectTimer)
      ws.close()
    }
  }, [watchlist, setConnectionStatus, updatePrice])

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isReconnecting: connectionStatus === 'reconnecting'
  }
}

// ===============================================
// PERFORMANCE MONITORING HOOKS
// ===============================================

/**
 * Hook for performance analytics
 */
export const usePerformanceAnalytics = () => {
  const { metrics: botMetrics } = useBotStore(
    (state) => ({ metrics: state.metrics }),
    shallow
  )

  const { calculateMetrics: portfolioMetrics } = usePortfolioStore(
    (state) => ({ calculateMetrics: state.calculateMetrics }),
    shallow
  )

  const portfolio = portfolioMetrics()
  const generationStats = useAIStore((state) => state.generationStats)

  const analytics = useMemo(() => ({
    portfolio: {
      totalValue: portfolio.totalValue,
      dayPnL: portfolio.dayPnL,
      totalPnL: portfolio.totalPnL,
      winnersCount: portfolio.winnersCount,
      losersCount: portfolio.losersCount,
      winRate: portfolio.winnersCount / (portfolio.winnersCount + portfolio.losersCount) || 0
    },
    bot: {
      uptime: botMetrics.uptime,
      tradesExecuted: botMetrics.tradesExecuted,
      successRate: botMetrics.successRate,
      totalPnL: botMetrics.totalPnL,
      dailyPnL: botMetrics.dailyPnL
    },
    ai: {
      totalGenerated: generationStats.totalGenerated,
      successfulExecutions: generationStats.successfulExecutions,
      failedExecutions: generationStats.failedExecutions,
      executionRate: generationStats.totalGenerated > 0 
        ? generationStats.successfulExecutions / generationStats.totalGenerated 
        : 0,
      averageConfidence: generationStats.averageConfidence
    }
  }), [portfolio, botMetrics, generationStats])

  return analytics
}

/**
 * Hook for error handling across stores
 */
export const useGlobalError = () => {
  const portfolioError = usePortfolioStore((state) => state.error)
  const aiError = useAIStore((state) => state.error)
  const botError = useBotStore((state) => state.error)
  const tradingError = useTradingStore((state) => state.error)

  const clearPortfolioError = usePortfolioStore((state) => state.setError)
  const clearAIError = useAIStore((state) => state.setError)
  const clearBotError = useBotStore((state) => state.setError)
  const clearTradingError = useTradingStore((state) => state.clearError)

  const hasError = !!(portfolioError || aiError || botError || tradingError)
  const firstError = portfolioError || aiError || botError || tradingError

  const clearAllErrors = useCallback(() => {
    clearPortfolioError(null)
    clearAIError(null)
    clearBotError(null)
    clearTradingError()
  }, [clearPortfolioError, clearAIError, clearBotError, clearTradingError])

  return {
    hasError,
    error: firstError,
    errors: {
      portfolio: portfolioError,
      ai: aiError,
      bot: botError,
      trading: tradingError
    },
    clearAllErrors,
    clearError: (type: 'portfolio' | 'ai' | 'bot' | 'trading') => {
      switch (type) {
        case 'portfolio':
          clearPortfolioError(null)
          break
        case 'ai':
          clearAIError(null)
          break
        case 'bot':
          clearBotError(null)
          break
        case 'trading':
          clearTradingError()
          break
      }
    }
  }
}

// ===============================================
// UTILITY HOOKS
// ===============================================

/**
 * Hook for store initialization and cleanup
 */
export const useStoreInitialization = () => {
  const initializeStore = useTradingStore((state) => state.initializeStore)
  const refreshPortfolio = usePortfolioStore((state) => state.refreshPortfolio)
  const refreshRecommendations = useAIStore((state) => state.refreshRecommendations)

  const initialize = useCallback(async () => {
    try {
      await Promise.all([
        initializeStore(),
        refreshPortfolio(),
        refreshRecommendations()
      ])
    } catch (error) {
      console.error('Failed to initialize stores:', error)
    }
  }, [initializeStore, refreshPortfolio, refreshRecommendations])

  // Auto-initialize on mount
  useEffect(() => {
    initialize()
  }, [])

  return { initialize }
}

/**
 * Hook for periodic data refresh
 */
export const usePeriodicRefresh = (intervalMs = 30000) => {
  const refreshPortfolio = usePortfolioStore((state) => state.refreshPortfolio)
  const refreshRecommendations = useAIStore((state) => state.refreshRecommendations)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await Promise.all([
          refreshPortfolio(),
          refreshRecommendations()
        ])
      } catch (error) {
        console.error('Periodic refresh failed:', error)
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [refreshPortfolio, refreshRecommendations, intervalMs])
}