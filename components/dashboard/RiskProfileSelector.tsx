/**
 * RiskProfileSelector - Quick risk preset selector
 * Uses Zustand for state management and Supabase for persistence
 */

'use client'

import { BotConfiguration } from '@/types/trading'
import { Shield, TrendingUp, Zap } from 'lucide-react'

interface RiskProfileSelectorProps {
  config: BotConfiguration
  onChange: (config: BotConfiguration) => void
}

type RiskMode = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'

const RISK_PROFILES: Record<RiskMode, {
  icon: typeof Shield
  name: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  settings: {
    maxPositionSize: number
    maxDailyLoss: number
    maxDrawdown: number
    minConfidence: number
    stopLossPercent: number
    takeProfitPercent: number
    minConfidenceForOrder: number
    maxOrdersPerDay: number
  }
}> = {
  CONSERVATIVE: {
    icon: Shield,
    name: 'Conservative',
    description: 'Lower risk, steady returns. Best for capital preservation.',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    settings: {
      maxPositionSize: 0.05,      // 5% max per position
      maxDailyLoss: 0.01,          // 1% max daily loss
      maxDrawdown: 0.10,           // 10% max drawdown
      minConfidence: 0.80,         // 80% minimum confidence
      stopLossPercent: 1.5,        // 1.5% stop loss
      takeProfitPercent: 3.0,      // 3% take profit
      minConfidenceForOrder: 0.85, // 85% for auto-execution
      maxOrdersPerDay: 10          // Max 10 orders/day
    }
  },
  BALANCED: {
    icon: TrendingUp,
    name: 'Balanced',
    description: 'Moderate risk/reward ratio. Recommended for most traders.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    settings: {
      maxPositionSize: 0.10,       // 10% max per position
      maxDailyLoss: 0.02,          // 2% max daily loss
      maxDrawdown: 0.15,           // 15% max drawdown
      minConfidence: 0.70,         // 70% minimum confidence
      stopLossPercent: 2.0,        // 2% stop loss
      takeProfitPercent: 4.0,      // 4% take profit
      minConfidenceForOrder: 0.75, // 75% for auto-execution
      maxOrdersPerDay: 20          // Max 20 orders/day
    }
  },
  AGGRESSIVE: {
    icon: Zap,
    name: 'Aggressive',
    description: 'Higher risk, higher potential returns. For experienced traders.',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    settings: {
      maxPositionSize: 0.15,       // 15% max per position
      maxDailyLoss: 0.03,          // 3% max daily loss
      maxDrawdown: 0.20,           // 20% max drawdown
      minConfidence: 0.60,         // 60% minimum confidence
      stopLossPercent: 3.0,        // 3% stop loss
      takeProfitPercent: 6.0,      // 6% take profit
      minConfidenceForOrder: 0.65, // 65% for auto-execution
      maxOrdersPerDay: 30          // Max 30 orders/day
    }
  }
}

export function RiskProfileSelector({ config, onChange }: RiskProfileSelectorProps) {
  const handleProfileSelect = (mode: RiskMode) => {
    const profile = RISK_PROFILES[mode]

    // Update configuration with preset values
    onChange({
      ...config,
      mode,
      riskManagement: {
        ...config.riskManagement,
        maxPositionSize: profile.settings.maxPositionSize,
        maxDailyLoss: profile.settings.maxDailyLoss,
        maxDrawdown: profile.settings.maxDrawdown,
        minConfidence: profile.settings.minConfidence,
        stopLossPercent: profile.settings.stopLossPercent,
        takeProfitPercent: profile.settings.takeProfitPercent
      },
      executionSettings: {
        ...config.executionSettings,
        minConfidenceForOrder: profile.settings.minConfidenceForOrder,
        maxOrdersPerDay: profile.settings.maxOrdersPerDay
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Risk Profile</h3>
        <p className="text-sm text-gray-600">
          Choose a preset risk profile or customize settings below
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(RISK_PROFILES) as RiskMode[]).map((mode) => {
          const profile = RISK_PROFILES[mode]
          const Icon = profile.icon
          const isSelected = config.mode === mode

          return (
            <button
              key={mode}
              onClick={() => handleProfileSelect(mode)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${profile.borderColor} ${profile.bgColor} shadow-md`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? profile.bgColor : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? profile.color : 'text-gray-600'}`} />
                </div>

                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${isSelected ? profile.color : 'text-gray-900'}`}>
                    {profile.name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {profile.description}
                  </p>

                  {/* Key Metrics */}
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Position:</span>
                      <span className="font-medium">
                        {(profile.settings.maxPositionSize * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stop Loss:</span>
                      <span className="font-medium">
                        {profile.settings.stopLossPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Confidence:</span>
                      <span className="font-medium">
                        {(profile.settings.minConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <span className="text-xs font-medium flex items-center gap-1">
                    ✓ Active Profile
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Advanced Settings Toggle */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Current Risk Settings</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Max Position:</span>
            <p className="font-medium">
              {(config.riskManagement.maxPositionSize * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <span className="text-gray-600">Max Daily Loss:</span>
            <p className="font-medium">
              {(config.riskManagement.maxDailyLoss * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <span className="text-gray-600">Stop Loss:</span>
            <p className="font-medium">
              {config.riskManagement.stopLossPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-gray-600">Take Profit:</span>
            <p className="font-medium">
              {config.riskManagement.takeProfitPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
        💡 Risk settings are applied to all trades executed via Alpaca API and saved to Supabase
      </div>
    </div>
  )
}
