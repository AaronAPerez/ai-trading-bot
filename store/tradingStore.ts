// ===============================================
// TRADING STORE - Zustand State Management
// src/store/tradingStore.ts
// ===============================================

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { 
  Portfolio, 
  Position, 
  AIRecommendation, 
  BotConfiguration,
  BotMetrics,
  Order,
  TradeHistory,
  BotActivityLog,
  RiskAssessment,
  AlpacaAccount,
  TradingMode,
  EngineStatus
} from '@/types/trading'

// ===============================================
// STORE STATE INTERFACE
// ===============================================

interface TradingState {
  // ============ ACCOUNT & PORTFOLIO ============
  account: AlpacaAccount | null
  portfolio: Portfolio | null
  positions: Position[]
  orders: Order[]
  tradeHistory: TradeHistory[]
  
  // ============ TRADING BOT ============
  botConfig: BotConfiguration | null
  botMetrics: BotMetrics
  botActivityLogs: BotActivityLog[]
  engineStatus: EngineStatus
  isInitializing: boolean
  
  // ============ AI RECOMMENDATIONS ============
  recommendations: AIRecommendation[]
  activeRecommendations: AIRecommendation[]
  recommendationHistory: AIRecommendation[]
  lastRecommendationUpdate: Date | null
  
  // ============ MARKET DATA ============
  marketData: Record<string, any>
  watchlist: string[]
  priceUpdates: Record<string, { price: number; timestamp: Date }>
  
  // ============ RISK MANAGEMENT ============
  riskAssessment: RiskAssessment | null
  dailyLossLimit: number
  positionSizeLimit: number
  
  // ============ UI STATE ============
  tradingMode: TradingMode
  isConnected: boolean
  isLoading: boolean
  error: string | null
  selectedSymbol: string | null
  
  // ============ REAL-TIME UPDATES ============
  lastUpdate: Date | null
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  dataFeedStatus: 'active' | 'inactive' | 'error'
}

// ===============================================
// STORE ACTIONS INTERFACE
// ===============================================

interface TradingActions {
  // ============ ACCOUNT ACTIONS ============
  setAccount: (account: AlpacaAccount) => void
  updatePortfolio: (portfolio: Portfolio) => void
  updatePositions: (positions: Position[]) => void
  addOrder: (order: Order) => void
  updateOrder: (orderId: string, updates: Partial<Order>) => void
  addTradeToHistory: (trade: TradeHistory) => void
  
  // ============ BOT ACTIONS ============
  startBot: (config: BotConfiguration) => Promise<void>
  stopBot: () => Promise<void>
  updateBotConfig: (config: Partial<BotConfiguration>) => void
  updateBotMetrics: (metrics: Partial<BotMetrics>) => void
  addBotActivity: (activity: BotActivityLog) => void
  clearBotLogs: () => void
  
  // ============ AI RECOMMENDATIONS ============
  addRecommendation: (recommendation: AIRecommendation) => void
  updateRecommendation: (id: string, updates: Partial<AIRecommendation>) => void
  removeRecommendation: (id: string) => void
  executeRecommendation: (recommendation: AIRecommendation) => Promise<void>
  refreshRecommendations: () => Promise<void>
  clearExpiredRecommendations: () => void
  
  // ============ MARKET DATA ACTIONS ============
  updateMarketData: (symbol: string, data: any) => void
  updatePrice: (symbol: string, price: number) => void
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  setSelectedSymbol: (symbol: string | null) => void
  
  // ============ RISK MANAGEMENT ============
  updateRiskAssessment: (assessment: RiskAssessment) => void
  setDailyLossLimit: (limit: number) => void
  setPositionSizeLimit: (limit: number) => void
  
  // ============ UI ACTIONS ============
  setTradingMode: (mode: TradingMode) => void
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void
  setDataFeedStatus: (status: 'active' | 'inactive' | 'error') => void
  
  // ============ UTILITY ACTIONS ============
  reset: () => void
  clearError: () => void
  updateLastUpdate: () => void
  initializeStore: () => Promise<void>
}

// ===============================================
// COMBINED STORE TYPE
// ===============================================

type TradingStore = TradingState & TradingActions

// ===============================================
// INITIAL STATE
// ===============================================

const initialState: TradingState = {
  // Account & Portfolio
  account: null,
  portfolio: null,
  positions: [],
  orders: [],
  tradeHistory: [],
  
  // Trading Bot
  botConfig: null,
  botMetrics: {
    isRunning: false,
    uptime: 0,
    tradesExecuted: 0,
    recommendationsGenerated: 0,
    successRate: 0,
    totalPnL: 0,
    dailyPnL: 0,
    riskScore: 0,
    lastActivity: undefined
  },
  botActivityLogs: [],
  engineStatus: 'STOPPED',
  isInitializing: false,
  
  // AI Recommendations
  recommendations: [],
  activeRecommendations: [],
  recommendationHistory: [],
  lastRecommendationUpdate: null,
  
  // Market Data
  marketData: {},
  watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'BTCUSD', 'ETHUSD'],
  priceUpdates: {},
  
  // Risk Management
  riskAssessment: null,
  dailyLossLimit: 1000,
  positionSizeLimit: 10000,
  
  // UI State
  tradingMode: 'PAPER',
  isConnected: false,
  isLoading: false,
  error: null,
  selectedSymbol: null,
  
  // Real-time Updates
  lastUpdate: null,
  connectionStatus: 'disconnected',
  dataFeedStatus: 'inactive'
}

// ===============================================
// ZUSTAND STORE IMPLEMENTATION
// ===============================================

export const useTradingStore = create<TradingStore>()(
  // Enable time-travel debugging in development
  subscribeWithSelector(
    // Persist critical data to localStorage
    persist(
      // Use Immer for immutable updates
      immer<TradingStore>((set, get) => ({
        ...initialState,

        // ============ ACCOUNT ACTIONS ============
        
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

        addOrder: (order) =>
          set((state) => {
            const existingIndex = state.orders.findIndex(o => o.id === order.id)
            if (existingIndex >= 0) {
              state.orders[existingIndex] = order
            } else {
              state.orders.unshift(order)
            }
            
            // Keep only last 100 orders
            if (state.orders.length > 100) {
              state.orders = state.orders.slice(0, 100)
            }
            
            state.lastUpdate = new Date()
          }),

        updateOrder: (orderId, updates) =>
          set((state) => {
            const orderIndex = state.orders.findIndex(o => o.id === orderId)
            if (orderIndex >= 0) {
              Object.assign(state.orders[orderIndex], updates)
              state.lastUpdate = new Date()
            }
          }),

        addTradeToHistory: (trade) =>
          set((state) => {
            state.tradeHistory.unshift(trade)
            
            // Keep only last 500 trades
            if (state.tradeHistory.length > 500) {
              state.tradeHistory = state.tradeHistory.slice(0, 500)
            }
            
            state.lastUpdate = new Date()
          }),

        // ============ BOT ACTIONS ============

        startBot: async (config) => {
          set((state) => {
            state.isInitializing = true
            state.error = null
          })

          try {
            // Initialize bot with configuration
            const response = await fetch('/api/bot/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config)
            })

            if (!response.ok) {
              throw new Error('Failed to start trading bot')
            }

            const result = await response.json()

            set((state) => {
              state.botConfig = config
              state.engineStatus = 'RUNNING'
              state.botMetrics.isRunning = true
              state.isInitializing = false
              state.lastUpdate = new Date()
              
              // Add start activity log
              state.botActivityLogs.unshift({
                id: `bot_start_${Date.now()}`,
                timestamp: new Date(),
                type: 'system',
                message: `Trading bot started in ${config.mode} mode`,
                status: 'completed',
                details: `Configuration: ${config.strategies.length} strategies enabled`
              })
            })

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to start bot'
              state.isInitializing = false
              state.engineStatus = 'ERROR'
            })
          }
        },

        stopBot: async () => {
          try {
            const response = await fetch('/api/bot/stop', { method: 'POST' })
            
            if (!response.ok) {
              throw new Error('Failed to stop trading bot')
            }

            set((state) => {
              state.engineStatus = 'STOPPED'
              state.botMetrics.isRunning = false
              state.lastUpdate = new Date()
              
              // Add stop activity log
              state.botActivityLogs.unshift({
                id: `bot_stop_${Date.now()}`,
                timestamp: new Date(),
                type: 'system',
                message: 'Trading bot stopped',
                status: 'completed',
                details: `Uptime: ${Math.floor(state.botMetrics.uptime / 60)}m`
              })
            })

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to stop bot'
            })
          }
        },

        updateBotConfig: (config) =>
          set((state) => {
            if (state.botConfig) {
              Object.assign(state.botConfig, config)
              state.lastUpdate = new Date()
            }
          }),

        updateBotMetrics: (metrics) =>
          set((state) => {
            Object.assign(state.botMetrics, metrics)
            state.lastUpdate = new Date()
          }),

        addBotActivity: (activity) =>
          set((state) => {
            state.botActivityLogs.unshift(activity)
            
            // Keep only last 200 activity logs
            if (state.botActivityLogs.length > 200) {
              state.botActivityLogs = state.botActivityLogs.slice(0, 200)
            }
            
            state.lastUpdate = new Date()
          }),

        clearBotLogs: () =>
          set((state) => {
            state.botActivityLogs = []
          }),

        // ============ AI RECOMMENDATIONS ============

        addRecommendation: (recommendation) =>
          set((state) => {
            // Remove any existing recommendation for the same symbol
            state.recommendations = state.recommendations.filter(r => r.symbol !== recommendation.symbol)
            
            // Add new recommendation
            state.recommendations.unshift(recommendation)
            
            // Update active recommendations (non-expired)
            const now = new Date()
            state.activeRecommendations = state.recommendations.filter(r => 
              new Date(r.expiresAt) > now
            )
            
            // Add to history
            state.recommendationHistory.unshift(recommendation)
            if (state.recommendationHistory.length > 100) {
              state.recommendationHistory = state.recommendationHistory.slice(0, 100)
            }
            
            state.lastRecommendationUpdate = new Date()
            state.botMetrics.recommendationsGenerated++
          }),

        updateRecommendation: (id, updates) =>
          set((state) => {
            const index = state.recommendations.findIndex(r => r.id === id)
            if (index >= 0) {
              Object.assign(state.recommendations[index], updates)
              state.lastRecommendationUpdate = new Date()
            }
          }),

        removeRecommendation: (id) =>
          set((state) => {
            state.recommendations = state.recommendations.filter(r => r.id !== id)
            state.activeRecommendations = state.activeRecommendations.filter(r => r.id !== id)
          }),

        executeRecommendation: async (recommendation) => {
          try {
            const response = await fetch('/api/trading/execute-recommendation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(recommendation)
            })

            if (!response.ok) {
              throw new Error('Failed to execute recommendation')
            }

            const result = await response.json()

            set((state) => {
              // Update recommendation status
              const index = state.recommendations.findIndex(r => r.id === recommendation.id)
              if (index >= 0) {
                state.recommendations[index] = {
                  ...state.recommendations[index],
                  // Add execution metadata
                  executionMetadata: {
                    ...state.recommendations[index].executionMetadata,
                    executed: true,
                    executedAt: new Date(),
                    orderId: result.orderId
                  }
                }
              }

              // Update bot metrics
              state.botMetrics.tradesExecuted++
              
              // Add activity log
              state.botActivityLogs.unshift({
                id: `exec_${Date.now()}`,
                timestamp: new Date(),
                type: 'trade',
                symbol: recommendation.symbol,
                message: `Executed ${recommendation.action} recommendation for ${recommendation.symbol}`,
                status: 'completed',
                details: `Confidence: ${recommendation.confidence}%, Order ID: ${result.orderId}`
              })
            })

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to execute recommendation'
            })
            throw error
          }
        },

        refreshRecommendations: async () => {
          try {
            const response = await fetch('/api/ai/recommendations')
            
            if (!response.ok) {
              throw new Error('Failed to fetch recommendations')
            }

            const recommendations = await response.json()

            set((state) => {
              state.recommendations = recommendations
              state.activeRecommendations = recommendations.filter((r: AIRecommendation) => 
                new Date(r.expiresAt) > new Date()
              )
              state.lastRecommendationUpdate = new Date()
            })

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to refresh recommendations'
            })
          }
        },

        clearExpiredRecommendations: () =>
          set((state) => {
            const now = new Date()
            state.recommendations = state.recommendations.filter(r => 
              new Date(r.expiresAt) > now
            )
            state.activeRecommendations = state.recommendations
          }),

        // ============ MARKET DATA ACTIONS ============

        updateMarketData: (symbol, data) =>
          set((state) => {
            state.marketData[symbol] = data
            state.lastUpdate = new Date()
          }),

        updatePrice: (symbol, price) =>
          set((state) => {
            state.priceUpdates[symbol] = {
              price,
              timestamp: new Date()
            }
            state.lastUpdate = new Date()
          }),

        addToWatchlist: (symbol) =>
          set((state) => {
            if (!state.watchlist.includes(symbol)) {
              state.watchlist.push(symbol)
            }
          }),

        removeFromWatchlist: (symbol) =>
          set((state) => {
            state.watchlist = state.watchlist.filter(s => s !== symbol)
          }),

        setSelectedSymbol: (symbol) =>
          set((state) => {
            state.selectedSymbol = symbol
          }),

        // ============ RISK MANAGEMENT ============

        updateRiskAssessment: (assessment) =>
          set((state) => {
            state.riskAssessment = assessment
            state.lastUpdate = new Date()
          }),

        setDailyLossLimit: (limit) =>
          set((state) => {
            state.dailyLossLimit = limit
          }),

        setPositionSizeLimit: (limit) =>
          set((state) => {
            state.positionSizeLimit = limit
          }),

        // ============ UI ACTIONS ============

        setTradingMode: (mode) =>
          set((state) => {
            state.tradingMode = mode
          }),

        setConnected: (connected) =>
          set((state) => {
            state.isConnected = connected
            state.connectionStatus = connected ? 'connected' : 'disconnected'
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading
          }),

        setError: (error) =>
          set((state) => {
            state.error = error
          }),

        setConnectionStatus: (status) =>
          set((state) => {
            state.connectionStatus = status
          }),

        setDataFeedStatus: (status) =>
          set((state) => {
            state.dataFeedStatus = status
          }),

        // ============ UTILITY ACTIONS ============

        reset: () => set(initialState),

        clearError: () =>
          set((state) => {
            state.error = null
          }),

        updateLastUpdate: () =>
          set((state) => {
            state.lastUpdate = new Date()
          }),

        initializeStore: async () => {
          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            // Initialize with account data
            const accountResponse = await fetch('/api/alpaca/account')
            if (accountResponse.ok) {
              const account = await accountResponse.json()
              get().setAccount(account)
            }

            // Initialize with positions
            const positionsResponse = await fetch('/api/alpaca/positions')
            if (positionsResponse.ok) {
              const positions = await accountResponse.json()
              get().updatePositions(positions)
            }

            // Initialize with recent orders
            const ordersResponse = await fetch('/api/alpaca/orders?status=open')
            if (ordersResponse.ok) {
              const orders = await ordersResponse.json()
              orders.forEach((order: Order) => get().addOrder(order))
            }

            set((state) => {
              state.isLoading = false
              state.isConnected = true
              state.lastUpdate = new Date()
            })

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to initialize store'
              state.isLoading = false
            })
          }
        }
      })),
      {
        name: 'trading-store',
        storage: createJSONStorage(() => localStorage),
        // Only persist critical user settings, not real-time data
        partialize: (state) => ({
          botConfig: state.botConfig,
          watchlist: state.watchlist,
          tradingMode: state.tradingMode,
          dailyLossLimit: state.dailyLossLimit,
          positionSizeLimit: state.positionSizeLimit
        })
      }
    )
  )
)

// ===============================================
// STORE SELECTORS FOR OPTIMIZED SUBSCRIPTIONS
// ===============================================

/**
 * Selector for portfolio metrics
 */
export const selectPortfolioMetrics = (state: TradingStore) => ({
  totalValue: state.portfolio?.totalValue || 0,
  dayPnL: state.portfolio?.dayPnL || 0,
  totalPnL: state.portfolio?.totalPnL || 0,
  buyingPower: state.account?.buying_power || 0,
  equity: state.account?.equity || 0
})

/**
 * Selector for bot status
 */
export const selectBotStatus = (state: TradingStore) => ({
  isRunning: state.botMetrics.isRunning,
  engineStatus: state.engineStatus,
  uptime: state.botMetrics.uptime,
  tradesExecuted: state.botMetrics.tradesExecuted,
  successRate: state.botMetrics.successRate,
  dailyPnL: state.botMetrics.dailyPnL
})

/**
 * Selector for active recommendations
 */
export const selectActiveRecommendations = (state: TradingStore) => 
  state.activeRecommendations.filter(r => new Date(r.expiresAt) > new Date())

/**
 * Selector for connection status
 */
export const selectConnectionStatus = (state: TradingStore) => ({
  isConnected: state.isConnected,
  connectionStatus: state.connectionStatus,
  dataFeedStatus: state.dataFeedStatus,
  lastUpdate: state.lastUpdate
})

// ===============================================
// STORE HOOKS FOR COMPONENT USAGE
// ===============================================

/**
 * Hook for portfolio data
 */
export const usePortfolio = () => useTradingStore(selectPortfolioMetrics)

/**
 * Hook for bot status
 */
export const useBotStatus = () => useTradingStore(selectBotStatus)

/**
 * Hook for recommendations
 */
export const useRecommendations = () => useTradingStore(selectActiveRecommendations)

/**
 * Hook for connection status
 */
export const useConnectionStatus = () => useTradingStore(selectConnectionStatus)

// ===============================================
// STORE ACTIONS EXPORTS
// ===============================================

export const useTradingActions = () => {
  const store = useTradingStore()
  
  return {
    // Account actions
    setAccount: store.setAccount,
    updatePortfolio: store.updatePortfolio,
    updatePositions: store.updatePositions,
    
    // Bot actions
    startBot: store.startBot,
    stopBot: store.stopBot,
    updateBotConfig: store.updateBotConfig,
    
    // Recommendation actions
    executeRecommendation: store.executeRecommendation,
    refreshRecommendations: store.refreshRecommendations,
    
    // UI actions
    setTradingMode: store.setTradingMode,
    setError: store.setError,
    clearError: store.clearError,
    
    // Utility
    initializeStore: store.initializeStore
  }
}