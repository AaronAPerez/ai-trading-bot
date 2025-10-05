"use client"
// Dashboard Container (Layout)

import { useEffect, useState, useCallback } from 'react'
import '../../styles/dashboard.css'
import { useAutoExecution } from "@/hooks/trading/useAutoExecution"
import { useTradingBot } from "@/hooks/trading/useTradingBot"
import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
import useAIBotActivity from "@/hooks/useAIBotActivity"
import AITradingNotifications from "../notifications/AITradingNotifications"
import useAITradingNotifications from "@/hooks/useAITradingNotifications"
import useRealAITrading from "@/hooks/useRealAITrading"
import LiveBalanceDisplay from "./LiveBalanceDisplay"
import { ClientSafeTime } from "@/components/ui/ClientSafeTime"
import { Brain } from 'lucide-react'
import AIInsightsDashboard from "./AIInsightsDashboard"
import { useAILearningManager } from "@/hooks/useAILearningManager"
import { useRealTimeAIMetrics } from "@/hooks/useRealTimeAIMetrics"
import { useRealTimeActivity } from "@/hooks/useRealTimeActivity"
import LiveTradesDisplay from "../trading/LiveTradesDisplay"
import MarketStatusDisplay from "../market/MarketStatusDisplay"

import { PriceChart } from '../charts/PriceChart'
import { PortfolioAllocationChart } from '../charts/PortfolioAllocationChart'
import { PerformanceChart } from '../charts/PerformanceChart'
import { RiskMetricsChart } from '../charts/RiskMetricsChart'
import { CryptoTradingPanel } from '../crypto/CryptoTradingPanel'
import LiveAIActivity from './LiveAIActivity'
import { useQuery } from '@tanstack/react-query'

// Type definitions
interface AlpacaPosition {
  symbol: string
  qty: number
  market_value: number
  current_price: number
  avg_entry_price: number
  unrealized_pl: number
  unrealized_plpc: number
  side: 'long' | 'short'
}

interface BotConfig {
  alpaca: {
    baseUrl: string
    apiKey: string
    secretKey: string
  }
  trading: {
    maxPositionSize: number
    riskLevel: number
  }
  mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  strategies: Array<{
    id: string
    name: string
    enabled: boolean
    weight: number
  }>
  riskManagement: {
    maxPositionSize: number
    maxDailyLoss: number
    maxDrawdown: number
    minConfidence: number
    stopLossPercent: number
    takeProfitPercent: number
  }
  executionSettings: {
    autoExecute: boolean
    minConfidenceForOrder: number
  }
  maxPositionSize: number
  stopLossPercent: number
  takeProfitPercent: number
  minimumConfidence: number
  watchlistSymbols: string[]
}

// Default bot configuration with auto-execution enabled
const defaultBotConfig = {
  alpaca: {
    baseUrl: 'https://paper-api.alpaca.markets',
    apiKey: process.env.NEXT_PUBLIC_APCA_API_KEY_ID || '',
    secretKey: process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY || ''
  },
  trading: {
    maxPositionSize: 10,
    riskLevel: 0.02
  },
  mode: 'BALANCED' as const,
  strategies: [
    { id: 'ml_enhanced', name: 'ML Enhanced', enabled: true, weight: 0.4 },
    { id: 'technical', name: 'Technical Analysis', enabled: true, weight: 0.3 },
    { id: 'sentiment', name: 'Sentiment Analysis', enabled: true, weight: 0.3 }
  ],
  riskManagement: {
    maxPositionSize: 0.05,
    maxDailyLoss: 0.02,
    maxDrawdown: 0.10,
    minConfidence: 0.75,
    stopLossPercent: 0.05,
    takeProfitPercent: 0.10
  },
  executionSettings: {
    autoExecute: true, // Enable auto-execution by default
    minConfidenceForOrder: 0.75
  },
  maxPositionSize: 10,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  minimumConfidence: 75,
  watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'BTC/USD', 'ETH/USD', 'DOGE/USD']
}

export default function AITradingDashboard() {
  const tradingBot = useTradingBot()
  const autoExecution = useAutoExecution(tradingBot.engine)

  // Persistent AI bot state
  const [persistentBotState, setPersistentBotState] = useState({
    isRunning: false,
    startTime: null as Date | null,
    config: defaultBotConfig
  })
  

  // Only poll Alpaca data when AI bot is active to reduce unnecessary API calls
  const account = useAlpacaAccount(persistentBotState.isRunning ? 5000 : undefined)
  const positions = useAlpacaPositions(persistentBotState.isRunning ? 15000 : undefined)

  const aiActivity = useAIBotActivity({
    refreshInterval: persistentBotState.isRunning ? 5000 : 30000, // Slower when inactive
    maxActivities: 8,
    autoStart: persistentBotState.isRunning // Start if was running before
  })

  // AI Trading Notifications with real data
  const notifications = useAITradingNotifications({
    maxNotifications: 5,
    autoHideDuration: 10000 // 10 seconds
    // userId will use getCurrentUserId() by default
  })

  // Real AI Trading hook for database integration
  const realAITrading = useRealAITrading({
    // userId will use getCurrentUserId() by default
  })

  // AI Learning Manager for 24/7 learning from Alpaca API data
  const aiLearningManager = useAILearningManager()

  // Real-time data hooks using React Query
  const realTimeMetrics = useRealTimeAIMetrics()
  const realTimeActivity = useRealTimeActivity()

  // Store interval reference for cleanup
  const [tradingInterval, setTradingInterval] = useState<NodeJS.Timeout | null>(null)
  const [isStoppingBot, setIsStoppingBot] = useState(false)

  // Real trading monitoring - no simulation
  const startTradingMonitoring = useCallback(() => {
    // Clear any existing interval
    if (tradingInterval) {
      clearInterval(tradingInterval)
    }

    // Monitor real AI trades from Alpaca API
    const interval = setInterval(async () => {
      if (tradingBot.metrics.isRunning || persistentBotState.isRunning) {
        // Check for new real trades from Alpaca API and save to database
        await realAITrading.fetchAndSaveRealTrades()
      } else {
        clearInterval(interval)
        setTradingInterval(null)
      }
    }, 30000) // Check every 30 seconds for real trades

    setTradingInterval(interval)
  }, [tradingBot.metrics.isRunning, persistentBotState.isRunning, tradingInterval])

  const stopTradingMonitoring = useCallback(() => {
    if (tradingInterval) {
      clearInterval(tradingInterval)
      setTradingInterval(null)
    }
  }, [tradingInterval])


  const { data: orders, isLoading } = useQuery({
  queryKey: ['alpacaOrders'],
  queryFn: async () => {
    const res = await fetch('/api/alpaca/orders?limit=20')
    const json = await res.json()
    return json.orders
  },
  refetchInterval: persistentBotState.isRunning ? 30000 : false
})


// const totalPnL = positions_data.reduce(...)
// const dayPnL = account.data ? parseFloat(account.data.dayPnL || account.data.day_pnl || '0') : 0

  // Load persistent state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('ai-trading-bot-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        setPersistentBotState({
          ...parsed,
          startTime: parsed.startTime ? new Date(parsed.startTime) : null
        })

        // If bot was running before refresh, restart it
        if (parsed.isRunning) {
          console.log('Restoring AI trading bot state from previous session')
          tradingBot.startBot(parsed.config || defaultBotConfig)
          // REMOVED: aiActivity.startSimulation() - Using real RealTimeAITradingEngine only
          startTradingMonitoring()
        }
      }
    } catch (error) {
      console.error('Error loading bot state from localStorage:', error)
    }
  }, [])  // Keep empty to only run once on mount to avoid infinite loops

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ai-trading-bot-state', JSON.stringify(persistentBotState))
    } catch (error) {
      console.error('Error saving bot state to localStorage:', error)
    }
  }, [persistentBotState])

  // Update persistent state when trading bot state changes
  useEffect(() => {
    setPersistentBotState(prev => ({
      ...prev,
      isRunning: tradingBot.metrics.isRunning
    }))
  }, [tradingBot.metrics.isRunning])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTradingMonitoring()
    }
  }, [stopTradingMonitoring])

  // Enhanced start function that starts both bot and activity monitoring
  const handleStart = async (config: BotConfig) => {
    await tradingBot.startBot(config)
    // REMOVED: aiActivity.startSimulation() - Using real RealTimeAITradingEngine only

    // Start 24/7 AI Learning Service with Alpaca API data
    console.log('🧠 Starting 24/7 AI Learning Service with Alpaca API data...')
    await aiLearningManager.startLearning()

    // Update persistent state
    setPersistentBotState(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date(),
      config
    }))

    // Start monitoring real trading activity
    startTradingMonitoring()

    // Show system notification that AI trading has started
    setTimeout(() => {
      notifications.addTradeNotification({
        symbol: 'SYSTEM',
        side: 'buy',
        quantity: 1,
        price: 0,
        pnl: undefined,
        confidence: 1.0
      })
    }, 1000)

    console.log('✅ AI Trading Bot + Learning Service started with Alpaca API integration')
  }

  // Enhanced stop function that stops both bot and activity monitoring
  const handleStop = async () => {
    if (isStoppingBot) return // Prevent multiple clicks

    setIsStoppingBot(true)

    try {
      console.log('🛑 Stopping AI Trading Bot...')

      // Stop trading monitoring first
      stopTradingMonitoring()

      // Stop bot and learning service in parallel
      console.log('🛑 Stopping AI Learning Service...')
      await Promise.all([
        tradingBot.stopBot(),
        // REMOVED: aiActivity.stopSimulation() - Using real RealTimeAITradingEngine only
        aiLearningManager.stopLearning()
      ])

      // Update persistent state
      setPersistentBotState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null
      }))

      console.log('✅ AI Trading Bot stopped and state cleared')

    } catch (error) {
      console.error('❌ Error stopping AI Trading Bot:', error)

      // Force update state even if there's an error
      setPersistentBotState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null
      }))

      // Still stop monitoring
      stopTradingMonitoring()
    } finally {
      setIsStoppingBot(false)
    }
  }


  // Calculate financial metrics for bot metrics (simplified since LiveBalanceDisplay handles the main metrics)
  const positions_data = Array.isArray(positions.data) ? positions.data : []
  const totalPnL = positions_data.reduce((total, pos) => total + (parseFloat(pos.unrealized_pl || pos.unrealizedPnL || '0')), 0)
  const dayPnL = account.data ? parseFloat(account.data.dayPnL || account.data.day_pnl || '0') : 0

  // Create proper BotMetrics object
  const botMetrics = {
    isRunning: tradingBot.metrics.isRunning || false,
    uptime: tradingBot.metrics.uptime || 0,
    tradesExecuted: tradingBot.metrics.tradesExecuted || 0,
    recommendationsGenerated: tradingBot.metrics.recommendationsGenerated || 0,
    successRate: tradingBot.metrics.successRate || 0,
    totalPnL: totalPnL,
    dailyPnL: dayPnL,
    riskScore: tradingBot.metrics.riskScore || 0,
    lastActivity: tradingBot.metrics.lastActivity
  }

  return (
    <div className="space-y-6">
      {/* AI Trading Control Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Trading Engine</h1>
              <p className="text-gray-400 text-sm">Powered by Advanced Machine Learning</p>
            </div>
          </div>
        </div>

      



        <div className="flex items-center space-x-4">
          {/* Generate Real Data Button */}
          {/* <button
            onClick={async () => {
              try {
                console.log('🔄 Generating real AI learning data from Alpaca trades...')
                const response = await fetch('/api/generate-learning-data', { method: 'POST' })
                const result = await response.json()
                console.log('✅ Learning data generated:', result)

                // Update bot metrics too
                const metricsResponse = await fetch('/api/update-bot-metrics', { method: 'POST' })
                const metricsResult = await metricsResponse.json()
                console.log('✅ Bot metrics updated:', metricsResult)

                // Force refresh the metrics
                realTimeMetrics.refetch()

                alert(`Generated ${result.learningDataCreated} AI learning records from real trades!`)
              } catch (error) {
                console.error('Error generating real data:', error)
                alert('Error generating real data. Check console for details.')
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Generate Real Data
          </button> */}

          {/* Bot Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${persistentBotState.isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <div className="text-sm">
              <div className={`font-medium ${persistentBotState.isRunning ? 'text-green-400' : 'text-gray-400'}`}>
                {persistentBotState.isRunning ? 'AI Active' : 'AI Stopped'}
              </div>
              {persistentBotState.isRunning && persistentBotState.startTime && (
                <div className="text-xs text-gray-500">
                  {Math.floor((Date.now() - persistentBotState.startTime.getTime()) / 60000)}m uptime
                </div>
              )}
            </div>
          </div>

          {/* Start/Stop Button */}
          <button
            onClick={persistentBotState.isRunning ? handleStop : () => handleStart(defaultBotConfig)}
            disabled={isStoppingBot || tradingBot.isStarting}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isStoppingBot || tradingBot.isStarting
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : persistentBotState.isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
          >
            {isStoppingBot ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Stopping...</span>
              </>
            ) : tradingBot.isStarting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Starting...</span>
              </>
            ) : persistentBotState.isRunning ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Stop AI</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Start AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
  <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
    <h4 className="text-sm text-gray-400 mb-1">Total Equity</h4>
    <div className="text-xl font-bold text-white">
      {account.isLoading ? (
        <div className="animate-pulse bg-gray-600 h-6 w-24 rounded"></div>
      ) : (
        `$${parseFloat(account.data?.equity || '0').toFixed(2)}`
      )}
    </div>
  </div>

  <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
    <h4 className="text-sm text-gray-400 mb-1">Buying Power</h4>
    <div className="text-xl font-bold text-white">
      {account.isLoading ? (
        <div className="animate-pulse bg-gray-600 h-6 w-24 rounded"></div>
      ) : (
        `$${parseFloat(account.data?.buying_power || '0').toFixed(2)}`
      )}
    </div>
  </div>

  <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
    <h4 className="text-sm text-gray-400 mb-1">Open Positions</h4>
    <div className="text-xl font-bold text-white">
      {positions.isLoading ? (
        <div className="animate-pulse bg-gray-600 h-6 w-12 rounded"></div>
      ) : (
        positions.data?.length || 0
      )}
    </div>
  </div>
</div>




      {/* Live Portfolio Balance */}
      <div className="bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-xl p-6 border border-gray-700/50">
        <LiveBalanceDisplay
          refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
          showChangeIndicators={true}
        />
        
      </div>

        {/* 🔥 MAIN FOCUS: Live Trading Activity - Full Width Showcase */}
      <div className="bg-gradient-to-r from-gray-800/50 to-green-900/30 rounded-xl p-6 border-2 border-green-500/30 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Live Trading Activity</h2>
              <p className="text-sm text-gray-400">Real-time orders & AI activity from Alpaca API</p>
            </div>
          </div>
          {persistentBotState.isRunning && (
            <div className="flex items-center space-x-2 bg-green-900/40 px-4 py-2 rounded-lg border border-green-500/40">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-300 font-semibold">Trading Active</span>
            </div>
          )}
        </div>
        <LiveTradesDisplay />
      </div>



      {/* AI Progress and Learning Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 gap-6">
        {/* AI Learning Progress - Real-time Data */}
        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">AI Learning Progress</h3>
            </div>
            <div className="flex items-center space-x-2">
              {realTimeMetrics.isLoading && (
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <div className={`w-2 h-2 rounded-full ${realTimeMetrics.metrics.isLearningActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                }`}></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Accuracy Rate</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-green-400">
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-12 rounded"></div>
                  ) : (
                    `${(realTimeMetrics.metrics.accuracy * 100).toFixed(1)}%`
                  )}
                </span>
                {realTimeMetrics.metrics.accuracy > 0.8 && (
                  <span className="text-xs text-green-300">↗</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Patterns Identified</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-blue-400">
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-8 rounded"></div>
                  ) : (
                    realTimeMetrics.metrics.patternsIdentified.toLocaleString()
                  )}
                </span>
                {realTimeMetrics.metrics.patternsIdentified > 10 && (
                  <span className="text-xs text-blue-300">+{Math.floor(realTimeMetrics.metrics.patternsIdentified / 5)}</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Data Points Processed</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-purple-400">
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-16 rounded"></div>
                  ) : (
                    realTimeMetrics.metrics.dataPointsProcessed.toLocaleString()
                  )}
                </span>
                {realTimeMetrics.metrics.dataPointsProcessed > 100 && (
                  <span className="text-xs text-purple-300">📈</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-purple-700/30">
              <div className="text-xs text-gray-400 mb-2">Learning Sources</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Alpaca API</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400">Live</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Supabase DB</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-400">Synced</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">React Query</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-purple-400">Caching</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        

        {/* AI Performance Metrics - Real-time Alpaca Data */}
        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-6 border border-green-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="text-lg font-semibold text-white">AI Performance</h3>
            </div>
            <div className="flex items-center space-x-2">
              {realTimeMetrics.isLoading && (
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <div className="text-xs text-green-400 font-medium">
                {persistentBotState.isRunning ? 'Live' : 'Inactive'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Success Rate</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-green-400">
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-12 rounded"></div>
                  ) : (
                    `${(realTimeMetrics.metrics.successRate * 100).toFixed(1)}%`
                  )}
                </span>
                {realTimeMetrics.metrics.successRate > 0.7 && (
                  <span className="text-xs text-green-300">🎯</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Trades Executed</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-blue-400">
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-8 rounded"></div>
                  ) : (
                    realTimeMetrics.metrics.tradesExecuted.toLocaleString()
                  )}
                </span>
                {realTimeMetrics.metrics.tradesExecuted > 0 && (
                  <span className="text-xs text-blue-300">📊</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Recommendations</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-purple-400">
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-8 rounded"></div>
                  ) : (
                    realTimeMetrics.metrics.recommendationsGenerated.toLocaleString()
                  )}
                </span>
                {realTimeMetrics.metrics.recommendationsGenerated > 5 && (
                  <span className="text-xs text-purple-300">💡</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Risk Score</span>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${realTimeMetrics.metrics.riskScore > 70 ? 'text-red-400' :
                  realTimeMetrics.metrics.riskScore > 40 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                  {realTimeMetrics.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-5 w-12 rounded"></div>
                  ) : (
                    `${realTimeMetrics.metrics.riskScore}/100`
                  )}
                </span>
                {realTimeMetrics.metrics.riskScore < 30 && (
                  <span className="text-xs text-green-300">🛡️</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-green-700/30">
              <div className="text-xs text-gray-400 mb-2">Real-time Alpaca Portfolio</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Invested Amount</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-blue-400">
                      {realTimeMetrics.isLoading ? (
                        <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
                      ) : (
                        `$${realTimeMetrics.metrics.investedAmount.toFixed(2)}`
                      )}
                    </span>
                    {realTimeMetrics.metrics.positionCount > 0 && (
                      <span className="text-xs text-gray-400">({realTimeMetrics.metrics.positionCount} pos)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total P&L</span>
                  <div className="flex items-center space-x-1">
                    <span className={`font-bold ${realTimeMetrics.metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {realTimeMetrics.isLoading ? (
                        <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
                      ) : (
                        `${realTimeMetrics.metrics.totalPnL >= 0 ? '+' : ''}$${realTimeMetrics.metrics.totalPnL.toFixed(2)}`
                      )}
                    </span>
                    {Math.abs(realTimeMetrics.metrics.totalPnL) > 100 && (
                      <span className="text-xs">{realTimeMetrics.metrics.totalPnL >= 0 ? '📈' : '📉'}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Daily P&L</span>
                  <div className="flex items-center space-x-1">
                    <span className={`font-bold ${realTimeMetrics.metrics.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {realTimeMetrics.isLoading ? (
                        <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
                      ) : (
                        `${realTimeMetrics.metrics.dailyPnL >= 0 ? '+' : ''}$${realTimeMetrics.metrics.dailyPnL.toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Feed - Real-time Console Capture */}
        <LiveAIActivity />
      </div>
      

    
      {/* Advanced AI Insights Dashboard */}
      <div className="bg-gradient-to-r from-gray-800/40 to-purple-900/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Advanced AI Insights</h2>
          </div>
          <div className="flex items-center space-x-4">
            {persistentBotState.isRunning && (
              <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <span className="text-xs text-green-400 font-medium">AI Learning Active</span>
              </div>
            )}
            {notifications.notifications.length > 0 && (
              <div className="flex items-center space-x-2 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/30">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs text-blue-400 font-medium">{notifications.notifications.length} Recent Trades</span>
              </div>
            )}
          </div>
        </div>

        <AIInsightsDashboard
          botIsActive={persistentBotState.isRunning}
          learningActive={aiLearningManager.isActive}
        />
      </div>

      {/* Market Data */}
      <div className="bg-gradient-to-r from-gray-800/40 to-blue-900/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Market Overview</h3>
        </div>
        <MarketStatusDisplay />
      </div>

      {/* 24/7 Crypto Trading Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">24/7 Crypto Trading</h2>
          <div className="text-xs text-gray-400">Never stop learning & trading</div>
        </div>

        <CryptoTradingPanel />
      </div>

      {/* Advanced Charts Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Advanced Analytics</h2>
          <div className="text-xs text-gray-400">Real-time charts powered by Alpaca API</div>
        </div>

        {/* Portfolio Performance & Allocation */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PerformanceChart period="1M" height={350} />
          <PortfolioAllocationChart height={350} />
        </div>

        {/* Risk Metrics */}
        <RiskMetricsChart height={400} showPositionRisks={true} />

        {/* Price Charts for Top Positions */}
        {positions.data && positions.data.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {(positions.data as AlpacaPosition[]).slice(0, 4).map((position) => (
              <PriceChart
                key={position.symbol}
                symbol={position.symbol}
                timeframe="1Day"
                limit={30}
                showVolume={true}
                height={300}
              />
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Data Sources Footer */}
      <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="text-sm">
                <span className="text-blue-400 font-medium">Alpaca API</span>
                <div className="text-xs text-gray-400">Real-time market data & trading</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-sm">
                <span className="text-green-400 font-medium">Supabase</span>
                <div className="text-xs text-gray-400">AI learning database</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <div className="text-sm">
                <span className="text-purple-400 font-medium">Zustand + React Query</span>
                <div className="text-xs text-gray-400">State management & caching</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Last updated</div>
            <div className="text-sm text-white font-medium">
              <ClientSafeTime timestamp={new Date()} format="time" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Trading Notifications */}
      <AITradingNotifications
        notifications={notifications.notifications}
        onDismiss={notifications.dismissNotification}
        autoHideDuration={notifications.autoHideDuration}
      />

    </div>
  )
}
