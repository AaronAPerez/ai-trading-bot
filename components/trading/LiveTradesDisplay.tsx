'use client'

import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useEffect } from 'react'

export default function LiveTradesDisplay() {
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['alpacaOrders'],
    queryFn: async () => {
      const res = await fetch('/api/alpaca/orders?limit=20')
      if (!res.ok) throw new Error('Failed to fetch orders')
      const json = await res.json()
      return json.orders || []
    },
    refetchInterval: 30000 // refresh every 30s
  })

  useEffect(() => {
    refetch()
  }, [])

  if (error) {
    return <div className="text-red-400 text-sm">Error loading trades: {error.message}</div>
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="animate-pulse bg-gray-700 h-24 rounded-lg"></div>
      ) : orders.length === 0 ? (
        <div className="text-gray-400 text-sm">No recent trades found.</div>
      ) : (
        orders.map((order: any) => (
          <div
            key={order.id}
            className={`border border-gray-700 rounded-lg p-4 bg-gray-800/40 hover:bg-gray-800/60 transition-all duration-200`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-white font-semibold">{order.symbol}</div>
              <div
                className={`text-sm font-medium ${
                  order.side === 'buy' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {order.side.toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <span className="text-gray-400">Filled Qty:</span>{' '}
                {parseFloat(order.filled_qty || order.qty || '0')}
              </div>
              <div>
                <span className="text-gray-400">Avg Fill Price:</span>{' '}
                ${parseFloat(order.filled_avg_price || '0').toFixed(2)}
              </div>
              <div>
                <span className="text-gray-400">Status:</span>{' '}
                <span
                  className={`font-semibold ${
                    order.status === 'filled'
                      ? 'text-green-400'
                      : order.status === 'canceled'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                  }`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Time:</span>{' '}
                {formatDistanceToNow(new Date(order.updated_at || order.created_at), {
                  addSuffix: true
                })}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}