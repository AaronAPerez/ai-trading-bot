// ===============================================
// DASHBOARD LAYOUT - Main Layout Component
// src/components/layout/DashboardLayout.tsx
// ===============================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Menu,
  X,
  Activity,
  TrendingUp,
  Settings,
  HelpCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Bot,
  Shield,
  PieChart,
  BarChart3,
  Home
} from 'lucide-react'
import type { DashboardLayoutProps, BotMetrics } from '@/types/trading'

/**
 * Main dashboard layout component providing responsive navigation,
 * trading mode indicators, and bot status monitoring
 */
const DashboardLayout = ({
  children,
  isLiveTrading,
  onToggleMode,
  botStatus
}: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()
  

  // Navigation menu items with icons and labels
  const navigationItems = [
    { id: 'trading', label: 'Trading', icon: Bot, path: '/trading' },
    { id: 'positions', label: 'Positions', icon: PieChart, path: '/positions' },
    { id: 'orders', label: 'Orders', icon: BarChart3, path: '/orders' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
  ]

  /**
   * Toggle mobile sidebar visibility
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  /**
   * Handle navigation item click - closes mobile sidebar and navigates
   */
  const handleNavItemClick = (path: string) => {
    setIsSidebarOpen(false)
    router.push(path)
  }

  /**
   * Format bot uptime for display
   */
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  /**
   * Get status color based on bot metrics and connection
   */
  const getStatusColor = (): string => {
    if (!isOnline) return 'bg-red-500'
    if (!botStatus.isRunning) return 'bg-yellow-500'
    if (botStatus.riskScore > 70) return 'bg-orange-500'
    return 'bg-green-500'
  }

  /**
   * Get trading mode display properties
   */
  const getTradingModeProps = () => {
    return isLiveTrading
      ? {
          text: 'LIVE TRADING',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          icon: AlertTriangle,
          pulseColor: 'bg-red-400'
        }
      : {
          text: 'PAPER TRADING',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: Shield,
          pulseColor: 'bg-blue-400'
        }
  }

  const tradingModeProps = getTradingModeProps()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              AI Trading Platform
            </button>
          </div>

          {/* Center section - Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavItemClick(item.path)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors font-medium"
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile navigation menu */}
          <div className="md:hidden">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-700 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Right section - Status indicators and controls */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Trading mode indicator */}
            <div
              className={`relative ${tradingModeProps.bgColor} ${tradingModeProps.textColor} px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-2 shadow-lg`}
            >
              {/* Pulsing indicator for live trading */}
              {isLiveTrading && (
                <div className={`absolute -left-1 -top-1 w-3 h-3 ${tradingModeProps.pulseColor} rounded-full animate-ping`} />
              )}
              <tradingModeProps.icon size={14} />
              <span>{tradingModeProps.text}</span>
            </div>

            {/* Bot status indicator */}
            {/* <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <div className="text-xs text-gray-400">
                <div>Bot: {botStatus.isRunning ? 'Active' : 'Stopped'}</div>
                {botStatus.isRunning && (
                  <div>Up: {formatUptime(botStatus.uptime)}</div>
                )}
              </div>
            </div> */}

            {/* Connection status */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi size={20} className="text-green-400" />
              ) : (
                <WifiOff size={16} className="text-red-400" />
              )}
              {/* <span className="text-xs text-gray-400">
                {isOnline ? 'Connected' : 'Offline'}
              </span> */}
            </div>

            {/* Trading mode toggle switch */}
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${!isLiveTrading ? 'text-blue-400' : 'text-gray-400'}`}>
                Paper
              </span>
              <button
                onClick={onToggleMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isLiveTrading ? 'bg-red-500' : 'bg-blue-500'
                }`}
                title={isLiveTrading ? 'Switch to Paper Trading' : 'Switch to Live Trading'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isLiveTrading ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isLiveTrading ? 'text-red-400' : 'text-gray-400'}`}>
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Mobile navigation dropdown */}
        {isSidebarOpen && (
          <div className="md:hidden mt-2 border-t border-gray-700 pt-2">
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item.path)}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left rounded-lg"
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile status indicators */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex justify-center mb-3">
                <div
                  className={`relative ${tradingModeProps.bgColor} ${tradingModeProps.textColor} px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-2`}
                >
                  {isLiveTrading && (
                    <div className={`absolute -left-0.5 -top-0.5 w-2 h-2 ${tradingModeProps.pulseColor} rounded-full animate-ping`} />
                  )}
                  <tradingModeProps.icon size={12} />
                  <span>{tradingModeProps.text}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                  <span>Bot: {botStatus.isRunning ? 'Active' : 'Stopped'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {isOnline ? (
                    <Wifi size={12} className="text-green-400" />
                  ) : (
                    <WifiOff size={12} className="text-red-400" />
                  )}
                  <span>{isOnline ? 'Connected' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </header>

      {/* Main content - Full width */}
      <main className="overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout