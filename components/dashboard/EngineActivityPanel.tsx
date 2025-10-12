'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function EngineActivityPanel() {
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['engineActivity'],
    queryFn: async () => {
      const res = await fetch('/api/engine/activity')
      if (!res.ok) throw new Error('Failed to fetch activity logs')
      return await res.json()
    },
    refetchInterval: 15000
  })

  const filtered = data?.filter((log: any) => {
    return (
      (!filter || log.message.toLowerCase().includes(filter.toLowerCase())) &&
      (!statusFilter || log.status === statusFilter) &&
      (!typeFilter || log.type === typeFilter)
    )
  })

  return (
    <div className="mt-6 bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-md">
      <h2 className="text-white font-semibold mb-4">🧠 Engine Activity Log</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="🔍 Search message or symbol"
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="system">System</option>
          <option value="risk">Risk</option>
          <option value="trade">Trade</option>
          <option value="info">Info</option>
        </select>
        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="error">Error</option>
        </select>
      </div>

      {error ? (
        <div className="text-red-400">Error loading activity logs</div>
      ) : isLoading ? (
        <div className="animate-pulse bg-gray-700 h-24 rounded-lg"></div>
      ) : (
        <ul className="space-y-3">
          {filtered?.map((log: any) => (
            <li key={log.id} className="text-sm text-gray-300 border-b border-gray-700 pb-2">
              <div className="flex justify-between">
                <span className="text-white font-semibold">{log.type.toUpperCase()}</span>
                <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <div className="text-gray-200">{log.message}</div>
              <div className={`text-xs mt-1 ${log.status === 'completed' ? 'text-green-400' : log.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                Status: {log.status}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}