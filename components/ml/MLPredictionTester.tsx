'use client'

import { useState } from 'react'
import { useMLPrediction } from '@/hooks/ml/useMLPrediction'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'

export function MLPredictionTester() {
  const [symbol, setSymbol] = useState('AAPL')
  const { prediction, loading, error, generatePrediction, clearPrediction } = useMLPrediction()

  const handlePredict = async () => {
    if (!symbol.trim()) return
    await generatePrediction(symbol.toUpperCase())
  }

  const getActionIcon = (action: string) => {
    if (action === 'BUY') return <TrendingUp className="h-5 w-5 text-green-500" />
    if (action === 'SELL') return <TrendingDown className="h-5 w-5 text-red-500" />
    return <Minus className="h-5 w-5 text-gray-500" />
  }

  const getActionColor = (action: string) => {
    if (action === 'BUY') return 'bg-green-100 text-green-800 border-green-300'
    if (action === 'SELL') return 'bg-red-100 text-red-800 border-red-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          ML Prediction Tester
        </CardTitle>
        <CardDescription>
          Test ensemble ML predictions for any symbol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter symbol (e.g., AAPL, TSLA, BTC/USD)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePredict()}
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handlePredict}
            disabled={loading || !symbol.trim()}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              'Get Prediction'
            )}
          </Button>
          {prediction && (
            <Button
              variant="secondary"
              onClick={clearPrediction}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="space-y-4 pt-4 border-t">
            {/* Main Prediction */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
              <div className="flex items-center gap-3">
                {getActionIcon(prediction.action)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{prediction.action}</span>
                    <Badge className={getActionColor(prediction.action)}>
                      Recommendation
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Confidence: <span className={`font-bold ${getConfidenceColor(prediction.confidence)}`}>
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Model Agreement</div>
                <div className="text-2xl font-bold text-purple-600">
                  {(prediction.ensemble.modelAgreement * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Model Scores */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Individual Model Scores</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white border rounded-lg">
                  <div className="text-xs text-gray-600">Reinforcement Learning</div>
                  <div className="text-lg font-bold text-blue-600">
                    {(prediction.modelScores.reinforcementLearning * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <div className="text-xs text-gray-600">Pattern Recognition</div>
                  <div className="text-lg font-bold text-green-600">
                    {(prediction.modelScores.patternRecognition * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <div className="text-xs text-gray-600">Sentiment Analysis</div>
                  <div className="text-lg font-bold text-purple-600">
                    {(prediction.modelScores.sentimentAnalysis * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <div className="text-xs text-gray-600">Technical Analysis</div>
                  <div className="text-lg font-bold text-indigo-600">
                    {(prediction.modelScores.technicalAnalysis * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            {prediction.reasoning && prediction.reasoning.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">AI Reasoning</div>
                <div className="space-y-1">
                  {prediction.reasoning.map((reason, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ensemble Stats */}
            <div className="p-3 bg-gray-50 border rounded-lg">
              <div className="text-xs font-semibold text-gray-700 mb-2">Ensemble Statistics</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-600">Consensus</div>
                  <div className="text-sm font-bold">
                    {(prediction.ensemble.votingConsensus * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Weighted Score</div>
                  <div className="text-sm font-bold">
                    {prediction.ensemble.weightedScore.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Time Horizon</div>
                  <div className="text-sm font-bold">
                    {prediction.timeHorizon}h
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Test Buttons */}
        <div className="pt-4 border-t">
          <div className="text-xs text-gray-600 mb-2">Quick Test Symbols:</div>
          <div className="flex flex-wrap gap-2">
            {['AAPL', 'TSLA', 'NVDA', 'SPY', 'BTC/USD', 'ETH/USD'].map((sym) => (
              <Button
                key={sym}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSymbol(sym)
                  generatePrediction(sym)
                }}
                disabled={loading}
              >
                {sym}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
