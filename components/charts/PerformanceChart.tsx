'use client'

import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealTimeAIMetrics } from '@/hooks/useRealTimeAIMetrics'

interface PerformanceDataPoint {
  timestamp: string
  date: string
  portfolioValue: number
  equity: number
  profitLoss: number
  profitLossPercent: number
}

interface PerformanceChartProps {
  period?: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'
  height?: number
  showComparison?: boolean
}

const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

export function PerformanceChart({
  period = '1M',
  height = 400,
  showComparison = false
}: PerformanceChartProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [initialValue, setInitialValue] = useState(0)
  const [currentValue, setCurrentValue] = useState(0)
  const [totalReturn, setTotalReturn] = useState(0)
  const [totalReturnPercent, setTotalReturnPercent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  const { metrics } = useRealTimeAIMetrics()

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const endDate = new Date()
        const startDate = new Date()

        // Calculate date range based on period
        switch (selectedPeriod) {
          case '1D':
            startDate.setDate(startDate.getDate() - 1)
            break
          case '1W':
            startDate.setDate(startDate.getDate() - 7)
            break
          case '1M':
            startDate.setMonth(startDate.getMonth() - 1)
            break
          case '3M':
            startDate.setMonth(startDate.getMonth() - 3)
            break
          case '1Y':
            startDate.setFullYear(startDate.getFullYear() - 1)
            break
          case 'ALL':
            startDate.setFullYear(startDate.getFullYear() - 5) // Max 5 years
            break
        }

        // Fetch portfolio history from Alpaca via API route
        const params = new URLSearchParams({
          period: selectedPeriod,
          timeframe: selectedPeriod === '1D' ? '5Min' : '1D',
          extended_hours: 'false'
        })

        const res = await fetch(`/api/alpaca/portfolio-history?${params}`)
        if (!res.ok) throw new Error('Failed to fetch portfolio history')

        const response = await res.json()

        if (response.equity && response.equity.length > 0) {
          const timestamps = response.timestamp || []
          const equityValues = response.equity || []
          const profitLossValues = response.profit_loss || []
          const profitLossPercentValues = response.profit_loss_pct || []

          const formattedData: PerformanceDataPoint[] = equityValues.map((equity: number, index: number) => {
            const timestamp = timestamps[index] ? new Date(timestamps[index] * 1000) : new Date()
            const profitLoss = profitLossValues[index] || 0
            const profitLossPercent = (profitLossPercentValues[index] || 0) * 100

            return {
              timestamp: timestamp.toISOString(),
              date: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              portfolioValue: equity,
              equity: equity,
              profitLoss,
              profitLossPercent
            }
          })

          setPerformanceData(formattedData)

          const initial = formattedData[0]?.portfolioValue || 0
          const current = formattedData[formattedData.length - 1]?.portfolioValue || 0
          const returnValue = current - initial
          const returnPercent = initial > 0 ? (returnValue / initial) * 100 : 0

          setInitialValue(initial)
          setCurrentValue(current)
          setTotalReturn(returnValue)
          setTotalReturnPercent(returnPercent)
        } else {
          // Fallback to current metrics if no historical data
          const mockData: PerformanceDataPoint[] = [
            {
              timestamp: new Date().toISOString(),
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              portfolioValue: metrics.portfolioValue,
              equity: metrics.equity,
              profitLoss: metrics.totalPnL,
              profitLossPercent: 0
            }
          ]
          setPerformanceData(mockData)
          setCurrentValue(metrics.portfolioValue)
          setInitialValue(metrics.portfolioValue - metrics.totalPnL)
          setTotalReturn(metrics.totalPnL)
          setTotalReturnPercent(0)
        }
      } catch (err) {
        console.error('Failed to fetch performance data:', err)
        setError('Unable to load performance data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPerformanceData()

    // OPTIMIZED: Refresh every 120 seconds instead of 60s
    const interval = setInterval(fetchPerformanceData, 120000)

    return () => clearInterval(interval)
  }, [selectedPeriod, metrics.portfolioValue, metrics.equity, metrics.totalPnL])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isProfitable = data.profitLoss >= 0

      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium mb-2">{data.date}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">Portfolio Value: <span className="text-white font-medium">{formatCurrency(data.portfolioValue)}</span></p>
            <p className="text-gray-300">
              P&L: <span className={`font-medium ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {isProfitable ? '+' : ''}{formatCurrency(data.profitLoss)}
              </span>
            </p>
            <p className="text-gray-300">
              Return: <span className={`font-medium ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(data.profitLossPercent)}
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // PERFORMANCE: Memoize period options to prevent recreation
  const periodOptions = useMemo(() => [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' },
    { value: 'ALL', label: 'ALL' }
  ], [])

  // PERFORMANCE: Memoize computed values
  const isPositive = useMemo(() => totalReturn >= 0, [totalReturn])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
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
          <CardTitle>Portfolio Performance</CardTitle>
          <div className="flex space-x-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value as typeof period)}
                className={`px-3 py-1 text-sm font-medium rounded ${
                  selectedPeriod === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <div className="text-3xl font-bold">{formatCurrency(currentValue)}</div>
            <div className="text-sm text-gray-400">Current Value</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(totalReturn))}
            </div>
            <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercent(totalReturnPercent)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center text-red-500" style={{ height }}>
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={initialValue} stroke="#6b7280" strokeDasharray="3 3" label="Start" />
              <Line
                type="monotone"
                dataKey="portfolioValue"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
                name="Portfolio Value"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Performance Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-400">Starting Value</div>
            <div className="text-lg font-semibold text-white">{formatCurrency(initialValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Total Return</div>
            <div className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(totalReturn)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Return %</div>
            <div className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(totalReturnPercent)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Trades Executed</div>
            <div className="text-lg font-semibold text-blue-400">{metrics.tradesExecuted}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
