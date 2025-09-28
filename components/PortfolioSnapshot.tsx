'use client'
import { useEffect, useState } from 'react'

export default function PortfolioSnapshot() {
  const [snapshot, setSnapshot] = useState<any>(null)

  useEffect(() => {
    const fetchSnapshot = async () => {
      const res = await fetch('/api/snapshots')
      const json = await res.json()
      if (json.success) setSnapshot(json.snapshot)
    }
    fetchSnapshot()
  }, [])

  if (!snapshot) return <p className="text-slate-400">📡 Fetching market data...</p>

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow text-slate-100 space-y-2">
      <h2 className="text-lg font-semibold">📈 Market Data API</h2>
      <p>Symbol: {snapshot.symbol}</p>
      <p>Current Price: ${snapshot.latestTrade?.p}</p>
      <p>Last Updated: {new Date(snapshot.latestTrade?.t).toLocaleString()}</p>
      <p>Volume: {snapshot.latestQuote?.v}</p>
    </div>
  )
}