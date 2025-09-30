import { Wifi, Activity, WifiOff, Clock } from "lucide-react"
import React from "react"
import { de } from "zod/v4/locales"

// Service Status Card Component
function ServiceStatusCard({ 
  name, 
  status, 
  responseTime, 
  icon, 
  isReady,
  extraInfo 
}: {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  responseTime?: number
  icon: React.ReactNode
  isReady: boolean
  extraInfo?: string
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'degraded': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'down': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return <Wifi size={12} />
      case 'degraded': return <Activity size={12} />
      case 'down': return <WifiOff size={12} />
      default: return <Clock size={12} />
    }
  }

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
        {getStatusIcon()}
      </div>
      
      <div className="text-xs space-y-1">
        <div className="flex justify-between items-center">
          <span className="opacity-80">Status:</span>
          <span className="capitalize font-medium">{status}</span>
        </div>
        
        {responseTime && (
          <div className="flex justify-between items-center">
            <span className="opacity-80">Response:</span>
            <span>{responseTime}ms</span>
          </div>
        )}
        
        {extraInfo && (
          <div className="flex justify-between items-center">
            <span className="opacity-80">Mode:</span>
            <span>{extraInfo}</span>
          </div>
        )}
    </div>
    </div>
  )
}

export default ServiceStatusCard;