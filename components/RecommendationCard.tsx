'use client'

// ===============================================
// AI RECOMMENDATION CARD COMPONENT
// components/RecommendationCard.tsx
// ===============================================

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import { usePlaceOrder, useRiskAssessment } from '@/hooks/useTradingData'

interface RecommendationCardProps {
  recommendation: any
  userId: string
  accountBalance: number
}

export function RecommendationCard({
  recommendation,
  userId,
  accountBalance
}: RecommendationCardProps) {
  const [quantity, setQuantity] = useState(10)
  const [riskAssessment, setRiskAssessment] = useState<any>(null)

  const placeOrder = usePlaceOrder()
  const assessRisk = useRiskAssessment()

  const handleCheckRisk = async () => {
    try {
      const result = await assessRisk.mutateAsync({
        userId,
        symbol: recommendation.symbol,
        action: recommendation.action,
        quantity,
        entryPrice: recommendation.currentPrice || recommendation.entry_price,
        stopLoss: recommendation.stopLoss || recommendation.stop_loss,
        targetPrice: recommendation.targetPrice || recommendation.target_price,
        accountBalance,
      })

      setRiskAssessment(result.assessment || result)
    } catch (error) {
      console.error('Risk assessment failed:', error)
    }
  }

  const handleExecute = async () => {
    // Check risk first if not already checked
    if (!riskAssessment) {
      await handleCheckRisk()
      return
    }

    // Don't execute if risk assessment didn't approve
    if (!riskAssessment?.approved) {
      return
    }

    try {
      await placeOrder.mutateAsync({
        symbol: recommendation.symbol,
        qty: quantity,
        side: recommendation.action.toLowerCase() as 'buy' | 'sell',
        type: 'market',
        time_in_force: 'day',
      })

      // Reset after successful order
      setRiskAssessment(null)
    } catch (error) {
      console.error('Order execution failed:', error)
    }
  }

  const isBuy = recommendation.action === 'BUY'
  const confidence = recommendation.confidence || recommendation.confidence_score || 0
  const riskScore = recommendation.riskScore || recommendation.risk_score || 50
  const currentPrice = recommendation.currentPrice || recommendation.entry_price || 0
  const targetPrice = recommendation.targetPrice || recommendation.target_price || 0
  const stopLoss = recommendation.stopLoss || recommendation.stop_loss || 0
  const potentialReturn = recommendation.potentialReturn ||
    recommendation.potential_return ||
    ((targetPrice - currentPrice) / currentPrice) * 100

  const confidenceColor =
    confidence >= 80 ? 'bg-green-500' :
    confidence >= 70 ? 'bg-yellow-500' :
    'bg-orange-500'

  return (
    <Card className="border-l-4" style={{ borderLeftColor: isBuy ? '#10b981' : '#ef4444' }}>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Symbol and Action */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold">{recommendation.symbol}</h3>
              <Badge
                variant={isBuy ? 'default' : 'destructive'}
                className="text-sm py-1 px-3"
              >
                {isBuy ? (
                  <>
                    <TrendingUp className="w-4 h-4 mr-1" /> BUY
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-1" /> SELL
                  </>
                )}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              {recommendation.reasoning || recommendation.reason || 'AI-generated trading signal'}
            </div>

            {/* Price Targets */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Current Price</div>
                <div className="font-semibold text-lg">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Target Price</div>
                <div className="font-semibold text-lg text-green-600">
                  ${targetPrice.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Stop Loss</div>
                <div className="font-semibold text-lg text-red-600">
                  ${stopLoss.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Strategy Info */}
            {recommendation.strategy && (
              <div className="text-xs">
                <span className="text-muted-foreground">Strategy: </span>
                <span className="font-medium">{recommendation.strategy}</span>
              </div>
            )}
          </div>

          {/* Right side - Metrics and Actions */}
          <div className="lg:w-80 space-y-4">
            {/* Confidence Score */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Confidence Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${confidenceColor} transition-all`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="font-bold text-lg w-12 text-right">{confidence}%</span>
              </div>
            </div>

            {/* Risk Level */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Risk Level</div>
              <Badge
                variant={
                  riskScore < 40 ? 'default' :
                  riskScore < 60 ? 'secondary' :
                  'destructive'
                }
                className="text-sm"
              >
                {riskScore < 40 ? 'Low Risk' :
                 riskScore < 60 ? 'Medium Risk' :
                 'High Risk'} ({riskScore})
              </Badge>
            </div>

            {/* Potential Return */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Potential Return</div>
              <div className="font-bold text-xl text-green-600">
                +{potentialReturn.toFixed(2)}%
              </div>
            </div>

            {/* Risk Assessment Display */}
            {riskAssessment && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  {riskAssessment.approved ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">
                        Trade Approved
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-semibold text-red-600">
                        Trade Not Recommended
                      </span>
                    </>
                  )}
                </div>

                {riskAssessment.warnings && riskAssessment.warnings.length > 0 && (
                  <div className="space-y-1">
                    {riskAssessment.warnings.map((warning: string, i: number) => (
                      <div key={i} className="text-xs text-yellow-600 flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {riskAssessment.errors && riskAssessment.errors.length > 0 && (
                  <div className="space-y-1">
                    {riskAssessment.errors.map((error: string, i: number) => (
                      <div key={i} className="text-xs text-red-600 flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs space-y-1 pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk:Reward Ratio:</span>
                    <span className="font-medium">
                      {riskAssessment.riskRewardRatio?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recommended Size:</span>
                    <span className="font-medium">
                      {riskAssessment.recommendedSize || quantity} shares
                    </span>
                  </div>
                  {riskAssessment.maxPositionSize && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Position:</span>
                      <span className="font-medium">
                        {riskAssessment.maxPositionSize} shares
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-16">Quantity:</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  min="1"
                  step="1"
                />
              </div>

              {!riskAssessment && (
                <Button
                  onClick={handleCheckRisk}
                  variant="outline"
                  className="w-full"
                  disabled={assessRisk.isPending}
                >
                  {assessRisk.isPending ? 'Analyzing Risk...' : 'Check Risk'}
                </Button>
              )}

              <Button
                onClick={handleExecute}
                className="w-full"
                disabled={
                  placeOrder.isPending ||
                  assessRisk.isPending ||
                  (riskAssessment && !riskAssessment.approved)
                }
                variant={riskAssessment?.approved ? 'default' : 'outline'}
              >
                {placeOrder.isPending ? 'Executing...' :
                 !riskAssessment ? 'Check & Execute' :
                 riskAssessment.approved ? 'Execute Trade' :
                 'Trade Not Approved'}
              </Button>

              {riskAssessment && (
                <Button
                  onClick={() => setRiskAssessment(null)}
                  variant="ghost"
                  className="w-full text-xs"
                >
                  Reset Assessment
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}