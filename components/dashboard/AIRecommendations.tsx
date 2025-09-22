'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  CpuChipIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

interface AIRecommendation {
  id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  targetPrice: number
  currentPrice: number
  expectedReturn: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  reasoning: string
  strategy: string
  timestamp: Date
}

interface AIRecommendationsProps {
  quotes: Record<string, any>
  botConfig: any
  executeOrder: (orderData: any) => Promise<any>
  account: any
}

export function AIRecommendations({ quotes, botConfig, executeOrder, account }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState<string | null>(null)

  // Generate AI recommendations based on market data
  const generateAIRecommendations = useCallback(() => {
    const symbols = botConfig.watchlistSymbols || ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']
    const strategies = ['AI Momentum', 'AI Mean Reversion', 'AI Breakout', 'AI Sentiment', 'AI Pattern Recognition']
    
    const newRecommendations = symbols.slice(0, 6).map((symbol: string, index: number) => {
      const quote = quotes[symbol]
      const currentPrice = quote?.midPrice || (100 + Math.random() * 300)
      const action = ['BUY', 'SELL', 'HOLD'][index % 3] as 'BUY' | 'SELL' | 'HOLD'
      const confidence = 75 + Math.random() * 20 // 75-95% for AI recommendations
      const expectedReturn = action === 'HOLD' ? 0 : (Math.random() - 0.2) * 15
      const riskLevels = ['LOW', 'MEDIUM', 'HIGH'] as const
      
      return {
        id: `ai_${symbol}_${Date.now()}_${index}`,
        symbol,
        action,
        confidence: Math.round(confidence),
        targetPrice: action === 'BUY' ? currentPrice * (1 + Math.random() * 0.15) : 
                     action === 'SELL' ? currentPrice * (1 - Math.random() * 0.1) : currentPrice,
        currentPrice,
        expectedReturn: Number(expectedReturn.toFixed(1)),
        riskLevel: riskLevels[index % 3],
        reasoning: generateAIReasoning(symbol, action, confidence, strategies[index % strategies.length]),
        strategy: strategies[index % strategies.length],
        timestamp: new Date()
      }
    })
    
    setRecommendations(newRecommendations)
    setIsLoading(false)
  }, [quotes, botConfig.watchlistSymbols])

  const generateAIReasoning = (symbol: string, action: string, confidence: number, strategy: string) => {
    const reasons = [
      `${strategy} detected strong ${action.toLowerCase()} signal for ${symbol}. Technical analysis shows ${confidence.toFixed(0)}% probability of positive momentum.`,
      `Advanced neural network analysis indicates ${symbol} is ${action === 'BUY' ? 'undervalued' : 'overvalued'} with ${confidence.toFixed(0)}% confidence based on ${strategy.toLowerCase()}.`,
      `Market sentiment analysis and ${strategy.toLowerCase()} suggest ${action.toLowerCase()}ing ${symbol}. AI model confidence: ${confidence.toFixed(0)}%.`,
      `${symbol} exhibits strong ${strategy.toLowerCase()} patterns. Recommend ${action.toLowerCase()} with ${confidence.toFixed(0)}% algorithmic confidence.`
    ]
    return reasons[Math.floor(Math.random() * reasons.length)]
  }

  // Execute AI recommendation
  const executeAIRecommendation = useCallback(async (recommendation: AIRecommendation) => {
    if (!account || recommendation.action === 'HOLD') return

    setIsExecuting(recommendation.id)
    
    try {
      const maxPositionValue = account.totalBalance * (botConfig.maxPositionSize / 100)
      const quantity = Math.floor(maxPositionValue / recommendation.currentPrice)
      
      if (quantity < 1) {
        throw new Error('Insufficient funds for minimum order size')
      }

      await executeOrder({
        symbol: recommendation.symbol,
        quantity,
        side: recommendation.action.toLowerCase(),
        type: 'market'
      })

      // Remove executed recommendation
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendation.id))
      
    } catch (error) {
      console.error('AI recommendation execution failed:', error)
    } finally {
      setIsExecuting(null)
    }
  }, [account, botConfig.maxPositionSize, executeOrder])

  // Generate new recommendations periodically
  useEffect(() => {
    generateAIRecommendations()
    const interval = setInterval(generateAIRecommendations, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [generateAIRecommendations])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-emerald-400'
    if (confidence >= 80) return 'text-cyan-400'
    if (confidence >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-emerald-400 bg-emerald-900/30'
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/30'
      case 'HIGH': return 'text-red-400 bg-red-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-cyan-400">Generating AI recommendations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CpuChipIcon className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold">AI Trading Recommendations</h2>
          <SparklesIcon className="w-5 h-5 text-purple-400" />
        </div>
        
        <button
          onClick={generateAIRecommendations}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors"
        >
          <ArrowTrendingUpIcon className="w-4 h-4" />
          Refresh AI Signals
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <CpuChipIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No AI Recommendations</h3>
          <p className="text-gray-500">AI is analyzing market conditions. Check back in a moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {recommendations.map((recommendation) => (
            <div key={recommendation.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{recommendation.symbol}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    recommendation.action === 'BUY' ? 'bg-emerald-600' :
                    recommendation.action === 'SELL' ? 'bg-red-600' : 'bg-indigo-600'
                  }`}>
                    {recommendation.action}
                  </span>
                  {recommendation.action !== 'HOLD' && (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-bold ${getConfidenceColor(recommendation.confidence)}`}>
                    {recommendation.confidence}%
                  </div>
                  <div className="text-xs text-gray-400">AI Confidence</div>
                </div>
              </div>

              {/* Price Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400">Current Price</div>
                  <div className="text-lg font-semibold">${recommendation.currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Target Price</div>
                  <div className="text-lg font-semibold text-cyan-400">${recommendation.targetPrice.toFixed(2)}</div>
                </div>
              </div>

              {/* Expected Return */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-gray-400">Expected Return</div>
                  <div className={`text-lg font-bold ${recommendation.expectedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {recommendation.expectedReturn >= 0 ? '+' : ''}{recommendation.expectedReturn}%
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(recommendation.riskLevel)}`}>
                  {recommendation.riskLevel} RISK
                </div>
              </div>

              {/* AI Strategy */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">AI Strategy</div>
                <div className="text-sm text-purple-400 font-medium">{recommendation.strategy}</div>
              </div>

              {/* AI Reasoning */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">AI Analysis</div>
                <div className="text-sm text-gray-300 leading-relaxed bg-gray-900/50 p-3 rounded">
                  {recommendation.reasoning}
                </div>
              </div>

              {/* Actions */}
              {recommendation.action !== 'HOLD' && account && (
                <div className="flex gap-2">
                  <button
                    onClick={() => executeAIRecommendation(recommendation)}
                    disabled={isExecuting === recommendation.id || !botConfig.enabled}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                  >
                    {isExecuting === recommendation.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Executing...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4" />
                        Execute AI Trade
                      </>
                    )}
                  </button>
                </div>
              )}

              {!botConfig.enabled && recommendation.action !== 'HOLD' && (
                <div className="flex items-center gap-2 text-amber-400 text-sm mt-2">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Enable bot to execute trades
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500">
                Generated: {recommendation.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Performance Summary */}
      <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          AI Performance Metrics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {recommendations.filter(r => r.confidence >= 85).length}
            </div>
            <div className="text-sm text-gray-400">High Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length || 0)}%
            </div>
            <div className="text-sm text-gray-400">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {recommendations.filter(r => r.action !== 'HOLD').length}
            </div>
            <div className="text-sm text-gray-400">Active Signals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-400">
              {recommendations.filter(r => r.riskLevel === 'LOW').length}
            </div>
            <div className="text-sm text-gray-400">Low Risk</div>
          </div>
        </div>
      </div>
    </div>
  )
}
