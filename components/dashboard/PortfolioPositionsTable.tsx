"use client"

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { useAlpacaPositions } from '@/hooks/api/useAlpacaData'

interface PortfolioPositionsTableProps {
  refreshInterval?: number
}

export default function PortfolioPositionsTable({ refreshInterval = 5000 }: PortfolioPositionsTableProps) {
  const { data: positionsResponse, isLoading, error } = useAlpacaPositions(refreshInterval)

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load positions data</span>
        </div>
      </div>
    )
  }

  const positions = positionsResponse?.data || []

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Top Positions</h2>
        <div className="text-sm text-gray-400">
          {positions.length} {positions.length === 1 ? 'position' : 'positions'}
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="h-12 bg-gray-700 rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">No positions found</div>
            <div className="text-sm text-gray-500">Your positions will appear here once you start trading</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-700/50">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total P/L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {positions.map((position: any, index: number) => {
                  const symbol = position.symbol
                  const currentPrice = parseFloat(position.current_price || position.currentPrice || '0')
                  const qty = parseFloat(position.qty || '0')
                  const marketValue = parseFloat(position.market_value || position.marketValue || '0')
                  const unrealizedPL = parseFloat(position.unrealized_pl || position.unrealizedPl || '0')
                  const unrealizedPLPercent = parseFloat(position.unrealized_plpc || position.unrealizedPlpc || '0') * 100
                  const side = position.side

                  const isPositive = unrealizedPL >= 0
                  const isNeutral = unrealizedPL === 0

                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            side === 'long' ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <div>
                            <div className="text-sm font-bold text-white">{symbol}</div>
                            <div className="text-xs text-gray-400 capitalize">{side || 'long'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-white">
                          {formatCurrency(currentPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-white">
                          {qty.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-white">
                          {formatCurrency(marketValue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isNeutral ? (
                            <Minus className="w-4 h-4 text-gray-400" />
                          ) : isPositive ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <div className={`text-sm font-bold ${
                              isNeutral ? 'text-gray-400' :
                              isPositive ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatCurrency(unrealizedPL)}
                            </div>
                            <div className={`text-xs ${
                              isNeutral ? 'text-gray-500' :
                              isPositive ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {formatPercent(unrealizedPLPercent)}
                            </div>
                          </div>
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
  )
}
