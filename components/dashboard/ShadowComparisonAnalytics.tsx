'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, LineChart, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'

interface ShadowComparisonAnalyticsProps {
  portfolioId: string
}

export default function ShadowComparisonAnalytics({ portfolioId }: ShadowComparisonAnalyticsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['shadowComparison', portfolioId],
    queryFn: async () => {
      const res = await fetch(`/api/shadow-trading?action=compare&portfolioId=${portfolioId}`)
      return res.json()
    },
    refetchInterval: 10000
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900/40 rounded-lg p-12 border border-gray-700/50 text-center">
        <div className="text-gray-400">Loading comparison data...</div>
      </div>
    )
  }

  if (!data?.success || !data?.comparison) {
    return (
      <div className="bg-gray-900/40 rounded-lg p-12 border border-gray-700/50 text-center">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <div className="text-gray-400">No comparison data available</div>
      </div>
    )
  }

  const { shadowPortfolio, comparison } = data

  const opportunityCostPercent = shadowPortfolio.initialCapital > 0
    ? (comparison.opportunityCost / shadowPortfolio.initialCapital) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <BarChart className="w-6 h-6" />
          <span>Performance Comparison</span>
        </h2>
        <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
          {shadowPortfolio.name}
        </div>
      </div>

      {/* Key Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-2">Shadow Portfolio P&L</div>
          <div className={`text-3xl font-bold ${comparison.shadowPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {comparison.shadowPnL >= 0 ? '+' : ''}${comparison.shadowPnL.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {comparison.shadowPnLPercent >= 0 ? '+' : ''}{comparison.shadowPnLPercent.toFixed(2)}% return
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Win Rate</span>
              <span className="text-white font-semibold">{comparison.shadowWinRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-2">Opportunity Cost</div>
          <div className={`text-3xl font-bold ${comparison.opportunityCost >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {comparison.opportunityCost >= 0 ? '+' : ''}${comparison.opportunityCost.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {opportunityCostPercent >= 0 ? '+' : ''}{opportunityCostPercent.toFixed(2)}% potential gain
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              {comparison.opportunityCost >= 0 ? (
                <div className="flex items-center space-x-1 text-green-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>Strategy would have outperformed</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-400">
                  <TrendingDown className="w-3 h-3" />
                  <span>Real trades performed better</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-2">Trade Activity</div>
          <div className="text-3xl font-bold text-white">
            {comparison.shadowTradesCount}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Shadow trades executed
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Real Trades</span>
              <span className="text-white font-semibold">{comparison.realTradesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Insights */}
      <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <LineChart className="w-5 h-5" />
          <span>Strategy Insights</span>
        </h3>

        <div className="space-y-4">
          {/* Performance Rating */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div>
              <div className="font-medium text-white">Overall Performance Rating</div>
              <div className="text-sm text-gray-400 mt-1">
                Based on P&L, win rate, and trade count
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {comparison.shadowPnL >= 0 && comparison.shadowWinRate >= 50 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Strong</span>
                </>
              ) : comparison.shadowPnL >= 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">Moderate</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-semibold">Weak</span>
                </>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div>
              <div className="font-medium text-white">Risk Profile</div>
              <div className="text-sm text-gray-400 mt-1">
                {shadowPortfolio.strategyVariant.replace('_', ' ').charAt(0).toUpperCase() +
                 shadowPortfolio.strategyVariant.replace('_', ' ').slice(1)} strategy
              </div>
            </div>
            <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-medium">
              {shadowPortfolio.strategyVariant === 'conservative' ? 'Low Risk' :
               shadowPortfolio.strategyVariant === 'aggressive' ? 'High Risk' : 'Medium Risk'}
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
            <div className="font-medium text-white mb-2">Recommendation</div>
            <div className="text-sm text-gray-300">
              {comparison.opportunityCost > 0 ? (
                <>
                  The shadow strategy shows <span className="text-green-400 font-semibold">positive opportunity cost</span>.
                  Consider implementing this strategy variant in your live trading to potentially improve returns.
                </>
              ) : comparison.opportunityCost < 0 ? (
                <>
                  Your current real trading strategy is <span className="text-green-400 font-semibold">outperforming</span> this shadow variant.
                  Continue with your current approach or test other strategy parameters.
                </>
              ) : (
                <>
                  The shadow strategy is performing similarly to your real trades.
                  Monitor for a longer period to identify meaningful differences.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
          <h4 className="text-sm font-semibold text-white mb-4">Shadow Portfolio Statistics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Initial Capital</span>
              <span className="text-sm font-semibold text-white">${shadowPortfolio.initialCapital.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current Capital</span>
              <span className="text-sm font-semibold text-white">${shadowPortfolio.currentCapital.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Value</span>
              <span className="text-sm font-semibold text-white">
                ${(shadowPortfolio.metadata?.totalPortfolioValue || shadowPortfolio.currentCapital).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Open Positions</span>
              <span className="text-sm font-semibold text-white">{Array.from(shadowPortfolio.positions).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Closed Trades</span>
              <span className="text-sm font-semibold text-white">{shadowPortfolio.closedTrades.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
          <h4 className="text-sm font-semibold text-white mb-4">Performance Metrics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Return</span>
              <span className={`text-sm font-semibold ${comparison.shadowPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {comparison.shadowPnLPercent >= 0 ? '+' : ''}{comparison.shadowPnLPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Win Rate</span>
              <span className="text-sm font-semibold text-white">{comparison.shadowWinRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Winning Trades</span>
              <span className="text-sm font-semibold text-green-400">
                {shadowPortfolio.closedTrades.filter((t: any) => t.pnl > 0).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Losing Trades</span>
              <span className="text-sm font-semibold text-red-400">
                {shadowPortfolio.closedTrades.filter((t: any) => t.pnl < 0).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Strategy Variant</span>
              <span className="text-sm font-semibold text-purple-400">{shadowPortfolio.strategyVariant}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
