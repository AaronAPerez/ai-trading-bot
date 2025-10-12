'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  Brain,
  Zap,
  Shield
} from 'lucide-react'

interface HedgeFundEngineDashboardProps {
  userId?: string
  mode?: 'paper' | 'live'
}

export default function HedgeFundEngineDashboard({
  userId = 'test-user',
  mode = 'paper'
}: HedgeFundEngineDashboardProps) {
  const queryClient = useQueryClient()
  const [symbol, setSymbol] = useState('AAPL')
  const [notionalAmount, setNotionalAmount] = useState(1000)
  const [selectedStrategy, setSelectedStrategy] = useState('')

  // Fetch engine status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['hedgeFundStatus', userId, mode],
    queryFn: async () => {
      const res = await fetch(`/api/hedge-fund/status?userId=${userId}&mode=${mode}`)
      if (!res.ok) throw new Error('Failed to fetch status')
      return await res.json()
    },
    refetchInterval: 30000 // Every 30 seconds
  })

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['hedgeFundAnalytics', userId, mode],
    queryFn: async () => {
      const res = await fetch(`/api/hedge-fund/analytics?userId=${userId}&mode=${mode}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return await res.json()
    },
    refetchInterval: 60000 // Every minute
  })

  // Run cycle mutation
  const runCycle = useMutation({
    mutationFn: async (params: { symbol: string; strategy?: string; notionalAmount?: number; dryRun?: boolean }) => {
      const res = await fetch('/api/hedge-fund/run-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          userId,
          mode
        })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Cycle execution failed')
      }
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hedgeFundStatus'] })
      queryClient.invalidateQueries({ queryKey: ['hedgeFundAnalytics'] })
    }
  })

  const handleRunCycle = () => {
    runCycle.mutate({
      symbol,
      strategy: selectedStrategy || undefined,
      notionalAmount,
      dryRun: false
    })
  }

  const handleDryRun = () => {
    runCycle.mutate({
      symbol,
      strategy: selectedStrategy || undefined,
      notionalAmount,
      dryRun: true
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'degraded': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'offline': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={16} />
      case 'degraded': return <AlertTriangle size={16} />
      case 'offline': return <XCircle size={16} />
      default: return <Activity size={16} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🏦 Hedge Fund Engine</h1>
            <p className="text-gray-300">
              Professional trading engine with AI-powered strategies
            </p>
          </div>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getStatusColor(status?.status)}`}>
            {getStatusIcon(status?.status)}
            <span className="font-semibold uppercase text-sm">
              {status?.status || 'Loading...'}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Alpaca API</span>
              {status?.connections?.alpaca ? (
                <span className="text-green-400 flex items-center space-x-1">
                  <CheckCircle size={14} />
                  <span className="text-xs">Connected</span>
                </span>
              ) : (
                <span className="text-red-400 flex items-center space-x-1">
                  <XCircle size={14} />
                  <span className="text-xs">Offline</span>
                </span>
              )}
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Supabase DB</span>
              {status?.connections?.supabase ? (
                <span className="text-green-400 flex items-center space-x-1">
                  <CheckCircle size={14} />
                  <span className="text-xs">Connected</span>
                </span>
              ) : (
                <span className="text-red-400 flex items-center space-x-1">
                  <XCircle size={14} />
                  <span className="text-xs">Offline</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trading Cycle Control */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
          <Play size={20} className="text-blue-400" />
          <span>Run Trading Cycle</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="AAPL"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Strategy (Optional)</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Auto-Select Best</option>
              <option value="momentum">Momentum</option>
              <option value="meanReversion">Mean Reversion</option>
              <option value="breakout">Breakout</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Amount ($)</label>
            <input
              type="number"
              value={notionalAmount}
              onChange={(e) => setNotionalAmount(parseFloat(e.target.value))}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="1000"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleRunCycle}
            disabled={runCycle.isPending || !symbol}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {runCycle.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Running Cycle...</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Execute Cycle</span>
              </>
            )}
          </button>

          <button
            onClick={handleDryRun}
            disabled={runCycle.isPending || !symbol}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
          >
            <Target size={18} />
            <span>Dry Run</span>
          </button>
        </div>

        {/* Cycle Result */}
        {runCycle.data && (
          <div className={`mt-4 p-4 rounded-lg border ${
            runCycle.data.status === 'executed'
              ? 'bg-green-500/10 border-green-500/30'
              : runCycle.data.status === 'rejected'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-white mb-1">
                  Status: {runCycle.data.status.toUpperCase()}
                </div>
                <div className="text-sm text-gray-300">{runCycle.data.reason}</div>
                {runCycle.data.executionResult && (
                  <div className="mt-2 text-xs text-gray-400">
                    Order ID: {runCycle.data.executionResult.orderId || 'N/A'} |
                    Latency: {runCycle.data.cycleTimeMs}ms
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {runCycle.data.signal?.confidence
                    ? `${(runCycle.data.signal.confidence * 100).toFixed(0)}%`
                    : 'N/A'
                  }
                </div>
                <div className="text-xs text-gray-400">Confidence</div>
              </div>
            </div>
          </div>
        )}

        {runCycle.error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="font-semibold text-red-400 mb-1">Error</div>
            <div className="text-sm text-gray-300">{runCycle.error.message}</div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Trades"
          value={analytics?.summary?.totalTrades || 0}
          icon={<BarChart3 size={20} />}
          gradient="from-blue-500 to-cyan-400"
          loading={analyticsLoading}
        />
        <MetricCard
          title="Success Rate"
          value={`${(analytics?.summary?.successRate || 0).toFixed(1)}%`}
          icon={<Target size={20} />}
          gradient="from-green-500 to-emerald-400"
          loading={analyticsLoading}
        />
        <MetricCard
          title="Total Volume"
          value={`$${(analytics?.summary?.totalVolume || 0).toLocaleString()}`}
          icon={<DollarSign size={20} />}
          gradient="from-purple-500 to-violet-400"
          loading={analyticsLoading}
        />
        <MetricCard
          title="Active Strategies"
          value={analytics?.summary?.strategiesActive || 0}
          icon={<Brain size={20} />}
          gradient="from-orange-500 to-amber-400"
          loading={analyticsLoading}
        />
      </div>

      {/* Strategy Performance */}
      {analytics?.strategyComparison && analytics.strategyComparison.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Brain size={20} className="text-purple-400" />
            <span>Strategy Performance</span>
          </h2>

          <div className="space-y-3">
            {analytics.strategyComparison.map((strategy: any, index: number) => (
              <div key={index} className="bg-black/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-white">{strategy.strategyName}</div>
                  <div className="text-sm text-gray-400">
                    {strategy.totalTrades} trades
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Win Rate</div>
                    <div className="font-semibold text-white">
                      {strategy.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Sharpe</div>
                    <div className="font-semibold text-white">
                      {strategy.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total P&L</div>
                    <div className={`font-semibold ${strategy.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${strategy.totalPnL.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {analytics?.recentTrades && analytics.recentTrades.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Activity size={20} className="text-blue-400" />
            <span>Recent Trades</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Symbol</th>
                  <th className="text-left py-2">Side</th>
                  <th className="text-right py-2">Quantity</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Value</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentTrades.slice(0, 10).map((trade: any, index: number) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 text-white font-semibold">{trade.symbol}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.side === 'buy'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right text-white">{trade.quantity}</td>
                    <td className="py-3 text-right text-white">${trade.price.toFixed(2)}</td>
                    <td className="py-3 text-right text-white">${trade.value.toFixed(2)}</td>
                    <td className="py-3">
                      <span className="text-gray-300">{trade.status}</span>
                    </td>
                    <td className="py-3 text-gray-400 text-xs">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {analytics?.activityLogs && analytics.activityLogs.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Zap size={20} className="text-yellow-400" />
            <span>Activity Log</span>
          </h2>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analytics.activityLogs.map((log: any, index: number) => (
              <div key={index} className="bg-black/30 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white uppercase text-xs">
                    {log.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(log.timestamp || log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-300">{log.message}</div>
                <div className={`text-xs mt-1 ${
                  log.status === 'completed'
                    ? 'text-green-400'
                    : log.status === 'failed'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}>
                  {log.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  gradient,
  loading
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  loading: boolean
}) {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl p-6 border border-gray-700/50">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${gradient} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-gray-400 text-sm mb-1">{title}</div>
      {loading ? (
        <div className="animate-pulse bg-gray-700 h-8 w-20 rounded"></div>
      ) : (
        <div className="text-2xl font-bold text-white">{value}</div>
      )}
    </div>
  )
}
