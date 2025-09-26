'use client'

import { useState } from 'react'
import { useAIRecommendations } from '@/hooks/useAIRecommendations'
import { AIRecommendationsList } from '@/components/dashboard/AIRecommendationsList'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Bot, Zap, TrendingUp } from 'lucide-react'

export default function AIRecommendationsDashboard() {
  const [minConfidence, setMinConfidence] = useState(70)

  const {
    recommendations,
    statistics,
    isLoading,
    isGenerating,
    error,
    refreshRecommendations,
    generateAll,
    executeRecommendation
  } = useAIRecommendations({
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    minConfidence,
    maxResults: 20
  })

  const handleExecuteRecommendation = async (recommendation: any) => {
    try {
      await executeRecommendation(recommendation)
      console.log(`✅ Successfully executed ${recommendation.action} ${recommendation.symbol}`)
    } catch (error) {
      console.error('❌ Failed to execute recommendation:', error)
    }
  }

  const handleGenerateNew = async () => {
    try {
      await generateAll(true) // Force refresh
      console.log('✅ Generated new AI recommendations')
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Trading Recommendations</h1>
            <p className="text-gray-400">Powered by advanced machine learning models</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Min Confidence:</label>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value={50}>50%</option>
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>

          <Button
            onClick={refreshRecommendations}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>

          <Button
            onClick={handleGenerateNew}
            disabled={isGenerating}
            variant="primary"
            size="sm"
          >
            <Zap className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate New'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Recommendations</p>
              <p className="text-2xl font-bold text-white">{statistics.total || 0}</p>
            </div>
            <Bot className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Buy Signals</p>
              <p className="text-2xl font-bold text-green-400">{statistics.buySignals || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Sell Signals</p>
              <p className="text-2xl font-bold text-red-400">{statistics.sellSignals || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-400 rotate-180" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Confidence</p>
              <p className="text-2xl font-bold text-purple-400">{statistics.averageConfidence || 0}%</p>
            </div>
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <AIRecommendationsList
        recommendations={recommendations}
        onExecuteRecommendation={handleExecuteRecommendation}
        isLoading={isLoading}
        error={error}
      />
    </div>
  )
}