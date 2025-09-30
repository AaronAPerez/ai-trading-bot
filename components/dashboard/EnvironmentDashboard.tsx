/**
 * Environment Dashboard Integration Component
 * Shows environment health status in the main trading dashboard
 * @fileoverview Real-time environment monitoring for trading dashboard
 */

'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  RefreshCw,
  Database,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
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

  // Calculate health metrics
  const healthMetrics = useMemo(() => {
    const totalServices = Object.keys(env.health.services).length
    const healthyServices = Object.values(env.health.services).filter(s => s === 'healthy').length
    const criticalIssues = env.health.issues.filter(i => i.severity === 'error').length
    const warnings = env.health.issues.filter(i => i.severity === 'warning').length

    return {
      totalServices,
      healthyServices,
      criticalIssues,
      warnings,
      healthPercentage: totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0
    }
  }, [env.health.services, env.health.issues])

  if (!env.isInitialized) {
    return <EnvironmentLoadingState />
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            env.isHealthy
              ? 'bg-green-500/20 text-green-400'
              : env.error
              ? 'bg-red-500/20 text-red-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {env.isHealthy ? (
              <CheckCircle size={20} />
            ) : env.error ? (
              <XCircle size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Environment Status</h3>
            <p className="text-sm text-gray-400">
              {env.isHealthy
                ? `All systems operational (${healthMetrics.healthPercentage}%)`
                : `${healthMetrics.criticalIssues} critical issue${healthMetrics.criticalIssues !== 1 ? 's' : ''} detected`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={env.revalidate}
            disabled={env.isValidating}
            className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh environment status"
          >
            <RefreshCw
              size={18}
              className={`text-gray-400 ${env.isValidating ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all flex items-center space-x-1"
            aria-label={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
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
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-green-400 font-medium">Ready for Trading</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-medium">
                {env.tradingMode.toUpperCase()}
              </span>
              {env.health.lastChecked && (
                <span className="text-xs text-green-400/70">
                  Updated {env.health.lastChecked.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 transition-all">
          <div className="flex items-center space-x-2 mb-3">
            <XCircle size={18} className="text-red-400" />
            <span className="text-red-400 font-semibold text-base">Trading Not Ready</span>
          </div>
          <p className="text-sm text-gray-300 mb-3 pl-6">{env.tradingReadiness.reason}</p>
          {env.tradingReadiness.issues.length > 0 && (
            <ul className="text-xs text-red-300 space-y-2 pl-6">
              {env.tradingReadiness.issues.map((issue, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Summary Stats Bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-400">{healthMetrics.healthyServices}</div>
              <div className="text-xs text-gray-400">Healthy</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-300">{healthMetrics.totalServices}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-400">{healthMetrics.criticalIssues}</div>
              <div className="text-xs text-gray-400">Critical</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-yellow-400">{healthMetrics.warnings}</div>
              <div className="text-xs text-gray-400">Warnings</div>
            </div>
          </div>

          {/* Environment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Settings size={14} className="mr-2" />
                Configuration
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Environment:</span>
                  <span className="text-white font-medium px-2 py-1 bg-white/5 rounded">
                    {env.environment}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trading Mode:</span>
                  <span className={`font-medium px-2 py-1 rounded ${
                    env.tradingMode === 'paper'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {env.tradingMode.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last Check:</span>
                  <span className="text-white">
                    {env.health.lastChecked?.toLocaleTimeString() || 'Never'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                <TrendingUp size={14} className="mr-2" />
                Performance
              </h4>
              <div className="space-y-2 text-xs">
                {env.performance.alpacaResponseTime !== undefined ? (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Alpaca API:</span>
                    <span className={`font-medium ${
                      env.performance.alpacaResponseTime < 100 ? 'text-green-400' :
                      env.performance.alpacaResponseTime < 300 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {env.performance.alpacaResponseTime}ms
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Alpaca API:</span>
                    <span className="text-gray-500">Not measured</span>
                  </div>
                )}
                {env.performance.supabaseResponseTime !== undefined ? (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Supabase:</span>
                    <span className={`font-medium ${
                      env.performance.supabaseResponseTime < 100 ? 'text-green-400' :
                      env.performance.supabaseResponseTime < 300 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {env.performance.supabaseResponseTime}ms
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Supabase:</span>
                    <span className="text-gray-500">Not measured</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-gray-400">Service Health:</span>
                  <span className="text-white font-medium">
                    {healthMetrics.healthyServices}/{healthMetrics.totalServices}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues and Warnings */}
          {env.health.issues.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center space-x-2">
                <AlertTriangle size={16} />
                <span>Active Issues ({env.health.issues.length})</span>
              </h4>
              <div className="space-y-3">
                {env.health.issues.map((issue, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        issue.severity === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></span>
                      <span className="text-white font-semibold text-xs">{issue.service}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        issue.severity === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {issue.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs ml-5">{issue.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation History */}
          {env.validationResult && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Shield size={14} className="mr-2" />
                Validation Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 mb-2 font-medium">Services Checked:</div>
                  <div className="space-y-2">
                    {env.validationResult.services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            service.status === 'connected' ? 'bg-green-400' :
                            service.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></div>
                          <span className="text-white capitalize">{service.name}</span>
                        </div>
                        {service.responseTime && (
                          <span className="text-gray-400">({service.responseTime}ms)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-2 font-medium">Status Summary:</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span className="text-gray-400">Valid:</span>
                      <span className={`font-semibold ${
                        env.validationResult.valid ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {env.validationResult.valid ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span className="text-gray-400">Issues:</span>
                      <span className={`font-semibold ${
                        env.validationResult.issues.length > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {env.validationResult.issues.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span className="text-gray-400">Warnings:</span>
                      <span className={`font-semibold ${
                        env.validationResult.warnings.length > 0 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {env.validationResult.warnings.length}
                      </span>
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2 mb-3">
            <XCircle size={18} className="text-red-400" />
            <span className="text-red-400 font-semibold text-base">Environment Error</span>
          </div>
          <p className="text-sm text-red-300 mb-3 pl-6">{env.error}</p>
          <div className="flex items-center space-x-2 pl-6">
            <button
              onClick={env.revalidate}
              disabled={env.isValidating}
              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {env.isValidating ? 'Retrying...' : 'Retry Validation'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
