'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { AlertCircle, Play, Square, TrendingUp, Activity, Clock, Zap, BarChart3, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button';

interface AITradingSession {
  sessionId: string
  startTime: string
  endTime?: string
  tradesExecuted: number
  totalPnL: number
  maxDrawdown: number
  aiPredictions: number
  successfulPredictions: number
}

interface AutoExecutionMetrics {
  totalExecutions: number
  successfulExecutions: number
  avgExecutionTime: number
  avgSlippage: number
  avgConfidence: number
  profitableExecutions: number
}

interface TodayExecutionStats {
  tradesExecuted: number
  tradesRemaining: number
  dailyPnL: number
  executionEnabled: boolean
}

interface AITradingStatus {
  running: boolean
  session: AITradingSession | null
  marketData: Array<{
    symbol: string
    dataPoints: number
    lastUpdate: string
  }>
  autoExecution?: {
    metrics: AutoExecutionMetrics
    todayStats: TodayExecutionStats
    recentExecutions: any[]
  }
}

interface PerformanceMetrics {
  sessionDuration: number // minutes
  tradesExecuted: number
  totalPnL: number
  maxDrawdown: number
  aiAccuracy: number
  averageTradeTime: number
}

export default function AITradingControl() {
  const [status, setStatus] = useState<AITradingStatus>({
    running: false,
    session: null,
    marketData: []
  })
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionLoading, setExecutionLoading] = useState(false)

  // Fetch status immediately and every 30 seconds
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Update status based on fetch results and persist state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai-engine-status', JSON.stringify({
          running: status.running,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.error('Failed to save AI engine status:', e)
      }
    }
  }, [status.running])

  // Fetch performance metrics when engine is running
  useEffect(() => {
    if (status.running) {
      fetchPerformance()
      const interval = setInterval(fetchPerformance, 60000) // Every minute
      return () => clearInterval(interval)
    }
  }, [status.running])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/ai-trading')
      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch AI trading status')
      console.error('Status fetch error:', err)
    }
  }

  const fetchPerformance = async () => {
    try {
      const response = await fetch('/api/ai-trading?metric=performance')
      const data = await response.json()
      setPerformance(data.performance)
    } catch (err) {
      console.error('Performance fetch error:', err)
    }
  }

  const handleStart = async () => {
    setLoading(true)
    setError(null)

    console.log('🚀 Starting AI Trading Engine with Live Execution...')

    try {
      // 1. Start the AI bot activity monitoring
      const botActivityResponse = await fetch('/api/ai-bot-activity?action=start-simulation')
      if (!botActivityResponse.ok) {
        throw new Error('Failed to start AI bot activity monitoring')
      }

      // 2. Enable live trading execution
      const executionResponse = await fetch('/api/ai-bot-activity?action=enable-execution')
      if (!executionResponse.ok) {
        throw new Error('Failed to enable live trading execution')
      }

      // 3. Start the main AI trading engine
      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start AI trading')
      }

      console.log('✅ AI Trading Engine with Live Execution started successfully!')
      await fetchStatus()
    } catch (err) {
      console.error('❌ Failed to start AI Trading:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Stop the AI trading engine
      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop AI trading')
      }

      // 2. Disable live trading execution
      const executionResponse = await fetch('/api/ai-bot-activity?action=disable-execution')
      if (!executionResponse.ok) {
        console.warn('Failed to disable live trading execution')
      }

      // 3. Stop bot activity monitoring
      const botActivityResponse = await fetch('/api/ai-bot-activity?action=stop-simulation')
      if (!botActivityResponse.ok) {
        console.warn('Failed to stop AI bot activity monitoring')
      }

      await fetchStatus()
      setPerformance(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAutoExecution = async () => {
    if (!status.autoExecution || !status.autoExecution.todayStats) return

    setExecutionLoading(true)
    try {
      const action = status.autoExecution.todayStats.executionEnabled ? 'disable' : 'enable'

      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execution_control',
          executionAction: action
        })
      })

      if (response.ok) {
        await fetchStatus()
      } else {
        throw new Error('Failed to toggle auto-execution')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setExecutionLoading(false)
    }
  }

  const executeManualTrade = async (symbol: string, action: 'BUY' | 'SELL', confidence: number) => {
    setExecutionLoading(true)
    try {
      // In a real implementation, this would call a manual execution endpoint
      const response = await fetch('/api/manual-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          action,
          quantity: 10, // Default quantity for manual trades
          orderType: 'MARKET'
        })
      })

      if (response.ok) {
        await fetchStatus()
        alert(`Manual ${action} order submitted for ${symbol}`)
      } else {
        throw new Error('Manual trade failed')
      }
    } catch (err) {
      alert(`Manual trade failed: ${err.message}`)
    } finally {
      setExecutionLoading(false)
    }
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* AI Trading Control Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                AI Trading Engine
              </CardTitle>
              <CardDescription>
                Advanced ML-powered trading with real-time Alpaca API integration
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.running ? "default" : "secondary"}>
                {status.running ? "ACTIVE" : "INACTIVE"}
              </Badge>
              {status.running ? (
                <Button
                  onClick={handleStop}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop Live AI Trading
                </Button>
              ) : (
                <Button
                  onClick={handleStart}
                  disabled={loading}
                  size="sm"
                  className={loading ? "cursor-not-allowed" : ""}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  {loading ? "Starting Live AI Trading..." : "Start Live AI Trading"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {error && (
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Live Trading Status - Integrated with AI Engine */}
      {status.running && status.autoExecution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              Live Trading Status
              <Badge variant="default" className="bg-green-500">
                ACTIVE
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {status.autoExecution.todayStats?.tradesExecuted || 0}
                </div>
                <div className="text-sm text-gray-500">Executed Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {status.autoExecution.todayStats?.tradesRemaining || 0}
                </div>
                <div className="text-sm text-gray-500">Remaining Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {((status.autoExecution.metrics?.avgConfidence || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Avg Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(status.autoExecution.metrics?.avgExecutionTime || 0).toFixed(0)}ms
                </div>
                <div className="text-sm text-gray-500">Avg Execution</div>
              </div>
            </div>

            {/* Live Trading Status Indicator */}
            <div className="mt-4 p-3 rounded-lg flex items-center gap-3 bg-green-50">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-700 font-medium">
                🚀 Live AI Trading Active - Orders will execute automatically for high-confidence signals
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Auto-Executions */}
      {status.autoExecution?.recentExecutions && status.autoExecution.recentExecutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Recent Auto-Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.autoExecution.recentExecutions.map((execution, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={execution.action === 'BUY' ? 'default' : 'destructive'}>
                      {execution.action}
                    </Badge>
                    <span className="font-semibold">{execution.symbol}</span>
                    <span className="text-sm text-gray-500">
                      {execution.quantity} @ ${execution.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">
                      {(execution.confidence * 100).toFixed(1)}% confidence
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(execution.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Information */}
      {status.session && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {status.session.tradesExecuted}
                </div>
                <div className="text-sm text-gray-500">Trades Executed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(status.session.totalPnL)}
                </div>
                <div className="text-sm text-gray-500">Total P&L</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {status.session.aiPredictions > 0
                    ? `${((status.session.successfulPredictions / status.session.aiPredictions) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
                <div className="text-sm text-gray-500">AI Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {new Date(status.session.startTime).toLocaleTimeString()}
                </div>
                <div className="text-sm text-gray-500">Session Start</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {performance && status.running && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Live Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Session Duration</span>
                  <span className="font-bold">{formatDuration(performance.sessionDuration)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Trades</span>
                  <span className="font-bold">{performance.tradesExecuted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg Trade Time</span>
                  <span className="font-bold">{formatDuration(performance.averageTradeTime)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total P&L</span>
                  <span className={`font-bold ${performance.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(performance.totalPnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Drawdown</span>
                  <span className="font-bold text-red-600">
                    {(performance.maxDrawdown * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Accuracy</span>
                  <span className="font-bold text-blue-600">
                    {performance.aiAccuracy.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">AI Status</div>
                  <div className="text-lg font-bold text-blue-700">
                    {status.running ? 'ANALYZING MARKETS' : 'IDLE'}
                  </div>
                </div>
                {status.running && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• ML models active</div>
                    <div>• Risk monitoring enabled</div>
                    <div>• Portfolio optimization running</div>
                    <div>• Real-time data processing</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Data Status */}
      {status.marketData && status.marketData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Market Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {status.marketData.slice(0, 12).map((item) => (
                <div
                  key={item.symbol}
                  className="p-3 border rounded-lg text-center hover:bg-gray-50 transition-colors"
                >
                  <div className="font-bold text-sm">{item.symbol}</div>
                  <div className="text-xs text-blue-600">{item.dataPoints} bars</div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            {status.marketData.length > 12 && (
              <div className="text-center mt-3 text-sm text-gray-500">
                ... and {status.marketData.length - 12} more symbols
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Features Overview */}
      {!status.running && (
        <Card>
          <CardHeader>
            <CardTitle>AI Trading Features</CardTitle>
            <CardDescription>
              Advanced artificial intelligence capabilities for maximum profit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-700">🧠 Machine Learning</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• LSTM neural networks for price prediction</li>
                  <li>• Transformer models for pattern recognition</li>
                  <li>• Random Forest ensemble for robust signals</li>
                  <li>• Real-time model adaptation</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-700">🛡️ Risk Management</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Kelly Criterion position sizing</li>
                  <li>• Dynamic stop loss/take profit</li>
                  <li>• Portfolio risk monitoring</li>
                  <li>• Correlation analysis</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-700">📊 Portfolio Optimization</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Modern Portfolio Theory</li>
                  <li>• Sharpe ratio maximization</li>
                  <li>• Automated rebalancing</li>
                  <li>• Diversification scoring</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-700">⚡ Real-time Execution</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Live Alpaca API integration</li>
                  <li>• Market hours awareness</li>
                  <li>• Latency optimization</li>
                  <li>• Emergency stop mechanisms</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}