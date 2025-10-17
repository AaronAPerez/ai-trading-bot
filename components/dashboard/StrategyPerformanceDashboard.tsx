"use client"

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Target, Zap, BarChart3, RefreshCw, AlertCircle } from 'lucide-react'

interface Strategy {
  strategyId: string
  strategyName: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnL: number
  winRate: number
  avgPnL: number
  score: number
  testingMode?: boolean
  testTradesCompleted?: number
  testPassed?: boolean | null
}

interface StrategyPerformanceDashboardProps {
  botIsActive: boolean
  onStrategyChange?: (strategyId: string, inverseMode: boolean) => void
  autoSwitch?: boolean
  inverseMode?: boolean // Current inverse mode state
}

export default function StrategyPerformanceDashboard({
  botIsActive,
  onStrategyChange,
  autoSwitch = true,
  inverseMode = false
}: StrategyPerformanceDashboardProps) {
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(autoSwitch)

  // Determine current active strategy based on inverseMode prop
  const currentStrategyId = inverseMode ? 'inverse' : 'normal'

  // Fetch strategy performance data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['strategyPerformance'],
    queryFn: async () => {
      const res = await fetch('/api/strategies/auto-select')
      if (!res.ok) throw new Error('Failed to fetch strategy performance')
      return res.json()
    },
    refetchInterval: botIsActive ? 30000 : false, // Refresh every 30s when bot active
    staleTime: 10000
  })

  const bestStrategy = data?.data?.bestStrategy
  const allStrategies = data?.data?.allStrategies || []
  const recommendation = data?.data?.recommendation

  // Auto-switch to best strategy if enabled
  useEffect(() => {
    if (autoSwitchEnabled && bestStrategy && botIsActive) {
      if (bestStrategy.strategyId !== currentStrategyId) {
        console.log(`🔄 Auto-switching to best strategy: ${bestStrategy.strategyName}`)

        // Notify parent component
        if (onStrategyChange) {
          const shouldEnableInverse = bestStrategy.strategyId === 'inverse'
          onStrategyChange(bestStrategy.strategyId, shouldEnableInverse)
        }
      }
    }
  }, [bestStrategy, autoSwitchEnabled, botIsActive, currentStrategyId, onStrategyChange])

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load strategy performance</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl p-6 border border-purple-700/50 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Strategy Performance</h3>
            <p className="text-sm text-gray-400">AI-powered strategy selection</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            title="Refresh performance data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Auto-Switch Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">Auto-Switch</span>
            <button
              onClick={() => setAutoSwitchEnabled(!autoSwitchEnabled)}
              disabled={!botIsActive}
              className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none ${
                autoSwitchEnabled
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                  : 'bg-gray-600'
              } ${!botIsActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-lg ${
                  autoSwitchEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Best Strategy Card */}
          {bestStrategy && (
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border-2 border-green-500/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-1">
                      🏆 Best Performing Strategy
                    </div>
                    <div className="text-2xl font-bold text-white">{bestStrategy.strategyName}</div>
                  </div>
                </div>
                {bestStrategy.strategyId === currentStrategyId && (
                  <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400 font-semibold">ACTIVE</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Total P&L</div>
                  <div className={`text-lg font-bold ${
                    bestStrategy.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {bestStrategy.totalPnL >= 0 ? '+' : ''}${bestStrategy.totalPnL.toFixed(2)}
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-white">
                    {bestStrategy.winRate.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Total Trades</div>
                  <div className="text-lg font-bold text-white">
                    {bestStrategy.totalTrades}
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Avg P&L</div>
                  <div className={`text-lg font-bold ${
                    bestStrategy.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {bestStrategy.avgPnL >= 0 ? '+' : ''}${bestStrategy.avgPnL.toFixed(2)}
                  </div>
                </div>
              </div>

              {recommendation && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-300">{recommendation.reason}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All Strategies Performance */}
          {allStrategies.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-semibold text-white">Strategy Comparison</h4>
                <span className="text-xs text-gray-400">
                  (Testing: 5 trades required)
                </span>
              </div>

              <div className="space-y-3">
                {allStrategies.map((strategy: Strategy, index: number) => (
                  <div
                    key={strategy.strategyId}
                    className={`p-4 rounded-lg border transition-all ${
                      strategy.strategyId === bestStrategy?.strategyId
                        ? 'bg-purple-900/30 border-purple-500/50'
                        : 'bg-gray-900/50 border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-500/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-700/20 text-gray-500'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white">{strategy.strategyName}</span>
                            {strategy.strategyId === currentStrategyId && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                                ACTIVE
                              </span>
                            )}
                            {strategy.strategyId === bestStrategy?.strategyId && strategy.strategyId !== currentStrategyId && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                                BEST
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {strategy.totalTrades} trades • {strategy.winningTrades}W / {strategy.losingTrades}L
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-right">
                        <div>
                          <div className="text-xs text-gray-400">Win Rate</div>
                          <div className="text-sm font-semibold text-white">
                            {strategy.winRate.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Total P&L</div>
                          <div className={`text-sm font-bold ${
                            strategy.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {strategy.totalPnL >= 0 ? '+' : ''}${strategy.totalPnL.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Score</div>
                          <div className="text-sm font-semibold text-purple-400">
                            {strategy.score.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allStrategies.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">No strategy data available</div>
              <div className="text-sm text-gray-500">
                Start trading to collect performance data
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
