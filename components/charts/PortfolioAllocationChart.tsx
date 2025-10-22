'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AllocationData {
  symbol: string
  value: number
  percentage: number
  quantity: number
  currentPrice: number
  unrealizedPnL: number
}

interface PortfolioAllocationChartProps {
  height?: number
  showLegend?: boolean
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
]

const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatPercent = (value: number) => `${value.toFixed(1)}%`

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
export const PortfolioAllocationChart = memo(function PortfolioAllocationChart({ height = 400, showLegend = true }: PortfolioAllocationChartProps) {
  const [allocationData, setAllocationData] = useState<AllocationData[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPortfolioData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch via API routes instead of direct client access
        const [accountRes, positionsRes] = await Promise.all([
          fetch('/api/alpaca/account'),
          fetch('/api/alpaca/positions')
        ])

        if (!accountRes.ok || !positionsRes.ok) {
          throw new Error('Failed to fetch portfolio data')
        }

        const accountData = await accountRes.json()
        const positionsData = await positionsRes.json()

        // Extract the actual data from the response
        const account = accountData.data || accountData
        const positions = Array.isArray(positionsData) ? positionsData : (positionsData.data || [])

        if (!positions || positions.length === 0) {
          setError('No positions in portfolio')
          setIsLoading(false)
          return
        }

        const portfolioValue = parseFloat(account.portfolio_value || account.equity || '0')
        setTotalValue(portfolioValue)

        // Calculate allocation for each position
        const allocations: AllocationData[] = positions.map((position: any) => {
          const marketValue = parseFloat(position.market_value || '0')
          const percentage = portfolioValue > 0 ? (marketValue / portfolioValue) * 100 : 0

          return {
            symbol: position.symbol,
            value: marketValue,
            percentage,
            quantity: parseFloat(position.qty || '0'),
            currentPrice: parseFloat(position.current_price || '0'),
            unrealizedPnL: parseFloat(position.unrealized_pl || '0')
          }
        })

        // Sort by value (largest first)
        allocations.sort((a, b) => b.value - a.value)

        setAllocationData(allocations)
      } catch (err) {
        console.error('Failed to fetch portfolio data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load portfolio data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPortfolioData()

    // OPTIMIZED: Refresh every 60 seconds instead of 30s
    const interval = setInterval(fetchPortfolioData, 60000)

    return () => clearInterval(interval)
  }, [])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isProfitable = data.unrealizedPnL >= 0

      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-bold text-lg mb-2">{data.symbol}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">Value: <span className="text-white font-medium">{formatCurrency(data.value)}</span></p>
            <p className="text-gray-300">Allocation: <span className="text-blue-400 font-medium">{formatPercent(data.percentage)}</span></p>
            <p className="text-gray-300">Quantity: <span className="text-white font-medium">{data.quantity.toFixed(2)}</span></p>
            <p className="text-gray-300">Price: <span className="text-white font-medium">{formatCurrency(data.currentPrice)}</span></p>
            <p className="text-gray-300">
              Unrealized P&L: <span className={`font-medium ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {isProfitable ? '+' : ''}{formatCurrency(data.unrealizedPnL)}
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    // Only show label if percentage is > 5%
    if (percent < 0.05) return null

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {payload.map((entry: any, index: number) => {
          const data = allocationData.find(d => d.symbol === entry.value)
          const isProfitable = data ? data.unrealizedPnL >= 0 : true

          return (
            <div key={`legend-${index}`} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{entry.value}</span>
                  <span className="text-gray-400">{data ? formatPercent(data.percentage) : ''}</span>
                </div>
                {data && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{formatCurrency(data.value)}</span>
                    <span className={isProfitable ? 'text-green-500' : 'text-red-500'}>
                      {isProfitable ? '+' : ''}{formatCurrency(data.unrealizedPnL)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-red-500" style={{ height }}>
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Allocation</CardTitle>
          <div className="text-right">
            <div className="text-sm text-gray-400">Total Value</div>
            <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={height * 0.35}
              fill="#8884d8"
              dataKey="value"
              nameKey="symbol"
            >
              {allocationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend content={<CustomLegend />} />}
          </PieChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-400">Positions</div>
            <div className="text-lg font-semibold text-white">{allocationData.length}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Largest Position</div>
            <div className="text-lg font-semibold text-blue-400">
              {allocationData.length > 0 ? formatPercent(allocationData[0].percentage) : '0%'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Total Unrealized P&L</div>
            <div className={`text-lg font-semibold ${
              allocationData.reduce((sum, d) => sum + d.unrealizedPnL, 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(allocationData.reduce((sum, d) => sum + d.unrealizedPnL, 0))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
