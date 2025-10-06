"use client"

import { useState } from 'react'
import { useAlpacaOrders } from '@/hooks/api/useAlpacaData'
import { AlertCircle, Filter, RefreshCw } from 'lucide-react'

interface OrdersTableProps {
  refreshInterval?: number
  limit?: number
}

export default function OrdersTable({ refreshInterval = 5000, limit = 50 }: OrdersTableProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'filled' | 'canceled'>('all')
  const { data: ordersResponse, isLoading, error, refetch } = useAlpacaOrders(refreshInterval)

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

  const allOrders = ordersResponse || []

  // Filter orders based on status
  const filteredOrders = statusFilter === 'all'
    ? allOrders
    : allOrders.filter((order: any) => order.status === statusFilter)

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Orders</h2>
        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
            <Filter className="w-4 h-4 text-gray-400 ml-2" />
            {(['all', 'open', 'filled', 'canceled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
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

      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {isLoading && allOrders.length === 0 ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="h-12 bg-gray-700 rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">No orders found</div>
            <div className="text-sm text-gray-500">
              {statusFilter === 'all'
                ? 'Orders will appear here once you start trading'
                : `No ${statusFilter} orders found`}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-700/50">
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
                {filteredOrders.map((order: any, index: number) => (
                  <tr
                    key={order.id || index}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Asset */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          order.asset_class === 'crypto' ? 'bg-orange-400' : 'bg-blue-400'
                        }`}></div>
                        <div>
                          <div className="text-sm font-bold text-white">{order.symbol}</div>
                          <div className="text-xs text-gray-400 capitalize">
                            {order.asset_class || 'stock'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  )
}
