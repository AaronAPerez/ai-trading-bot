"use client"

import React from 'react'
import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw, Search, ChevronLeft, ChevronRight, X, XCircle } from 'lucide-react'
import { useAlpacaPositions } from '@/hooks/api/useAlpacaData'
import { AssetLogo } from '@/components/ui/AssetLogo'

interface PortfolioPositionsTableProps {
  refreshInterval?: number
  initialLimit?: number
}

export default function PortfolioPositionsTable({ refreshInterval = 5000, initialLimit = 10 }: PortfolioPositionsTableProps) {
  // Filters
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'stock' | 'crypto'>('all')
  const [sideFilter, setSideFilter] = useState<'all' | 'long' | 'short'>('all')
  const [plFilter, setPlFilter] = useState<'all' | 'profit' | 'loss'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit)

  // Liquidation state
  const [liquidating, setLiquidating] = useState<string | null>(null)
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())

  const { data: positions, isLoading, error, refetch } = useAlpacaPositions(refreshInterval)

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

  // The hook returns the data directly, not wrapped in a data property
  const allPositions = Array.isArray(positions) ? positions : []

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
  }

  // Close single position
  const closePosition = async (symbol: string) => {
    if (!confirm(`Close position for ${symbol}?`)) return

    setLiquidating(symbol)
    try {
      const response = await fetch('/api/alpaca/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })

      // Try to parse JSON, but handle empty responses
      let result: any = {}
      const text = await response.text()

      if (text) {
        try {
          result = JSON.parse(text)
        } catch (e) {
          console.error('Failed to parse response:', text)
          result = { error: 'Invalid server response' }
        }
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to close position')
      }

      await refetch()
      alert(`✅ Successfully closed position for ${symbol}`)
    } catch (error: any) {
      console.error('Error closing position:', error)
      const errorMessage = error.message || 'Failed to close position'

      // Show user-friendly error with detailed information
      if (errorMessage.includes('pattern day trading') || errorMessage.includes('PDT')) {
        alert(`🚫 Pattern Day Trading Protection\n\n` +
          `Cannot close ${symbol} today - you opened this position today.\n\n` +
          `📊 Alpaca enforces SEC rules:\n` +
          `• Accounts under $25,000 are limited in day trading\n` +
          `• Same-day buy & sell = day trade\n\n` +
          `✅ Solutions:\n` +
          `1. Wait until tomorrow to close (recommended)\n` +
          `2. Close manually in Alpaca dashboard\n` +
          `3. Increase account to $25,000+`)
      } else if (errorMessage.includes('fractional')) {
        alert(`⚠️ Cannot close ${symbol}\n\nThis position contains fractional shares, which Alpaca's API doesn't support closing.\n\n➡️ Close it manually at: https://app.alpaca.markets/paper/dashboard/overview`)
      } else if (errorMessage.includes('403') || errorMessage.includes('denied')) {
        alert(`⚠️ Alpaca API denied the request\n\nError: ${errorMessage}\n\n➡️ Close manually at: https://app.alpaca.markets/paper/dashboard/overview`)
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        alert(`⚠️ Position for ${symbol} not found. It may have already been closed.`)
        await refetch() // Refresh to update UI
      } else {
        alert(`❌ Failed to close ${symbol}\n\n${errorMessage}`)
      }
    } finally {
      setLiquidating(null)
    }
  }

  // Liquidate all positions
  const liquidateAll = async () => {
    if (!confirm(`Are you sure you want to liquidate ALL ${filteredPositions.length} positions? This cannot be undone.`)) return

    setLiquidating('all')
    try {
      const response = await fetch('/api/alpaca/positions/close', {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to liquidate all positions')

      await refetch()
      alert('Successfully liquidated all positions')
    } catch (error) {
      console.error('Error liquidating positions:', error)
      alert(`Failed to liquidate: ${error.message}`)
    } finally {
      setLiquidating(null)
    }
  }

  // Toggle position selection
  const togglePosition = (symbol: string) => {
    const newSelected = new Set(selectedPositions)
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol)
    } else {
      newSelected.add(symbol)
    }
    setSelectedPositions(newSelected)
  }

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedPositions.size === paginatedPositions.length) {
      setSelectedPositions(new Set())
    } else {
      setSelectedPositions(new Set(paginatedPositions.map((p: any) => p.symbol)))
    }
  }

  // Apply all filters and search
  const filteredPositions = useMemo(() => {
    return allPositions.filter((position: any) => {
      // Asset class filter
      if (assetClassFilter !== 'all') {
        const isCrypto = position.symbol?.includes('/') ||
                        /[-](USD|USDT|USDC)$/i.test(position.symbol) ||
                        position.asset_class === 'crypto'
        const matchAssetClass = assetClassFilter === 'crypto' ? isCrypto : !isCrypto
        if (!matchAssetClass) return false
      }

      // Side filter
      if (sideFilter !== 'all' && position.side !== sideFilter) {
        return false
      }

      // P/L filter
      if (plFilter !== 'all') {
        const unrealizedPL = parseFloat(position.unrealized_pl || position.unrealizedPl || '0')
        const matchPL = plFilter === 'profit' ? unrealizedPL > 0 : unrealizedPL < 0
        if (!matchPL) return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchSymbol = position.symbol?.toLowerCase().includes(query)
        if (!matchSymbol) return false
      }

      return true
    })
  }, [allPositions, assetClassFilter, sideFilter, plFilter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredPositions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPositions = filteredPositions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // Calculate summary stats
  const totalMarketValue = filteredPositions.reduce((sum: number, pos: any) =>
    sum + parseFloat(pos.market_value || pos.marketValue || '0'), 0)
  const totalUnrealizedPL = filteredPositions.reduce((sum: number, pos: any) =>
    sum + parseFloat(pos.unrealized_pl || pos.unrealizedPl || '0'), 0)
  const profitablePositions = filteredPositions.filter((pos: any) =>
    parseFloat(pos.unrealized_pl || pos.unrealizedPl || '0') > 0).length
  const losingPositions = filteredPositions.filter((pos: any) =>
    parseFloat(pos.unrealized_pl || pos.unrealizedPl || '0') < 0).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Portfolio Positions</h2>
        <div className="flex items-center space-x-3">
          {/* Liquidate Selected Button */}
          {selectedPositions.size > 0 && (
            <button
              onClick={() => {
                if (confirm(`Close ${selectedPositions.size} selected positions?`)) {
                  selectedPositions.forEach(symbol => closePosition(symbol))
                  setSelectedPositions(new Set())
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Close {selectedPositions.size} Selected
            </button>
          )}

          {/* Liquidate All Button */}
          {filteredPositions.length > 0 && (
            <button
              onClick={liquidateAll}
              disabled={liquidating === 'all'}
              className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              title="Close all positions"
            >
              {liquidating === 'all' ? (
                <span className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Liquidating...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4" />
                  <span>Liquidate All</span>
                </span>
              )}
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            title="Refresh positions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Positions Count */}
          <div className="text-sm text-gray-400">
            {filteredPositions.length} of {allPositions.length} {filteredPositions.length === 1 ? 'position' : 'positions'}
          </div>
        </div>
      </div>

       {/* Summary Stats */}
      {filteredPositions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Total Positions</div>
            <div className="text-lg font-bold text-white">{filteredPositions.length}</div>
          </div>
          <div className="bg-blue-900/20 rounded-lg border border-blue-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Market Value</div>
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(totalMarketValue)}
            </div>
          </div>
          <div className={`rounded-lg border p-4 ${
            totalUnrealizedPL >= 0
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-red-900/20 border-red-700/50'
          }`}>
            <div className="text-xs text-gray-400 mb-1">Total P/L</div>
            <div className={`text-lg font-bold ${
              totalUnrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(totalUnrealizedPL)}
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Win/Loss</div>
            <div className="text-lg font-bold text-white">
              <span className="text-green-400">{profitablePositions}</span>
              {' / '}
              <span className="text-red-400">{losingPositions}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              handleFilterChange()
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Asset Class Filter */}
        <select
          value={assetClassFilter}
          onChange={(e) => {
            setAssetClassFilter(e.target.value as any)
            handleFilterChange()
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Assets</option>
          <option value="stock">Stocks</option>
          <option value="crypto">Crypto</option>
        </select>

        {/* Side Filter */}
        <select
          value={sideFilter}
          onChange={(e) => {
            setSideFilter(e.target.value as any)
            handleFilterChange()
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Sides</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>

        {/* P/L Filter */}
        <select
          value={plFilter}
          onChange={(e) => {
            setPlFilter(e.target.value as any)
            handleFilterChange()
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All P/L</option>
          <option value="profit">Profit</option>
          <option value="loss">Loss</option>
        </select>
      </div>

      {/* Table Container with Scrollbar */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {isLoading && allPositions.length === 0 ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="h-12 bg-gray-700 rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : paginatedPositions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">No positions found</div>
            <div className="text-sm text-gray-500">
              {searchQuery || assetClassFilter !== 'all' || sideFilter !== 'all' || plFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your positions will appear here once you start trading'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedPositions.size === paginatedPositions.length && paginatedPositions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
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
                    Today's P/L ($)
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total P/L ($)
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {paginatedPositions.map((position: any, index: number) => {
                  const symbol = position.symbol
                  const currentPrice = parseFloat(position.current_price || position.currentPrice || '0')
                  const qty = parseFloat(position.qty || '0')
                  const marketValue = parseFloat(position.market_value || position.marketValue || '0')
                  const unrealizedPL = parseFloat(position.unrealized_pl || position.unrealizedPl || '0')
                  const unrealizedPLPercent = parseFloat(position.unrealized_plpc || position.unrealizedPlpc || '0') * 100
                  const todayPL = parseFloat(position.change_today || '0')
                  const side = position.side

                  const isPositive = unrealizedPL >= 0
                  const isNeutral = unrealizedPL === 0
                  const isTodayPositive = todayPL >= 0
                  const isCrypto = symbol?.includes('/') ||
                                  /[-](USD|USDT|USDC)$/i.test(symbol) ||
                                  position.asset_class === 'crypto'

                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedPositions.has(symbol)}
                          onChange={() => togglePosition(symbol)}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Asset */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <AssetLogo
                            symbol={symbol}
                            isCrypto={isCrypto}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-bold text-white">{symbol}</div>
                              <div className={`w-2 h-2 rounded-full ${
                                side === 'long' ? 'bg-green-400' : 'bg-red-400'
                              }`}></div>
                            </div>
                            <div className="text-xs text-gray-400">
                              <span className="capitalize">{side || 'long'}</span>
                              <span className="text-gray-500 mx-1">•</span>
                              <span>{isCrypto ? 'Crypto' : 'Stock'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-white">
                          {formatCurrency(currentPrice)}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-white">
                          {qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </div>
                      </td>

                      {/* Market Value */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-white">
                          {formatCurrency(marketValue)}
                        </div>
                      </td>

                      {/* Today's P/L */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${
                          todayPL === 0 ? 'text-gray-400' :
                          isTodayPositive ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(todayPL)}
                        </div>
                      </td>

                      {/* Total P/L */}
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

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => closePosition(symbol)}
                          disabled={liquidating === symbol}
                          className="p-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-colors disabled:opacity-50"
                          title="Close position"
                        >
                          {liquidating === symbol ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredPositions.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-400">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredPositions.length)} of {filteredPositions.length}
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-gray-500 px-2">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-1 rounded transition-colors ${
                      currentPage === totalPages
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
