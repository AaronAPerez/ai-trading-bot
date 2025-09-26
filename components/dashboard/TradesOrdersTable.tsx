'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Trade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  value: number
  status: 'filled' | 'pending' | 'cancelled' | 'rejected'
  timestamp: Date
  type: 'market' | 'limit' | 'stop'
  fee?: number
}

interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price?: number
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled'
  type: 'market' | 'limit' | 'stop'
  timestamp: Date
  filledQuantity?: number
}

interface TradesOrdersTableProps {
  trades?: Trade[]
  orders?: Order[]
  isLoading?: boolean
  showTrades?: boolean
  showOrders?: boolean
  maxItems?: number
  compact?: boolean
}

export default function TradesOrdersTable({
  trades = [],
  orders = [],
  isLoading = false,
  showTrades = true,
  showOrders = true,
  maxItems = 20,
  compact = false
}: TradesOrdersTableProps) {
  const [activeTab, setActiveTab] = useState<'trades' | 'orders'>('trades')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  // Mock data for demonstration - remove when real data is available
  const mockTrades: Trade[] = [
    {
      id: 'trade-1',
      symbol: 'AAPL',
      side: 'buy',
      quantity: 10,
      price: 185.23,
      value: 1852.30,
      status: 'filled',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      type: 'market',
      fee: 0.50
    },
    {
      id: 'trade-2',
      symbol: 'TSLA',
      side: 'sell',
      quantity: 5,
      price: 242.15,
      value: 1210.75,
      status: 'filled',
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      type: 'limit',
      fee: 0.25
    },
    {
      id: 'trade-3',
      symbol: 'BTC-USD',
      side: 'buy',
      quantity: 0.1,
      price: 42850.00,
      value: 4285.00,
      status: 'filled',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      type: 'market',
      fee: 2.14
    }
  ]

  const mockOrders: Order[] = [
    {
      id: 'order-1',
      symbol: 'NVDA',
      side: 'buy',
      quantity: 20,
      price: 875.50,
      status: 'pending',
      type: 'limit',
      timestamp: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: 'order-2',
      symbol: 'ETH-USD',
      side: 'sell',
      quantity: 2.5,
      status: 'filled',
      type: 'market',
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      filledQuantity: 2.5
    },
    {
      id: 'order-3',
      symbol: 'MSFT',
      side: 'buy',
      quantity: 15,
      price: 420.00,
      status: 'partially_filled',
      type: 'limit',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      filledQuantity: 8
    }
  ]

  // Use mock data if no real data provided
  const displayTrades = trades.length > 0 ? trades : mockTrades
  const displayOrders = orders.length > 0 ? orders : mockOrders

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />
      case 'cancelled':
      case 'rejected':
        return <XMarkIcon className="w-4 h-4 text-red-400" />
      case 'partially_filled':
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-400" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled':
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'cancelled':
      case 'rejected':
        return 'text-red-400'
      case 'partially_filled':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="bg-gray-900/40 rounded-lg border border-gray-700/50">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-white">Trading Activity</h3>
            <div className="flex bg-gray-800 rounded-lg p-1">
              {showTrades && (
                <button
                  onClick={() => setActiveTab('trades')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    activeTab === 'trades'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Trades ({displayTrades.length})
                </button>
              )}
              {showOrders && (
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Orders ({displayOrders.length})
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Live Trading Activity
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-400">Loading trading data...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeTab === 'trades' && displayTrades.slice(0, maxItems).map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors cursor-pointer"
                onClick={() => setSelectedItem(selectedItem === trade.id ? null : trade.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded ${trade.side === 'buy' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                    {trade.side === 'buy' ?
                      <ArrowUpIcon className="w-4 h-4 text-green-400" /> :
                      <ArrowDownIcon className="w-4 h-4 text-red-400" />
                    }
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{trade.symbol}</span>
                      <span className={`text-sm font-medium ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      {getStatusIcon(trade.status)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {trade.quantity} @ ${trade.price.toFixed(2)} • {formatTime(trade.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-white">
                    ${trade.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs ${getStatusColor(trade.status)}`}>
                    {trade.status.toUpperCase()}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedItem === trade.id && (
                  <div className="absolute z-10 mt-2 ml-12 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Order Type:</span>
                        <span className="ml-1 text-white capitalize">{trade.type}</span>
                      </div>
                      {trade.fee && (
                        <div>
                          <span className="text-gray-400">Fee:</span>
                          <span className="ml-1 text-white">${trade.fee.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'orders' && displayOrders.slice(0, maxItems).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors cursor-pointer"
                onClick={() => setSelectedItem(selectedItem === order.id ? null : order.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded ${order.side === 'buy' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                    {order.side === 'buy' ?
                      <ArrowUpIcon className="w-4 h-4 text-green-400" /> :
                      <ArrowDownIcon className="w-4 h-4 text-red-400" />
                    }
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{order.symbol}</span>
                      <span className={`text-sm font-medium ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {order.side.toUpperCase()}
                      </span>
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {order.quantity} {order.price && `@ $${order.price.toFixed(2)}`} • {formatTime(order.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-white">
                    {order.filledQuantity ? `${order.filledQuantity}/${order.quantity}` : order.quantity}
                  </div>
                  <div className={`text-xs ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            ))}

            {((activeTab === 'trades' && displayTrades.length === 0) ||
              (activeTab === 'orders' && displayOrders.length === 0)) && (
              <div className="text-center py-8">
                <EyeIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  No {activeTab} to display yet
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Activity will appear here when trading starts
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}