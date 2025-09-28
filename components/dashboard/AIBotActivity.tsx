'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import useAIBotActivity from '@/hooks/useAIBotActivity'

// Import the BotActivityLog type
interface BotActivityLog {
  id: string
  timestamp: string
  type: 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info'
  symbol?: string
  message: string
  details?: string
  confidence?: number
  status: 'active' | 'completed' | 'failed'
  executionTime?: number
}
import {
  Activity,
  Bot,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Square,
  Settings,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

interface AIBotActivityProps {
  refreshInterval?: number
  maxActivities?: number
  showControls?: boolean
  compact?: boolean
  // AI Bot Control Props
  botIsRunning?: boolean
  onStartBot?: () => void
  onStopBot?: () => void
}

export default function AIBotActivity({
  refreshInterval = 5000,
  maxActivities = 15,
  showControls = true,
  compact = false,
  botIsRunning = false,
  onStartBot,
  onStopBot
}: AIBotActivityProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    activities,
    metrics,
    orderExecution,
    isSimulating,
    isLoading,
    error,
    startSimulation,
    stopSimulation,
    toggleOrderExecution,
    refreshActivity
  } = useAIBotActivity({
    refreshInterval,
    maxActivities,
    autoStart: false
  })

  // Get activity icon based on type
  const getActivityIcon = (activity: BotActivityLog) => {
    const iconClass = "w-4 h-4"

    switch (activity.type) {
      case 'scan':
        return <Activity className={`${iconClass} text-blue-400`} />
      case 'analysis':
        return <TrendingUp className={`${iconClass} text-purple-400`} />
      case 'recommendation':
        return activity.confidence && activity.confidence > 70
          ? <CheckCircle className={`${iconClass} text-green-400`} />
          : <AlertTriangle className={`${iconClass} text-yellow-400`} />
      case 'trade':
        return <TrendingDown className={`${iconClass} text-green-500`} />
      case 'error':
        return <XCircle className={`${iconClass} text-red-400`} />
      case 'info':
        return <Clock className={`${iconClass} text-gray-400`} />
      default:
        return <Bot className={`${iconClass} text-blue-400`} />
    }
  }

  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'completed':
        return <div className="w-2 h-2 bg-green-400 rounded-full" />
      case 'failed':
        return <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
      case 'active':
        return <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
    }
  }

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  if (compact) {
    return (
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">AI Bot Activity</span>
            <div className={`w-2 h-2 rounded-full ${botIsRunning || isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          </div>
          {/* <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
          >
            {isCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button> */}
        </div>

        {!isCollapsed && (
          <div className="space-y-3">
            {/* AI Bot Control Button for Compact Mode */}
            {(onStartBot || onStopBot) && (
              <div className="flex items-center justify-center">
                <Button
                  onClick={botIsRunning ? onStopBot : onStartBot}
                  variant={botIsRunning ? "danger" : "primary"}
                  size="sm"
                  className="w-full"
                >
                  {botIsRunning ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {botIsRunning ? 'Stop' : 'Start'} AI Bot
                </Button>
              </div>
            )}

            {metrics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Trades:</span>
                  <span className="text-green-400 ml-2">{metrics.tradesExecuted}</span>
                </div>
                <div>
                  <span className="text-gray-400">Success:</span>
                  <span className="text-blue-400 ml-2">{metrics.successRate.toFixed(1)}%</span>
                </div>
              </div>
            )}

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-2 text-xs">
                  {getActivityIcon(activity)}
                  <span className="text-gray-300 truncate flex-1">{activity.message}</span>
                  <span className="text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card className="bg-blue/40 border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">AI Bot Activity Monitor</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${botIsRunning || isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-gray-400">
                {botIsRunning || isSimulating ? 'Active' : 'Inactive'}
                {metrics && ` • Uptime: ${formatUptime(metrics.uptime)}`}
              </span>
            </div>
          </div>
        </div>

        {showControls && (
          <div className="flex flex-col space-y-2">
            {/* AI Bot Control Button */}
            {(onStartBot || onStopBot) && (
              <div className="flex items-center justify-center">
                <Button
                  onClick={botIsRunning ? onStopBot : onStartBot}
                  variant={botIsRunning ? "danger" : "primary"}
                  size="sm"
                  className="w-full"
                >
                  {botIsRunning ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {botIsRunning ? 'Stop' : 'Start'} AI Bot
                </Button>
              </div>
            )}

            {/* Activity Controls */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshActivity}
                variant="ghost"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={toggleOrderExecution}
                variant={orderExecution?.enabled ? "danger" : "primary"}
                size="sm"
                disabled={isLoading}
              >
                <Settings className="w-4 h-4" />
                {orderExecution?.enabled ? 'Disable Trades' : 'Enable Trades'}
              </Button>

              <Button
                onClick={isSimulating ? stopSimulation : startSimulation}
                variant={isSimulating ? "danger" : "primary"}
                size="sm"
                disabled={isLoading}
              >
                {isSimulating ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isSimulating ? 'Stop' : 'Start'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded p-3 mb-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded p-3">
            <div className="text-blue-400 text-sm font-medium">Scans</div>
            <div className="text-white text-xl font-bold">{metrics.symbolsScanned}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-purple-400 text-sm font-medium">Analysis</div>
            <div className="text-white text-xl font-bold">{metrics.analysisCompleted}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-green-400 text-sm font-medium">Trades</div>
            <div className="text-white text-xl font-bold">{metrics.tradesExecuted}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-yellow-400 text-sm font-medium">Success Rate</div>
            <div className="text-white text-xl font-bold">{metrics.successRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Order Execution Status */}
      {orderExecution && (
        <div className="bg-gray-900 rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Order Execution</span>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              orderExecution.enabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}>
              {orderExecution.enabled ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Daily Orders:</span>
              <span className="text-white ml-2">
                {orderExecution.dailyOrderCount}/{orderExecution.dailyOrderLimit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Success Rate:</span>
              <span className="text-green-400 ml-2">
                {orderExecution.metrics.totalOrdersExecuted > 0
                  ? ((orderExecution.metrics.successfulOrders / orderExecution.metrics.totalOrdersExecuted) * 100).toFixed(1)
                  : '0'}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Value:</span>
              <span className="text-blue-400 ml-2">
                ${orderExecution.metrics.totalValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Recent Activity</span>
          <span className="text-xs text-gray-500">({activities.length} activities)</span>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <div className="text-gray-400">No activity yet</div>
            <div className="text-gray-500 text-sm">
              {!isSimulating && "Click 'Start' to begin monitoring"}
            </div>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-900 rounded hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-2 mt-0.5">
                {getActivityIcon(activity)}
                {getStatusIndicator(activity.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white text-sm">{activity.message}</span>
                  {activity.symbol && (
                    <span className="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded">
                      {activity.symbol}
                    </span>
                  )}
                  {activity.confidence && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      activity.confidence > 80 ? 'bg-green-900 text-green-300' :
                      activity.confidence > 60 ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {activity.confidence.toFixed(1)}%
                    </span>
                  )}
                </div>

                {activity.details && (
                  <div className="text-gray-400 text-xs mb-2">
                    {activity.details}
                  </div>
                )}

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                  {activity.executionTime && (
                    <span>{activity.executionTime.toFixed(0)}ms</span>
                  )}
                  <span className="capitalize">{activity.type}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}