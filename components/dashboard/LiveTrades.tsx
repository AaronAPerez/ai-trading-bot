'use client'

import React, { useState } from 'react'
import { 
  BoltIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'

interface LiveTradesProps {
  positions: any[]
  quotes: Record<string, any>
  executeOrder: (orderData: any) => Promise<any>
  isLoading: boolean
}

export function LiveTrades({ positions, quotes, executeOrder, isLoading }: LiveTradesProps) {
  const [isExecutingOrder, setIsExecutingOrder] = useState(false)
  const [executionMessage, setExecutionMessage] = useState<string | null>(null)

  const handleClosePosition = async (position: any) => {
    try {
      setIsExecutingOrder(true)
      
      const orderData = {
        symbol: position.symbol,
        quantity: Math.abs(position.quantity),
        side: position.side === 'long' ? 'sell' : 'buy' as 'buy' | 'sell',
        type: 'market' as const
      }

      await executeOrder(orderData)
      setExecutionMessage(`Successfully closed position in ${position.symbol}`)
      
      setTimeout(() => setExecutionMessage(null), 3000)
    } catch (error) {
      console.error('Order execution failed:', error)
      setExecutionMessage(`Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setExecutionMessage(null), 5000)
    } finally {
      setIsExecutingOrder(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BoltIcon className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold">Live Trading Positions</h2>
        </div>
        
        {executionMessage && (
          <div className={`px-4 py-2 rounded-lg text-sm ${
            executionMessage.includes('Successfully') ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
          }`}>
            {executionMessage}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!isLoading && positions.length === 0 && (
        <div className="text-center py-12">
          <BoltIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Active Positions</h3>
          <p className="text-gray-500">Enable the AI bot to start generating trades</p>
        </div>
      )}

      {positions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {positions.map((position, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold">{position.symbol}</div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    position.side === 'long' ? 'bg-emerald-600' : 'bg-red-600'
                  }`}>
                    {position.side.toUpperCase()}
                  </div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
                
                <button
                  onClick={() => handleClosePosition(position)}
                  disabled={isExecutingOrder}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                  title="Close Position"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400">Entry Price</div>
                  <div className="text-lg font-semibold">${position.avgBuyPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Current Price</div>
                  <div className="text-lg font-semibold">${position.currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Quantity</div>
                  <div className="text-lg font-semibold">{Math.abs(position.quantity)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Market Value</div>
                  <div className="text-lg font-semibold">${position.marketValue.toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-400">Unrealized P&L</div>
                    <div className={`text-xl font-bold ${
                      position.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Return</div>
                    <div className={`text-xl font-bold ${
                      position.unrealizedPnLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Price Update Indicator */}
              {quotes[position.symbol] && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Live Quote: ${quotes[position.symbol].midPrice.toFixed(2)}</span>
                    <span>Updated: {quotes[position.symbol].timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}