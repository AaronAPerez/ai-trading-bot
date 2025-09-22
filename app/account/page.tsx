// app/account/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AccountDashboard() {
  const [account, setAccount] = useState<any>(null)

  useEffect(() => {
    // Replace with API call
    setAccount({
      account_number: 'PA321X2UFKUZ',
      status: 'ACTIVE',
      portfolio_value: 2000.97,
      equity: 2000.97,
      last_equity: 2000,
      cash: 1230.1,
      buying_power: 3231.07,
      non_marginable_buying_power: 1230.1,
      options_buying_power: 1615.53,
      created_at: '2025-09-22T17:14:39.247707Z',
      pattern_day_trader: false,
      shorting_enabled: true,
      trading_blocked: false,
      options_trading_level: 3,
      currency: 'USD',
    })
  }, [])

  if (!account) return <div>Loading...</div>

  const buyingPowerData = [
    { name: 'Cash', value: account.cash },
    { name: 'Options', value: account.options_buying_power },
    { name: 'Non-Marginable', value: account.non_marginable_buying_power },
  ]

  const equityHistory = [
    { date: '2025-09-19', equity: 2000 },
    { date: '2025-09-20', equity: 1985 },
    { date: '2025-09-21', equity: 1995 },
    { date: '2025-09-22', equity: account.equity },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Top Snapshot */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="text-sm text-gray-500">Account</h2>
          <p className="text-lg font-bold">{account.account_number}</p>
          <span className={`px-2 py-1 text-xs rounded ${account.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {account.status}
          </span>
        </div>
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="text-sm text-gray-500">Portfolio Value</h2>
          <p className="text-lg font-bold">${account.portfolio_value}</p>
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={equityHistory}>
              <Line type="monotone" dataKey="equity" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="text-sm text-gray-500">Cash / Buying Power</h2>
          <p className="text-lg font-bold">${account.cash}</p>
          <p className="text-xs text-gray-500">Buying Power: ${account.buying_power}</p>
        </div>
      </div>

      {/* Middle Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="font-semibold mb-2">Equity Over Time</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equityHistory}>
              <Line type="monotone" dataKey="equity" stroke="#10B981" strokeWidth={2} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="font-semibold mb-2">Buying Power Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={buyingPowerData} dataKey="value" nameKey="name" outerRadius={80} label>
                {buyingPowerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Detail Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="font-semibold mb-2">Trading Permissions</h2>
          <span className={`px-2 py-1 text-xs rounded ${account.pattern_day_trader ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            PDT: {account.pattern_day_trader ? 'Yes' : 'No'}
          </span>
          <div className="mt-2">Options Level: {account.options_trading_level}</div>
          <div>Shorting: {account.shorting_enabled ? 'Enabled' : 'Disabled'}</div>
        </div>
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="font-semibold mb-2">Flags</h2>
          <p>Trading Blocked: {account.trading_blocked ? 'Yes' : 'No'}</p>
        </div>
        <div className="bg-gray-700 shadow rounded p-4">
          <h2 className="font-semibold mb-2">Meta</h2>
          <p>Currency: {account.currency}</p>
          <p>Created: {new Date(account.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}