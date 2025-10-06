"use client"

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { useAlpacaAccount, useAlpacaPositions, usePortfolioHistory } from '@/hooks/api/useAlpacaData'
import { AlertCircle, TrendingUp, TrendingDown, Activity, PieChartIcon } from 'lucide-react'

interface PortfolioChartProps {
  refreshInterval?: number
}

const COLORS = {
  stocks: '#3b82f6',    // blue
  crypto: '#f59e0b',    // amber
  options: '#8b5cf6',   // purple
  cash: '#10b981',      // green
  long: '#22c55e',      // green
  short: '#ef4444'      // red
}

export default function PortfolioChart({ refreshInterval = 5000 }: PortfolioChartProps) {
  const { data: account, isLoading: accountLoading } = useAlpacaAccount(refreshInterval)
  const { data: positionsResponse, isLoading: positionsLoading } = useAlpacaPositions(refreshInterval)
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | 'ALL'>('1D')
  const { data: portfolioHistory, isLoading: historyLoading } = usePortfolioHistory(timeRange, refreshInterval)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (!portfolioHistory || !portfolioHistory.timestamp) return

    // Parse Alpaca portfolio history data
    const timestamps = portfolioHistory.timestamp || []
    const equity = portfolioHistory.equity || []
    const profitLoss = portfolioHistory.profit_loss || []
    const profitLossPct = portfolioHistory.profit_loss_pct || []

    const dataPoints = timestamps.map((timestamp: number, index: number) => {
      const date = new Date(timestamp * 1000)
      return {
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: timeRange === '1D' ? '2-digit' : undefined,
          hour12: true
        }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        equity: equity[index] || 0,
        profitLoss: profitLoss[index] || 0,
        profitLossPct: (profitLossPct[index] || 0) * 100,
        timestamp: date.toISOString()
      }
    })

    setChartData(dataPoints)
  }, [portfolioHistory, timeRange])

  const isLoading = accountLoading || positionsLoading || historyLoading

  if (isLoading && chartData.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  const positions = positionsResponse?.data || []
  const equity = parseFloat(account?.equity || '0')
  const cash = parseFloat(account?.cash || '0')
  const equityPrevClose = parseFloat(account?.equity_previous_close || account?.equityPreviousClose || equity)
  const dailyChange = equity - equityPrevClose
  const dailyChangePercent = equityPrevClose > 0 ? (dailyChange / equityPrevClose) * 100 : 0
  const isPositive = dailyChange >= 0

  // Calculate asset breakdown
  const assetBreakdown: { [key: string]: number } = {
    stocks: 0,
    crypto: 0,
    options: 0,
    cash: cash
  }

  positions.forEach((pos: any) => {
    const symbol = pos.symbol || ''
    const marketValue = parseFloat(pos.market_value || pos.marketValue || '0')

    // Determine asset class
    if (symbol.includes('/')) {
      // Crypto (e.g., BTC/USD, ETH/USD)
      assetBreakdown.crypto += marketValue
    } else if (symbol.length > 5 || pos.asset_class === 'option') {
      // Options (longer symbols or explicit option class)
      assetBreakdown.options += marketValue
    } else {
      // Stocks
      assetBreakdown.stocks += marketValue
    }
  })

  // Prepare pie chart data for asset types
  const assetTypeData = Object.entries(assetBreakdown)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value,
      percentage: (value / equity) * 100
    }))

  // Calculate position sides
  const positionSides: { [key: string]: number } = {
    long: 0,
    short: 0
  }

  positions.forEach((pos: any) => {
    const marketValue = Math.abs(parseFloat(pos.market_value || pos.marketValue || '0'))
    const side = pos.side || 'long'

    if (side === 'short') {
      positionSides.short += marketValue
    } else {
      positionSides.long += marketValue
    }
  })

  // Prepare pie chart data for position sides
  const positionSidesData = Object.entries(positionSides)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value,
      percentage: (value / (positionSides.long + positionSides.short)) * 100
    }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
          <div className="text-xs text-gray-400 mb-2">{payload[0].payload.date}</div>
          <div className="text-xs text-gray-400 mb-2">{payload[0].payload.time}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-xs text-blue-400">Equity:</span>
              <span className="text-sm font-bold text-white">
                ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {payload[0].payload.profitLoss !== undefined && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-xs text-purple-400">P&L:</span>
                <span className={`text-sm font-medium ${payload[0].payload.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {payload[0].payload.profitLoss >= 0 ? '+' : ''}${payload[0].payload.profitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({payload[0].payload.profitLossPct >= 0 ? '+' : ''}{payload[0].payload.profitLossPct.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
          <div className="text-sm font-bold text-white mb-1">{payload[0].name}</div>
          <div className="text-xs text-gray-400">
            ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-400">
            {payload[0].payload.percentage.toFixed(1)}%
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Portfolio Performance</h2>
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-bold text-white">
              ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center space-x-1 text-sm font-medium ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {isPositive ? '+' : ''}${Math.abs(dailyChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span>({isPositive ? '+' : ''}{dailyChangePercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {['1D', '1W', '1M', '3M', 'ALL'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Main Portfolio Chart */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEquity)"
              name="Total Equity"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Types Pie Chart */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Asset Allocation</h3>
          </div>
          {assetTypeData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={assetTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {assetTypeData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[item.name.toLowerCase() as keyof typeof COLORS] }}
                      ></div>
                      <span className="text-xs text-gray-300">{item.name}</span>
                    </div>
                    <div className="text-xs font-bold text-white">
                      ${item.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <PieChartIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-sm">No positions to display</div>
            </div>
          )}
        </div>

        {/* Position Sides Pie Chart */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold text-white">Position Sides</h3>
          </div>
          {positionSidesData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={positionSidesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {positionSidesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {positionSidesData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[item.name.toLowerCase() as keyof typeof COLORS] }}
                      ></div>
                      <span className="text-xs text-gray-300">{item.name}</span>
                    </div>
                    <div className="text-xs font-bold text-white">
                      ${item.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <PieChartIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-sm">No positions to display</div>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Positions</span>
          </div>
          <div className="text-lg font-bold text-white">{positions.length}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Day High</span>
          </div>
          <div className="text-lg font-bold text-green-400">
            ${chartData.length > 0 ? Math.max(...chartData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">Day Low</span>
          </div>
          <div className="text-lg font-bold text-red-400">
            ${chartData.length > 0 ? Math.min(...chartData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
      </div>
    </div>
  )
}
