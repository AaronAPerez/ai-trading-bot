/**
 * WeightDistributionChart - Pie chart showing strategy weight distribution
 * Uses real strategy data from Supabase
 */

'use client'

import { BotStrategy } from '@/types/trading'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface WeightDistributionChartProps {
  strategies: BotStrategy[]
}

const COLORS: Record<string, string> = {
  MOMENTUM: '#3B82F6',
  MEAN_REVERSION: '#10B981',
  ENHANCED_MEAN_REVERSION: '#8B5CF6',
  BREAKOUT: '#F59E0B',
  TECHNICAL: '#6366F1'
}

export function WeightDistributionChart({ strategies }: WeightDistributionChartProps) {
  // Transform strategy data for Recharts
  const chartData = strategies
    .filter(s => s.enabled && s.weight > 0)
    .map(s => ({
      name: s.name,
      value: s.weight * 100, // Convert to percentage
      type: s.type,
      color: COLORS[s.type] || '#6B7280'
    }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No strategies enabled</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '0.5rem',
              padding: '0.5rem'
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium">Distribution Summary:</p>
        <ul className="mt-2 space-y-1">
          {chartData.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}: {item.value.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
