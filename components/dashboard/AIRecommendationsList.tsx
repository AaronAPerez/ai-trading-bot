// ===============================================
// AI RECOMMENDATIONS LIST - AI Trading Recommendations Component
// src/components/trading/AIRecommendationsList.tsx
// ===============================================

import { useState, useMemo } from 'react'
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Target,
  Brain,
  Activity
} from 'lucide-react'
import type { AIRecommendationsListProps, AIRecommendation, TradeAction } from '@/types/trading'

/**
 * AI Recommendations List component displaying intelligent trading suggestions
 * with confidence scoring, safety checks, and execution capabilities
 */
const AIRecommendationsList = ({
  recommendations,
  onExecuteRecommendation,
  onExecute,
  isLoading = false,
  error
}: AIRecommendationsListProps) => {
  const [filter, setFilter] = useState<string>('ALL')
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set())

  /**
   * Filter options for recommendations display
   */
  const filterOptions = ['ALL', 'BUY', 'SELL', 'HIGH_CONFIDENCE']

  /**
   * Filter recommendations based on selected criteria
   */
  const filteredRecommendations = useMemo(() => {
    if (!recommendations) return []

    return recommendations.filter(rec => {
      if (filter === 'ALL') return true
      if (filter === 'BUY') return rec.action === 'BUY'
      if (filter === 'SELL') return rec.action === 'SELL'
      if (filter === 'HIGH_CONFIDENCE') return rec.confidence >= 80
      return true
    })
  }, [recommendations, filter])

  /**
   * Handle recommendation execution
   */
  const handleExecute = async (recommendation: AIRecommendation) => {
    if (executingIds.has(recommendation.id)) return

    setExecutingIds(prev => new Set([...prev, recommendation.id]))

    try {
      if (onExecuteRecommendation) {
        await onExecuteRecommendation(recommendation)
      } else if (onExecute) {
        await onExecute(recommendation)
      }
    } catch (error) {
      console.error('Error executing recommendation:', error)
    } finally {
      setExecutingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recommendation.id)
        return newSet
      })
    }
  }

  /**
   * Get styling properties for different trade actions
   */
  const getActionProps = (action: TradeAction) => {
    const props = {
      BUY: {
        bgColor: 'bg-green-900',
        textColor: 'text-green-400',
        icon: TrendingUp
      },
      SELL: {
        bgColor: 'bg-red-900',
        textColor: 'text-red-400',
        icon: TrendingDown
      },
      HOLD: {
        bgColor: 'bg-gray-700',
        textColor: 'text-gray-400',
        icon: Activity
      }
    }
    return props[action] || props.HOLD
  }

  /**
   * Get confidence color based on score
   */
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-400'
    if (confidence >= 70) return 'text-yellow-400'
    if (confidence >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  /**
   * Format currency values
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  /**
   * Format relative time for timestamps
   */
  const formatRelativeTime = (timestamp: Date): string => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  /**
   * Check if recommendation is expired
   */
  const isExpired = (expiresAt: Date): boolean => {
    return new Date() > new Date(expiresAt)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-400" />
          <span className="ml-3 text-gray-400">Generating AI recommendations...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-300">Error loading recommendations: {error instanceof Error ? error.message : String(error || 'Unknown error')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">AI Trading Recommendations</h2>
          <div className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded-full">
            {filteredRecommendations.length}
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex space-x-2">
          {filterOptions.map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              {filterOption.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations list */}
      {filteredRecommendations.length > 0 ? (
        <div className="space-y-4">
          {filteredRecommendations.map((recommendation) => {
            const actionProps = getActionProps(recommendation.action)
            const ActionIcon = actionProps.icon
            const isExecuting = executingIds.has(recommendation.id)
            const expired = isExpired(recommendation.expiresAt)

            return (
              <div
                key={recommendation.id}
                className={`bg-gray-800 border rounded-lg p-4 transition-all ${expired ? 'border-gray-600 opacity-60' : 'border-gray-700 hover:border-gray-600'}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Main recommendation info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-lg ${actionProps.bgColor}`}>
                        <ActionIcon className={`h-5 w-5 ${actionProps.textColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-blue-400" />
                          <span className="text-xs text-gray-400">AI Score:</span>
                          <span className="text-blue-400 font-semibold">
                            {recommendation.aiScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Safety checks */}
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-1">
                          <Shield className="h-4 w-4 text-gray-400" />
                          <span className={`text-xs ${recommendation.riskScore <= 30
                            ? 'text-green-400'
                            : recommendation.riskScore <= 60
                            ? 'text-yellow-400'
                            : 'text-red-400'}`}>
                            {recommendation.riskScore <= 30 ? 'LOW' : recommendation.riskScore <= 60 ? 'MEDIUM' : 'HIGH'} Risk
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 font-medium text-lg">
                            {recommendation.action} {recommendation.symbol}
                          </span>
                          <span className={`text-lg font-bold ${getConfidenceColor(recommendation.confidence)}`}>
                            {recommendation.confidence}%
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>Current: {formatCurrency(recommendation.currentPrice)}</span>
                          <span>Target: {formatCurrency(recommendation.targetPrice)}</span>
                          {recommendation.stopLoss && (
                            <span>Stop: {formatCurrency(recommendation.stopLoss)}</span>
                          )}
                        </div>

                        <div className="text-gray-300 text-sm">
                          <div className="font-medium mb-1">AI Analysis:</div>
                          {recommendation.reasoning.slice(0, 2).map((reason, index) => (
                            <div key={index} className="text-xs text-gray-400">• {reason}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleExecute(recommendation)}
                        disabled={isExecuting || expired}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          expired
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : isExecuting
                            ? 'bg-blue-600 text-white opacity-50 cursor-not-allowed'
                            : recommendation.action === 'BUY'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {isExecuting ? (
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="animate-spin h-4 w-4" />
                            <span>Executing...</span>
                          </div>
                        ) : expired ? (
                          'Expired'
                        ) : (
                          `${recommendation.action} ${recommendation.symbol}`
                        )}
                      </button>
                    </div>

                    {/* Metadata and time info */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-400">
                              Generated {formatRelativeTime(new Date(recommendation.timestamp))}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Brain className="h-3 w-3 text-blue-400" />
                            <span className="text-gray-400">
                              {recommendation.executionMetadata?.mlFeatures?.model || 'AI Engine v2.0'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isExpired(recommendation.expiresAt) ? (
                            <div className="flex items-center space-x-1 text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              <span>Valid</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-red-400">
                              <XCircle className="h-3 w-3" />
                              <span>Expired</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Empty state
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
          <div className="text-center">
            <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Recommendations Available</h3>
            <p className="text-gray-400 mb-4">
              {filter === 'ALL'
                ? 'AI is analyzing market conditions. New recommendations will appear here.'
                : `No recommendations match the "${filter.replace('_', ' ')}" filter.`
              }
            </p>
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View All Recommendations
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {recommendations.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {recommendations.length}
              </div>
              <div className="text-sm text-gray-400">Total Recommendations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {recommendations.filter(r => r.action === 'BUY').length}
              </div>
              <div className="text-sm text-gray-400">Buy Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {recommendations.filter(r => r.action === 'SELL').length}
              </div>
              <div className="text-sm text-gray-400">Sell Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-400">Avg Confidence</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIRecommendationsList