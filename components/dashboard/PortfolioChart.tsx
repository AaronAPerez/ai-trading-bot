"use client"

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAlpacaAccount, useAlpacaPositions } from '@/hooks/api/useAlpacaData'
import { AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface PortfolioChartProps {
  refreshInterval?: number
}

export default function PortfolioChart({ refreshInterval = 5000 }: PortfolioChartProps) {
  const { data: account, isLoading: accountLoading } = useAlpacaAccount(refreshInterval)
  const { data: positionsResponse, isLoading: positionsLoading } = useAlpacaPositions(refreshInterval)
  const [chartData, setChartData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | 'ALL'>('1D')

  useEffect(() => {
    if (!account) return

    const equity = parseFloat(account?.equity || '0')
    const equityPrevClose = parseFloat(account?.equity_previous_close || account?.equityPreviousClose || equity)
    const cash = parseFloat(account?.cash || '0')
    const positions = positionsResponse?.data || []
    const totalPositionValue = positions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.market_value || pos.marketValue || '0')
    }, 0)

    // Generate hourly data points for the day (simulated historical data)
    const now = new Date()
    const dataPoints = []
    const hoursToShow = timeRange === '1D' ? 7 : timeRange === '1W' ? 168 : timeRange === '1M' ? 720 : 2160

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9.5 // 9:30 AM
    const marketClose = 16 // 4:00 PM
    const currentHour = now.getHours() + now.getMinutes() / 60

    for (let i = hoursToShow; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000)
      const hour = date.getHours() + date.getMinutes() / 60
      const dayOfWeek = date.getDay()

      // Only show market hours (weekdays 9:30 AM - 4:00 PM)
      const isMarketHours = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= marketOpen && hour <= marketClose

      if (timeRange === '1D' && !isMarketHours) continue

      // Calculate simulated portfolio value with small variations
      const variation = (Math.sin(i / 10) * 0.005) + (Math.random() * 0.002 - 0.001)
      const portfolioValue = equity * (1 + variation)

      dataPoints.push({
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: timeRange === '1D' ? '2-digit' : undefined,
          hour12: true
        }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        equity: portfolioValue,
        cash: cash * (1 + variation * 0.5),
        positions: totalPositionValue * (1 + variation * 1.5),
        timestamp: date.toISOString()
      })
    }

    setChartData(dataPoints)
  }, [account, positionsResponse, timeRange])

  const isLoading = accountLoading || positionsLoading

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  const equity = parseFloat(account?.equity || '0')
  const equityPrevClose = parseFloat(account?.equity_previous_close || account?.equityPreviousClose || equity)
  const dailyChange = equity - equityPrevClose
  const dailyChangePercent = equityPrevClose > 0 ? (dailyChange / equityPrevClose) * 100 : 0
  const isPositive = dailyChange >= 0

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
            {payload[1] && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-xs text-purple-400">Cash:</span>
                <span className="text-sm font-medium text-white">
                  ${payload[1].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {payload[2] && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-xs text-green-400">Positions:</span>
                <span className="text-sm font-medium text-white">
                  ${payload[2].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
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

      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPositions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEquity)"
              name="Total Equity"
            />
            <Area
              type="monotone"
              dataKey="cash"
              stroke="#a855f7"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorCash)"
              name="Cash"
            />
            <Area
              type="monotone"
              dataKey="positions"
              stroke="#10b981"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorPositions)"
              name="Positions Value"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Current Value</span>
          </div>
          <div className="text-lg font-bold text-white">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Day High</span>
          </div>
          <div className="text-lg font-bold text-green-400">
            ${Math.max(...chartData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">Day Low</span>
          </div>
          <div className="text-lg font-bold text-red-400">
            ${Math.min(...chartData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigints: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  )
}
