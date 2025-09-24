'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  CpuChipIcon,
  EyeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface BotActivity {
  id: string
  timestamp: Date
  type: 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info'
  symbol?: string
  message: string
  details?: string
  confidence?: number
  status: 'active' | 'completed' | 'failed'
}

interface AIRecommendation {
  symbol: string
  action: 'BUY' | 'SELL'
  confidence: number
  aiScore: number
  riskScore: number
  reasoning: string[]
  lastUpdate: string
  dataPoints: number
  canExecute: boolean
  executionReason: string
}

interface BotMetrics {
  symbolsScanned: number
  analysisCompleted: number
  recommendationsGenerated: number
  tradesExecuted: number
  lastActivityTime: Date
  currentSymbol: string | null
  nextScanIn: number
  avgAnalysisTime: number
  successRate: number
}

interface AIBotActivityMonitorProps {
  botEnabled: boolean
  mode: string
  minimumConfidence: number
}

export default function AIBotActivityMonitor({
  botEnabled,
  mode,
  minimumConfidence
}: AIBotActivityMonitorProps) {
  const [activities, setActivities] = useState<BotActivity[]>([])
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [metrics, setMetrics] = useState<BotMetrics>({
    symbolsScanned: 0,
    analysisCompleted: 0,
    recommendationsGenerated: 0,
    tradesExecuted: 0,
    lastActivityTime: new Date(),
    currentSymbol: null,
    nextScanIn: 0,
    avgAnalysisTime: 2.5,
    successRate: 87.5
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [orderExecutionEnabled, setOrderExecutionEnabled] = useState(false)
  const [orderExecutionMetrics, setOrderExecutionMetrics] = useState({
    totalOrdersExecuted: 0,
    successfulOrders: 0,
    failedOrders: 0,
    totalValue: 0,
    dailyOrderCount: 0,
    dailyOrderLimit: 10
  })

  // Fetch AI recommendations from the real AI trading engine
  const fetchAIRecommendations = useCallback(async () => {
    if (!botEnabled) return

    setIsLoadingRecommendations(true)
    try {
      // First check if the AI engine is actually running
      const statusResponse = await fetch('/api/ai-trading')
      const statusData = await statusResponse.json()

      if (!statusData.running) {
        // Engine not running, don't try to fetch recommendations
        setIsLoadingRecommendations(false)
        return
      }

      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_recommendations' })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecommendations(data.recommendations || [])

          // Update metrics based on real data
          setMetrics(prev => ({
            ...prev,
            symbolsScanned: data.marketDataStatus?.length || prev.symbolsScanned,
            recommendationsGenerated: data.recommendations?.length || prev.recommendationsGenerated,
            tradesExecuted: data.session?.tradesExecuted || prev.tradesExecuted,
            lastActivityTime: new Date(),
            successRate: data.autoExecutionMetrics?.successRate || prev.successRate
          }))
        }
      } else {
        console.error('Failed to fetch AI recommendations:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }, [botEnabled])

  // Fetch real-time bot activity from API
  const fetchBotActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-bot-activity')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setActivities(data.data.activities || [])
          setMetrics(prev => ({
            ...prev,
            ...data.data.metrics
          }))

          // Update order execution state
          if (data.data.orderExecution) {
            setOrderExecutionEnabled(data.data.orderExecution.enabled)
            setOrderExecutionMetrics({
              totalOrdersExecuted: data.data.orderExecution.metrics.totalOrdersExecuted,
              successfulOrders: data.data.orderExecution.metrics.successfulOrders,
              failedOrders: data.data.orderExecution.metrics.failedOrders,
              totalValue: data.data.orderExecution.metrics.totalValue,
              dailyOrderCount: data.data.orderExecution.dailyOrderCount,
              dailyOrderLimit: data.data.orderExecution.dailyOrderLimit
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch bot activity:', error)
    }
  }, [])

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Show browser notification for successful trades
  const showTradeNotification = (symbol: string, action: 'BUY' | 'SELL', amount: number, success: boolean) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = success
        ? `🎉 Trade Executed Successfully!`
        : `❌ Trade Failed`

      const body = success
        ? `${action} $${amount} ${symbol} - Order submitted to Alpaca`
        : `Failed to ${action} ${symbol} - Check account permissions`

      const icon = success ? '🚀' : '⚠️'

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `trade-${symbol}-${Date.now()}`,
        requireInteraction: false,
        silent: false
      })
    }
  }

  // Get a fresh AI recommendation to replace the bought card
  const getNewRecommendation = useCallback(async (excludeSymbol: string): Promise<AIRecommendation | null> => {
    try {
      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_single_recommendation', exclude: excludeSymbol })
      })

      if (response.ok) {
        const data = await response.json()
        return data.recommendation || null
      }
    } catch (error) {
      console.error('Failed to get new recommendation:', error)
    }
    return null
  }, [])

  // Manual trade execution function with card replacement
  const executeManualTrade = useCallback(async (symbol: string, action: 'BUY' | 'SELL', notionalAmount: number = 20) => {
    try {
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          notional: notionalAmount,
          side: action.toLowerCase(),
          type: 'market',
          time_in_force: 'day',
          client_order_id: `manual_${symbol}_${Date.now()}`
        })
      })

      const result = await response.json()

      if (result.success) {
        // Show success notification
        showTradeNotification(symbol, action, notionalAmount, true)

        // Also show alert for immediate feedback
        alert(`✅ ${action} order for ${symbol} ($${notionalAmount}) submitted successfully!`)

        // If BUY was successful, replace the card with a new recommendation
        if (action === 'BUY') {
          const newRecommendation = await getNewRecommendation(symbol)
          if (newRecommendation) {
            setRecommendations(prev =>
              prev.map(rec =>
                rec.symbol === symbol ? newRecommendation : rec
              )
            )
          } else {
            // If no new recommendation available, remove the bought card
            setRecommendations(prev => prev.filter(rec => rec.symbol !== symbol))
          }
        } else {
          // For SELL orders, just refresh all recommendations
          fetchAIRecommendations()
        }
      } else {
        // Show failure notification
        showTradeNotification(symbol, action, notionalAmount, false)

        alert(`❌ Order failed: ${result.error || result.details}`)
      }
    } catch (error) {
      console.error('Manual trade execution failed:', error)
      showTradeNotification(symbol, action, notionalAmount, false)
      alert(`❌ Trade execution failed: ${error.message}`)
    }
  }, [fetchAIRecommendations, getNewRecommendation])


  // Start/stop bot activity monitoring
  useEffect(() => {
    if (!botEnabled) {
      // Stop activity simulation when bot is disabled
      fetch('/api/ai-bot-activity?action=stop-simulation').catch(console.error)
      setActivities([])
      setMetrics(prev => ({
        ...prev,
        currentSymbol: null,
        nextScanIn: 0
      }))
      return
    }

    // Start activity simulation when bot is enabled
    fetch('/api/ai-bot-activity?action=start-simulation')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('AI Bot activity monitoring started')
        }
      })
      .catch(console.error)

    // Initial fetch
    fetchBotActivity()
    fetchAIRecommendations()

    // Poll for updates every 3 seconds when bot is active
    const interval = setInterval(() => {
      fetchBotActivity()
      fetchAIRecommendations()
    }, 15000) // Every 15 seconds for AI recommendations (increased from 5s)

    return () => {
      clearInterval(interval)
      // Stop simulation when component unmounts
      fetch('/api/ai-bot-activity?action=stop-simulation').catch(console.error)
    }
  }, [botEnabled, fetchBotActivity, fetchAIRecommendations])

  // Countdown for next scan
  useEffect(() => {
    if (!botEnabled || metrics.nextScanIn <= 0) return

    const countdown = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        nextScanIn: Math.max(0, prev.nextScanIn - 1)
      }))
    }, 1000)

    return () => clearInterval(countdown)
  }, [botEnabled, metrics.nextScanIn])

  const getActivityIcon = (type: BotActivity['type']) => {
    switch (type) {
      case 'scan': return MagnifyingGlassIcon
      case 'analysis': return ChartBarIcon
      case 'recommendation': return SparklesIcon
      case 'trade': return BoltIcon
      case 'error': return ExclamationTriangleIcon
      default: return CpuChipIcon
    }
  }

  const getActivityColor = (type: BotActivity['type'], status: BotActivity['status']) => {
    if (status === 'failed') return 'text-red-400'
    if (status === 'active') return 'text-yellow-400'

    switch (type) {
      case 'scan': return 'text-blue-400'
      case 'analysis': return 'text-purple-400'
      case 'recommendation': return 'text-green-400'
      case 'trade': return 'text-cyan-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CpuChipIcon className={`w-6 h-6 ${botEnabled ? 'text-purple-400' : 'text-gray-400'}`} />
            {botEnabled && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">AI Bot Activity Monitor</h3>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            botEnabled
              ? 'bg-green-900/30 text-green-400 border border-green-500/30'
              : 'bg-gray-900/30 text-gray-400 border border-gray-500/30'
          }`}>
            {botEnabled ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors text-sm"
        >
          <EyeIcon className="w-4 h-4" />
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {!botEnabled ? (
        <div className="text-center py-8">
          <CpuChipIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Enable AI Bot to monitor trading activity</p>
        </div>
      ) : (
        <>
          {/* Real-time Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Symbols Scanned</div>
              <div className="text-lg font-semibold text-white">{metrics.symbolsScanned}</div>
              <div className="text-xs text-blue-400">+{(metrics.symbolsScanned * 0.1).toFixed(0)} this hour</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">AI Recommendations</div>
              <div className="text-lg font-semibold text-white">{metrics.recommendationsGenerated}</div>
              <div className="text-xs text-green-400">{metrics.successRate ? metrics.successRate.toFixed(1) : '0.0'}% success rate</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Current Symbol</div>
              <div className="text-lg font-semibold text-white">{metrics.currentSymbol || '--'}</div>
              <div className="text-xs text-purple-400">{metrics.avgAnalysisTime ? metrics.avgAnalysisTime.toFixed(1) : '0.0'}s avg analysis</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Next Scan</div>
              <div className="text-lg font-semibold text-white">{metrics.nextScanIn || 0}s</div>
              <div className="text-xs text-yellow-400">Mode: {mode}</div>
            </div>
          </div>

          {/* AI Recommendations Cards */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium text-sm">Live AI Recommendations</span>
                <span className="text-gray-400 text-xs">•</span>
                <span className="text-purple-400 text-xs">Min Confidence: {minimumConfidence}%</span>
                {isLoadingRecommendations && (
                  <ArrowPathIcon className="w-4 h-4 text-yellow-400 animate-spin" />
                )}
              </div>
              <button
                onClick={fetchAIRecommendations}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="text-center py-4">
                  <SparklesIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm mb-1">Generating AI Recommendations...</p>
                  <p className="text-gray-400 text-xs">AI is analyzing market data from Yahoo Finance</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={`${rec.symbol}-${index}`}
                    className={`bg-gradient-to-r rounded-lg p-4 border ${
                      rec.action === 'BUY'
                        ? 'from-green-900/20 to-emerald-900/20 border-green-500/30'
                        : 'from-red-900/20 to-rose-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-lg">{rec.symbol}</span>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            rec.action === 'BUY'
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}>
                            {rec.action}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            rec.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' :
                            rec.confidence >= 0.7 ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-gray-600 text-gray-300'
                          }`}>
                            {(rec.confidence * 100).toFixed(0)}% confidence
                          </span>
                          <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs">
                            AI Score: {(rec.aiScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => executeManualTrade(rec.symbol, rec.action, 20)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            rec.canExecute
                              ? rec.action === 'BUY'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!rec.canExecute}
                        >
                          {rec.action} $20
                        </button>
                        <button
                          onClick={() => executeManualTrade(rec.symbol, rec.action, 50)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            rec.canExecute
                              ? rec.action === 'BUY'
                                ? 'bg-green-700 hover:bg-green-800 text-white'
                                : 'bg-red-700 hover:bg-red-800 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!rec.canExecute}
                        >
                          {rec.action} $50
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-400">AI Analysis:</span>
                        <div className="mt-1 space-y-1">
                          {rec.reasoning.map((reason, i) => (
                            <div key={i} className="text-xs text-gray-300 pl-2 border-l-2 border-gray-600">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-4">
                          <span>Risk: {(rec.riskScore * 100).toFixed(0)}%</span>
                          <span>Data Points: {rec.dataPoints}</span>
                          <span>Updated: {new Date(rec.lastUpdate).toLocaleTimeString()}</span>
                        </div>
                        {!rec.canExecute && (
                          <span className="text-yellow-400 text-xs">
                            ⚠️ {rec.executionReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Execution Controls */}
          <div className={`border rounded-lg p-4 mb-4 ${
            orderExecutionEnabled
              ? 'bg-gradient-to-r from-green-900/20 to-yellow-900/20 border-green-500/30'
              : 'bg-gradient-to-r from-gray-900/20 to-gray-800/20 border-gray-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className={`w-5 h-5 ${orderExecutionEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className="font-medium text-white">Order Execution</span>
                  {orderExecutionEnabled && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  orderExecutionEnabled
                    ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                    : 'bg-gray-900/30 text-gray-400 border border-gray-500/30'
                }`}>
                  {orderExecutionEnabled ? 'LIVE TRADING' : 'SIMULATION ONLY'}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ShieldCheckIcon className="w-4 h-4" />
                Controlled by AI Trading Control
              </div>
            </div>

            {/* Order Execution Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-700/30 rounded-lg p-2">
                <div className="text-xs text-gray-400">Orders Today</div>
                <div className="text-lg font-semibold text-white">
                  {orderExecutionMetrics.dailyOrderCount}/{orderExecutionMetrics.dailyOrderLimit}
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2">
                <div className="text-xs text-gray-400">Total Orders</div>
                <div className="text-lg font-semibold text-white">{orderExecutionMetrics.totalOrdersExecuted}</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2">
                <div className="text-xs text-gray-400">Success Rate</div>
                <div className="text-lg font-semibold text-white">
                  {orderExecutionMetrics.totalOrdersExecuted > 0
                    ? Math.round((orderExecutionMetrics.successfulOrders / orderExecutionMetrics.totalOrdersExecuted) * 100)
                    : 0}%
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2">
                <div className="text-xs text-gray-400">Total Value</div>
                <div className="text-lg font-semibold text-white">
                  ${orderExecutionMetrics.totalValue.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400">
              {orderExecutionEnabled
                ? '⚠️ Live trading enabled - Real orders will be executed for high-confidence recommendations (≥70%)'
                : '📊 Simulation mode - No real orders will be placed, only simulated trades'
              }
            </div>
          </div>

          {/* Recent Activities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Recent Activity</h4>
              <div className="text-xs text-gray-400">
                {activities.length} activities • Last: {metrics.lastActivityTime ? new Date(metrics.lastActivityTime).toLocaleTimeString() : '--:--:-- --'}
              </div>
            </div>

            <div className={`space-y-2 ${isExpanded ? 'max-h-96' : 'max-h-48'} overflow-y-auto`}>
              {activities.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  <ArrowPathIcon className="w-5 h-5 mx-auto mb-2 animate-spin" />
                  Initializing AI Bot...
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  const color = getActivityColor(activity.type, activity.status)

                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                      <Icon className={`w-4 h-4 mt-0.5 ${color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white">{activity.message}</span>
                          {activity.symbol && (
                            <span className="px-1.5 py-0.5 bg-gray-600 text-xs text-gray-300 rounded">
                              {activity.symbol}
                            </span>
                          )}
                          {activity.confidence && (
                            <span className={`px-1.5 py-0.5 text-xs rounded ${
                              activity.confidence >= 80 ? 'bg-green-900/30 text-green-400' :
                              activity.confidence >= 70 ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-gray-600 text-gray-300'
                            }`}>
                              {activity.confidence.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <ClockIcon className="w-3 h-3" />
                          <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                          {activity.details && (
                            <>
                              <span>•</span>
                              <span>{activity.details}</span>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            {activity.status === 'completed' && <CheckCircleIcon className="w-3 h-3 text-green-400" />}
                            {activity.status === 'active' && <ArrowPathIcon className="w-3 h-3 text-yellow-400 animate-spin" />}
                            {activity.status === 'failed' && <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}