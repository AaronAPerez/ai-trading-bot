"use client"

import React from 'react'
import { useState, useMemo } from 'react'
import { useAlpacaOrders } from '@/hooks/api/useAlpacaData'
import { AlertCircle, Filter, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { AssetLogo } from '@/components/ui/AssetLogo'

interface OrdersTableProps {
  refreshInterval?: number
  initialLimit?: number
}

export default function OrdersTable({ refreshInterval = 5000, initialLimit = 10 }: OrdersTableProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'filled' | 'canceled'>('all')
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'stock' | 'crypto'>('all')
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit)

  const { data: ordersResponse, isLoading, error, refetch } = useAlpacaOrders(refreshInterval)

  const allOrders = ordersResponse || []

  // Apply all filters and search (MUST be before any early returns)
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order: any) => {
      // Status filter
      if (statusFilter !== 'all') {
        const matchStatus = statusFilter === 'open'
          ? ['new', 'accepted', 'pending_new', 'partially_filled'].includes(order.status)
          : order.status === statusFilter
        if (!matchStatus) return false
      }

      // Asset class filter
      if (assetClassFilter !== 'all') {
        const isCrypto = order.symbol?.includes('/') ||
                        /[-](USD|USDT|USDC)$/i.test(order.symbol) ||
                        order.asset_class === 'crypto'
        const matchAssetClass = assetClassFilter === 'crypto' ? isCrypto : !isCrypto
        if (!matchAssetClass) return false
      }

      // Side filter
      if (sideFilter !== 'all' && order.side !== sideFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchSymbol = order.symbol?.toLowerCase().includes(query)
        const matchOrderId = order.id?.toLowerCase().includes(query)
        const matchClientOrderId = order.client_order_id?.toLowerCase().includes(query)
        if (!matchSymbol && !matchOrderId && !matchClientOrderId) return false
      }

      return true
    })
  }, [allOrders, statusFilter, assetClassFilter, sideFilter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // Error handling (MUST be after all hooks)
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load orders data</span>
        </div>
      </div>
    )
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'filled':
        return 'bg-green-900/30 text-green-400 border-green-500/30'
      case 'partially_filled':
        return 'bg-blue-900/30 text-blue-400 border-blue-500/30'
      case 'new':
      case 'accepted':
      case 'pending_new':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
      case 'canceled':
      case 'expired':
      case 'rejected':
        return 'bg-red-900/30 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-500/30'
    }
  }

  const getSideColor = (side: string) => {
    return side?.toLowerCase() === 'buy' ? 'text-green-400' : 'text-red-400'
  }

  const formatOrderType = (type: string) => {
    if (!type) return 'N/A'
    return type.replace(/_/g, ' ').toUpperCase()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Orders</h2>
        <div className="flex items-center space-x-3">
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            title="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Orders Count */}
          <div className="text-sm text-gray-400">
            {filteredOrders.length} of {allOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </div>
        </div>
      </div>

          {/* Summary Stats */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Total Orders</div>
            <div className="text-lg font-bold text-white">{filteredOrders.length}</div>
          </div>
          <div className="bg-green-900/20 rounded-lg border border-green-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Filled Orders</div>
            <div className="text-lg font-bold text-green-400">
              {filteredOrders.filter((o: any) => o.status === 'filled').length}
            </div>
          </div>
          <div className="bg-yellow-900/20 rounded-lg border border-yellow-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Pending Orders</div>
            <div className="text-lg font-bold text-yellow-400">
              {filteredOrders.filter((o: any) => ['new', 'accepted', 'pending_new', 'partially_filled'].includes(o.status)).length}
            </div>
          </div>
          <div className="bg-red-900/20 rounded-lg border border-red-700/50 p-4">
            <div className="text-xs text-gray-400 mb-1">Canceled/Rejected</div>
            <div className="text-lg font-bold text-red-400">
              {filteredOrders.filter((o: any) => ['canceled', 'expired', 'rejected'].includes(o.status)).length}
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
            placeholder="Search symbol, order ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              handleFilterChange()
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any)
            handleFilterChange()
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="filled">Filled</option>
          <option value="canceled">Canceled</option>
        </select>

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
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {/* Table Container with Scrollbar */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {isLoading && allOrders.length === 0 ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="h-12 bg-gray-700 rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">No orders found</div>
            <div className="text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || assetClassFilter !== 'all' || sideFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Orders will appear here once you start trading'}
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Order Type
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Filled Qty
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Avg Fill Price
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Filled At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Expires At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {paginatedOrders.map((order: any, index: number) => {
                  const isCrypto = order.asset_class === 'crypto' ||
                                  order.symbol?.includes('/') ||
                                  /[-](USD|USDT|USDC)$/i.test(order.symbol)
                  return (
                  <tr
                    key={order.id || index}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Asset */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <AssetLogo
                          symbol={order.symbol}
                          isCrypto={isCrypto}
                          size="md"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{order.symbol}</div>
                          <div className="text-xs text-gray-400">
                            {isCrypto ? 'Crypto' : 'Stock'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Order Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {formatOrderType(order.type)}
                      </div>
                      {order.limit_price && (
                        <div className="text-xs text-gray-500">
                          Limit: ${parseFloat(order.limit_price).toFixed(2)}
                        </div>
                      )}
                      {order.stop_price && (
                        <div className="text-xs text-gray-500">
                          Stop: ${parseFloat(order.stop_price).toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Side */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-bold uppercase ${getSideColor(order.side)}`}>
                        {order.side}
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">
                        {parseFloat(order.qty || order.notional || '0').toLocaleString()}
                      </div>
                    </td>

                    {/* Filled Qty */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">
                        {parseFloat(order.filled_qty || '0').toLocaleString()}
                      </div>
                      {order.qty && order.filled_qty && (
                        <div className="text-xs text-gray-500">
                          {((parseFloat(order.filled_qty) / parseFloat(order.qty)) * 100).toFixed(0)}%
                        </div>
                      )}
                    </td>

                    {/* Avg Fill Price */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">
                        {order.filled_avg_price
                          ? `$${parseFloat(order.filled_avg_price).toFixed(2)}`
                          : 'N/A'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300 capitalize">
                        {order.source || 'N/A'}
                      </div>
                    </td>

                    {/* Submitted At */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {formatDateTime(order.submitted_at || order.created_at)}
                      </div>
                    </td>

                    {/* Filled At */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {formatDateTime(order.filled_at)}
                      </div>
                    </td>

                    {/* Expires At */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {order.expired_at
                          ? formatDateTime(order.expired_at)
                          : order.time_in_force === 'gtc'
                            ? 'GTC'
                            : order.time_in_force === 'day'
                              ? 'EOD'
                              : 'N/A'}
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
      {filteredOrders.length > 0 && (
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
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
