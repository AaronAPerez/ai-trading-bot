/**
 * Bot Control Example Component
 * Demonstrates how to use the useBotControl hook with the bot control API
 */

'use client'

import React from 'react'
import { useBotControl } from '@/hooks/useBotControl'
import { BotConfiguration } from '@/types/trading'

export default function BotControlExample() {
  const {
    botStatus,
    isLoading,
    error,
    isRunning,
    uptimeFormatted,
    scanCount,
    health,
    startBot,
    stopBot,
    restartBot,
  } = useBotControl()

  const handleStartBot = async () => {
    // Use default configuration
    const result = await startBot()
    if (result.success) {
      console.log('✅ Bot started successfully:', result.data)
    } else {
      console.error('❌ Failed to start bot:', result.error)
    }
  }

  const handleStartWithCustomConfig = async () => {
    // Custom configuration
    const customConfig: Partial<BotConfiguration> = {
      mode: 'AGGRESSIVE',
      executionSettings: {
        autoExecute: false,
        minConfidenceForOrder: 0.80,
        maxOrdersPerDay: 10,
        orderSizePercent: 0.02,
        slippageTolerance: 0.01,
        marketHoursOnly: true
      },
      watchlist: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA']
    }

    const result = await startBot(customConfig as BotConfiguration)
    if (result.success) {
      console.log('✅ Bot started with custom config:', result.data)
    }
  }

  const handleStopBot = async () => {
    const result = await stopBot()
    if (result.success) {
      console.log('✅ Bot stopped successfully:', result.data)
    } else {
      console.error('❌ Failed to stop bot:', result.error)
    }
  }

  const handleRestartBot = async () => {
    const result = await restartBot()
    if (result.success) {
      console.log('✅ Bot restarted successfully:', result.data)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Trading Bot Control</h1>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Bot Status Card */}
      <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Bot Status</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-lg font-semibold ${isRunning ? 'text-green-600' : 'text-gray-600'}`}>
              {isRunning ? '🟢 Running' : '⚫ Stopped'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Health</p>
            <p className={`text-lg font-semibold ${
              health === 'HEALTHY' ? 'text-green-600' :
              health === 'WARNING' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {health}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Uptime</p>
            <p className="text-lg font-semibold">{uptimeFormatted}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Scans Completed</p>
            <p className="text-lg font-semibold">{scanCount}</p>
          </div>
        </div>

        {botStatus?.config && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Configuration</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Mode: <span className="font-medium">{botStatus.config.mode}</span></div>
              <div>Strategies: <span className="font-medium">{botStatus.config.strategiesEnabled}</span></div>
              <div>Auto-Execute: <span className="font-medium">{botStatus.config.autoExecute ? 'Yes' : 'No'}</span></div>
              <div>Market Hours Only: <span className="font-medium">{botStatus.config.marketHoursOnly ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={handleStartBot}
          disabled={isLoading || isRunning}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Starting...' : 'Start Bot'}
        </button>

        <button
          onClick={handleStartWithCustomConfig}
          disabled={isLoading || isRunning}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Start with Custom Config
        </button>

        <button
          onClick={handleStopBot}
          disabled={isLoading || !isRunning}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Stopping...' : 'Stop Bot'}
        </button>

        <button
          onClick={handleRestartBot}
          disabled={isLoading || !isRunning}
          className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Restarting...' : 'Restart Bot'}
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <p className="font-semibold mb-2">💡 Bot Control Integration</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Bot scans watchlist every 60 seconds</li>
          <li>Uses enhanced mean reversion strategy</li>
          <li>Generates AI recommendations with confidence scoring</li>
          <li>Logs all activity to Supabase database</li>
          <li>Auto-execution can be enabled in configuration</li>
        </ul>
      </div>
    </div>
  )
}
