"use client"
// Dashboard Container (Layout)

import { useEffect, useState, useCallback } from 'react'
import '../../styles/dashboard.css'
import { useAutoExecution } from "@/hooks/trading/useAutoExecution"
import { useTradingBot } from "@/hooks/trading/useTradingBot"
import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
import AIRecommendationsList from "./AIRecommendationsList"
import AIBotActivity from "./AIBotActivity"
import useAIBotActivity from "@/hooks/useAIBotActivity"
import TradesOrdersTable from "./TradesOrdersTable"
import AILiveTradesTable from "./AILiveTradesTable"
import AITradingNotifications from "../notifications/AITradingNotifications"
import useAITradingNotifications from "@/hooks/useAITradingNotifications"
import useRealAITrading from "@/hooks/useRealAITrading"
import AILearningProgress from "./AILearningProgress"
import LiveBalanceDisplay from "./LiveBalanceDisplay"

import PortfolioOverview from "./PortfolioOverview"
import DashboardLayout from "./DashboardLayout"

// Default bot configuration
const defaultBotConfig = {
  alpaca: {
    baseUrl: 'https://paper-api.alpaca.markets',
    apiKey: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
    secretKey: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || ''
  },
  trading: {
    maxPositionSize: 10,
    riskLevel: 0.02
  },
  mode: 'BALANCED' as const,
  maxPositionSize: 10,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  minimumConfidence: 75,
  watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
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
  const handleStart = async (config: any) => {
    await tradingBot.startBot(config)
    await aiActivity.startSimulation()

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

    console.log('AI Trading Bot started and state persisted')
  }

  // Enhanced stop function that stops both bot and activity monitoring
  const handleStop = async () => {
    if (isStoppingBot) return // Prevent multiple clicks

    setIsStoppingBot(true)

    try {
      console.log('🛑 Stopping AI Trading Bot...')

      // Stop trading monitoring first
      stopTradingMonitoring()

      // Stop bot and AI activity in parallel
      await Promise.all([
        tradingBot.stopBot(),
        aiActivity.stopSimulation()
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
  const positions_data = positions.data || []
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
    <DashboardLayout
      isLiveTrading={false}
      onToggleMode={() => {}}
      botStatus={botMetrics}
    >
         {/* AI Trading Engine Header with Control Button */}
          <div className="flex items-center justify-between mb-6">

            <div className="flex items-center space-x-3">
              {/* <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                </svg>
              </div> */}
              {/* <div>
                <h2 className="text-2xl font-bold text-white">AI Trading Engine</h2>
                <p className="text-gray-300">Advanced algorithmic trading powered by machine learning</p>
              </div> */}
            </div>

            {/* AI Trading Control - Top Right */}
            <div className="flex items-center space-x-4">
              {/* Live Trading Activity Indicator - More Prominent */}
              {persistentBotState.isRunning && (
                <div className="relative bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-lg px-3 py-2 overflow-hidden">
                  {/* Animated background pulse */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 animate-pulse"></div>

                  

                  <div className="relative flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    </div>
                    <div className="text-xs">
                      <div className="text-green-400 font-bold text-sm">🤖 AI TRADING LIVE</div>
                      <div className="text-gray-300 font-medium">
                        {aiActivity.activities.length > 0
                          ? `${aiActivity.activities.filter(a => a.type === 'trade').length} trades • ${aiActivity.activities.filter(a => a.type === 'analysis').length} analyses`
                          : notifications.notifications.length > 0
                            ? `${notifications.notifications.length} recent trades`
                            : 'Monitoring Alpaca API...'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Trades Count */}
              {notifications.notifications.length > 0 && (
                <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-600/50">
                  <div className="relative">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {notifications.notifications.length}
                    </span>
                  </div>
                  <span className="text-xs text-gray-300 font-medium">Recent</span>
                </div>
              )}

              {/* Bot Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${persistentBotState.isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                <div className="text-sm">
                  <div className={`font-medium ${persistentBotState.isRunning ? 'text-green-400' : 'text-gray-400'}`}>
                    {persistentBotState.isRunning ? 'AI Bot Active' : 'AI Bot Stopped'}
                  </div>
                  {persistentBotState.isRunning && persistentBotState.startTime && (
                    <div className="text-xs text-gray-500">
                      Running {Math.floor((Date.now() - persistentBotState.startTime.getTime()) / 60000)}m
                    </div>
                  )}
                </div>
              </div>


              {/* Start/Stop Button */}
              <button
                onClick={persistentBotState.isRunning ? handleStop : () => handleStart(defaultBotConfig)}
                disabled={isStoppingBot || tradingBot.isStarting}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  isStoppingBot || tradingBot.isStarting
                    ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                    : persistentBotState.isRunning
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
              >
                {isStoppingBot ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span>Stopping...</span>
                  </>
                ) : tradingBot.isStarting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span>Starting...</span>
                  </>
                ) : persistentBotState.isRunning ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span>Stop AI Trading</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Start AI Trading</span>
                  </>
                )}
              </button>
            </div>
          </div>


      {/* AI-Powered Trading Overview Section - Top Priority */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">

        {/* AI Bot Activity - Primary Column */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700/50 shadow-2xl">
            <div className="p-4 border-b border-blue-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${persistentBotState.isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                  <h4 className="text-lg font-semibold ai-gradient-text">🤖 AI Trading Bot</h4>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-300">
                  <span>{tradingBot.metrics.tradesExecuted || 0} trades</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-green-400">{(tradingBot.metrics.successRate * 100 || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Live AI Activity Stream */}
            <div className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h6 className="text-sm font-semibold text-white">Live Activity Feed</h6>
                  <div className="text-xs text-blue-300">
                    {aiActivity.activities.length > 0 ? `${aiActivity.activities.length} activities` : 'No activity yet'}
                  </div>
                </div>

                {/* Activity Stream with enhanced styling */}
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {aiActivity.activities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="ai-activity-card flex items-start space-x-2 p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:border-blue-500/30 transition-all text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ai-pulse ${
                        activity.type === 'trade' ? 'bg-green-400 ai-glow-green' :
                        activity.type === 'analysis' ? 'bg-blue-400 ai-glow-blue' :
                        activity.type === 'recommendation' ? 'bg-yellow-400 ai-glow-yellow' :
                        activity.type === 'error' ? 'bg-red-400 ai-glow-red' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{activity.message}</div>
                        {activity.symbol && (
                          <div className="text-blue-300 font-mono text-xs">{activity.symbol}</div>
                        )}
                        <div className="text-gray-400 text-xs">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {aiActivity.activities.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <div className="mb-2">🎯</div>
                      {persistentBotState.isRunning ? 'Waiting for AI activity...' : 'Start AI bot to see live activity'}
                    </div>
                  )}
                </div>

                {/* Real-time AI metrics from Supabase */}
                {aiActivity.metrics && (
                  <div className="mt-4 pt-3 border-t border-blue-700/30">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-800/30 rounded-lg p-2">
                        <div className="text-gray-400">Symbols Analyzed</div>
                        <div className="text-white font-bold">{aiActivity.metrics.symbolsScanned || 0}</div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-2">
                        <div className="text-gray-400">Success Rate</div>
                        <div className="text-green-400 font-bold">{aiActivity.metrics.successRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Learning Progress - Secondary Column */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-lg border border-green-700/50 shadow-2xl h-full">
            <div className="p-4 border-b border-green-700/30">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h4 className="text-lg font-semibold ai-gradient-text">🧠 AI Learning</h4>
              </div>
            </div>
            <div className="p-4">
              <AILearningProgress compact={false} />
            </div>
          </div>
        </div>

        {/* Live Balance Display - Spanning 2 columns */}
        <div className="xl:col-span-2">
          <LiveBalanceDisplay
            refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
            showChangeIndicators={true}
          />
        </div>
      </div>

      {/* Secondary Trading Data Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Trading Activity - Takes full width below AI section */}
        <div className="xl:col-span-3">
          <div className="bg-gray-900/40 rounded-lg border border-gray-700/50">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"/>
                  </svg>
                  <h4 className="text-lg font-semibold text-white">Complete Trading Activity</h4>
                  <span className="text-xs text-gray-500">(Alpaca API + AI Trades from Supabase)</span>
                </div>
                <div className="text-xs text-gray-400">
                  Real-time data from Alpaca API
                </div>
              </div>
            </div>
            <div className="p-4">
              <TradesOrdersTable
                maxItems={15}
                compact={false}
                showTrades={true}
                showOrders={true}
                useRealData={true}
                defaultTab="orders"
                refreshInterval={persistentBotState.isRunning ? 5000 : 30000}
              />
            </div>
          </div>
        </div>
      </div>

                  {/* AI Live Trades Section */}
            {/* <div className="border-t border-gray-700/50">
              <div className="p-4 pb-2">
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  <h5 className="text-sm font-semibold text-white">AI Live Trades</h5>
                </div>
                <AILiveTradesTable
                  maxItems={5}
                  compact={true}
                  showHeader={false}
                />
              </div>
            </div> */}


      {/* Dashboard Grid Layout */}
      {/* <div className="grid grid-cols-1 gap-6 mb-8">
        <PortfolioOverview
          portfolio={account.data}
          positions={positions.data}
          isLoading={account.isLoading || positions.isLoading}
          error={account.error || positions.error}
        />
      </div> */}

      {/* <AIRecommendationsList
        recommendations={[]}
        onExecuteRecommendation={async (rec) => {
          console.log('Executing recommendation:', rec)
          // TODO: Implement actual execution logic
        }}
        isLoading={false}
      /> */}

      {/* Data Sources Info */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4 text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Live Alpaca API</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Supabase Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span>AI Analytics Engine</span>
            </div>
          </div>
          <div className="text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* AI Trading Notifications */}
      <AITradingNotifications
        notifications={notifications.notifications}
        onDismiss={notifications.dismissNotification}
        autoHideDuration={notifications.autoHideDuration}
      />
    </DashboardLayout>
  )
}