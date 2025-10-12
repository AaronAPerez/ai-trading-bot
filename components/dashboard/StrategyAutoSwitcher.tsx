"use client"

import { useState, useEffect } from 'react'
import { useMultiStrategyEngine } from '@/hooks/useMultiStrategyEngine'

interface StrategySwitcherProps {
  botIsActive: boolean
  onStrategyChange?: (strategyId: string) => void
}

export default function StrategyAutoSwitcher({ botIsActive, onStrategyChange }: StrategySwitcherProps) {
  const {
    currentStrategy,
    bestStrategy,
    switchingStats,
    toggleAutoSwitch,
    manualSwitchStrategy
  } = useMultiStrategyEngine()

  const [lastSwitchTime, setLastSwitchTime] = useState<Date | null>(null)

  useEffect(() => {
    if (currentStrategy) {
      setLastSwitchTime(new Date())
    }
  }, [currentStrategy])

  const handleToggleAutoSwitch = () => {
    toggleAutoSwitch()
  }

  const handleManualSwitch = (strategyId: string) => {
    const success = manualSwitchStrategy(strategyId)
    if (success && onStrategyChange) {
      onStrategyChange(strategyId)
    }
  }

  if (!currentStrategy && !bestStrategy) {
    return null
  }

  const scoreDiff = bestStrategy && currentStrategy
    ? bestStrategy.score - (currentStrategy.performance.totalTrades >= 10
        ? calculateScore(currentStrategy.performance)
        : 0)
    : 0

  const shouldRecommendSwitch = scoreDiff >= (switchingStats?.switchThreshold || 10)

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl p-6 border border-purple-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Strategy Auto-Switcher</h3>
            <p className="text-xs text-gray-400">Automatically uses best performing strategy</p>
          </div>
        </div>

        {/* Auto-Switch Toggle */}
        <button
          onClick={handleToggleAutoSwitch}
          disabled={!botIsActive}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
            switchingStats?.autoSwitchEnabled
              ? 'bg-purple-600'
              : 'bg-gray-600'
          } ${!botIsActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
              switchingStats?.autoSwitchEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Current Strategy Display */}
      {currentStrategy && (
        <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Current Strategy</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-medium">ACTIVE</span>
            </div>
          </div>
          <div className="text-xl font-bold text-white mb-2">{currentStrategy.name}</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Win Rate</span>
              <div className="text-white font-semibold">
                {currentStrategy.performance.winRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-400">Trades</span>
              <div className="text-white font-semibold">
                {currentStrategy.performance.totalTrades}
              </div>
            </div>
            <div>
              <span className="text-gray-400">P&L</span>
              <div className={`font-semibold ${
                currentStrategy.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${currentStrategy.performance.totalPnL.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Strategy Recommendation */}
      {bestStrategy && shouldRecommendSwitch && (
        <div className="mb-4 p-4 bg-green-900/20 rounded-lg border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm text-green-400 font-medium">Better Strategy Available</span>
            </div>
            <span className="text-xs text-green-300">+{scoreDiff.toFixed(1)} pts</span>
          </div>
          <div className="text-lg font-bold text-white mb-2">{bestStrategy.name}</div>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-400">Win Rate</span>
              <div className="text-white font-semibold">
                {bestStrategy.performance.winRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-400">Sharpe</span>
              <div className="text-white font-semibold">
                {bestStrategy.performance.sharpeRatio.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Score</span>
              <div className="text-green-400 font-semibold">
                {bestStrategy.score.toFixed(1)}
              </div>
            </div>
          </div>

          {!switchingStats?.autoSwitchEnabled && (
            <button
              onClick={() => handleManualSwitch(bestStrategy.id)}
              disabled={!botIsActive}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
            >
              Switch to This Strategy
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-gray-900/40 rounded-lg">
          <span className="text-gray-400 block mb-1">Auto-Switch</span>
          <span className={`font-semibold ${
            switchingStats?.autoSwitchEnabled ? 'text-green-400' : 'text-gray-400'
          }`}>
            {switchingStats?.autoSwitchEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="p-3 bg-gray-900/40 rounded-lg">
          <span className="text-gray-400 block mb-1">Switch Threshold</span>
          <span className="text-white font-semibold">
            {switchingStats?.switchThreshold || 10} pts
          </span>
        </div>
        <div className="p-3 bg-gray-900/40 rounded-lg">
          <span className="text-gray-400 block mb-1">Min Trades Required</span>
          <span className="text-white font-semibold">
            {switchingStats?.minTradesRequired || 20}
          </span>
        </div>
        <div className="p-3 bg-gray-900/40 rounded-lg">
          <span className="text-gray-400 block mb-1">Last Switch</span>
          <span className="text-white font-semibold text-xs">
            {lastSwitchTime
              ? new Date(lastSwitchTime).toLocaleTimeString()
              : 'Never'}
          </span>
        </div>
      </div>

      {/* Info Message */}
      <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-300">
            {switchingStats?.autoSwitchEnabled
              ? 'The system will automatically switch to better performing strategies when they exceed the current strategy by the threshold.'
              : 'Enable auto-switching to let the system automatically use the best performing strategy.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate composite score
function calculateScore(performance: any): number {
  if (performance.totalTrades < 10) {
    return performance.totalTrades * 5
  }

  const winRateScore = (performance.winRate / 100) * 25
  const profitScore = Math.min((performance.averagePnL / 10) * 20, 20)
  const sharpeScore = Math.min(performance.sharpeRatio * 10, 20)
  const consistencyScore = performance.consistency * 15
  const drawdownScore = Math.max(0, (1 - performance.maxDrawdown / 1000) * 10)
  const volumeScore = Math.min(performance.totalTrades / 10, 10)

  return winRateScore + profitScore + sharpeScore + consistencyScore + drawdownScore + volumeScore
}
