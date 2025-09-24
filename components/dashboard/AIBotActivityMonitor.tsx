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
  PlayIcon,
  StopIcon,
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

  // Fetch real-time bot activity from API
  const fetchBotActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-bot-activity')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setActivities(data.data.activities || [])
          setMetrics(data.data.metrics || {})

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

  // Toggle order execution
  const toggleOrderExecution = async () => {
    try {
      const action = orderExecutionEnabled ? 'disable-execution' : 'enable-execution'
      const response = await fetch(`/api/ai-bot-activity?action=${action}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setOrderExecutionEnabled(data.orderExecutionStatus.enabled)
          console.log(`Order execution ${data.orderExecutionStatus.enabled ? 'enabled' : 'disabled'}`)
        }
      }
    } catch (error) {
      console.error('Failed to toggle order execution:', error)
    }
  }

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

    // Poll for updates every 3 seconds when bot is active
    const interval = setInterval(fetchBotActivity, 3000)

    return () => {
      clearInterval(interval)
      // Stop simulation when component unmounts
      fetch('/api/ai-bot-activity?action=stop-simulation').catch(console.error)
    }
  }, [botEnabled, fetchBotActivity])

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

          {/* Current Activity Status */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium text-sm">AI Bot Active</span>
              <span className="text-gray-400 text-xs">•</span>
              <span className="text-purple-400 text-xs">Min Confidence: {minimumConfidence}%</span>
            </div>
            <div className="text-sm text-gray-300">
              🤖 Continuously monitoring Alpaca markets, analyzing patterns, and generating trading recommendations
            </div>
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

              <button
                onClick={toggleOrderExecution}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  orderExecutionEnabled
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {orderExecutionEnabled ? (
                  <>
                    <StopIcon className="w-4 h-4" />
                    Disable Live Trading
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    Enable Live Trading
                  </>
                )}
              </button>
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
                ? '⚠️ Live trading enabled - Real orders will be executed for high-confidence recommendations (≥80%)'
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