/**
 * Real Data Dashboard Component
 * Uses ONLY real Alpaca API data via React Query
 * NO MOCKS - Production ready
 */

'use client'

import { useEffect } from 'react'
import {
  useAlpacaAccount,
  useAlpacaPositions,
  useAlpacaOrders,
  useRealTimeQuotes
} from '@/hooks/useRealAlpacaData'
import {
  useRealTradingStore,
  selectPortfolioValue,
  selectDayPnL,
  selectPositionCount,
  selectBotRunning
} from '@/store/realTradingStore'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Activity, CheckCircle } from 'lucide-react'

export function RealDataDashboard() {
  // React Query hooks for real data
  const { data: account, isLoading: accountLoading, error: accountError } = useAlpacaAccount()
  const { data: positions, isLoading: positionsLoading } = useAlpacaPositions()
  const { data: orders, isLoading: ordersLoading } = useAlpacaOrders()

  // Get symbols from positions for real-time quotes
  const symbols = positions?.map(p => p.symbol) || []
  const { data: quotes } = useRealTimeQuotes(symbols)

  // Zustand store
  const setAccount = useRealTradingStore(state => state.setAccount)
  const setPositions = useRealTradingStore(state => state.setPositions)
  const setOrders = useRealTradingStore(state => state.setOrders)
  const portfolioValue = useRealTradingStore(selectPortfolioValue)
  const dayPnL = useRealTradingStore(selectDayPnL)
  const positionCount = useRealTradingStore(selectPositionCount)
  const botRunning = useRealTradingStore(selectBotRunning)

  // Sync React Query data to Zustand store
  useEffect(() => {
    if (account) setAccount(account)
  }, [account, setAccount])

  useEffect(() => {
    if (positions) setPositions(positions)
  }, [positions, setPositions])

  useEffect(() => {
    if (orders) setOrders(orders)
  }, [orders, setOrders])

  // Calculate metrics
  const buyingPower = account ? parseFloat(account.buying_power) : 0
  const equity = account ? parseFloat(account.equity) : 0
  const cash = account ? parseFloat(account.cash) : 0

  const dayPnLPercent = account && parseFloat(account.last_equity) > 0
    ? (dayPnL / parseFloat(account.last_equity)) * 100
    : 0

  // Loading state
  if (accountLoading) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
          <p className="text-gray-300">Loading real account data from Alpaca API...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (accountError) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg">
        <p className="text-red-400">❌ Failed to load account data: {accountError.message}</p>
        <p className="text-sm text-gray-400 mt-2">Check your Alpaca API credentials in .env.local</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <h3 className="font-bold text-green-300">✅ REAL DATA STATUS</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Data Source:</span>
            <span className="ml-2 font-mono text-green-300">ALPACA_API</span>
          </div>
          <div>
            <span className="text-gray-400">Account:</span>
            <span className="ml-2 font-mono text-green-300">{account?.account_number}</span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className="ml-2 font-mono text-green-300">{account?.status}</span>
          </div>
          <div>
            <span className="text-gray-400">Last Update:</span>
            <span className="ml-2 font-mono text-green-300">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Portfolio Value</span>
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">Real-time from Alpaca</div>
        </div>

        {/* Day P&L */}
        <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Day P&L</span>
            {dayPnL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dayPnL >= 0 ? '+' : ''}${dayPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm ${dayPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dayPnLPercent >= 0 ? '+' : ''}{dayPnLPercent.toFixed(2)}%
          </div>
        </div>

        {/* Buying Power */}
        <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Buying Power</span>
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">Available to trade</div>
        </div>

        {/* Positions */}
        <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Active Positions</span>
            <Activity className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{positionCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            Cash: ${cash.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      {positions && positions.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-bold text-white">Real Positions (Live from Alpaca)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Avg Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Current</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Market Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">P&L</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const unrealizedPL = parseFloat(position.unrealized_pl)
                  const unrealizedPLPC = parseFloat(position.unrealized_plpc)
                  const quote = quotes?.[position.symbol]
                  const currentPrice = quote?.ap || parseFloat(position.current_price)

                  return (
                    <tr key={position.symbol} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">{position.symbol}</span>
                        <span className="ml-2 text-xs text-gray-500">{position.asset_class}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{position.qty}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        ${parseFloat(position.avg_entry_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        ${currentPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        ${parseFloat(position.market_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${unrealizedPLPC >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {unrealizedPLPC >= 0 ? '+' : ''}{(unrealizedPLPC * 100).toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Positions State */}
      {positions && positions.length === 0 && (
        <div className="p-12 bg-gray-800 rounded-lg border border-gray-700 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Active Positions</h3>
          <p className="text-gray-500">Start the AI trading bot to begin generating positions</p>
        </div>
      )}

      {/* Recent Orders */}
      {orders && orders.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-bold text-white">Recent Orders (Last 10)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Side</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{order.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.side === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                      }`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">{order.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      ${order.filled_avg_price ? parseFloat(order.filled_avg_price).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'filled' ? 'bg-green-900/30 text-green-400' :
                        order.status === 'canceled' ? 'bg-gray-700 text-gray-400' :
                        'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
