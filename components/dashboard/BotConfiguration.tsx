'use client'

import React from 'react'
import { 
  Cog6ToothIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'

interface BotConfigurationProps {
  botConfig: any
  setBotConfig: (config: any) => void
  account: any
}

export function BotConfiguration({ botConfig, setBotConfig, account }: BotConfigurationProps) {
  const updateConfig = (updates: any) => {
    setBotConfig((prev: any) => ({ ...prev, ...updates }))
  }

  const RangeSlider = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step, 
    suffix = '' 
  }: {
    label: string
    value: number
    onChange: (value: number) => void
    min: number
    max: number
    step: number
    suffix?: string
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm font-semibold text-cyan-400">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${((value - min) / (max - min)) * 100}%, #4b5563 ${((value - min) / (max - min)) * 100}%, #4b5563 100%)`
        }}
      />
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Cog6ToothIcon className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold">AI Trading Bot Configuration</h2>
      </div>

      {!account?.isConnected && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Connection Required</span>
          </div>
          <p className="text-red-200 text-sm">
            Connect to your Alpaca account to enable live trading functionality.
          </p>
        </div>
      )}

      {/* Trading Mode Selection */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-400" />
          Trading Mode
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => updateConfig({ mode })}
              className={`p-4 rounded-lg border-2 transition-all ${
                botConfig.mode === mode 
                  ? 'border-cyan-500 bg-cyan-900/30' 
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold text-white mb-2">{mode}</div>
                <div className="text-sm text-gray-400">
                  {mode === 'CONSERVATIVE' && 'Low risk, steady gains'}
                  {mode === 'BALANCED' && 'Moderate risk, balanced approach'}
                  {mode === 'AGGRESSIVE' && 'Higher risk, maximum potential'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
          Risk Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RangeSlider
            label="Max Position Size"
            value={botConfig.maxPositionSize}
            onChange={(value) => updateConfig({ maxPositionSize: value })}
            min={1}
            max={25}
            step={1}
            suffix="%"
          />
          
          <RangeSlider
            label="Stop Loss"
            value={botConfig.stopLossPercent}
            onChange={(value) => updateConfig({ stopLossPercent: value })}
            min={1}
            max={20}
            step={0.5}
            suffix="%"
          />
          
          <RangeSlider
            label="Take Profit"
            value={botConfig.takeProfitPercent}
            onChange={(value) => updateConfig({ takeProfitPercent: value })}
            min={2}
            max={50}
            step={1}
            suffix="%"
          />
          
          <RangeSlider
            label="Minimum AI Confidence"
            value={botConfig.minimumConfidence}
            onChange={(value) => updateConfig({ minimumConfidence: value })}
            min={60}
            max={95}
            step={1}
            suffix="%"
          />
        </div>

        <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
          <div className="text-sm text-gray-400 space-y-1">
            <div>• Trades below minimum confidence will be ignored</div>
            <div>• Position size limited to {botConfig.maxPositionSize}% of portfolio</div>
            <div>• Stop loss triggers at -{botConfig.stopLossPercent}% loss</div>
            <div>• Take profit activates at +{botConfig.takeProfitPercent}% gain</div>
          </div>
        </div>
      </div>

      {/* Watchlist Configuration */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-indigo-400" />
          Trading Watchlist
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selected Symbols ({botConfig.watchlistSymbols.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {botConfig.watchlistSymbols.map((symbol: string) => (
              <span
                key={symbol}
                className="px-3 py-1 bg-cyan-600 text-white rounded-full text-sm font-medium flex items-center gap-1"
              >
                {symbol}
                <button
                  onClick={() => updateConfig({ 
                    watchlistSymbols: botConfig.watchlistSymbols.filter((s: string) => s !== symbol) 
                  })}
                  className="ml-1 hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-400">
          Bot will monitor these symbols for AI trading opportunities. 
          Current selection optimized for {botConfig.mode.toLowerCase()} trading mode.
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Configuration Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{botConfig.minimumConfidence}%</div>
            <div className="text-sm text-gray-400">Min Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{botConfig.maxPositionSize}%</div>
            <div className="text-sm text-gray-400">Max Position</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{botConfig.watchlistSymbols.length}</div>
            <div className="text-sm text-gray-400">Symbols</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-400">{botConfig.mode}</div>
            <div className="text-sm text-gray-400">Mode</div>
          </div>
        </div>
      </div>
    </div>
  )
}
