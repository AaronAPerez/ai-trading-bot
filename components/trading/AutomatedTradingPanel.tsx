'use client'

// ===============================================
// AUTOMATED TRADING PANEL - Complete Bot Control UI
// components/trading/AutomatedTradingPanel.tsx
// ===============================================

import { useState } from 'react'
import { useAutomatedTrading, tradingUtils } from '@/hooks/useAutomatedTrading'
import { useTradingBot } from '@/hooks/trading/useTradingBot'
import type { BotConfiguration } from '@/types/trading'

export default function AutomatedTradingPanel() {
  const [botMode, setBotMode] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'>('BALANCED')
  const [autoExecute, setAutoExecute] = useState(true)

  const {
    botStatus,
    isRunning,
    activeOrders,
    activityLogs,
    statistics,
    isStarting,
    isStopping,
    isLoadingStatus,
    startError,
    stopError,
    startBot,
    stopBot,
    cancelOrder
  } = useAutomatedTrading()

  const handleStartBot = async () => {
    const config: BotConfiguration = {
      enabled: true,
      mode: botMode,
      strategies: [
        {
          id: 'ml_enhanced',
          name: 'ML Enhanced',
          type: 'ML_ENHANCED',
          enabled: true,
          weight: 0.4,
          parameters: {},
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
          enabled: true,
          weight: 0.3,
          parameters: {},
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
          id: 'sentiment',
          name: 'Sentiment Analysis',
          type: 'SENTIMENT',
          enabled: true,
          weight: 0.3,
          parameters: {},
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
        maxPositionSize: 0.05,
        maxDailyLoss: 0.02,
        maxDrawdown: 0.10,
        minConfidence: 0.75,
        stopLossPercent: 0.05,
        takeProfitPercent: 0.10,
        correlationLimit: 0.7
      },
      executionSettings: {
        autoExecute,
        minConfidenceForOrder: 0.80,
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
        cooldownMinutes: 2
      }
    }

    try {
      await startBot(config)
    } catch (error) {
      console.error('Failed to start bot:', error)
    }
  }

  const handleStopBot = async () => {
    try {
      await stopBot()
    } catch (error) {
      console.error('Failed to stop bot:', error)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId)
    } catch (error) {
      console.error('Failed to cancel order:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Bot Control Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Trading Bot
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Automated trading with Alpaca API & Supabase
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Bot Status Indicator */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRunning
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>

            {/* Uptime */}
            {isRunning && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Uptime: {tradingUtils.formatUptime(statistics.uptime)}
              </div>
            )}
          </div>
        </div>

        {/* Configuration */}
        {!isRunning && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Bot Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trading Mode
              </label>
              <select
                value={botMode}
                onChange={(e) => setBotMode(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="CONSERVATIVE">Conservative</option>
                <option value="BALANCED">Balanced</option>
                <option value="AGGRESSIVE">Aggressive</option>
              </select>
            </div>

            {/* Auto Execute */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Execution Mode
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoExecute}
                    onChange={(e) => setAutoExecute(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Auto-execute trades
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {autoExecute
                  ? 'Bot will automatically execute trades'
                  : 'Bot will only generate recommendations'}
              </p>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-4">
          {!isRunning ? (
            <button
              onClick={handleStartBot}
              disabled={isStarting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isStarting ? '🚀 Starting...' : '▶️ Start Bot'}
            </button>
          ) : (
            <button
              onClick={handleStopBot}
              disabled={isStopping}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isStopping ? '⏹️ Stopping...' : '⏹️ Stop Bot'}
            </button>
          )}
        </div>

        {/* Error Messages */}
        {(startError || stopError) && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">
              {(startError as Error)?.message || (stopError as Error)?.message}
            </p>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Orders"
          value={statistics.totalOrders}
          icon="📋"
          color="blue"
        />
        <StatCard
          title="Pending"
          value={statistics.pendingOrders}
          icon="⏳"
          color="yellow"
        />
        <StatCard
          title="Filled"
          value={statistics.filledOrders}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Session ID"
          value={botStatus.sessionId?.slice(-8) || 'N/A'}
          icon="🔑"
          color="purple"
        />
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Active Orders
          </h3>
          <div className="space-y-3">
            {activeOrders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {order.symbol}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        order.side === 'buy'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {order.qty} shares @ {order.type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Status: {order.status}</span>
                    <span>Filled: {order.filled_percent.toFixed(1)}%</span>
                    {order.is_bot_order && (
                      <span className="text-blue-600 dark:text-blue-400">
                        🤖 Bot Order
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleCancelOrder(order.id)}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activityLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No activity yet. Start the bot to begin trading.
            </p>
          ) : (
            activityLogs.slice(0, 20).map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${
                    activity.type === 'error'
                      ? 'bg-red-500'
                      : activity.type === 'trade'
                      ? 'bg-green-500'
                      : activity.type === 'recommendation'
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity.message}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                    {activity.symbol && (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {activity.symbol}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color
}: {
  title: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
  }

  return (
    <div
      className={`${colorClasses[color]} border rounded-lg p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
    </div>
  )
}
