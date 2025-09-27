'use client'

import { useAlpacaAccount, useAlpacaPositions } from '@/hooks/api/useAlpacaData'
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export default function PositionsPage() {
  const account = useAlpacaAccount()
  const positions = useAlpacaPositions()
  const [sortBy, setSortBy] = useState<'symbol' | 'value' | 'pnl' | 'change'>('value')
  const [filterBy, setFilterBy] = useState<'all' | 'profitable' | 'losing'>('all')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Calculate portfolio metrics
  const totalValue = positions.data ? positions.data.reduce((total, pos) => total + parseFloat(pos.market_value || '0'), 0) : 0
  const totalPnL = positions.data ? positions.data.reduce((total, pos) => total + parseFloat(pos.unrealized_pl || '0'), 0) : 0
  const totalGainPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0

  // Filter and sort positions
  const filteredPositions = positions.data?.filter(pos => {
    const pnl = parseFloat(pos.unrealized_pl || '0')
    if (filterBy === 'profitable') return pnl > 0
    if (filterBy === 'losing') return pnl < 0
    return true
  }) || []

  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sortBy) {
      case 'symbol':
        return a.symbol.localeCompare(b.symbol)
      case 'value':
        return parseFloat(b.market_value || '0') - parseFloat(a.market_value || '0')
      case 'pnl':
        return parseFloat(b.unrealized_pl || '0') - parseFloat(a.unrealized_pl || '0')
      case 'change':
        return parseFloat(b.unrealized_plpc || '0') - parseFloat(a.unrealized_plpc || '0')
      default:
        return 0
    }
  })

  const profitablePositions = positions.data?.filter(pos => parseFloat(pos.unrealized_pl || '0') > 0).length || 0
  const losingPositions = positions.data?.filter(pos => parseFloat(pos.unrealized_pl || '0') < 0).length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="space-y-8 p-1">

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                <DollarSign size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Value</h3>
              <div className="text-2xl font-bold text-white">
                {positions.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-24 rounded-lg"></div>
                ) : (
                  formatCurrency(totalValue)
                )}
              </div>
              <p className="text-gray-500 text-sm">Market value of holdings</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${totalPnL >= 0 ? 'from-green-500 to-emerald-400' : 'from-red-500 to-rose-400'} flex items-center justify-center shadow-lg`}>
                {totalPnL >= 0 ? <TrendingUp size={24} className="text-white" /> : <TrendingDown size={24} className="text-white" />}
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                totalPnL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {totalPnL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{formatPercentage(totalGainPercent)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Total P&L</h3>
              <div className="text-2xl font-bold">
                {positions.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-24 rounded-lg"></div>
                ) : (
                  <span className={totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">Unrealized gains/losses</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 flex items-center justify-center shadow-lg">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Profitable</h3>
              <div className="text-2xl font-bold text-green-400">
                {positions.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-16 rounded-lg"></div>
                ) : (
                  profitablePositions
                )}
              </div>
              <p className="text-gray-500 text-sm">Winning positions</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 flex items-center justify-center shadow-lg">
                <TrendingDown size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Losing</h3>
              <div className="text-2xl font-bold text-red-400">
                {positions.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-16 rounded-lg"></div>
                ) : (
                  losingPositions
                )}
              </div>
              <p className="text-gray-500 text-sm">Losing positions</p>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Filter by</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Positions</option>
                  <option value="profitable">Profitable Only</option>
                  <option value="losing">Losing Only</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="value">Market Value</option>
                  <option value="symbol">Symbol</option>
                  <option value="pnl">P&L Amount</option>
                  <option value="change">P&L Percentage</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {sortedPositions.length} of {positions.data?.length || 0} positions
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <BarChart3 size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold text-white">Current Holdings</h3>
            </div>
          </div>

          {positions.isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading positions...</p>
            </div>
          ) : positions.error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2">Error loading positions</p>
              <p className="text-gray-500 text-sm">{positions.error.message}</p>
            </div>
          ) : sortedPositions.length === 0 ? (
            <div className="p-8 text-center">
              <PieChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No positions found</p>
              <p className="text-gray-500 text-sm">
                {filterBy === 'all'
                  ? 'Start trading to see your positions here'
                  : `No ${filterBy} positions at the moment`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-gray-300 font-medium">Symbol</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Quantity</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Avg Cost</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Current Price</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Market Value</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">P&L</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPositions.map((position, index) => {
                    const pnl = parseFloat(position.unrealized_pl || '0')
                    const pnlPercent = parseFloat(position.unrealized_plpc || '0') * 100
                    const marketValue = parseFloat(position.market_value || '0')
                    const quantity = parseFloat(position.qty || '0')
                    const avgCost = parseFloat(position.avg_entry_price || '0')
                    const currentPrice = parseFloat(position.current_price || '0')

                    return (
                      <tr key={position.symbol} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{position.symbol.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-white font-semibold">{position.symbol}</div>
                              <div className="text-gray-400 text-sm">{position.side}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right text-white font-medium">
                          {formatNumber(Math.abs(quantity))}
                        </td>
                        <td className="py-4 px-6 text-right text-gray-300">
                          {formatCurrency(avgCost)}
                        </td>
                        <td className="py-4 px-6 text-right text-gray-300">
                          {formatCurrency(currentPrice)}
                        </td>
                        <td className="py-4 px-6 text-right text-white font-semibold">
                          {formatCurrency(marketValue)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className={`flex items-center justify-end space-x-1 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <span className="font-medium">{formatPercentage(pnlPercent)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}