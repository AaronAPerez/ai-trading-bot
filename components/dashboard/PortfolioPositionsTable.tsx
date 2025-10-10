"use client"

import React from 'react'
import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

  const { data: positionsResponse, isLoading, error, refetch } = useAlpacaPositions(refreshInterval)

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

  const allPositions = positionsResponse?.data || []

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
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
        <h2 className="text-xl font-bold text-white">Top Positions</h2>
        <div className="flex items-center space-x-3">
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
                {paginatedPositions.map((position: any, index: number) => {
                  const symbol = position.symbol
                  const currentPrice = parseFloat(position.current_price || position.currentPrice || '0')
                  const qty = parseFloat(position.qty || '0')
                  const marketValue = parseFloat(position.market_value || position.marketValue || '0')
                  const unrealizedPL = parseFloat(position.unrealized_pl || position.unrealizedPl || '0')
                  const unrealizedPLPercent = parseFloat(position.unrealized_plpc || position.unrealizedPlpc || '0') * 100
                  const side = position.side

                  const isPositive = unrealizedPL >= 0
                  const isNeutral = unrealizedPL === 0
                  const isCrypto = symbol?.includes('/') ||
                                  /[-](USD|USDT|USDC)$/i.test(symbol) ||
                                  position.asset_class === 'crypto'

                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
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
