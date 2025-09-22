'use client'

import { TrendingUp, TrendingDown, AlertTriangle, BrainIcon, Badge, Clock, Brain } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/card'

interface AIRecommendation {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  aiScore: number
  currentPrice: number
  targetPrice: number
  stopLoss: number
  riskReward: number
  reasoning: string[]
  timestamp: Date
  timeframe: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export default function AIRecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [executionLoading, setExecutionLoading] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    fetchRecommendations()
    const interval = setInterval(fetchRecommendations, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would fetch from a dedicated recommendations API
      // For now, we'll create mock data based on current AI analysis
      const mockRecommendations: AIRecommendation[] = [
        {
          symbol: 'NVDA',
          action: 'BUY',
          confidence: 0.87,
          aiScore: 92.5,
          currentPrice: 435.20,
          targetPrice: 475.00,
          stopLoss: 415.00,
          riskReward: 2.1,
          reasoning: [
            'Strong Q4 earnings momentum',
            'AI chip demand surge continues',
            'Technical breakout above resistance',
            'High institutional buying volume'
          ],
          timestamp: new Date(),
          timeframe: '1-3 weeks',
          priority: 'CRITICAL'
        },
        {
          symbol: 'TSLA',
          action: 'SELL',
          confidence: 0.74,
          aiScore: 81.3,
          currentPrice: 248.50,
          targetPrice: 220.00,
          stopLoss: 265.00,
          riskReward: 1.8,
          reasoning: [
            'Overvaluation at current levels',
            'Production challenges in China',
            'Competition intensifying',
            'Technical bearish divergence'
          ],
          timestamp: new Date(),
          timeframe: '2-4 weeks',
          priority: 'HIGH'
        },
        {
          symbol: 'MSFT',
          action: 'BUY',
          confidence: 0.69,
          aiScore: 76.8,
          currentPrice: 420.15,
          targetPrice: 445.00,
          stopLoss: 405.00,
          riskReward: 1.6,
          reasoning: [
            'Cloud growth acceleration',
            'AI integration driving revenue',
            'Strong balance sheet',
            'Dividend support at current levels'
          ],
          timestamp: new Date(),
          timeframe: '3-6 weeks',
          priority: 'MEDIUM'
        }
      ]

      setRecommendations(mockRecommendations)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeManualTrade = async (symbol: string, action: 'BUY' | 'SELL', confidence: number) => {
    setExecutionLoading(symbol)
    try {
      // Calculate position size based on confidence
      const basePositionSize = 0.02 // 2% base
      const confidenceMultiplier = confidence * 1.5
      const positionSize = Math.min(0.08, basePositionSize * confidenceMultiplier) // Max 8%

      const response = await fetch('/api/manual-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          action,
          positionSize,
          orderType: 'MARKET',
          source: 'AI_RECOMMENDATION_MANUAL'
        })
      })

      if (response.ok) {
        alert(`Manual ${action} order submitted for ${symbol} (${(positionSize * 100).toFixed(1)}% position)`)
        // Remove executed recommendation from list
        setRecommendations(prev => prev.filter(rec => rec.symbol !== symbol))
      } else {
        throw new Error('Manual trade failed')
      }
    } catch (err) {
      alert(`Manual trade failed: ${err.message}`)
    } finally {
      setExecutionLoading(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'SELL': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BrainIcon className="h-5 w-5 text-purple-500" />
              AI Trading Recommendations
            </h2>
            <p className="text-gray-400 mt-1">
              Real-time AI analysis with manual execution options
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-3 py-1 border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              Refresh Analysis
            </button>
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <Card key={rec.symbol} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getActionIcon(rec.action)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{rec.symbol}</span>
                      <Badge variant={rec.action === 'BUY' ? 'default' : 'destructive'}>
                        {rec.action}
                      </Badge>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatCurrency(rec.currentPrice)} • Target: {formatCurrency(rec.targetPrice)} •
                      Stop: {formatCurrency(rec.stopLoss)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {(rec.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">AI Confidence</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {rec.aiScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">AI Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {rec.riskReward.toFixed(1)}:1
                  </div>
                  <div className="text-xs text-gray-500">Risk/Reward</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {rec.timeframe}
                  </div>
                  <div className="text-xs text-gray-500">Time Horizon</div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">AI Analysis:</div>
                <div className="space-y-1">
                  {rec.reasoning.map((reason, index) => (
                    <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Execution Buttons */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Generated: {rec.timestamp.toLocaleTimeString()}
                </div>

                <div className="flex items-center gap-2">
                  {rec.action === 'BUY' && (
                    <Button
                      onClick={() => executeManualTrade(rec.symbol, 'BUY', rec.confidence)}
                      disabled={executionLoading === rec.symbol}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Manual Buy
                    </Button>
                  )}

                  {rec.action === 'SELL' && (
                    <Button
                      onClick={() => executeManualTrade(rec.symbol, 'SELL', rec.confidence)}
                      disabled={executionLoading === rec.symbol}
                      variant="destructive"
                      size="sm"
                    >
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Manual Sell
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Remove recommendation from list (dismiss)
                      setRecommendations(prev => prev.filter(r => r.symbol !== rec.symbol))
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {recommendations.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500">
                No AI recommendations available at this time.
              </div>
              <div className="text-sm text-gray-400 mt-2">
                AI is analyzing market conditions for new opportunities...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}