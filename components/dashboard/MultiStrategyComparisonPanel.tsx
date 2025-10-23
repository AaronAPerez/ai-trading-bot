"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface MultiStrategyComparisonPanelProps {
  botIsActive: boolean
}

export default function MultiStrategyComparisonPanel({
  botIsActive
}: MultiStrategyComparisonPanelProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD') // Default to Bitcoin

  // Fetch multi-strategy comparison data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['multiStrategyComparison', selectedSymbol],
    queryFn: async () => {
      const res = await fetch(`/api/hedge-fund/multi-strategy-analysis?symbol=${selectedSymbol}`)
      if (!res.ok) throw new Error('Failed to fetch multi-strategy analysis')
      return res.json()
    },
    refetchInterval: botIsActive ? 30000 : false,
    staleTime: 10000
  })

  const allStrategies = data?.data?.allSignals || []
  const consensus = data?.data?.consensus
  const weightedSignal = data?.data?.weightedSignal
  const recommendedSignal = data?.data?.recommendedSignal
  const marketData = data?.data?.marketData
  const dataSource = data?.data?.dataSource

  // Calculate consensus majority
  const getMajorityAction = () => {
    if (!consensus) return 'HOLD'
    const votes = {
      BUY: consensus.buyVotes,
      SELL: consensus.sellVotes,
      HOLD: consensus.holdVotes
    }
    return Object.entries(votes).reduce((a, b) => votes[a[0] as keyof typeof votes] > votes[b[0] as keyof typeof votes] ? a : b)[0]
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load multi-strategy comparison</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-blue-700/50 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Multi-Strategy Comparison</h3>
            <p className="text-sm text-gray-400">
              {dataSource === 'alpaca' ? '🟢 Live Alpaca Data - Crypto Only (24/7)' : '💎 Crypto-Only Trading Mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Symbol Selector - Crypto Only */}
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
          >
            <optgroup label="Major Crypto">
              <option value="BTCUSD">BTC/USD</option>
              <option value="ETHUSD">ETH/USD</option>
              <option value="LTCUSD">LTC/USD</option>
              <option value="BCHUSD">BCH/USD</option>
            </optgroup>
            <optgroup label="Layer 1s">
              <option value="SOLUSD">SOL/USD</option>
              <option value="AVAXUSD">AVAX/USD</option>
              <option value="ADAUSD">ADA/USD</option>
              <option value="DOTUSD">DOT/USD</option>
              <option value="ATOMUSD">ATOM/USD</option>
              <option value="NEARUSD">NEAR/USD</option>
            </optgroup>
            <optgroup label="DeFi">
              <option value="LINKUSD">LINK/USD</option>
              <option value="UNIUSD">UNI/USD</option>
              <option value="AAVEUSD">AAVE/USD</option>
            </optgroup>
            <optgroup label="Meme Coins">
              <option value="DOGEUSDT">DOGE/USDT</option>
              <option value="SHIBUSDT">SHIB/USDT</option>
            </optgroup>
            <optgroup label="Trending">
              <option value="SUIUSD">SUI/USD</option>
              <option value="APTUSD">APT/USD</option>
              <option value="SEIUSD">SEI/USD</option>
            </optgroup>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Market Data Summary */}
      {marketData && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Current Price (Alpaca)</div>
              <div className="text-2xl font-bold text-white">
                ${marketData.currentPrice?.toFixed(2) || 'N/A'}
              </div>
            </div>
            {marketData.change !== undefined && (
              <div className={`text-right ${marketData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <div className="text-xl font-bold">
                  {marketData.change >= 0 ? '+' : ''}{marketData.change.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-400">24h Change</div>
              </div>
            )}
            {marketData.volume && (
              <div className="text-right">
                <div className="text-sm font-semibold text-white">
                  {(marketData.volume / 1000000).toFixed(2)}M
                </div>
                <div className="text-xs text-gray-400">Volume</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consensus Summary */}
      {consensus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Consensus Action */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase mb-1">Consensus</div>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${
                getMajorityAction() === 'BUY' ? 'text-green-400' :
                getMajorityAction() === 'SELL' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {getMajorityAction()}
              </span>
              <span className="text-sm text-gray-400">
                ({Math.round(consensus.agreement * 100)}% agree)
              </span>
            </div>
          </div>

          {/* Vote Distribution */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase mb-2">Vote Distribution</div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Buy: {consensus.buyVotes}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-gray-300">Sell: {consensus.sellVotes}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Hold: {consensus.holdVotes}</span>
              </div>
            </div>
          </div>

          {/* Average Confidence */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase mb-1">Avg Confidence</div>
            <div className="text-2xl font-bold text-white">
              {Math.round(consensus.averageConfidence)}%
            </div>
          </div>
        </div>
      )}

      {/* Weighted Recommendation */}
      {weightedSignal && (
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Performance-Weighted Signal</div>
              <div className="flex items-center space-x-3">
                <span className={`text-xl font-bold ${
                  weightedSignal.action === 'BUY' ? 'text-green-400' :
                  weightedSignal.action === 'SELL' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {weightedSignal.action}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-white">{Math.round(weightedSignal.confidence)}% confidence</span>
              </div>
            </div>
            <div className="text-sm text-gray-400 max-w-md">
              {weightedSignal.reasoning}
            </div>
          </div>
        </div>
      )}

      {/* Individual Strategy Signals */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 uppercase mb-3">Individual Strategies</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allStrategies.map((signal: any) => (
            <div
              key={signal.strategyId}
              className={`bg-gray-800/50 rounded-lg p-4 border ${
                signal.strategyId === recommendedSignal?.strategyId
                  ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-white">{signal.strategyName}</div>
                  {signal.strategyId === recommendedSignal?.strategyId && (
                    <div className="text-xs text-yellow-400 mt-1">⭐ Best Performer</div>
                  )}
                </div>
                {signal.action === 'BUY' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : signal.action === 'SELL' ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-yellow-400" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Signal:</span>
                  <span className={`font-semibold ${
                    signal.action === 'BUY' ? 'text-green-400' :
                    signal.action === 'SELL' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {signal.action}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Confidence:</span>
                  <span className="text-white font-semibold">{Math.round(signal.confidence)}%</span>
                </div>

                {signal.performance && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="text-white">{signal.performance.winRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Trades:</span>
                      <span className="text-white">{signal.performance.totalTrades || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">P&L:</span>
                      <span className={signal.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ${signal.performance.totalPnL?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && allStrategies.length === 0 && (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading multi-strategy analysis...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allStrategies.length === 0 && (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400">No strategy data available</p>
          <p className="text-sm text-gray-500 mt-1">Start the bot to generate signals</p>
        </div>
      )}
    </div>
  )
}
