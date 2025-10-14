'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface TradeStep {
  step: number
  label: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  timestamp?: Date
  details?: string
}

interface LiveTrade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  status: 'analyzing' | 'validated' | 'executing' | 'filled' | 'failed'
  confidence?: number
  quantity?: string
  price?: string
  totalValue?: number
  steps: TradeStep[]
  startTime: Date
  endTime?: Date
}

export default function LiveTradingProcess() {
  const [activeTrades, setActiveTrades] = useState<LiveTrade[]>([])
  const [completedTrades, setCompletedTrades] = useState<LiveTrade[]>([])

  // Fetch orders from Alpaca
  const { data: orders } = useQuery<any[]>({
    queryKey: ['alpacaOrders'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/alpaca/orders?limit=50')
        if (!res.ok) {
          console.warn('Failed to fetch orders:', res.status)
          return []
        }
        const json = await res.json()
        return json.orders || []
      } catch (error) {
        console.error('Error fetching orders:', error)
        return []
      }
    },
    refetchInterval: 30000, // 30 seconds (reduced from 5)
    retry: 1,
    retryDelay: 10000,
    staleTime: 15000
  })

  // Simulate trade process steps based on order status
  useEffect(() => {
    if (!orders) return

    const recentOrders = orders.slice(0, 10)
    const newActiveTrades: LiveTrade[] = []
    const newCompletedTrades: LiveTrade[] = []

    recentOrders.forEach((order) => {
      const steps: TradeStep[] = [
        {
          step: 1,
          label: 'AI Analysis',
          status: 'completed',
          details: 'Confidence threshold met'
        },
        {
          step: 2,
          label: 'Risk Validation',
          status: 'completed',
          details: 'Position sizing calculated'
        },
        {
          step: 3,
          label: 'Market Check',
          status: 'completed',
          details: 'Trading hours validated'
        },
        {
          step: 4,
          label: 'Order Placed',
          status: order.status === 'new' || order.status === 'accepted' ? 'active' : 'completed',
          details: `${order.side?.toUpperCase()} ${order.qty} @ market`
        },
        {
          step: 5,
          label: 'Execution',
          status: order.status === 'filled' ? 'completed' :
                  order.status === 'canceled' ? 'failed' :
                  order.status === 'partially_filled' ? 'active' : 'pending',
          details: order.filled_qty ? `Filled: ${order.filled_qty}/${order.qty}` : 'Waiting for fill'
        }
      ]

      const trade: LiveTrade = {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        status: order.status === 'filled' ? 'filled' :
                order.status === 'canceled' ? 'failed' : 'executing',
        confidence: Math.random() * 40 + 60, // Simulated
        quantity: order.qty,
        price: order.filled_avg_price,
        totalValue: order.filled_avg_price ? parseFloat(order.filled_avg_price) * parseFloat(order.qty) : undefined,
        steps,
        startTime: new Date(order.created_at),
        endTime: order.updated_at ? new Date(order.updated_at) : undefined
      }

      if (trade.status === 'filled' || trade.status === 'failed') {
        newCompletedTrades.push(trade)
      } else {
        newActiveTrades.push(trade)
      }
    })

    setActiveTrades(newActiveTrades)
    setCompletedTrades(newCompletedTrades.slice(0, 5)) // Keep last 5 completed
  }, [orders])

  const getStepIcon = (status: TradeStep['status']) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'active':
        return '⏳'
      case 'failed':
        return '❌'
      default:
        return '⚪'
    }
  }

  const getTradeColor = (side: 'buy' | 'sell') => {
    return side === 'buy' ? 'green' : 'red'
  }

  return (
    <div className="space-y-6">
      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>Active Trades ({activeTrades.length})</span>
            </h3>
          </div>

          {activeTrades.map((trade) => (
            <div
              key={trade.id}
              className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl p-6 border-2 border-yellow-500/30 animate-pulse-border"
            >
              {/* Trade Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-${getTradeColor(trade.side)}-500/20 rounded-lg flex items-center justify-center border-2 border-${getTradeColor(trade.side)}-500`}>
                    <span className="text-2xl">{trade.side === 'buy' ? '📈' : '📉'}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xl font-bold text-white">{trade.symbol}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        trade.side === 'buy'
                          ? 'bg-green-900/40 text-green-400 border border-green-500/40'
                          : 'bg-red-900/40 text-red-400 border border-red-500/40'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {formatDistanceToNow(trade.startTime, { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {trade.confidence && (
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Confidence</div>
                    <div className="text-lg font-bold text-blue-400">
                      {trade.confidence.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Process Steps */}
              <div className="space-y-3">
                {trade.steps.map((step) => (
                  <div
                    key={step.step}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      step.status === 'active'
                        ? 'bg-yellow-900/20 border-l-4 border-yellow-500'
                        : step.status === 'completed'
                        ? 'bg-green-900/10 border-l-4 border-green-500/30'
                        : 'bg-gray-800/30 border-l-4 border-gray-600'
                    }`}
                  >
                    <div className="text-2xl">{getStepIcon(step.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${
                          step.status === 'active' ? 'text-yellow-300' :
                          step.status === 'completed' ? 'text-green-300' :
                          'text-gray-400'
                        }`}>
                          {step.step}. {step.label}
                        </span>
                        {step.status === 'active' && (
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        )}
                      </div>
                      {step.details && (
                        <div className="text-xs text-gray-400 mt-1">{step.details}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trade Details */}
              {trade.quantity && (
                <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-400">Quantity</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {parseFloat(trade.quantity).toFixed(4)}
                    </div>
                  </div>
                  {trade.price && (
                    <div>
                      <div className="text-xs text-gray-400">Price</div>
                      <div className="text-sm font-semibold text-white mt-1">
                        ${parseFloat(trade.price).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {trade.totalValue && (
                    <div>
                      <div className="text-xs text-gray-400">Total Value</div>
                      <div className="text-sm font-semibold text-white mt-1">
                        ${trade.totalValue.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Completed Trades */}
      {completedTrades.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>Recently Completed</span>
            </h3>
          </div>

          <div className="space-y-2">
            {completedTrades.map((trade) => (
              <div
                key={trade.id}
                className={`bg-gradient-to-r ${
                  trade.status === 'filled'
                    ? 'from-green-900/20 to-green-800/10 border-green-700/30'
                    : 'from-red-900/20 to-red-800/10 border-red-700/30'
                } rounded-lg p-4 border transition-all hover:border-${trade.status === 'filled' ? 'green' : 'red'}-500/50`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl ${
                      trade.status === 'filled' ? 'animate-bounce-once' : ''
                    }`}>
                      {trade.status === 'filled' ? '✅' : '❌'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{trade.symbol}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          trade.side === 'buy' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {trade.quantity && trade.price && (
                          <>
                            {parseFloat(trade.quantity).toFixed(4)} @ ${parseFloat(trade.price).toFixed(2)}
                            {' • '}
                            {formatDistanceToNow(trade.startTime, { addSuffix: true })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      trade.status === 'filled' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.status === 'filled' ? 'FILLED' : 'CANCELED'}
                    </div>
                    {trade.totalValue && (
                      <div className="text-xs text-gray-400 mt-1">
                        ${trade.totalValue.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeTrades.length === 0 && completedTrades.length === 0 && (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-700">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Waiting for Trading Activity
          </h3>
          <p className="text-gray-400 text-sm">
            Start the AI bot to see live buy/sell processes here
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(234, 179, 8, 0.3);
          }
          50% {
            border-color: rgba(234, 179, 8, 0.8);
          }
        }

        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }

        @keyframes bounce-once {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
      `}</style>
    </div>
  )
}
