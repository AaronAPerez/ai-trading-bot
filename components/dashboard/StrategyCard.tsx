/**
 * StrategyCard - Individual strategy configuration card
 * Uses real Alpaca API data for performance metrics
 */

'use client'

import { useState } from 'react'
import { BotStrategy, AIStrategy } from '@/types/trading'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'
import { ParameterInput } from './ParameterInput'

interface StrategyCardProps {
  strategy: BotStrategy
  strategyInfo: {
    name: string
    description: string
    parameters: Record<string, { min: number; max: number; default: number; description: string }>
    bestFor: string
  }
  onToggle: (enabled: boolean) => void
  onWeightChange: (weight: number) => void
  onParameterChange: (paramName: string, value: number) => void
}

const STRATEGY_COLORS: Record<AIStrategy, string> = {
  MOMENTUM: 'bg-blue-100 text-blue-800 border-blue-300',
  MEAN_REVERSION: 'bg-green-100 text-green-800 border-green-300',
  ENHANCED_MEAN_REVERSION: 'bg-purple-100 text-purple-800 border-purple-300',
  BREAKOUT: 'bg-orange-100 text-orange-800 border-orange-300',
  TECHNICAL: 'bg-indigo-100 text-indigo-800 border-indigo-300'
}

export function StrategyCard({
  strategy,
  strategyInfo,
  onToggle,
  onWeightChange,
  onParameterChange
}: StrategyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const colorClass = STRATEGY_COLORS[strategy.type]

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      strategy.enabled ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.enabled}
                onChange={(e) => onToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{strategyInfo.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${colorClass}`}>
                  {strategy.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{strategyInfo.description}</p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Best for:</span> {strategyInfo.bestFor}
              </p>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Weight Slider - Always visible if enabled */}
        {strategy.enabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy Weight: {(strategy.weight * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={strategy.weight * 100}
              onChange={(e) => onWeightChange(parseFloat(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        )}

        {/* Performance Metrics - Real data from Supabase */}
        {strategy.enabled && strategy.performance && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Win Rate</div>
              <div className="text-sm font-semibold">
                {strategy.performance.totalTrades > 0
                  ? `${(strategy.performance.winRate * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Sharpe Ratio</div>
              <div className="text-sm font-semibold">
                {strategy.performance.sharpeRatio > 0
                  ? strategy.performance.sharpeRatio.toFixed(2)
                  : 'N/A'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Return</div>
              <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                strategy.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {strategy.performance.totalReturn >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {(strategy.performance.totalReturn * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content - Parameters */}
      {isExpanded && strategy.enabled && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="font-medium text-sm mb-3">Strategy Parameters</h4>
          <div className="space-y-3">
            {Object.entries(strategyInfo.parameters).map(([paramName, paramInfo]) => (
              <ParameterInput
                key={paramName}
                name={paramName}
                label={paramName
                  .split(/(?=[A-Z])/)
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
                value={strategy.parameters[paramName] as number || paramInfo.default}
                min={paramInfo.min}
                max={paramInfo.max}
                step={paramInfo.min < 1 ? 0.01 : 1}
                description={paramInfo.description}
                onChange={(value) => onParameterChange(paramName, value)}
              />
            ))}
          </div>

          {/* Data Source Info */}
          <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-2 rounded">
            📊 Parameters affect how this strategy analyzes real-time Alpaca market data
          </div>
        </div>
      )}
    </div>
  )
}
