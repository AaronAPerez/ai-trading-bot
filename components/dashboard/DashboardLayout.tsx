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
  Shield
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
    { id: 'overview', label: 'Portfolio Overview', icon: TrendingUp, path: '/dashboard' },
    { id: 'trading', label: 'AI Trading', icon: Bot, path: '/trading' },
    { id: 'activity', label: 'Activity', icon: Activity, path: '/activity' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    { id: 'help', label: 'Help', icon: HelpCircle, path: '/help' }
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
          {/* Left section - Logo and mobile menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-gray-700 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Trading Platform
              </h1>
            </div>
          </div>

          {/* Center section - Trading mode indicator */}
          <div className="hidden md:flex items-center">
            <div 
              className={`relative ${tradingModeProps.bgColor} ${tradingModeProps.textColor} px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2 shadow-lg`}
            >
              {/* Pulsing indicator for live trading */}
              {isLiveTrading && (
                <div className={`absolute -left-1 -top-1 w-3 h-3 ${tradingModeProps.pulseColor} rounded-full animate-ping`} />
              )}
              <tradingModeProps.icon size={16} />
              <span>{tradingModeProps.text}</span>
            </div>
          </div>

          {/* Right section - Status indicators and controls */}
          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi size={16} className="text-green-400" />
              ) : (
                <WifiOff size={16} className="text-red-400" />
              )}
              <span className="text-xs text-gray-400">
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Bot status indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <div className="text-xs text-gray-400">
                <div>Bot: {botStatus.isRunning ? 'Active' : 'Stopped'}</div>
                {botStatus.isRunning && (
                  <div>Up: {formatUptime(botStatus.uptime)}</div>
                )}
              </div>
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

        {/* Mobile trading mode indicator */}
        <div className="md:hidden mt-2 flex justify-center">
          <div 
            className={`relative ${tradingModeProps.bgColor} ${tradingModeProps.textColor} px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-2`}
          >
            {isLiveTrading && (
              <div className={`absolute -left-0.5 -top-0.5 w-2 h-2 ${tradingModeProps.pulseColor} rounded-full animate-ping`} />
            )}
            <tradingModeProps.icon size={14} />
            <span>{tradingModeProps.text}</span>
          </div>
        </div>
      </header>

      {/* Main content area with sidebar */}
      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={`
            fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between lg:justify-center">
              <div className="flex items-center space-x-2">
                <Bot size={20} className="text-blue-400" />
                <span className="font-semibold">Trading Bot</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-1 rounded-md hover:bg-gray-700"
                aria-label="Close navigation menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Navigation items */}
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavItemClick(item.path)}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left"
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Bot metrics summary in sidebar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-800">
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Trades Today:</span>
                <span className="text-white">{botStatus.tradesExecuted}</span>
              </div>
              <div className="flex justify-between">
                <span>Success Rate:</span>
                <span className="text-green-400">{(botStatus.successRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Daily P&L:</span>
                <span className={botStatus.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ${botStatus.dailyPnL?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout