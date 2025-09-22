'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Play, Square, TrendingUp, DollarSign, Activity, Clock } from 'lucide-react'

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

interface AITradingStatus {
  running: boolean
  session: AITradingSession | null
  marketData: Array<{
    symbol: string
    dataPoints: number
    lastUpdate: string
  }>
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

  // Fetch status every 30 seconds
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

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

    try {
      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start AI trading')
      }

      await fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop AI trading')
      }

      await fetchStatus()
      setPerformance(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
                  Stop AI Trading
                </Button>
              ) : (
                <Button
                  onClick={handleStart}
                  disabled={loading}
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start AI Trading
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
      {status.marketData.length > 0 && (
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