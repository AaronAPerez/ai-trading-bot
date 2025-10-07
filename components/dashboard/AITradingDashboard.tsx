"use client"
// Dashboard Container (Layout)

import { useEffect, useState, useCallback } from 'react'
import '../../styles/dashboard.css'
import { useTradingBot } from "@/hooks/trading/useTradingBot"
import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
import useAIBotActivity from "@/hooks/useAIBotActivity"
import AITradingNotifications from "../notifications/AITradingNotifications"
import useAITradingNotifications from "@/hooks/useAITradingNotifications"
import useRealAITrading from "@/hooks/useRealAITrading"
import { ClientSafeTime } from "@/components/ui/ClientSafeTime"
import { Brain } from 'lucide-react'
import AIInsightsDashboard from "./AIInsightsDashboard"
import { useAILearningManager } from "@/hooks/useAILearningManager"
import { useRealTimeAIMetrics } from "@/hooks/useRealTimeAIMetrics"
// import { useRealTimeActivity } from "@/hooks/useRealTimeActivity" // Not currently used
import LiveTradesDisplay from "../trading/LiveTradesDisplay"
import MarketStatusDisplay from "../market/MarketStatusDisplay"
import { BotConfiguration } from "@/types/trading"
import PortfolioSummaryCards from "./PortfolioSummaryCards"
import PortfolioPositionsTable from "./PortfolioPositionsTable"
import PortfolioChart from "./PortfolioChart"
import OrdersTable from "./OrdersTable"

// Default bot configuration with auto-execution enabled
const defaultBotConfig: BotConfiguration = {
  enabled: true,
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
    takeProfitPercent: 0.10,
    correlationLimit: 0.7
  },
  executionSettings: {
    autoExecute: true, // Enable auto-execution by default
    minConfidenceForOrder: 0.75
  },
  scheduleSettings: {
    tradingHours: {
      start: '09:30',
      end: '16:00'
    },
    excludedDays: ['Saturday', 'Sunday'],
    cooldownMinutes: 5
  },
  maxPositionSize: 10,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  minimumConfidence: 75,
  watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'BTC/USD', 'ETH/USD', 'DOGE/USD']
}

export default function AITradingDashboard() {
  const tradingBot = useTradingBot()

  // Persistent AI bot state - allow flexible config type
  const [persistentBotState, setPersistentBotState] = useState<{
    isRunning: boolean
    startTime: Date | null
    config: BotConfiguration
  }>({
    isRunning: false,
    startTime: null,
    config: defaultBotConfig
  })

  // Note: account and positions data is now fetched by individual child components
  // const account = useAlpacaAccount(persistentBotState.isRunning ? 5000 : undefined)
  // const positions = useAlpacaPositions(persistentBotState.isRunning ? 15000 : undefined)

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
  // const realTimeActivity = useRealTimeActivity() // Commented out - not currently used in UI

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
  }, [tradingBot.metrics.isRunning, persistentBotState.isRunning, tradingInterval, realAITrading])

  const stopTradingMonitoring = useCallback(() => {
    if (tradingInterval) {
      clearInterval(tradingInterval)
      setTradingInterval(null)
    }
  }, [tradingInterval])


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
          aiActivity.startSimulation()
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
  const handleStart = async (config: BotConfiguration) => {
    await tradingBot.startBot(config)
    await aiActivity.startSimulation()

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

      // Stop bot, AI activity, and learning service in parallel
      console.log('🛑 Stopping AI Learning Service...')
      await Promise.all([
        tradingBot.stopBot(),
        aiActivity.stopSimulation(),
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
          <button
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
          </button>

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

      {/* Portfolio Summary Cards */}
      <div className="bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-xl p-6 border border-gray-700/50">
        <PortfolioSummaryCards
          refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
        />
      </div>

      {/* Portfolio Positions Table */}
      <div className="bg-gradient-to-r from-gray-800/50 to-green-900/30 rounded-xl p-6 border border-gray-700/50">
        <PortfolioPositionsTable
          refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
        />
      </div>

      {/* Orders Table */}
      <div className="bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-xl p-6 border border-gray-700/50">
        <OrdersTable
          refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
          initialLimit={50}
        />
      </div>

      {/* Portfolio Performance Chart */}
      <div className="bg-gradient-to-r from-gray-800/50 to-purple-900/30 rounded-xl p-6 border border-gray-700/50">
        <PortfolioChart
          refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
        />
      </div>




      {/* AI Progress and Learning Overview */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> */}
        {/* AI Learning Progress - Real-time Data */}
        {/* <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">AI Learning Progress</h3>
            </div>
            <div className="flex items-center space-x-2">
              {realTimeMetrics.isLoading && (
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <div className={`w-2 h-2 rounded-full ${
                realTimeMetrics.metrics.isLearningActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
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
        </div> */}

        {/* AI Performance Metrics - Real-time Alpaca Data */}
        {/* <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-6 border border-green-700/50">
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
                <span className={`text-lg font-bold ${
                  realTimeMetrics.metrics.riskScore > 70 ? 'text-red-400' :
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
              <div className="text-xs text-gray-400 mb-2">Real-time P&L from Alpaca</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total P&L</span>
                  <div className="flex items-center space-x-1">
                    <span className={`font-bold ${
                      realTimeMetrics.metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
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
                    <span className={`font-bold ${
                      realTimeMetrics.metrics.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'
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
        </div> */}

        {/* Live Activity Feed - Real-time Database Data */}
        {/* <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-6 border border-blue-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                realTimeActivity.hasRecentActivity ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
              }`}></div>
              <h3 className="text-lg font-semibold text-white">Live AI Activity</h3>
            </div>
            <div className="flex items-center space-x-2">
              {realTimeActivity.isLoading && (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <div className="text-xs text-blue-400">
                {realTimeActivity.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-3 w-16 rounded"></div>
                ) : (
                  `${realTimeActivity.activities.length} activities`
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {realTimeActivity.isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 animate-pulse">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : realTimeActivity.activities.length > 0 ? (
              realTimeActivity.activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:border-blue-500/30 transition-all">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'trade' ? 'bg-green-400' :
                    activity.type === 'info' ? 'bg-blue-400' :
                    activity.type === 'recommendation' ? 'bg-yellow-400' :
                    activity.type === 'error' ? 'bg-red-400' :
                    activity.type === 'risk' ? 'bg-orange-400' :
                    activity.type === 'system' ? 'bg-purple-400' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{activity.message}</div>
                    {activity.symbol && (
                      <div className="text-xs text-blue-300 font-mono">{activity.symbol}</div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        activity.status === 'completed' ? 'bg-green-900/30 text-green-300' :
                        activity.status === 'failed' ? 'bg-red-900/30 text-red-300' :
                        'bg-yellow-900/30 text-yellow-300'
                      }`}>
                        {activity.status}
                      </div>
                    </div>
                    {activity.confidence && (
                      <div className="text-xs text-purple-300 mt-1">
                        Confidence: {(activity.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <div className="text-sm">
                  {persistentBotState.isRunning ? 'Waiting for AI activity...' : 'Start AI to see live activity'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Data sourced from Supabase database
                </div>
              </div>
            )}
          </div> */}

          {/* Activity Stats */}
          {/* {realTimeActivity.activities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-700/30">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-800/30 rounded-lg p-2">
                  <div className="text-gray-400">Recent Trades</div>
                  <div className="text-green-400 font-bold">{realTimeActivity.recentTradesCount}</div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2">
                  <div className="text-gray-400">Total Activities</div>
                  <div className="text-blue-400 font-bold">{realTimeActivity.stats.totalActivities}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div> */}

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



      {/* Market Data and Trading Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Market Status */}
        <div className="bg-gradient-to-r from-gray-800/40 to-blue-900/20 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Market Overview</h3>
          </div>
          <MarketStatusDisplay />
        </div>

        {/* Live Trading Activity */}
        <div className="bg-gradient-to-r from-gray-800/40 to-green-900/20 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Live Trades</h3>
          </div>
          <LiveTradesDisplay />
        </div>
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