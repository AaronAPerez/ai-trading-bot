"use client"

import { useMultiStrategyEngine } from "@/hooks/useMultiStrategyEngine"
import { useState, useEffect } from "react"
import { Brain, TrendingUp, TrendingDown, Activity, Award, Target, BarChart3 } from "lucide-react"

interface MultiStrategyComparisonProps {
  symbol?: string
  autoAnalyze?: boolean
  refreshInterval?: number
}

export default function MultiStrategyComparison({
  symbol = 'AAPL',
  autoAnalyze = false,
  refreshInterval = 30000
}: MultiStrategyComparisonProps) {
  const multiStrategy = useMultiStrategyEngine({
    autoStart: true,
    refreshInterval,
    autoSelectBest: true
  })

  const [selectedSymbol, setSelectedSymbol] = useState(symbol)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Auto-analyze on mount or when symbol changes
  useEffect(() => {
    if (autoAnalyze && multiStrategy.isRunning && selectedSymbol) {
      console.log('🎯 Auto-analyzing market for symbol:', selectedSymbol)
      handleAnalyze()
    }
  }, [selectedSymbol, multiStrategy.isRunning, autoAnalyze])

  const handleAnalyze = async () => {
    if (!selectedSymbol) {
      console.warn('⚠️ Cannot analyze: no symbol selected')
      return
    }

    setIsAnalyzing(true)
    console.log(`📊 Starting multi-strategy analysis for ${selectedSymbol}...`)

    try {
      const result = await multiStrategy.analyzeMarket(selectedSymbol)
      console.log('✅ Multi-strategy analysis completed:', result)
    } catch (error) {
      console.error('❌ Multi-strategy analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const { comparison, currentSignal, bestStrategy } = multiStrategy

  // Debug logging
  useEffect(() => {
    if (comparison) {
      console.log('MultiStrategyComparison - comparison data:', {
        hasRanking: !!comparison.ranking,
        rankingLength: comparison.ranking?.length || 0,
        topStrategy: comparison.topStrategy?.strategyName,
        allStrategiesCount: comparison.allStrategies?.length || 0
      })
    }
  }, [comparison])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Multi-Strategy Analysis</h2>
              <p className="text-sm text-gray-400">Real-time comparison of all trading strategies</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {multiStrategy.isRunning && (
              <div className="flex items-center space-x-2 bg-green-900/30 px-4 py-2 rounded-lg border border-green-500/30">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400 font-medium">Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="text-sm text-gray-400">
          Performance tracked automatically from real Alpaca API trades. Start the AI bot to begin collecting data.
        </div>
      </div>

      {/* No Data Message */}
      {!bestStrategy || bestStrategy.totalTrades === 0 ? (
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-8 border border-blue-700/50 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">No Strategy Data Yet</h3>
              <p className="text-gray-400 max-w-2xl">
                Strategy performance tracking begins automatically when the AI bot executes trades via Alpaca API.
                Start the bot above to begin collecting real trading data across all strategies.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 w-full max-w-3xl">
              {['RSI Momentum', 'MACD Trend', 'Bollinger Bands', 'MA Crossover', 'Mean Reversion'].map(name => (
                <div key={name} className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-400 mb-1">Ready</div>
                  <div className="text-sm font-semibold text-white truncate">{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Best Strategy Highlight */}
      {bestStrategy && bestStrategy.totalTrades > 0 && (
        <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-6 border-2 border-green-500/50">
          <div className="flex items-center space-x-3 mb-4">
            <Award className="w-6 h-6 text-yellow-400" />
            <h3 className="text-xl font-bold text-white">🏆 Best Performing Strategy</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Strategy</div>
              <div className="text-lg font-bold text-green-400">{bestStrategy.strategyName}</div>
            </div>

            <div className="bg-gray-900/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Win Rate</div>
              <div className="text-lg font-bold text-white">{bestStrategy.winRate.toFixed(1)}%</div>
            </div>

            <div className="bg-gray-900/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total P&L</div>
              <div className={`text-lg font-bold ${bestStrategy.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${bestStrategy.totalPnL.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-900/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Sharpe Ratio</div>
              <div className="text-lg font-bold text-blue-400">{bestStrategy.sharpeRatio.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400">Total Trades</div>
              <div className="text-sm font-semibold text-white">{bestStrategy.totalTrades}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Consistency</div>
              <div className="text-sm font-semibold text-white">{(bestStrategy.consistency * 100).toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Max Drawdown</div>
              <div className="text-sm font-semibold text-white">${bestStrategy.maxDrawdown.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Signal Analysis */}
      {currentSignal && (
        <div className="bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Current Analysis for {selectedSymbol}</h3>
          </div>

          {/* Recommended Signal */}
          <div className="bg-gray-900/60 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Recommended Action</div>
                <div className="flex items-center space-x-3">
                  <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                    currentSignal.recommendedSignal.action === 'BUY'
                      ? 'bg-green-600 text-white'
                      : currentSignal.recommendedSignal.action === 'SELL'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {currentSignal.recommendedSignal.action}
                  </div>
                  <div className="text-white">
                    <div className="text-xs text-gray-400">Confidence</div>
                    <div className="text-lg font-bold">{(currentSignal.recommendedSignal.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">From Strategy</div>
                <div className="text-lg font-semibold text-blue-400">{currentSignal.recommendedSignal.strategyName}</div>
              </div>
            </div>

            {currentSignal.recommendedSignal.reason && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Reasoning</div>
                <div className="text-sm text-gray-300">{currentSignal.recommendedSignal.reason}</div>
              </div>
            )}
          </div>

          {/* Consensus Analysis */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-700/30">
              <div className="text-sm text-gray-400 mb-1">BUY Votes</div>
              <div className="text-2xl font-bold text-green-400">{currentSignal.consensus.buyVotes}</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-4 border border-red-700/30">
              <div className="text-sm text-gray-400 mb-1">SELL Votes</div>
              <div className="text-2xl font-bold text-red-400">{currentSignal.consensus.sellVotes}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30">
              <div className="text-sm text-gray-400 mb-1">HOLD Votes</div>
              <div className="text-2xl font-bold text-gray-400">{currentSignal.consensus.holdVotes}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/40 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Average Confidence</div>
              <div className="text-lg font-bold text-white">{(currentSignal.consensus.averageConfidence * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Agreement Level</div>
              <div className="text-lg font-bold text-white">{(currentSignal.consensus.agreement * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Weighted Signal */}
          {currentSignal.weightedSignal && (
            <div className="mt-4 bg-purple-900/30 rounded-lg p-4 border border-purple-700/30">
              <div className="text-sm text-gray-400 mb-2">Performance-Weighted Signal</div>
              <div className="flex items-center justify-between">
                <div className={`px-4 py-1 rounded-lg font-bold ${
                  currentSignal.weightedSignal.action === 'BUY'
                    ? 'bg-green-600 text-white'
                    : currentSignal.weightedSignal.action === 'SELL'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}>
                  {currentSignal.weightedSignal.action}
                </div>
                <div className="text-sm text-gray-300">
                  {(currentSignal.weightedSignal.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">{currentSignal.weightedSignal.reasoning}</div>
            </div>
          )}
        </div>
      )}

      {/* All Strategies Comparison */}
      {currentSignal && currentSignal.allSignals.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/50 to-purple-900/30 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Individual Strategy Signals</h3>
          </div>

          <div className="space-y-3">
            {currentSignal.allSignals.map((signal, index) => (
              <div key={index} className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/30 hover:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="text-sm font-semibold text-white">{signal.strategyName}</div>
                      <div className="text-xs text-gray-400">
                        {signal.performance
                          ? `${signal.performance.totalTrades} trades, ${signal.performance.winRate.toFixed(0)}% win rate`
                          : 'No performance data'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Confidence</div>
                      <div className="text-sm font-semibold text-white">{(signal.confidence * 100).toFixed(0)}%</div>
                    </div>

                    <div className={`px-4 py-2 rounded-lg font-bold min-w-[80px] text-center ${
                      signal.action === 'BUY'
                        ? 'bg-green-600/80 text-white'
                        : signal.action === 'SELL'
                        ? 'bg-red-600/80 text-white'
                        : 'bg-gray-600/80 text-white'
                    }`}>
                      {signal.action}
                    </div>

                    {signal.performance && (
                      <div className="text-right min-w-[100px]">
                        <div className="text-xs text-gray-400">Total P&L</div>
                        <div className={`text-sm font-bold ${signal.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${signal.performance.totalPnL.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {signal.reason && (
                  <div className="mt-2 pt-2 border-t border-gray-700/30">
                    <div className="text-xs text-gray-400">{signal.reason}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Rankings */}
      {comparison && comparison.ranking && comparison.ranking.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/50 to-yellow-900/30 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-4">
            <Award className="w-6 h-6 text-yellow-400" />
            <h3 className="text-xl font-bold text-white">Strategy Performance Rankings</h3>
          </div>

          <div className="space-y-2">
            {comparison.ranking.map((rank) => (
              <div key={rank.strategyId} className="flex items-center justify-between bg-gray-900/40 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                    rank.rank === 1
                      ? 'bg-yellow-500 text-black'
                      : rank.rank === 2
                      ? 'bg-gray-300 text-black'
                      : rank.rank === 3
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}>
                    {rank.rank}
                  </div>

                  <div>
                    <div className="font-semibold text-white">{rank.performance?.strategyName || 'Unknown Strategy'}</div>
                    <div className="text-xs text-gray-400">
                      {rank.performance?.totalTrades || 0} trades • {(rank.performance?.winRate || 0).toFixed(1)}% win rate
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Score</div>
                    <div className="text-lg font-bold text-purple-400">{(rank.score || 0).toFixed(1)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total P&L</div>
                    <div className={`text-lg font-bold ${(rank.performance?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(rank.performance?.totalPnL || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400">Sharpe</div>
                    <div className="text-lg font-bold text-blue-400">{(rank.performance?.sharpeRatio || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {comparison.recommendation && (
            <div className="mt-4 bg-blue-900/30 rounded-lg p-4 border border-blue-700/30">
              <div className="text-sm text-gray-400 mb-1">Recommendation</div>
              <div className="text-sm text-gray-200">{comparison.recommendation}</div>
            </div>
          )}
        </div>
      )}

      {multiStrategy.lastUpdate && (
        <div className="text-center text-xs text-gray-500">
          Last updated: {multiStrategy.lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
