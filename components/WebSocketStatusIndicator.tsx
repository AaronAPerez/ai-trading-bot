
// ===============================================
// WEBSOCKET STATUS COMPONENT
// ===============================================

import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react'

export const WebSocketStatusIndicator: React.FC = () => {
  const { connectionStatus, healthScore } = useWebSocketMonitoring()

  const getStatusColor = () => {
    if (healthScore >= 80) return 'text-green-400'
    if (healthScore >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = () => {
    if (healthScore >= 80) return <Wifi size={16} />
    if (healthScore >= 50) return <Activity size={16} />
    return <WifiOff size={16} />
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`${getStatusColor()}`}>
        {getStatusIcon()}
      </div>
      <div className="text-xs text-gray-400">
        <div>WebSocket: {healthScore}%</div>
        <div className="flex space-x-1">
          {Object.entries(connectionStatus).map(([key, connected]) => (
            <div
              key={key}
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400' : 'bg-red-400'
              }`}
              title={`${key}: ${connected ? 'Connected' : 'Disconnected'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}