'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  BoltIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useAlpacaTrades } from '@/hooks/api/useAlpacaData'
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
  const aiActivity = useAIBotActivity({
    refreshInterval: 5000,
    maxActivities: 50
  })

  const formatTime = (date: Date | string | number) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Filter and combine trade data with AI activity logs
  useEffect(() => {
    const trades = realTradesQuery.data || []
    const activities = aiActivity.activities || []

    // Get trade activities from AI bot
    const tradeActivities = activities.filter(activity => activity.type === 'trade')

    // Filter trades that correspond to AI activities or recent trades when bot is active
    const filteredTrades = trades
      .filter((trade: any) => {
        // If we have specific trade activities, match them
        if (tradeActivities.length > 0) {
          return tradeActivities.some(activity =>
            activity.symbol === trade.symbol &&
            Math.abs(new Date(activity.timestamp).getTime() - new Date(trade.timestamp).getTime()) < 60000 // Within 1 minute
          )
        }

        // If AI bot is active, show recent trades (assume they're AI generated)
        if (aiActivity.isSimulating) {
          const tradeTime = new Date(trade.timestamp).getTime()
          const now = Date.now()
          return (now - tradeTime) < 3600000 // Within last hour when bot is active
        }

        return false
      })
      .map((trade: any) => {
        const relatedActivity = tradeActivities.find(activity =>
          activity.symbol === trade.symbol &&
          Math.abs(new Date(activity.timestamp).getTime() - new Date(trade.timestamp).getTime()) < 60000
        )

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
          aiGenerated: true,
          activityId: relatedActivity?.id
        }
      })
      .slice(0, maxItems)

    setAiTrades(filteredTrades)
  }, [realTradesQuery.data, aiActivity.activities, aiActivity.isSimulating, maxItems])

  // Only use real AI trades from Alpaca API - no mock data
  const displayTrades = aiTrades
  const isLoading = realTradesQuery.isLoading

  return (
    <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 h-96">
      {showHeader && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BoltIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">AI Live Trades</h3>
              <div className={`w-2 h-2 rounded-full ${
                aiActivity.isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
              }`} />
            </div>
            <div className="text-xs text-gray-400">
              {displayTrades.length} trades
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
              {aiActivity.isSimulating ? 'No AI trades yet' : 'AI trading inactive'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {!aiActivity.isSimulating && 'Start AI trading to see live trades here'}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700/30">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {trade.side === 'buy' ?
                      <ArrowUpIcon className="w-4 h-4 text-green-400" /> :
                      <ArrowDownIcon className="w-4 h-4 text-red-400" />
                    }
                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-white">{trade.symbol}</span>
                      <span className={`text-sm font-medium ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      <div className="flex items-center space-x-1">
                        <BoltIcon className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400 font-medium">AI</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {trade.quantity} @ ${trade.price.toFixed(2)} • {formatTime(trade.timestamp)}
                      {trade.confidence && (
                        <span className="ml-2 text-green-400">{trade.confidence.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-white">
                    ${trade.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-green-400">
                    FILLED
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