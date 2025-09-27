'use client'

import { useState, useEffect } from 'react'
import { useAlpacaAccount } from '@/hooks/api/useAlpacaData'
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, Bot, User, Filter } from 'lucide-react'

interface Order {
  id: string
  symbol: string
  side: string
  quantity: number
  price: number
  value: number
  status: string
  type: string
  timestamp: Date
  fee: number
  client_order_id?: string
  filled_qty?: number
  filled_avg_price?: number
}

interface Trade {
  id: string
  symbol: string
  side: string
  quantity: number
  price: number
  value: number
  status: string
  type: string
  timestamp: Date
  fee: number
  client_order_id?: string
}

export default function OrdersPage() {
  const account = useAlpacaAccount()
  const [orders, setOrders] = useState<Order[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'trades'>('orders')
  const [filterBy, setFilterBy] = useState<'all' | 'ai' | 'manual'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'filled' | 'pending' | 'cancelled'>('all')

  useEffect(() => {
    fetchOrdersAndTrades()
  }, [])

  const fetchOrdersAndTrades = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch orders
      const ordersResponse = await fetch('/api/alpaca/orders')
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders')
      }
      const ordersData = await ordersResponse.json()

      // Fetch trades
      const tradesResponse = await fetch('/api/alpaca/trades')
      if (!tradesResponse.ok) {
        throw new Error('Failed to fetch trades')
      }
      const tradesData = await tradesResponse.json()

      setOrders(ordersData.orders || [])
      setTrades(tradesData.trades || [])
    } catch (err) {
      console.error('Error fetching orders/trades:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isAIOrder = (item: Order | Trade) => {
    return item.client_order_id?.startsWith('AI_BOT_') || false
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filled':
        return <CheckCircle size={16} className="text-green-400" />
      case 'cancelled':
      case 'canceled':
        return <XCircle size={16} className="text-red-400" />
      case 'pending':
      case 'new':
      case 'accepted':
        return <Clock size={16} className="text-yellow-400" />
      default:
        return <AlertCircle size={16} className="text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filled':
        return 'bg-green-500/20 text-green-400'
      case 'cancelled':
      case 'canceled':
        return 'bg-red-500/20 text-red-400'
      case 'pending':
      case 'new':
      case 'accepted':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  // Filter data based on current filters
  const filterData = (data: (Order | Trade)[]) => {
    return data.filter(item => {
      // Filter by source (AI vs Manual)
      if (filterBy === 'ai' && !isAIOrder(item)) return false
      if (filterBy === 'manual' && isAIOrder(item)) return false

      // Filter by status
      if (statusFilter !== 'all' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false

      return true
    })
  }

  const filteredOrders = filterData(orders)
  const filteredTrades = filterData(trades)

  // Calculate statistics
  const totalOrders = orders.length
  const aiOrders = orders.filter(isAIOrder).length
  const manualOrders = totalOrders - aiOrders
  const filledOrders = orders.filter(o => o.status.toLowerCase() === 'filled').length

  const totalTrades = trades.length
  const aiTrades = trades.filter(isAIOrder).length
  const manualTrades = totalTrades - aiTrades
  const totalTradeValue = trades.reduce((sum, trade) => sum + trade.value, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="space-y-8 p-1">

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                <BarChart3 size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Orders</h3>
              <div className="text-2xl font-bold text-white">{totalOrders}</div>
              <p className="text-gray-500 text-sm">{filledOrders} filled</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-violet-400 flex items-center justify-center shadow-lg">
                <Bot size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">AI Orders</h3>
              <div className="text-2xl font-bold text-purple-400">{aiOrders}</div>
              <p className="text-gray-500 text-sm">Automated trades</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 flex items-center justify-center shadow-lg">
                <CheckCircle size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Trades</h3>
              <div className="text-2xl font-bold text-green-400">{totalTrades}</div>
              <p className="text-gray-500 text-sm">Executed orders</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center shadow-lg">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-400 text-sm font-medium">Trade Volume</h3>
              <div className="text-2xl font-bold text-orange-400">{formatCurrency(totalTradeValue)}</div>
              <p className="text-gray-500 text-sm">Total value traded</p>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Orders ({filteredOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'trades'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Trades ({filteredTrades.length})
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Source</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="ai">AI Bot</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="filled">Filled</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button
                onClick={fetchOrdersAndTrades}
                className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-2">
              {activeTab === 'orders' ? (
                <>
                  <Clock size={20} className="text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Order History</h3>
                </>
              ) : (
                <>
                  <CheckCircle size={20} className="text-green-400" />
                  <h3 className="text-xl font-bold text-white">Trade History</h3>
                </>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading {activeTab}...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2">Error loading {activeTab}</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : (activeTab === 'orders' ? filteredOrders : filteredTrades).length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No {activeTab} found</p>
              <p className="text-gray-500 text-sm">
                {filterBy === 'all' && statusFilter === 'all'
                  ? `Start trading to see your ${activeTab} here`
                  : 'Try adjusting your filters'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-gray-300 font-medium">Symbol</th>
                    <th className="text-left py-4 px-6 text-gray-300 font-medium">Side</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Quantity</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Price</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Value</th>
                    <th className="text-left py-4 px-6 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-4 px-6 text-gray-300 font-medium">Source</th>
                    <th className="text-right py-4 px-6 text-gray-300 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'orders' ? filteredOrders : filteredTrades).map((item, index) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{item.symbol.charAt(0)}</span>
                          </div>
                          <div className="text-white font-semibold">{item.symbol}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`flex items-center space-x-1 ${
                          item.side.toLowerCase() === 'buy' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.side.toLowerCase() === 'buy' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span className="font-medium">{item.side.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-white font-medium">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right text-gray-300">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-4 px-6 text-right text-white font-semibold">
                        {formatCurrency(item.value)}
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-1">
                          {isAIOrder(item) ? (
                            <>
                              <Bot size={14} className="text-purple-400" />
                              <span className="text-purple-400 text-sm font-medium">AI Bot</span>
                            </>
                          ) : (
                            <>
                              <User size={14} className="text-blue-400" />
                              <span className="text-blue-400 text-sm font-medium">Manual</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-gray-400 text-sm">
                        {formatTime(item.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}