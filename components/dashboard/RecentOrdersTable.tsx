"use client"

import React, { useState, useMemo, memo } from 'react'
import { Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AssetLogo } from '@/components/ui/AssetLogo'

interface RecentOrdersTableProps {
  refreshInterval?: number
  initialLimit?: number
}

interface AlpacaOrder {
  id: string
  client_order_id: string
  created_at: string
  updated_at: string
  submitted_at: string
  filled_at: string | null
  expired_at: string | null
  canceled_at: string | null
  failed_at: string | null
  replaced_at: string | null
  replaced_by: string | null
  replaces: string | null
  asset_id: string
  symbol: string
  asset_class: string
  notional: string | null
  qty: string
  filled_qty: string
  filled_avg_price: string | null
  order_class: string
  order_type: string
  type: string
  side: 'buy' | 'sell'
  time_in_force: string
  limit_price: string | null
  stop_price: string | null
  status: string
  extended_hours: boolean
  legs: any | null
  trail_percent: string | null
  trail_price: string | null
  hwm: string | null
  source: string | null
}

type ColumnKey = 'asset' | 'order_type' | 'side' | 'qty' | 'filled_qty' | 'avg_fill_price' | 'status' | 'source' | 'submitted_at' | 'filled_at' | 'expires_at'

const DEFAULT_COLUMNS: ColumnKey[] = ['asset', 'order_type', 'side', 'qty', 'filled_qty', 'avg_fill_price', 'status', 'source', 'submitted_at', 'filled_at', 'expires_at']

const COLUMN_LABELS: Record<ColumnKey, string> = {
  asset: 'Asset',
  order_type: 'Order Type',
  side: 'Side',
  qty: 'Qty',
  filled_qty: 'Filled Qty',
  avg_fill_price: 'Avg. Fill Price',
  status: 'Status',
  source: 'Source',
  submitted_at: 'Submitted At',
  filled_at: 'Filled At',
  expires_at: 'Expires At'
}

// PERFORMANCE: Memoize to prevent unnecessary re-renders
const RecentOrdersTable = memo(function RecentOrdersTable({ refreshInterval = 30000, initialLimit = 20 }: RecentOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMNS))

  // Fetch orders from Alpaca API
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['alpacaOrders'],
    queryFn: async () => {
      const res = await fetch('/api/alpaca/orders?limit=100&status=all')
      if (!res.ok) {
        throw new Error('Failed to fetch orders')
      }
      const json = await res.json()
      // API returns data in json.data, not json.orders
      return Array.isArray(json.data) ? json.data : []
    },
    refetchInterval: refreshInterval,
    staleTime: 2000
  })

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

  // Apply search filter
  const filteredOrders = useMemo(() => {
    return orders.filter((order: AlpacaOrder) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return order.symbol?.toLowerCase().includes(query) ||
               order.status?.toLowerCase().includes(query) ||
               order.order_type?.toLowerCase().includes(query)
      }
      return true
    })
  }, [orders, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const formatCurrency = (value: string | null) => {
    if (!value) return '-'
    const num = parseFloat(value)
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  }

  const toggleRowSelection = (orderId: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedRows(newSelected)
  }

  const toggleAllRows = () => {
    if (selectedRows.size === paginatedOrders.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedOrders.map((o: AlpacaOrder) => o.id)))
    }
  }

  const clearSelection = () => {
    setSelectedRows(new Set())
  }

  const toggleColumn = (column: ColumnKey) => {
    const newColumns = new Set(visibleColumns)
    if (newColumns.has(column)) {
      newColumns.delete(column)
    } else {
      newColumns.add(column)
    }
    setVisibleColumns(newColumns)
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'filled':
        return 'text-green-400 bg-green-900/20'
      case 'pending':
      case 'new':
      case 'accepted':
        return 'text-yellow-400 bg-yellow-900/20'
      case 'canceled':
      case 'cancelled':
        return 'text-gray-400 bg-gray-900/20'
      case 'rejected':
      case 'failed':
        return 'text-red-400 bg-red-900/20'
      case 'partially_filled':
        return 'text-blue-400 bg-blue-900/20'
      default:
        return 'text-gray-400 bg-gray-900/20'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-white">Live Order Execution Feed</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">LIVE</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* View All Button */}
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View All
          </button>

          {/* Column Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center space-x-2"
              title="Columns"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Columns</span>
            </button>

            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">Show Columns</h3>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(key as ColumnKey)}
                        onChange={() => toggleColumn(key as ColumnKey)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-white">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

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
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </div>
        </div>
      </div>

      {/* Search and Selection Controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selection Controls */}
        <div className="flex items-center space-x-3">
          {selectedRows.size > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <span className="text-sm text-gray-400">
                {selectedRows.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selected Count Display */}
      {selectedRows.size > 0 && (
        <div className="text-sm text-blue-400">
          {selectedRows.size} rows selected
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {isLoading && orders.length === 0 ? (
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
              {searchQuery ? 'Try adjusting your search' : 'Your orders will appear here once you start trading'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedOrders.length && paginatedOrders.length > 0}
                      onChange={toggleAllRows}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  {visibleColumns.has('asset') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Asset
                    </th>
                  )}
                  {visibleColumns.has('order_type') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Order Type
                    </th>
                  )}
                  {visibleColumns.has('side') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Side
                    </th>
                  )}
                  {visibleColumns.has('qty') && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Qty
                    </th>
                  )}
                  {visibleColumns.has('filled_qty') && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Filled Qty
                    </th>
                  )}
                  {visibleColumns.has('avg_fill_price') && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Avg. Fill Price
                    </th>
                  )}
                  {visibleColumns.has('status') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  {visibleColumns.has('source') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                  )}
                  {visibleColumns.has('submitted_at') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Submitted At
                    </th>
                  )}
                  {visibleColumns.has('filled_at') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Filled At
                    </th>
                  )}
                  {visibleColumns.has('expires_at') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Expires At
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {paginatedOrders.map((order: AlpacaOrder) => {
                  const isCrypto = order.symbol?.includes('/') ||
                                  /USD$/i.test(order.symbol) ||
                                  order.asset_class === 'crypto'

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(order.id)}
                          onChange={() => toggleRowSelection(order.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      {visibleColumns.has('asset') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <AssetLogo
                              symbol={order.symbol}
                              isCrypto={isCrypto}
                              size="sm"
                            />
                            <div className="text-sm font-medium text-white">{order.symbol}</div>
                            <div className="text-xs text-gray-500">{isCrypto ? 'Crypto' : order.asset_class}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.has('order_type') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white capitalize">{order.order_type || order.type || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.has('side') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            order.side === 'buy' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                          }`}>
                            {order.side}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has('qty') && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">{order.qty || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.has('filled_qty') && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">{order.filled_qty || '0'}</div>
                        </td>
                      )}
                      {visibleColumns.has('avg_fill_price') && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">{formatCurrency(order.filled_avg_price)}</div>
                        </td>
                      )}
                      {visibleColumns.has('status') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has('source') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{order.source || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.has('submitted_at') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{formatDate(order.submitted_at)}</div>
                        </td>
                      )}
                      {visibleColumns.has('filled_at') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{formatDate(order.filled_at)}</div>
                        </td>
                      )}
                      {visibleColumns.has('expires_at') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{formatDate(order.expired_at)}</div>
                        </td>
                      )}
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
                <option value={20}>20</option>
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
})

export default RecentOrdersTable
