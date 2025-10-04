'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PriceDataPoint {
  timestamp: string
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface PriceChartProps {
  symbol: string
  timeframe?: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day'
  limit?: number
  showVolume?: boolean
  height?: number
}

const formatPrice = (value: number) => `$${value.toFixed(2)}`
const formatVolume = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function PriceChart({
  symbol,
  timeframe = '1Day',
  limit = 100,
  showVolume = true,
  height = 400
}: PriceChartProps) {
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPriceData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const endDate = new Date()
        const startDate = new Date()

        // Calculate start date based on timeframe
        switch (timeframe) {
          case '1Min':
            startDate.setHours(startDate.getHours() - 6) // Last 6 hours
            break
          case '5Min':
            startDate.setDate(startDate.getDate() - 1) // Last 1 day
            break
          case '15Min':
            startDate.setDate(startDate.getDate() - 3) // Last 3 days
            break
          case '1Hour':
            startDate.setDate(startDate.getDate() - 7) // Last 7 days
            break
          case '1Day':
            startDate.setDate(startDate.getDate() - 90) // Last 90 days
            break
        }

        // Fetch via API route instead of direct client access
        const params = new URLSearchParams({
          symbol,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          limit: limit.toString(),
          timeframe
        })

        const response = await fetch(`/api/alpaca/bars?${params}`)
        if (!response.ok) throw new Error('Failed to fetch bars')

        const barsResponse = await response.json()

        if (barsResponse.bars && barsResponse.bars.length > 0) {
          const formattedData = barsResponse.bars.map((bar: any) => ({
            timestamp: bar.t,
            time: formatTime(bar.t),
            open: parseFloat(bar.o),
            high: parseFloat(bar.h),
            low: parseFloat(bar.l),
            close: parseFloat(bar.c),
            volume: parseInt(bar.v)
          }))

          setPriceData(formattedData)
        } else {
          setError('No price data available')
        }
      } catch (err) {
        console.error('Failed to fetch price data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load price data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPriceData()

    // Refresh data based on timeframe
    const refreshInterval = timeframe === '1Min' ? 60000 :
                          timeframe === '5Min' ? 300000 :
                          timeframe === '15Min' ? 900000 :
                          3600000 // 1 hour default

    const interval = setInterval(fetchPriceData, refreshInterval)

    return () => clearInterval(interval)
  }, [symbol, timeframe, limit])

  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].close : 0
  const previousPrice = priceData.length > 1 ? priceData[priceData.length - 2].close : currentPrice
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0
  const isPositive = priceChange >= 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium mb-1">{data.time}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">Open: <span className="text-white font-medium">{formatPrice(data.open)}</span></p>
            <p className="text-gray-300">High: <span className="text-green-400 font-medium">{formatPrice(data.high)}</span></p>
            <p className="text-gray-300">Low: <span className="text-red-400 font-medium">{formatPrice(data.low)}</span></p>
            <p className="text-gray-300">Close: <span className="text-white font-medium">{formatPrice(data.close)}</span></p>
            {showVolume && (
              <p className="text-gray-300">Volume: <span className="text-blue-400 font-medium">{formatVolume(data.volume)}</span></p>
            )}
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
          <CardTitle>{symbol} Price Chart</CardTitle>
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
          <CardTitle>{symbol} Price Chart</CardTitle>
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
          <CardTitle>{symbol} Price Chart</CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatPrice(currentPrice)}</div>
            <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '↑' : '↓'} {formatPrice(Math.abs(priceChange))} ({priceChangePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={formatPrice}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill={`url(#colorPrice-${symbol})`}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {showVolume && priceData.length > 0 && (
          <div style={{ height: 120 }} className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatVolume}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="volume" fill="#3b82f6" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
