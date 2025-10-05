'use client'

// ===============================================
// LIVE AI ACTIVITY FEED - Real-time Console Display
// components/dashboard/LiveAIActivity.tsx
// ===============================================

import { useState, useEffect, useRef } from 'react'
import { Activity, Brain, TrendingUp, BarChart3, Zap, AlertCircle } from 'lucide-react'

export interface AIActivityLog {
  id: string
  timestamp: Date
  type: 'analysis' | 'sentiment' | 'learning' | 'pattern' | 'signal'
  symbol?: string
  message: string
  confidence?: number
  pattern?: string
  sentiment?: string
  score?: number
  metadata?: Record<string, any>
}

export default function LiveAIActivity() {
  const [activities, setActivities] = useState<AIActivityLog[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Intercept console.log to capture REAL AI Trading Engine activity ONLY
    const originalLog = console.log

    console.log = (...args: any[]) => {
      originalLog(...args)

      // Parse REAL AI Trading Engine activity from console logs
      const message = args.join(' ')

      // ONLY capture REAL RealTimeAITradingEngine logs (NO SIMULATION)
      if (
        message.includes('⚡ AI Trading Loop') ||
        message.includes('🧠 Executing AI trading cycle') ||
        message.includes('🔍 Evaluating') ||
        message.includes('✅ AUTO-EXECUTED:') ||
        message.includes('⏸️ EXECUTION BLOCKED:') ||
        message.includes('🎯 Generated') ||
        message.includes('📊 Enhanced cycle') ||
        (message.includes('🤖') && message.includes('decisions qualify'))
      ) {
        const activity = parseConsoleMessage(message)
        if (activity) {
          setActivities(prev => [activity, ...prev.slice(0, 49)]) // Keep last 50
        }
      }
    }

    return () => {
      console.log = originalLog
    }
  }, [])

  // Auto-scroll to top when new activity arrives
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [activities, isPaused])

  const parseConsoleMessage = (message: string): AIActivityLog | null => {
    const timestamp = new Date()
    const id = `activity_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`

    // Parse REAL AI Trading Loop execution
    if (message.includes('⚡ AI Trading Loop')) {
      return {
        id,
        timestamp,
        type: 'signal',
        message: '⚡ AI Trading Loop executing - analyzing all symbols with Alpaca data'
      }
    }

    // Parse REAL trading cycle start
    if (message.includes('🧠 Executing AI trading cycle')) {
      return {
        id,
        timestamp,
        type: 'analysis',
        message: '🧠 Executing AI trading cycle with real Alpaca market data'
      }
    }

    // Parse REAL trade evaluation
    if (message.includes('🔍 Evaluating')) {
      const match = message.match(/🔍 Evaluating (.+?) (BUY|SELL): ([\d.]+)% confidence/)
      if (match) {
        return {
          id,
          timestamp,
          type: 'analysis',
          symbol: match[1],
          confidence: parseFloat(match[3]),
          message: `🔍 Evaluating ${match[2]} ${match[1]} - ${match[3]}% confidence`
        }
      }
    }

    // Parse REAL trade execution SUCCESS
    if (message.includes('✅ AUTO-EXECUTED:')) {
      const match = message.match(/✅ AUTO-EXECUTED: (.+?) (BUY|SELL)/)
      if (match) {
        return {
          id,
          timestamp,
          type: 'signal',
          symbol: match[1],
          message: `✅ REAL TRADE EXECUTED: ${match[2]} ${match[1]} via Alpaca API`,
          pattern: 'EXECUTED'
        }
      }
    }

    // Parse REAL execution blocks
    if (message.includes('⏸️ EXECUTION BLOCKED:')) {
      const match = message.match(/⏸️ EXECUTION BLOCKED: (.+?) -/)
      if (match) {
        return {
          id,
          timestamp,
          type: 'pattern',
          symbol: match[1],
          message: `⏸️ Execution blocked for ${match[1]}`,
          pattern: 'BLOCKED'
        }
      }
    }

    // Parse decision generation
    if (message.includes('🎯 Generated') && message.includes('trading decisions')) {
      const match = message.match(/🎯 Generated ([\d]+) trading decisions/)
      if (match) {
        return {
          id,
          timestamp,
          type: 'learning',
          message: `🎯 Generated ${match[1]} trading decisions from market analysis`
        }
      }
    }

    // Parse qualifying decisions
    if (message.includes('🤖') && message.includes('decisions qualify')) {
      const match = message.match(/🤖 ([\d]+) decisions qualify/)
      if (match) {
        return {
          id,
          timestamp,
          type: 'learning',
          message: `🤖 ${match[1]} decisions qualify for auto-execution`
        }
      }
    }

    // Parse cycle completion
    if (message.includes('📊 Enhanced cycle') && message.includes('complete')) {
      const match = message.match(/📊 Enhanced cycle .+ complete: ([\d]+)\/([\d]+) executions/)
      if (match) {
        return {
          id,
          timestamp,
          type: 'signal',
          message: `📊 Trading cycle complete: ${match[1]}/${match[2]} executions successful`
        }
      }
    }

    return null
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Brain className="w-4 h-4 text-blue-400" />
      case 'sentiment':
        return <TrendingUp className="w-4 h-4 text-purple-400" />
      case 'learning':
        return <Zap className="w-4 h-4 text-yellow-400" />
      case 'pattern':
        return <BarChart3 className="w-4 h-4 text-green-400" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'border-blue-500/20 bg-blue-500/5'
      case 'sentiment':
        return 'border-purple-500/20 bg-purple-500/5'
      case 'learning':
        return 'border-yellow-500/20 bg-yellow-500/5'
      case 'pattern':
        return 'border-green-500/20 bg-green-500/5'
      default:
        return 'border-gray-500/20 bg-gray-500/5'
    }
  }

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null

    const color = confidence >= 80
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : confidence >= 70
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30'

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {confidence.toFixed(1)}%
      </span>
    )
  }

  const getSentimentBadge = (sentiment?: string, score?: number) => {
    if (!sentiment) return null

    const color = sentiment === 'BULLISH'
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : sentiment === 'BEARISH'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {sentiment} {score && `(${score})`}
      </span>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Activity className="w-6 h-6 text-blue-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Real AI Trading Engine Activity</h3>
            <p className="text-sm text-gray-400">Live Alpaca API executions & analysis</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>{activities.length} activities</span>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              isPaused
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
          >
            {isPaused ? 'Paused' : 'Live'}
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div
        ref={scrollRef}
        className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-2"
      >
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">
              Waiting for Real AI Trading Engine to start...
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Start the bot to see real Alpaca API trading activity
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`border rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] ${getActivityColor(
                activity.type
              )}`}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {activity.symbol && (
                        <span className="text-sm font-bold text-white">
                          {activity.symbol}
                        </span>
                      )}
                      {activity.pattern && (
                        <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-medium text-gray-300">
                          {activity.pattern}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {activity.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 mb-2">
                    {activity.message}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center space-x-2">
                    {getConfidenceBadge(activity.confidence)}
                    {getSentimentBadge(activity.sentiment, activity.score)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats - Real Engine Activity */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400 mb-1">Evaluations</div>
            <div className="text-lg font-bold text-blue-400">
              {activities.filter(a => a.type === 'analysis').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Executions</div>
            <div className="text-lg font-bold text-green-400">
              {activities.filter(a => a.type === 'signal' && a.pattern === 'EXECUTED').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Decisions</div>
            <div className="text-lg font-bold text-yellow-400">
              {activities.filter(a => a.type === 'learning').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
