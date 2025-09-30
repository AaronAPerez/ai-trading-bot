/**
 * Service Status Card Component
 * Displays individual service health status with metrics
 * @fileoverview Visual indicator for service connectivity and performance
 */

import { Wifi, Activity, WifiOff, Clock } from 'lucide-react'
import React from 'react'

interface ServiceStatusCardProps {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  responseTime?: number
  icon: React.ReactNode
  isReady: boolean
  extraInfo?: string
}

function ServiceStatusCard({
  name,
  status,
  responseTime,
  icon,
  isReady,
  extraInfo
}: ServiceStatusCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'degraded':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'down':
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <Wifi size={12} className="text-green-400" />
      case 'degraded':
        return <Activity size={12} className="text-yellow-400" />
      case 'down':
        return <WifiOff size={12} className="text-red-400" />
      default:
        return <Clock size={12} className="text-gray-400" />
    }
  }

  const getResponseTimeColor = () => {
    if (!responseTime) return 'text-white'
    if (responseTime < 100) return 'text-green-400'
    if (responseTime < 300) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className={`border rounded-lg p-3 transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="opacity-80">
            {icon}
          </div>
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
        {getStatusIcon()}
      </div>

      <div className="text-xs space-y-1">
        <div className="flex justify-between items-center">
          <span className="opacity-70">Status:</span>
          <span className="capitalize font-medium">{status}</span>
        </div>

        {responseTime !== undefined && (
          <div className="flex justify-between items-center">
            <span className="opacity-70">Response:</span>
            <span className={`font-medium ${getResponseTimeColor()}`}>
              {responseTime}ms
            </span>
          </div>
        )}

        {extraInfo && (
          <div className="flex justify-between items-center">
            <span className="opacity-70">Mode:</span>
            <span className="font-medium">{extraInfo}</span>
          </div>
        )}

        {!isReady && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <span className="text-xs opacity-80">Service not ready</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiceStatusCard