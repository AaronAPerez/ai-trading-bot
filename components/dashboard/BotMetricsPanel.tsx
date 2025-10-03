'use client'

/**
 * Bot Metrics Panel Component
 * Displays bot performance, activity, and statistics
 */

import { useBotMetrics } from '@/hooks/useTradingData'
import { Bot, TrendingUp, Activity, Clock, Target, Zap, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface BotMetricsPanelProps {
  userId: string
}

export default function BotMetricsPanel({ userId }: BotMetricsPanelProps) {
  const { data: metrics, isLoading, error, refetch } = useBotMetrics(userId)
  const [uptime, setUptime] = useState(0)

  // Update uptime every second if bot is running
  useEffect(() => {
    if (metrics?.is_running) {
      const interval = setInterval(() => {
        setUptime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [metrics?.is_running])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${(value * 100).toFixed(2)}%`
  }

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle size={20} />
          <p>Failed to load bot metrics</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="text-center py-12 text-gray-400">
          <Bot size={48} className="mx-auto mb-4 opacity-50" />
          <p>No bot metrics available</p>
          <p className="text-sm mt-2">Start the trading bot to see metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bot size={24} className="text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Trading Bot Metrics</h2>
        </div>
        {metrics.is_running ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Active</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-gray-400 text-sm font-medium">Stopped</span>
          </div>
        )}
      </div>

      {/* Status Card */}
      <div
        className={`mb-6 rounded-xl p-4 ${
          metrics.is_running
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-gray-500/10 border border-gray-500/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Bot Status</p>
            <p
              className={`text-2xl font-bold ${
                metrics.is_running ? 'text-green-400' : 'text-gray-400'
              }`}
            >
              {metrics.is_running ? 'Running' : 'Stopped'}
            </p>
          </div>
          {metrics.is_running && (
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Uptime</p>
              <p className="text-white font-mono text-lg">{formatUptime(uptime)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity size={16} className="text-purple-400" />
            <span className="text-gray-400 text-sm">Trades Executed</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics.trades_executed}</p>
          <p className="text-xs text-gray-500 mt-1">Total lifetime trades</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target size={16} className="text-green-400" />
            <span className="text-gray-400 text-sm">Success Rate</span>
          </div>
          <p className="text-3xl font-bold text-green-400">
            {formatPercentage(metrics.success_rate)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Winning trades ratio</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <span className="text-gray-400 text-sm">Total P&L</span>
          </div>
          <p
            className={`text-3xl font-bold ${
              metrics.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(metrics.total_pnl)}
          </p>
          <p className="text-xs text-gray-500 mt-1">All-time profit/loss</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-gray-400 text-sm">Daily P&L</span>
          </div>
          <p
            className={`text-3xl font-bold ${
              metrics.daily_pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(metrics.daily_pnl)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Today's performance</p>
        </div>
      </div>

      {/* AI Metrics */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center space-x-2">
          <Zap size={18} className="text-yellow-400" />
          <span>AI Performance</span>
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Recommendations Generated</span>
            <span className="text-white font-medium">{metrics.recommendations_generated}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Risk Score</span>
            <span
              className={`font-medium ${
                metrics.risk_score < 30
                  ? 'text-green-400'
                  : metrics.risk_score < 60
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {metrics.risk_score.toFixed(1)}/100
            </span>
          </div>

          {metrics.last_activity && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Last Activity</span>
              <span className="text-white font-medium">
                {new Date(metrics.last_activity).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Performance Bar */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Overall Performance</span>
          <span className="text-white text-sm font-medium">
            {((metrics.success_rate * 100) / 100).toFixed(0)}%
          </span>
        </div>
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute h-full transition-all duration-500 ${
              metrics.success_rate >= 0.7
                ? 'bg-green-500'
                : metrics.success_rate >= 0.5
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(metrics.success_rate * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm flex items-center space-x-2"
        >
          <Activity size={16} />
          <span>Refresh Metrics</span>
        </button>
      </div>
    </div>
  )
}
