"use client"

import React from 'react'
import {
  Target,
  Activity,
  Zap,
  BarChart3,
  CheckCircle,
  Database,
  Cpu
} from 'lucide-react'
import OptimizedAILearning from './OptimizedAILearning'
import { useAILearningManager } from '@/hooks/useAILearningManager'
import { useAIInsightsStream } from '@/hooks/useAIInsightsStream'

interface AIInsightsDashboardProps {
  botIsActive?: boolean
  learningActive?: boolean
}

export default function AIInsightsDashboard({
  botIsActive = false,
  learningActive = false
}: AIInsightsDashboardProps) {
  const learningManager = useAILearningManager()
  const { insights, isConnected, latestAnalysis, activeSymbols } = useAIInsightsStream(30)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Live AI Analysis Stream */}
      <div className="lg:col-span-2">
        <div className="bg-gradient-to-br from-gray-900/80 to-blue-900/30 rounded-lg border border-gray-700/50 shadow-2xl">
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-400" />
                <h4 className="text-lg font-semibold text-white">Live AI Analysis Stream</h4>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                }`}></div>
                <span className="text-sm text-gray-300">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Latest Analysis */}
            {latestAnalysis && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">Latest Analysis</span>
                  <span className="text-xs text-gray-400">
                    {latestAnalysis.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-white">{latestAnalysis.message}</div>
              </div>
            )}

            {/* AI Insights Feed */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    insight.type === 'pattern_analysis'
                      ? 'bg-green-900/20 border-green-400'
                      : insight.type === 'sentiment'
                      ? 'bg-purple-900/20 border-purple-400'
                      : insight.type === 'learning'
                      ? 'bg-blue-900/20 border-blue-400'
                      : 'bg-orange-900/20 border-orange-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-400">
                        {insight.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                        {insight.symbol}
                      </span>
                    </div>
                    {insight.confidence && (
                      <span className="text-xs text-gray-400">
                        {insight.confidence}%
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-white mt-1">{insight.message}</div>
                </div>
              ))}
            </div>

            {insights.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                <div>Waiting for AI analysis...</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI System Status & Quick Stats */}
      <div className="space-y-6">
        {/* System Status */}
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700/50 shadow-2xl">
          <div className="p-4 border-b border-blue-700/30">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h4 className="text-lg font-semibold text-white">AI System Status</h4>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">AI Trading Bot</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    botIsActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-sm font-medium text-white">
                    {botIsActive ? 'Active' : 'Stopped'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">AI Learning Engine</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    learningActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-sm font-medium text-white">
                    {learningActive ? 'Learning Active' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="bg-gray-800/30 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-gray-300 mb-2">Data Sources</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-3 h-3 text-green-400" />
                    <span className="text-gray-300">Alpaca API</span>
                  </div>
                  <span className="text-green-400 font-medium">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-3 h-3 text-blue-400" />
                    <span className="text-gray-300">Supabase DB</span>
                  </div>
                  <span className="text-blue-400 font-medium">Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Symbols */}
        <div className="bg-gray-900/40 rounded-lg border border-gray-700/50">
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h4 className="text-lg font-semibold text-white">Active Analysis</h4>
            </div>
          </div>
          <div className="p-4">
            <div className="text-sm text-gray-300 mb-3">
              Symbols being analyzed: {activeSymbols.size}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(activeSymbols).slice(0, 12).map((symbol) => (
                <span
                  key={symbol}
                  className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300"
                >
                  {symbol}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}