// components/RealDataMonitor.tsx
export function RealDataMonitor() {
  const { data: account } = useAlpacaAccount()
  const { data: positions } = useAlpacaPositions()
  
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="font-bold text-green-800">✅ REAL DATA STATUS</h3>
      
      <div className="mt-2 space-y-1 text-sm">
        <div>
          📊 Data Source: <span className="font-mono">ALPACA_API</span>
        </div>
        <div>
          💰 Real Buying Power: ${account?.buying_power || '0'}
        </div>
        <div>
          📈 Real Positions: {positions?.length || 0}
        </div>
        <div>
          🔄 Last Update: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}