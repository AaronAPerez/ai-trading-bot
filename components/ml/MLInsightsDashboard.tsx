'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { BrainCircuit, TrendingUp, Newspaper, Activity, Target } from 'lucide-react'
import { Progress } from '../ui/progress'

interface MLMetrics {
  overallAccuracy: number
  modelPerformance: {
    reinforcementLearning: {
      qTableSize: number
      explorationRate: number
      averageReward: number
      convergenceStatus: string
    }
    patternRecognition: {
      patternsIdentified: number
      accuracyRate: number
      strongestPatterns: string[]
    }
    sentimentAnalysis: {
      newsArticlesProcessed: number
      averageSentiment: number
      sentimentAccuracy: number
    }
    technicalAnalysis: {
      indicatorsUsed: number
      accuracy: number
      profitableSignals: number
    }
  }
  ensembleMetrics: {
    consensusRate: number
    predictionAccuracy: number
    totalPredictions: number
    profitablePredictions: number
  }
}

export function MLInsightsDashboard() {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMLMetrics()
    const interval = setInterval(fetchMLMetrics, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchMLMetrics = async () => {
    try {
      const response = await fetch('/api/ml/metrics')
      const data = await response.json()

      if (data.success) {
        setMetrics(data.metrics)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Machine Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Machine Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-amber-600">
            {error || 'No ML metrics available'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getConvergenceColor = (status: string) => {
    if (status === 'CONVERGED') return 'bg-green-100 text-green-800'
    if (status === 'CONVERGING') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            ML Ensemble Performance
          </CardTitle>
          <CardDescription>
            Combined intelligence from 4 machine learning models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Overall Accuracy</div>
              <div className="text-2xl font-bold text-blue-600">
                {(metrics.overallAccuracy * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.overallAccuracy * 100} className="mt-2" />
            </div>

            <div>
              <div className="text-sm text-gray-600">Model Consensus</div>
              <div className="text-2xl font-bold text-green-600">
                {(metrics.ensembleMetrics.consensusRate * 100).toFixed(0)}%
              </div>
              <Progress value={metrics.ensembleMetrics.consensusRate * 100} className="mt-2" />
            </div>

            <div>
              <div className="text-sm text-gray-600">Total Predictions</div>
              <div className="text-2xl font-bold text-purple-600">
                {metrics.ensembleMetrics.totalPredictions}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics.ensembleMetrics.profitablePredictions} profitable
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Prediction Accuracy</div>
              <div className="text-2xl font-bold text-indigo-600">
                {(metrics.ensembleMetrics.predictionAccuracy * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.ensembleMetrics.predictionAccuracy * 100} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Model Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reinforcement Learning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Reinforcement Learning
              </div>
              <Badge className={getConvergenceColor(metrics.modelPerformance.reinforcementLearning.convergenceStatus)}>
                {metrics.modelPerformance.reinforcementLearning.convergenceStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Q-Table States</span>
                <span className="font-semibold">{metrics.modelPerformance.reinforcementLearning.qTableSize.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Exploration Rate</span>
                <span className="font-semibold">{(metrics.modelPerformance.reinforcementLearning.explorationRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Reward</span>
                <span className={`font-semibold ${metrics.modelPerformance.reinforcementLearning.averageReward > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.modelPerformance.reinforcementLearning.averageReward.toFixed(3)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pattern Recognition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Pattern Recognition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Patterns Identified</span>
                <span className="font-semibold">{metrics.modelPerformance.patternRecognition.patternsIdentified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accuracy Rate</span>
                <span className="font-semibold">{(metrics.modelPerformance.patternRecognition.accuracyRate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Strongest Patterns</div>
                <div className="flex flex-wrap gap-1">
                  {metrics.modelPerformance.patternRecognition.strongestPatterns.slice(0, 3).map((pattern, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Articles Processed</span>
                <span className="font-semibold">{metrics.modelPerformance.sentimentAnalysis.newsArticlesProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Sentiment</span>
                <span className={`font-semibold ${
                  metrics.modelPerformance.sentimentAnalysis.averageSentiment > 60 ? 'text-green-600' :
                  metrics.modelPerformance.sentimentAnalysis.averageSentiment < 40 ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {metrics.modelPerformance.sentimentAnalysis.averageSentiment}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sentiment Accuracy</span>
                <span className="font-semibold">{(metrics.modelPerformance.sentimentAnalysis.sentimentAccuracy * 100).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Technical Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Indicators Used</span>
                <span className="font-semibold">{metrics.modelPerformance.technicalAnalysis.indicatorsUsed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accuracy</span>
                <span className="font-semibold">{(metrics.modelPerformance.technicalAnalysis.accuracy * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Profitable Signals</span>
                <span className="font-semibold text-green-600">{metrics.modelPerformance.technicalAnalysis.profitableSignals}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
