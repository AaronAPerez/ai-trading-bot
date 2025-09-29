
// ===============================================
// ENVIRONMENT STATUS COMPONENT
// ===============================================
import React from "react"
import { useEnvironmentChecker } from "@/hooks/useEnvironmentChecker"

export function EnvironmentStatusIndicator() {
  const env = useEnvironmentChecker()

  if (!env.isInitialized) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
        <span className="text-sm">Validating environment...</span>
      </div>
    )
  }

  if (env.error) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
        <span className="text-sm">Environment Error</span>
        <button 
          onClick={env.revalidate}
          className="text-xs underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const statusColor = env.isHealthy ? 'green' : 'yellow'
  const statusText = env.isHealthy ? 'Ready' : 'Issues Detected'

  return (
    <div className={`flex items-center space-x-2 text-${statusColor}-600`}>
      <div className={`h-2 w-2 bg-${statusColor}-500 rounded-full ${env.isHealthy ? '' : 'animate-pulse'}`}></div>
      <span className="text-sm">{statusText}</span>
      {env.tradingReadiness.ready && (
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          Trading Ready
        </span>
      )}
    </div>
  )
}