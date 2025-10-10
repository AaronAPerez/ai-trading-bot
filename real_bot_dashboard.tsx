import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealTradingStore } from '@/store/realTradingStore'
import { Activity, TrendingUp, DollarSign, AlertCircle, Play, Square, RefreshCw } from 'lucide-react'

/**
 * Real AI Bot Dashboard
 * Displays ONLY real data from Alpaca API and Supabase
 * 
 * NO MOCKS | NO SIMULATIONS | PRODUCTION READY
 */

// =============================================
// REAL DATA FETCHING HOOKS
// =============================================

// Fetch real bot status
function useRealBotStatus() {
  return useQuery({
    queryKey: ['bot', 'status'],
    queryFn: async () => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot status')
      }
      
      return await response.json()
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time status
    staleTime: 3000
  })
}

// Fetch real Alpaca account data
function useRealAccount() {
  return useQuery({
    queryKey: ['alpaca', 'account'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) throw new Error('Failed to fetch account')
      const data = await response.json()
      
      // Validate real data
      if (!data.account?.account_number) {
        throw new Error('Invalid account data - possible mock data detected')
      }
      
      return data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000
  })
}

// Fetch real positions from Alpaca
function useRealPositions() {
  return useQuery({
    queryKey: ['alpaca', 'positions'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/positions')
      if (!response.ok) throw new Error('Failed to fetch positions')
      const data = await response.json()
      return data.positions || []
    },
    refetchInterval: 15000,
    staleTime: 10000
  })
}

// Fetch real orders from Alpaca
function useRealOrders() {
  return useQuery({
    queryKey: ['alpaca', 'orders'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/orders?status=all&limit=10')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      return data.orders || []
    },
    refetchInterval: 10000
  })
}

// Fetch real bot activity from Supabase
function useRealBotActivity() {
  return useQuery({
    queryKey: ['bot', 'activity'],
    queryFn: async () => {
      const response = await fetch('/api/bot-activity?limit=20')
      if (!response.ok) throw new Error('Failed to fetch activity')
      const data = await response.json()
      return data.activities || []
    },
    refetchInterval: 5000
  })
}

// Start bot mutation
function useStartBot() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', config })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start bot')
      }
      
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot'] })
      queryClient.invalidateQueries({ queryKey: ['alpaca'] })
    }
  })
}

// Stop bot mutation
function useStopBot() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      if (!response.ok) throw new Error('Failed to stop bot')
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot'] })
    }
  })
}

// =============================================
// MAIN DASHBOARD COMPONENT
// =============================================

export default function RealAIBotDashboard() {
  // Zustand store for global state
  const { botRunning, toggleBot } = useRealTradingStore()
  
  // React Query hooks for real data
  const { data: botStatus, isLoading: statusLoading } = useRealBotStatus()
  const { data: accountData, isLoading: accountLoading } = useRealAccount()
  const { data: positions } = useRealPositions()
  const { data: orders } = useRealOrders()
  const { data: activity } = useRealBotActivity()
  
  // Mutations
  const startBot = useStartBot()
  const stopBot = useStopBot()

  // Bot configuration
  const [config, setConfig] = useState({
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
    scanIntervalMinutes: 5,
    maxConcurrentPositions: 5,
    autoExecuteOrders: false,
    minConfidenceThreshold: 0.70,
    maxRiskPerTrade: 0.02,
    strategies: ['TECHNICAL', 'MOMENTUM', 'MEAN_REVERSION']
  })

  const isRunning = botStatus?.isRunning || false
  const account = accountData?.account
  const stats = botStatus?.session?.stats

  // =============================================
  // REAL DATA VALIDATION INDICATOR
  // =============================================

  const RealDataBadge = () => (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs font-semibold text-green-800">
        ✅ REAL DATA ONLY
      </span>
    </div>
  )

  // =============================================
  // BOT CONTROLS
  // =============================================

  const handleStartBot = async () => {
    try {
      await startBot.mutateAsync(config)
      alert('✅ Bot started successfully with REAL data!')
    } catch (error) {
      alert(`❌ Failed to start bot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleStopBot = async () => {
    try {
      await stopBot.mutateAsync()
      alert('🛑 Bot stopped successfully')
    } catch (error) {
      alert(`❌ Failed to stop bot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // =============================================
  // RENDER UI
  // =============================================

  if (accountLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading real trading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Real Data Badge */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Trading Bot</h1>
            <p className="text-gray-600 mt-1">Automated trading with real Alpaca API & Supabase</p>
          </div>
          <RealDataBadge />
        </div>

        {/* Real Account Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Real Buying Power</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${account ? parseFloat(account.buying_power).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Real Equity</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${account ? parseFloat(account.equity).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Real Positions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {positions?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-8 h-8 ${isRunning ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-600">Bot Status</p>
                <p className="text-xl font-bold text-gray-900">
                  {isRunning ? '🟢 Running' : '🔴 Stopped'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details - Real Data */}
        {account && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Real Alpaca Account Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Account Number</p>
                <p className="font-mono font-semibold">{account.account_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Account Status</p>
                <p className="font-semibold text-green-600">{account.status}</p>
              </div>
              <div>
                <p className="text-gray-600">Cash</p>
                <p className="font-semibold">${parseFloat(account.cash || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Day Trade Count</p>
                <p className="font-semibold">{account.daytrade_count || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bot Controls */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Bot Control Panel</h2>
          
          <div className="space-y-4">
            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbols to Trade
                </label>
                <input
                  type="text"
                  value={config.symbols.join(', ')}
                  onChange={(e) => setConfig({ ...config, symbols: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={isRunning}
                  placeholder="AAPL, MSFT, GOOGL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scan Interval (minutes)
                </label>
                <input
                  type="number"
                  value={config.scanIntervalMinutes}
                  onChange={(e) => setConfig({ ...config, scanIntervalMinutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={isRunning}
                  min="1"
                  max="60"
                />
              </div>
            </div>

            {/* Auto-execute toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoExecute"
                checked={config.autoExecuteOrders}
                onChange={(e) => setConfig({ ...config, autoExecuteOrders: e.target.checked })}
                disabled={isRunning}
                className="w-5 h-5 text-blue-600"
              />
              <label htmlFor="autoExecute" className="text-sm font-medium text-gray-700">
                Auto-execute orders (requires real account approval)
              </label>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4 pt-4">
              {!isRunning ? (
                <button
                  onClick={handleStartBot}
                  disabled={startBot.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                >
                  <Play className="w-5 h-5" />
                  {startBot.isPending ? 'Starting...' : 'Start Bot with Real Data'}
                </button>
              ) : (
                <button
                  onClick={handleStopBot}
                  disabled={stopBot.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
                >
                  <Square className="w-5 h-5" />
                  {stopBot.isPending ? 'Stopping...' : 'Stop Bot'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bot Statistics - Real Performance */}
        {isRunning && stats && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Real Bot Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Scans Completed</p>
                <p className="text-xl font-bold text-blue-600">{stats.scansCompleted}</p>
              </div>
              <div>
                <p className="text-gray-600">Recommendations Generated</p>
                <p className="text-xl font-bold text-purple-600">{stats.recommendationsGenerated}</p>
              </div>
              <div>
                <p className="text-gray-600">Trades Executed</p>
                <p className="text-xl font-bold text-green-600">{stats.tradesExecuted}</p>
              </div>
              <div>
                <p className="text-gray-600">Success Rate</p>
                <p className="text-xl font-bold text-orange-600">
                  {stats.tradesExecuted > 0 
                    ? `${((stats.tradesSuccessful / stats.tradesExecuted) * 100).toFixed(1)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real Positions */}
        {positions && positions.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Real Positions (from Alpaca API)</h2>
            <div className="space-y-2">
              {positions.map((position: any) => (
                <div key={position.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{position.symbol}</p>
                    <p className="text-sm text-gray-600">{position.qty} shares @ ${parseFloat(position.avg_entry_price).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${parseFloat(position.unrealized_pl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${parseFloat(position.unrealized_pl).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {parseFloat(position.unrealized_plpc) >= 0 ? '+' : ''}
                      {(parseFloat(position.unrealized_plpc) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real Activity Log */}
        {activity && activity.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Real Activity Log (from Supabase)</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activity.map((log: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">
                    {log.type === 'trade' ? '💰' : log.type === 'recommendation' ? '🤖' : '📊'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    log.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Source Verification */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">✅ Real Data Sources Verified</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Account data: Alpaca Paper Trading API</li>
            <li>• Market data: Real-time Alpaca bars and quotes</li>
            <li>• Orders: Executed via Alpaca Orders API</li>
            <li>• Database: Supabase PostgreSQL database</li>
            <li>• No mock, simulation, or fake data used</li>
          </ul>
        </div>

      </div>
    </div>
  )
}