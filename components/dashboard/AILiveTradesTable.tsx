'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  BoltIcon,
  EyeIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'
import { useAlpacaTrades, useAlpacaPositions, useMarketData } from '@/hooks/api/useAlpacaData'
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData'
import useAIBotActivity from '@/hooks/useAIBotActivity'

interface AITrade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  value: number
  status: 'filled' | 'pending' | 'processing'
  timestamp: Date
  type: 'market' | 'limit' | 'stop'
  confidence?: number
  aiGenerated: boolean
  activityId?: string
  // Enhanced live data
  currentPrice?: number
  unrealizedPnL?: number
  unrealizedPnLPercent?: number
  marketValue?: number
  dayChange?: number
  dayChangePercent?: number
}

interface AILiveTradesTableProps {
  maxItems?: number
  compact?: boolean
  showHeader?: boolean
}

export default function AILiveTradesTable({
  maxItems = 8,
  compact = false,
  showHeader = true
}: AILiveTradesTableProps) {
  const [aiTrades, setAiTrades] = useState<AITrade[]>([])
  const realTradesQuery = useAlpacaTrades()
  const positionsQuery = useAlpacaPositions()
  const aiActivity = useAIBotActivity({
    refreshInterval: 5000,
    maxActivities: 50
  })

  // Get all unique symbols from trades and positions for live price updates
  const [tradingSymbols, setTradingSymbols] = useState<string[]>([])
  const { prices: livePrices } = useRealTimeMarketData(tradingSymbols)

  const formatTime = (date: Date | string | number) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0)
  }

  const formatPercentage = (value: number) => {
    const formatted = (value * 100).toFixed(2)
    return `${value >= 0 ? '+' : ''}${formatted}%`
  }

  // Update trading symbols for live price subscriptions
  useEffect(() => {
    const trades = realTradesQuery.data || []
    const positions = positionsQuery.data || []

    const symbols = new Set<string>()

    // Add symbols from recent trades
    trades.forEach((trade: any) => symbols.add(trade.symbol))

    // Add symbols from current positions
    positions.forEach((position: any) => symbols.add(position.symbol))

    setTradingSymbols(Array.from(symbols))
  }, [realTradesQuery.data, positionsQuery.data])

  // Filter and combine trade data with AI activity logs and live positions
  useEffect(() => {
    const trades = realTradesQuery.data || []
    const positions = positionsQuery.data || []
    const activities = aiActivity.activities || []

    // Get trade activities from AI bot
    const tradeActivities = activities.filter(activity => activity.type === 'trade')

    // Create a map of current positions for quick lookup
    const positionMap = new Map()
    positions.forEach((position: any) => {
      positionMap.set(position.symbol, position)
    })

    // Show all recent trades and current positions
    const filteredTrades = trades
      .filter((trade: any) => {
        // Show all recent trades (last 24 hours) when we have data
        const tradeTime = new Date(trade.timestamp).getTime()
        const now = Date.now()
        return (now - tradeTime) < 86400000 // Within last 24 hours
      })
      .map((trade: any) => {
        const relatedActivity = tradeActivities.find(activity =>
          activity.symbol === trade.symbol &&
          Math.abs(new Date(activity.timestamp).getTime() - new Date(trade.timestamp).getTime()) < 60000
        )

        // Get current position data for this symbol
        const currentPosition = positionMap.get(trade.symbol)
        const livePrice = livePrices[trade.symbol]?.price || 0

        // Calculate P&L and current values
        let unrealizedPnL = 0
        let unrealizedPnLPercent = 0
        let marketValue = trade.value

        if (currentPosition && livePrice > 0) {
          unrealizedPnL = parseFloat(currentPosition.unrealized_pl || currentPosition.unrealizedPnL || '0')
          unrealizedPnLPercent = parseFloat(currentPosition.unrealized_plpc || currentPosition.unrealizedPnLPercent || '0')
          marketValue = parseFloat(currentPosition.market_value || currentPosition.marketValue || '0')
        } else if (livePrice > 0 && trade.side === 'buy') {
          // For trades without positions, calculate based on current price
          const priceDiff = livePrice - trade.price
          unrealizedPnL = priceDiff * trade.quantity
          unrealizedPnLPercent = priceDiff / trade.price
          marketValue = livePrice * trade.quantity
        }

        return {
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          value: trade.value,
          status: 'filled',
          timestamp: new Date(trade.timestamp),
          type: trade.type || 'market',
          confidence: relatedActivity?.confidence,
          aiGenerated: !!relatedActivity || aiActivity.isSimulating,
          activityId: relatedActivity?.id,
          // Enhanced live data
          currentPrice: livePrice,
          unrealizedPnL,
          unrealizedPnLPercent,
          marketValue,
          dayChange: livePrice - trade.price,
          dayChangePercent: livePrice > 0 ? (livePrice - trade.price) / trade.price : 0
        }
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems)

    setAiTrades(filteredTrades)
  }, [realTradesQuery.data, positionsQuery.data, aiActivity.activities, aiActivity.isSimulating, livePrices, maxItems])

  // Only use real AI trades from Alpaca API - no mock data
  const displayTrades = aiTrades
  const isLoading = realTradesQuery.isLoading || positionsQuery.isLoading

  // Calculate summary stats
  const totalInvested = displayTrades.reduce((sum, trade) => sum + trade.value, 0)
  const totalMarketValue = displayTrades.reduce((sum, trade) => sum + (trade.marketValue || trade.value), 0)
  const totalPnL = displayTrades.reduce((sum, trade) => sum + (trade.unrealizedPnL || 0), 0)

  return (
    <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 h-96">
      {showHeader && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <BoltIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Live Trading Positions</h3>
              <div className={`w-2 h-2 rounded-full ${
                realTradesQuery.isLoading || positionsQuery.isLoading ? 'bg-yellow-400 animate-pulse' :
                realTradesQuery.error || positionsQuery.error ? 'bg-red-400' : 'bg-green-400'
              }`} />
            </div>
            <div className="text-xs text-gray-400">
              {displayTrades.length} positions
            </div>
          </div>

          {/* Live Summary Stats */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Invested</div>
              <div className="text-white font-medium">{formatCurrency(totalInvested)}</div>
            </div>
            <div>
              <div className="text-gray-400">Market Value</div>
              <div className="text-white font-medium">{formatCurrency(totalMarketValue)}</div>
            </div>
            <div>
              <div className="text-gray-400">Total P&L</div>
              <div className={`font-medium ${
                totalPnL > 0 ? 'text-green-400' : totalPnL < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {totalPnL !== 0 ? formatCurrency(totalPnL) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-400">Loading AI trades...</span>
          </div>
        ) : displayTrades.length === 0 ? (
          <div className="text-center py-8">
            <BoltIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <div className="text-gray-400 text-sm">
              No trading positions found
            </div>
            <div className="text-gray-500 text-xs mt-1">
              Execute some trades to see live position data with P&L
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTrades.map((trade) => (
              <div key={trade.id} className="bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700/30 p-4">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {trade.side === 'buy' ?
                        <ArrowUpIcon className="w-4 h-4 text-green-400" /> :
                        <ArrowDownIcon className="w-4 h-4 text-red-400" />
                      }
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white text-lg">{trade.symbol}</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          trade.side === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                        {trade.aiGenerated && (
                          <div className="flex items-center space-x-1 bg-blue-900/30 px-2 py-1 rounded">
                            <BoltIcon className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-blue-400 font-medium">AI</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTime(trade.timestamp)}
                        {trade.confidence && (
                          <span className="ml-2 text-green-400">Confidence: {trade.confidence.toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-green-400 font-medium">FILLED</div>
                  </div>
                </div>

                {/* Trading Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {/* Trade Details */}
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Trade Details</div>
                    <div className="text-white font-medium">
                      {trade.quantity} shares @ {formatCurrency(trade.price)}
                    </div>
                    <div className="text-gray-400 text-xs">
                      Cost: {formatCurrency(trade.value)}
                    </div>
                  </div>

                  {/* Current Price */}
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Current Price</div>
                    <div className="text-white font-medium">
                      {trade.currentPrice ? formatCurrency(trade.currentPrice) : 'Loading...'}
                    </div>
                    {trade.dayChange !== undefined && trade.dayChange !== 0 && (
                      <div className={`text-xs flex items-center ${
                        trade.dayChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.dayChange >= 0 ? (
                          <TrendingUpIcon className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDownIcon className="w-3 h-3 mr-1" />
                        )}
                        {formatCurrency(Math.abs(trade.dayChange))}
                      </div>
                    )}
                  </div>

                  {/* Market Value */}
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Market Value</div>
                    <div className="text-white font-medium">
                      {formatCurrency(trade.marketValue)}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {trade.quantity} × {trade.currentPrice ? formatCurrency(trade.currentPrice) : 'N/A'}
                    </div>
                  </div>

                  {/* P&L */}
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Unrealized P&L</div>
                    <div className={`font-medium ${
                      trade.unrealizedPnL > 0 ? 'text-green-400' :
                      trade.unrealizedPnL < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {trade.unrealizedPnL !== 0 ? formatCurrency(trade.unrealizedPnL) : 'N/A'}
                    </div>
                    {trade.unrealizedPnLPercent !== 0 && (
                      <div className={`text-xs ${
                        trade.unrealizedPnLPercent > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(trade.unrealizedPnLPercent)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}