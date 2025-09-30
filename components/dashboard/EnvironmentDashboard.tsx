/**
 * Environment Dashboard Integration Component
 * Shows environment health status in the main trading dashboard
 * @fileoverview Real-time environment monitoring for trading dashboard
 */

'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Settings, 
  RefreshCw,
  Database,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { useEnvironmentChecker } from '@/hooks/useEnvironmentChecker'
import EnvironmentLoadingState from './EnvironmentLoadingState'
import ServiceStatusCard from './ServiceStatusCard'

export default function EnvironmentDashboard() {
  const [showDetails, setShowDetails] = useState(false)
  const env = useEnvironmentChecker({
    checkInterval: 30000, // Check every 30 seconds
    enableHealthCheck: true,
    enablePerformanceMonitoring: true
  })

  if (!env.isInitialized) {
    return <EnvironmentLoadingState />
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            env.isHealthy 
              ? 'bg-green-500/20 text-green-400' 
              : env.error 
              ? 'bg-red-500/20 text-red-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {env.isHealthy ? (
              <CheckCircle size={16} />
            ) : env.error ? (
              <XCircle size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">Environment Status</h3>
            <p className="text-sm text-gray-400">
              {env.isHealthy ? 'All systems operational' : 'Issues detected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={env.revalidate}
            disabled={env.isValidating}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw 
              size={16} 
              className={`text-gray-400 ${env.isValidating ? 'animate-spin' : ''}`} 
            />
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Settings size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <ServiceStatusCard
          name="Alpaca API"
          status={env.getServiceStatus('alpaca')}
          responseTime={env.performance.alpacaResponseTime}
          icon={<TrendingUp size={16} />}
          isReady={env.isAlpacaReady()}
        />
        
        <ServiceStatusCard
          name="Supabase"
          status={env.getServiceStatus('supabase')}
          responseTime={env.performance.supabaseResponseTime}
          icon={<Database size={16} />}
          isReady={env.isSupabaseReady()}
        />
        
        <ServiceStatusCard
          name="Trading Ready"
          status={env.tradingReadiness.ready ? 'healthy' : 'down'}
          icon={<Shield size={16} />}
          isReady={env.tradingReadiness.ready}
          extraInfo={env.tradingMode === 'paper' ? 'Paper Trading' : 'Live Trading'}
        />
      </div>

      {/* Trading Readiness Banner */}
      {env.tradingReadiness.ready ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-green-400 font-medium">Ready for Trading</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              {env.tradingMode.toUpperCase()}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle size={16} className="text-red-400" />
            <span className="text-red-400 font-medium">Trading Not Ready</span>
          </div>
          <p className="text-sm text-gray-300 mb-2">{env.tradingReadiness.reason}</p>
          {env.tradingReadiness.issues.length > 0 && (
            <ul className="text-xs text-red-300 space-y-1">
              {env.tradingReadiness.issues.map((issue, index) => (
                <li key={index} className="flex items-center space-x-1">
                  <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-4">
          {/* Environment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Configuration</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Environment:</span>
                  <span className="text-white">{env.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trading Mode:</span>
                  <span className={`${
                    env.tradingMode === 'paper' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {env.tradingMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Check:</span>
                  <span className="text-white">
                    {env.health.lastChecked?.toLocaleTimeString() || 'Never'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Performance</h4>
              <div className="space-y-1 text-xs">
                {env.performance.alpacaResponseTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Alpaca API:</span>
                    <span className="text-white">{env.performance.alpacaResponseTime}ms</span>
                  </div>
                )}
                {env.performance.supabaseResponseTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Supabase:</span>
                    <span className="text-white">{env.performance.supabaseResponseTime}ms</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Services:</span>
                  <span className="text-white">
                    {Object.values(env.health.services).filter(s => s === 'healthy').length}/
                    {Object.values(env.health.services).length} Healthy
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues and Warnings */}
          {env.health.issues.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center space-x-2">
                <AlertTriangle size={14} />
                <span>Issues ({env.health.issues.length})</span>
              </h4>
              <div className="space-y-2">
                {env.health.issues.map((issue, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${
                        issue.severity === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></span>
                      <span className="text-gray-300 font-medium">{issue.service}</span>
                    </div>
                    <p className="text-gray-400 ml-4">{issue.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation History */}
          {env.validationResult && (
            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Validation Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 mb-1">Services Checked:</div>
                  <div className="space-y-1">
                    {env.validationResult.services.map((service, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          service.status === 'connected' ? 'bg-green-400' : 
                          service.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                        }`}></div>
                        <span className="text-white">{service.name}</span>
                        {service.responseTime && (
                          <span className="text-gray-400">({service.responseTime}ms)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Status Summary:</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valid:</span>
                      <span className={env.validationResult.valid ? 'text-green-400' : 'text-red-400'}>
                        {env.validationResult.valid ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Issues:</span>
                      <span className="text-white">{env.validationResult.issues.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Warnings:</span>
                      <span className="text-white">{env.validationResult.warnings.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {env.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle size={16} className="text-red-400" />
            <span className="text-red-400 font-medium">Environment Error</span>
          </div>
          <p className="text-sm text-red-300 mb-2">{env.error}</p>
          <button
            onClick={env.revalidate}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded transition-colors"
          >
            Retry Validation
          </button>
        </div>
      )}
    </div>
  )
}
