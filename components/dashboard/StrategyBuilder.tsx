/**
 * StrategyBuilder - Visual strategy configuration component
 * Uses: Alpaca API, Supabase, Zustand, React Query
 * NO MOCK DATA - All data from real sources
 */

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BotConfiguration, BotStrategy, AIStrategy } from '@/types/trading'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/auth-utils'
import { Save, Play, RotateCcw, Download, AlertCircle } from 'lucide-react'
import { StrategyCard } from './StrategyCard'
import { WeightDistributionChart } from '../charts/WeightDistributionChart'
import { RiskProfileSelector } from './RiskProfileSelector'

interface StrategyBuilderProps {
  onSave?: (config: BotConfiguration) => void
  onStartBot?: (config: BotConfiguration) => void
}

// Strategy metadata with real parameters for Alpaca API
const STRATEGY_INFO: Record<AIStrategy, {
  name: string
  description: string
  parameters: Record<string, { min: number; max: number; default: number; description: string }>
  bestFor: string
}> = {
  MOMENTUM: {
    name: 'Momentum Trading',
    description: 'Identifies stocks with strong price momentum using Alpaca real-time data',
    parameters: {
      lookbackPeriod: { min: 5, max: 50, default: 20, description: 'Days to analyze momentum from Alpaca bars' },
      momentumThreshold: { min: 0.01, max: 0.1, default: 0.05, description: 'Minimum momentum % for entry' }
    },
    bestFor: 'Trending markets with clear directional movement'
  },
  MEAN_REVERSION: {
    name: 'Mean Reversion',
    description: 'Trades based on price deviation from statistical mean using Alpaca market data',
    parameters: {
      zScoreThreshold: { min: 1.5, max: 3.0, default: 2.0, description: 'Standard deviations from mean' },
      lookbackPeriod: { min: 10, max: 50, default: 20, description: 'Period for mean calculation' }
    },
    bestFor: 'Range-bound markets with low volatility'
  },
  ENHANCED_MEAN_REVERSION: {
    name: 'Enhanced Mean Reversion',
    description: 'Advanced mean reversion with volatility-adaptive thresholds from Alpaca API',
    parameters: {
      zScoreThresholdLow: { min: 1.0, max: 2.0, default: 1.5, description: 'Low volatility threshold' },
      zScoreThresholdMedium: { min: 1.5, max: 2.5, default: 2.0, description: 'Medium volatility threshold' },
      zScoreThresholdHigh: { min: 2.0, max: 3.0, default: 2.5, description: 'High volatility threshold' }
    },
    bestFor: 'All market conditions with automatic adaptation'
  },
  BREAKOUT: {
    name: 'Breakout Strategy',
    description: 'Identifies price breakouts using Alpaca volume and price data',
    parameters: {
      consolidationPeriod: { min: 5, max: 30, default: 10, description: 'Days of consolidation' },
      breakoutThreshold: { min: 0.01, max: 0.05, default: 0.02, description: 'Breakout % required' }
    },
    bestFor: 'Volatile markets with strong volume'
  },
  TECHNICAL: {
    name: 'Technical Analysis',
    description: 'Multi-indicator analysis using real Alpaca market data',
    parameters: {
      rsiPeriod: { min: 7, max: 21, default: 14, description: 'RSI calculation period' },
      macdFast: { min: 8, max: 16, default: 12, description: 'MACD fast period' },
      macdSlow: { min: 20, max: 30, default: 26, description: 'MACD slow period' }
    },
    bestFor: 'All market conditions with diversified signals'
  }
}

export function StrategyBuilder({ onSave, onStartBot }: StrategyBuilderProps) {
  const queryClient = useQueryClient()
  const userId = getCurrentUserId()

  // Fetch saved configuration from Supabase
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['bot-configuration', userId],
    queryFn: async () => {
      const { data, error } = await supabaseService.client
        .from('bot_configurations')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // Handle table not found or no records gracefully
        if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.code === '42P01') {
          console.warn('bot_configurations not found - using default')
          return null
        }
        throw error
      }
      return data?.configuration as BotConfiguration | null
    },
    retry: false,
    enabled: !!userId
  })

  // Local state for form
  const [config, setConfig] = useState<BotConfiguration>(getDefaultConfig())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Initialize with saved config
  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig)
    }
  }, [savedConfig])

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async (configuration: BotConfiguration) => {
      const { data, error } = await supabaseService.client
        .from('bot_configurations')
        .upsert({
          user_id: userId,
          configuration,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        // Handle table not found
        if (error.code === 'PGRST204' || error.code === '42P01') {
          console.warn('bot_configurations table not found - run migration')
          throw new Error('Database table missing. Please run migrations.')
        }
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-configuration', userId] })
      setHasUnsavedChanges(false)
      if (onSave) onSave(config)
    }
  })

  // Handle strategy toggle
  const handleStrategyToggle = (strategyId: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map(s =>
        s.id === strategyId ? { ...s, enabled } : s
      )
    }))
    setHasUnsavedChanges(true)
  }

  // Handle weight change
  const handleWeightChange = (strategyId: string, weight: number) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map(s =>
        s.id === strategyId ? { ...s, weight } : s
      )
    }))
    setHasUnsavedChanges(true)
  }

  // Handle parameter change
  const handleParameterChange = (strategyId: string, paramName: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map(s =>
        s.id === strategyId
          ? { ...s, parameters: { ...s.parameters, [paramName]: value } }
          : s
      )
    }))
    setHasUnsavedChanges(true)
  }

  // Normalize weights
  const normalizeWeights = () => {
    const enabledStrategies = config.strategies.filter(s => s.enabled)
    if (enabledStrategies.length === 0) return

    const totalWeight = enabledStrategies.reduce((sum, s) => sum + s.weight, 0)
    if (totalWeight === 0) return

    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map(s =>
        s.enabled ? { ...s, weight: s.weight / totalWeight } : s
      )
    }))
    setHasUnsavedChanges(true)
  }

  // Handle save
  const handleSave = async () => {
    await saveMutation.mutateAsync(config)
  }

  // Handle start bot
  const handleStartBot = async () => {
    if (hasUnsavedChanges) {
      await saveMutation.mutateAsync(config)
    }
    if (onStartBot) onStartBot(config)
  }

  // Handle reset
  const handleReset = () => {
    setConfig(getDefaultConfig())
    setHasUnsavedChanges(true)
  }

  // Export config
  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `strategy-config-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  const enabledStrategies = config.strategies.filter(s => s.enabled)
  const totalWeight = enabledStrategies.reduce((sum, s) => sum + s.weight, 0)
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.01

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Strategy Configuration</h2>
          <p className="text-sm text-gray-600">
            Configure trading strategies using real Alpaca market data
          </p>
        </div>

        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Risk Profile Selector */}
      <RiskProfileSelector
        config={config}
        onChange={(newConfig) => {
          setConfig(newConfig)
          setHasUnsavedChanges(true)
        }}
      />

      {/* Weight Distribution */}
      {enabledStrategies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Weight Distribution</h3>
            <WeightDistributionChart strategies={enabledStrategies} />

            {!isWeightValid && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                Weights sum to {(totalWeight * 100).toFixed(1)}%.
                <button
                  onClick={normalizeWeights}
                  className="ml-2 underline hover:no-underline"
                >
                  Normalize to 100%
                </button>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Configuration Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="font-medium">{config.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Strategies:</span>
                <span className="font-medium">{enabledStrategies.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auto-Execute:</span>
                <span className="font-medium">
                  {config.executionSettings.autoExecute ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Position:</span>
                <span className="font-medium">
                  {(config.riskManagement.maxPositionSize * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Min Confidence:</span>
                <span className="font-medium">
                  {(config.riskManagement.minConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Strategies</h3>
        {config.strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            strategyInfo={STRATEGY_INFO[strategy.type]}
            onToggle={(enabled) => handleStrategyToggle(strategy.id, enabled)}
            onWeightChange={(weight) => handleWeightChange(strategy.id, weight)}
            onParameterChange={(paramName, value) =>
              handleParameterChange(strategy.id, paramName, value)
            }
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !hasUnsavedChanges}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </button>

        <button
          onClick={handleStartBot}
          disabled={enabledStrategies.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          Apply & Start Bot
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
      </div>

      {/* Data Source Info */}
      <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
        💡 All strategies use real-time data from Alpaca API.
        Configuration is saved to Supabase database.
        No mock or simulated data is used.
      </div>
    </div>
  )
}

function getDefaultConfig(): BotConfiguration {
  return {
    enabled: true,
    mode: 'BALANCED',
    strategies: [
      {
        id: 'enhanced_mean_reversion',
        name: 'Enhanced Mean Reversion',
        type: 'ENHANCED_MEAN_REVERSION',
        enabled: true,
        weight: 0.4,
        parameters: {
          zScoreThresholdLow: 1.5,
          zScoreThresholdMedium: 2.0,
          zScoreThresholdHigh: 2.5
        },
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      },
      {
        id: 'momentum',
        name: 'Momentum Trading',
        type: 'MOMENTUM',
        enabled: true,
        weight: 0.3,
        parameters: {
          lookbackPeriod: 20,
          momentumThreshold: 0.05
        },
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      },
      {
        id: 'breakout',
        name: 'Breakout Strategy',
        type: 'BREAKOUT',
        enabled: true,
        weight: 0.3,
        parameters: {
          consolidationPeriod: 10,
          breakoutThreshold: 0.02
        },
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      },
      {
        id: 'mean_reversion',
        name: 'Mean Reversion',
        type: 'MEAN_REVERSION',
        enabled: false,
        weight: 0,
        parameters: {
          zScoreThreshold: 2.0,
          lookbackPeriod: 20
        },
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      },
      {
        id: 'technical',
        name: 'Technical Analysis',
        type: 'TECHNICAL',
        enabled: false,
        weight: 0,
        parameters: {
          rsiPeriod: 14,
          macdFast: 12,
          macdSlow: 26
        },
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      }
    ],
    riskManagement: {
      maxPositionSize: 0.10,
      maxDailyLoss: 0.02,
      maxDrawdown: 0.15,
      minConfidence: 0.70,
      stopLossPercent: 2.0,
      takeProfitPercent: 4.0,
      correlationLimit: 0.7
    },
    executionSettings: {
      autoExecute: false,
      minConfidenceForOrder: 0.75,
      maxOrdersPerDay: 20,
      orderSizePercent: 0.02,
      slippageTolerance: 0.01,
      marketHoursOnly: true
    },
    scheduleSettings: {
      tradingHours: {
        start: '09:30',
        end: '16:00'
      },
      excludedDays: ['Saturday', 'Sunday'],
      cooldownMinutes: 5
    }
  }
}
