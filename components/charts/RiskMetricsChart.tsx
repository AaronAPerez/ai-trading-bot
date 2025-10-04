'use client'

import { useState, useEffect } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealTimeAIMetrics } from '@/hooks/useRealTimeAIMetrics'

interface RiskMetric {
  category: string
  value: number
  maxValue: number
  status: 'low' | 'medium' | 'high'
  description: string
}

interface PositionRisk {
  symbol: string
  risk: number
  exposure: number
  concentration: number
}

interface RiskMetricsChartProps {
  height?: number
  showPositionRisks?: boolean
}

const getRiskColor = (status: 'low' | 'medium' | 'high') => {
  switch (status) {
    case 'low': return '#10b981' // green
    case 'medium': return '#f59e0b' // amber
    case 'high': return '#ef4444' // red
  }
}

const getRiskStatus = (value: number, thresholds: { low: number, medium: number }): 'low' | 'medium' | 'high' => {
  if (value <= thresholds.low) return 'low'
  if (value <= thresholds.medium) return 'medium'
  return 'high'
}

export function RiskMetricsChart({ height = 400, showPositionRisks = true }: RiskMetricsChartProps) {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([])
  const [positionRisks, setPositionRisks] = useState<PositionRisk[]>([])
  const [overallRiskScore, setOverallRiskScore] = useState(0)
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low')
  const [isLoading, setIsLoading] = useState(true)

  const { metrics } = useRealTimeAIMetrics()

  useEffect(() => {
    const calculateRiskMetrics = async () => {
      setIsLoading(true)

      try {
        // Fetch via API routes instead of direct client access
        const [accountRes, positionsRes] = await Promise.all([
          fetch('/api/alpaca/account'),
          fetch('/api/alpaca/positions')
        ])

        if (!accountRes.ok || !positionsRes.ok) {
          throw new Error('Failed to fetch account data')
        }

        const accountData = await accountRes.json()
        const positionsData = await positionsRes.json()

        // Extract the actual data from the response
        const account = accountData.data || accountData
        const positions = Array.isArray(positionsData) ? positionsData : (positionsData.data || [])

        const portfolioValue = parseFloat(account.portfolio_value || account.equity || '0')
        const buyingPower = parseFloat(account.buying_power || '0')
        const equity = parseFloat(account.equity || '0')
        const cash = parseFloat(account.cash || '0')

        // Calculate leverage ratio
        const leverage = portfolioValue > 0 ? (portfolioValue - cash) / portfolioValue : 0
        const leveragePercent = leverage * 100

        // Calculate concentration risk (largest position %)
        let maxPositionPercent = 0
        if (positions && positions.length > 0) {
          const positionValues = positions.map((p: any) => parseFloat(p.market_value || '0'))
          const maxPosition = Math.max(...positionValues)
          maxPositionPercent = portfolioValue > 0 ? (maxPosition / portfolioValue) * 100 : 0
        }

        // Calculate volatility risk (based on unrealized P&L volatility)
        const unrealizedPnL = positions?.reduce((sum: number, p: any) =>
          sum + parseFloat(p.unrealized_pl || '0'), 0) || 0
        const volatilityPercent = portfolioValue > 0 ? Math.abs(unrealizedPnL / portfolioValue) * 100 : 0

        // Calculate diversification score (inverse of concentration)
        const diversificationScore = positions?.length || 0
        const diversificationPercent = Math.min(diversificationScore * 10, 100) // Max 100% at 10+ positions

        // Calculate liquidity risk (cash/portfolio ratio)
        const liquidityPercent = portfolioValue > 0 ? (cash / portfolioValue) * 100 : 0

        // Calculate daily loss risk
        const dailyPnL = metrics.dailyPnL || 0
        const dailyLossPercent = portfolioValue > 0 ? Math.abs(Math.min(dailyPnL, 0) / portfolioValue) * 100 : 0

        const calculatedMetrics: RiskMetric[] = [
          {
            category: 'Leverage',
            value: leveragePercent,
            maxValue: 100,
            status: getRiskStatus(leveragePercent, { low: 30, medium: 60 }),
            description: `${leveragePercent.toFixed(1)}% portfolio leverage`
          },
          {
            category: 'Concentration',
            value: maxPositionPercent,
            maxValue: 100,
            status: getRiskStatus(maxPositionPercent, { low: 15, medium: 30 }),
            description: `${maxPositionPercent.toFixed(1)}% in largest position`
          },
          {
            category: 'Volatility',
            value: volatilityPercent,
            maxValue: 100,
            status: getRiskStatus(volatilityPercent, { low: 5, medium: 15 }),
            description: `${volatilityPercent.toFixed(1)}% portfolio volatility`
          },
          {
            category: 'Diversification',
            value: 100 - diversificationPercent,
            maxValue: 100,
            status: getRiskStatus(100 - diversificationPercent, { low: 40, medium: 70 }),
            description: `${diversificationScore} positions`
          },
          {
            category: 'Liquidity',
            value: 100 - liquidityPercent,
            maxValue: 100,
            status: getRiskStatus(100 - liquidityPercent, { low: 30, medium: 60 }),
            description: `${liquidityPercent.toFixed(1)}% cash available`
          },
          {
            category: 'Daily Loss',
            value: dailyLossPercent,
            maxValue: 100,
            status: getRiskStatus(dailyLossPercent, { low: 2, medium: 5 }),
            description: `${dailyLossPercent.toFixed(1)}% daily loss`
          }
        ]

        setRiskMetrics(calculatedMetrics)

        // Calculate position-specific risks
        if (positions && positions.length > 0) {
          const positionRiskData: PositionRisk[] = positions.map((position: any) => {
            const marketValue = parseFloat(position.market_value || '0')
            const unrealizedPL = parseFloat(position.unrealized_pl || '0')
            const exposure = portfolioValue > 0 ? (marketValue / portfolioValue) * 100 : 0
            const pnlPercent = marketValue > 0 ? Math.abs(unrealizedPL / marketValue) * 100 : 0

            // Risk score: combination of exposure and volatility
            const risk = (exposure * 0.6) + (pnlPercent * 0.4)

            return {
              symbol: position.symbol,
              risk: Math.min(risk, 100),
              exposure,
              concentration: exposure
            }
          })

          positionRiskData.sort((a, b) => b.risk - a.risk)
          setPositionRisks(positionRiskData.slice(0, 10)) // Top 10 riskiest
        }

        // Calculate overall risk score (average of all metrics)
        const avgRiskScore = calculatedMetrics.reduce((sum, m) => sum + (m.value / m.maxValue), 0) / calculatedMetrics.length * 100
        setOverallRiskScore(avgRiskScore)
        setRiskLevel(getRiskStatus(avgRiskScore, { low: 30, medium: 60 }))

      } catch (err) {
        console.error('Failed to calculate risk metrics:', err)
      } finally {
        setIsLoading(false)
      }
    }

    calculateRiskMetrics()

    // Refresh every 30 seconds
    const interval = setInterval(calculateRiskMetrics, 30000)

    return () => clearInterval(interval)
  }, [metrics.dailyPnL])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-bold mb-1">{data.category}</p>
          <p className="text-sm text-gray-300">{data.description}</p>
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getRiskColor(data.status) }} />
            <span className="text-sm font-medium" style={{ color: getRiskColor(data.status) }}>
              {data.status.toUpperCase()} RISK
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Risk Analysis</CardTitle>
          <div className="text-right">
            <div className="text-sm text-gray-400">Overall Risk Score</div>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold" style={{ color: getRiskColor(riskLevel) }}>
                {overallRiskScore.toFixed(0)}%
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold`} style={{
                backgroundColor: getRiskColor(riskLevel) + '20',
                color: getRiskColor(riskLevel)
              }}>
                {riskLevel.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={riskMetrics}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Radar
                  name="Risk Level"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Metrics Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Risk Breakdown</h3>
            {riskMetrics.map((metric, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{metric.category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm" style={{ color: getRiskColor(metric.status) }}>
                      {(metric.value).toFixed(0)}%
                    </span>
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getRiskColor(metric.status) }} />
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(metric.value / metric.maxValue) * 100}%`,
                      backgroundColor: getRiskColor(metric.status)
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Position Risk Analysis */}
        {showPositionRisks && positionRisks.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Position Risk Analysis</h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={positionRisks} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="symbol" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
                            <p className="text-white font-bold mb-1">{data.symbol}</p>
                            <p className="text-sm text-gray-300">Risk Score: {data.risk.toFixed(1)}%</p>
                            <p className="text-sm text-gray-300">Exposure: {data.exposure.toFixed(1)}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="risk" radius={[8, 8, 0, 0]}>
                    {positionRisks.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getRiskColor(getRiskStatus(entry.risk, { low: 30, medium: 60 }))}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
