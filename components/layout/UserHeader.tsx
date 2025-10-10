/**
 * UserHeader Component - Fully Responsive Production Version
 * Mobile-first responsive design with optimized layouts for all screen sizes
 * 
 * Responsive Breakpoints:
 * - xs: 0-639px (mobile portrait)
 * - sm: 640-767px (mobile landscape)
 * - md: 768-1023px (tablet)
 * - lg: 1024-1279px (small desktop)
 * - xl: 1280-1535px (desktop)
 * - 2xl: 1536px+ (large desktop)
 * 
 * @author AI Trading Bot Team
 * @version 4.0.0 - Fully Responsive Design
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Brain, 
  LayoutDashboard, 
  TrendingUp, 
  ListOrdered, 
  Target,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Activity,
  BarChart3,
  Shield,
  Sliders,
  History,
  User,
  TrendingDown,
  Loader2,
  Wallet
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils/formatters'
import { useQuery } from '@tanstack/react-query'
import { useBotStore } from '@/store/slices/botSlice'

// ===============================================
// TYPES & INTERFACES
// ===============================================

interface NavigationItem {
  id: string
  label: string
  path: string
  icon: any
  description?: string
  badge?: string
  mobileOnly?: boolean
}

interface AlpacaAccount {
  portfolio_value: string
  equity: string
  last_equity: string
  cash: string
  buying_power: string
  account_number: string
  status: string
}

interface Position {
  symbol: string
  qty: string
  market_value: string
  current_price: string
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export const UserHeader = () => {
  const pathname = usePathname()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Get bot status from Zustand store
  const botMetrics = useBotStore((state) => state.metrics)

  // Fetch real account data from Alpaca API using React Query
  const { 
    data: accountData, 
    isLoading: accountLoading,
    error: accountError,
    refetch: refetchAccount
  } = useQuery<AlpacaAccount>({
    queryKey: ['account'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) {
        throw new Error('Failed to fetch account data')
      }
      const data = await response.json()
      return data.account || data
    },
    refetchInterval: 30000,
    staleTime: 20000,
    retry: 2,
    retryDelay: 1000
  })

  // Fetch real positions data using React Query
  const { 
    data: positionsData,
    isLoading: positionsLoading
  } = useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca?action=positions')
      if (!response.ok) {
        throw new Error('Failed to fetch positions')
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    refetchInterval: 10000,
    staleTime: 5000,
    retry: 2
  })

  // Fetch user profile from Supabase
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          return { email: 'user@tradingbot.com', full_name: 'Trading User' }
        }
        return response.json()
      } catch (error) {
        return { email: 'user@tradingbot.com', full_name: 'Trading User' }
      }
    },
    staleTime: 300000,
    retry: 1
  })

  // Navigation items - optimized for different screen sizes
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview and metrics'
    },
    {
      id: 'trading',
      label: 'Trading',
      path: '/trading',
      icon: TrendingUp,
      description: 'Live trading interface'
    },
    {
      id: 'strategies',
      label: 'Strategies',
      path: '/strategies',
      icon: Sliders,
      description: 'Configure trading strategies',
      badge: 'New'
    },
    {
      id: 'positions',
      label: 'Positions',
      path: '/positions',
      icon: Target,
      description: 'Current positions'
    },
    {
      id: 'orders',
      label: 'Orders',
      path: '/orders',
      icon: ListOrdered,
      description: 'Order history'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      description: 'Performance analytics',
      badge: 'New'
    },
    {
      id: 'risk',
      label: 'Risk',
      path: '/risk',
      icon: Shield,
      description: 'Risk management',
      badge: 'New'
    },
    {
      id: 'backtest',
      label: 'Backtest',
      path: '/backtest',
      icon: History,
      description: 'Strategy backtesting',
      badge: 'New'
    },
    {
      id: 'activity',
      label: 'Activity',
      path: '/activity',
      icon: Activity,
      description: 'Bot activity logs'
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      description: 'Configuration'
    }
  ]

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false)
    setShowUserMenu(false)
  }, [pathname])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showMobileMenu])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/auth/signin'
    } catch (error) {
      console.error('Sign out failed:', error)
      window.location.href = '/auth/signin'
    }
  }

  // Get user initials
  const getInitials = (name: string): string => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Calculate real P&L from Alpaca account data
  const portfolioValue = accountData?.portfolio_value ? parseFloat(accountData.portfolio_value) : 0
  const equity = accountData?.equity ? parseFloat(accountData.equity) : 0
  const lastEquity = accountData?.last_equity ? parseFloat(accountData.last_equity) : equity
  const dayPnL = equity - lastEquity
  const dayPnLPercent = lastEquity > 0 ? ((dayPnL / lastEquity) * 100) : 0
  const cash = accountData?.cash ? parseFloat(accountData.cash) : 0
  const buyingPower = accountData?.buying_power ? parseFloat(accountData.buying_power) : 0
  const positionCount = Array.isArray(positionsData) ? positionsData.length : 0

  return (
    <>
      <header className="bg-gradient-to-r from-gray-900/95 to-indigo-900/35 border-b border-gray-700/50 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-16">
            
            {/* ============================================= */}
            {/* LOGO & BRAND - Responsive sizing */}
            {/* ============================================= */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity group"
                aria-label="AI Trading Bot Dashboard"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-cyan-500/50 transition-shadow">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white leading-tight">
                    AI Trading Bot
                  </h1>
                  <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">
                    Paper Trading
                  </p>
                </div>
              </Link>
            </div>

            {/* ============================================= */}
            {/* DESKTOP NAVIGATION - Hidden on mobile/tablet */}
            {/* ============================================= */}
            <nav className="hidden xl:flex items-center space-x-0.5 lg:space-x-1" role="navigation">
              {navigationItems.map((item) => {
                const isActive = pathname === item.path || 
                               (item.path !== '/dashboard' && pathname.startsWith(item.path))
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`relative flex items-center space-x-1.5 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                    title={item.description}
                    aria-label={item.description}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] px-1 lg:px-1.5 py-0.5 rounded-full font-bold shadow-lg animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* ============================================= */}
            {/* ACCOUNT INFO - Responsive display */}
            {/* ============================================= */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3 xl:space-x-4">
              
              {/* Compact metrics for medium screens */}
              <div className="hidden md:flex lg:hidden items-center space-x-2">
                {accountLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : accountData && (
                  <>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white flex items-center">
                        <Wallet className="w-3 h-3 mr-1 text-gray-400" />
                        {formatCurrency(portfolioValue, 0)}
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dayPnL >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayPnL), 0)}
                    </div>
                  </>
                )}
              </div>

              {/* Full metrics for large screens */}
              <div className="hidden lg:flex items-center space-x-3 xl:space-x-4">
                {/* Portfolio Value */}
                {accountLoading ? (
                  <div className="text-right animate-pulse">
                    <div className="h-3 w-16 lg:w-20 bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 w-20 lg:w-24 bg-gray-700 rounded"></div>
                  </div>
                ) : accountError ? (
                  <div className="text-right">
                    <div className="text-xs text-red-400">Error</div>
                    <button 
                      onClick={() => refetchAccount()}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Retry
                    </button>
                  </div>
                ) : accountData ? (
                  <div className="text-right">
                    <div className="text-[10px] lg:text-xs text-gray-400">Portfolio</div>
                    <div className="text-xs lg:text-sm font-bold text-white">
                      {formatCurrency(portfolioValue)}
                    </div>
                  </div>
                ) : null}

                {/* Day P&L */}
                {!accountLoading && !accountError && accountData && (
                  <div className="text-right">
                    <div className="text-[10px] lg:text-xs text-gray-400">Day P&L</div>
                    <div className={`text-xs lg:text-sm font-bold flex items-center ${
                      dayPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {dayPnL >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-0.5" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-0.5" aria-hidden="true" />
                      )}
                      <span className="hidden xl:inline">
                        {dayPnL >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayPnL))}
                      </span>
                      <span className="text-[10px] ml-1">
                        ({dayPnL >= 0 ? '+' : ''}{formatPercent(dayPnLPercent, 1)})
                      </span>
                    </div>
                  </div>
                )}

                {/* Positions Count */}
                {positionsLoading ? (
                  <div className="text-right animate-pulse hidden xl:block">
                    <div className="h-3 w-12 bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 w-8 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <div className="text-right hidden xl:block">
                    <div className="text-[10px] lg:text-xs text-gray-400">Positions</div>
                    <div className="text-xs lg:text-sm font-bold text-white">
                      {positionCount}
                    </div>
                  </div>
                )}

                {/* Bot Status */}
                <div className="text-right hidden xl:block">
                  <div className="text-[10px] lg:text-xs text-gray-400">Bot</div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${
                      botMetrics.isRunning 
                        ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' 
                        : 'bg-gray-500'
                    }`} aria-hidden="true"></div>
                    <span className={`text-xs lg:text-sm font-semibold ${
                      botMetrics.isRunning ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {botMetrics.isRunning ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Menu Button */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1.5 lg:space-x-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {getInitials(userProfile?.full_name || userProfile?.email || 'User')}
                  </div>
                  <ChevronDown 
                    className={`w-3 h-3 lg:w-4 lg:h-4 text-gray-400 transition-transform hidden lg:block ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Desktop User Dropdown */}
                {showUserMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-56 sm:w-64 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-semibold text-white truncate">
                        {userProfile?.full_name || 'Trading User'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {userProfile?.email || 'user@tradingbot.com'}
                      </p>
                    </div>

                    {/* Account Summary */}
                    {accountData && !accountLoading && (
                      <div className="px-4 py-3 border-b border-gray-700 bg-gray-700/30">
                        <h3 className="text-xs font-semibold text-gray-300 mb-2">Account Summary</h3>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Cash</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(cash)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Buying Power</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(buyingPower)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Positions</span>
                            <span className="text-white font-semibold">
                              {positionCount}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Mode</span>
                            <span className="text-yellow-400 font-semibold flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1 animate-pulse"></span>
                              Paper
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="py-2" role="none">
                      <Link
                        href="/settings"
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                        onClick={() => setShowUserMenu(false)}
                        role="menuitem"
                      >
                        <Settings className="w-4 h-4" aria-hidden="true" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        href="/settings/profile"
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                        onClick={() => setShowUserMenu(false)}
                        role="menuitem"
                      >
                        <User className="w-4 h-4" aria-hidden="true" />
                        <span>Profile</span>
                      </Link>
                      <hr className="my-2 border-gray-700" role="none" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-700/50 hover:text-red-300 transition-colors text-left"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================= */}
            {/* MOBILE/TABLET MENU BUTTON */}
            {/* ============================================= */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden xl:flex p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors touch-manipulation active:scale-95"
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============================================= */}
      {/* MOBILE/TABLET FULLSCREEN MENU */}
      {/* ============================================= */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">AI Trading Bot</h2>
                    <p className="text-xs text-gray-400">Menu</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Account Summary Card */}
              {accountData && !accountLoading && (
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl">
                  <h3 className="text-sm font-semibold text-white mb-3">Account Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Portfolio</div>
                      <div className="text-base sm:text-lg font-bold text-white">
                        {formatCurrency(portfolioValue, 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Day P&L</div>
                      <div className={`text-base sm:text-lg font-bold ${dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {dayPnL >= 0 ? '+' : ''}{formatCurrency(dayPnL, 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Positions</div>
                      <div className="text-base sm:text-lg font-bold text-white">
                        {positionCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Bot Status</div>
                      <div className={`text-base sm:text-lg font-bold flex items-center ${botMetrics.isRunning ? 'text-green-400' : 'text-gray-400'}`}>
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${botMetrics.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                        {botMetrics.isRunning ? 'On' : 'Off'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="space-y-1 mb-6" role="navigation">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.path || 
                                 (item.path !== '/dashboard' && pathname.startsWith(item.path))
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.id}
                      href={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center justify-between p-4 rounded-xl text-base font-medium transition-all touch-manipulation active:scale-98 ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                        <div className="text-left">
                          <div className="font-semibold">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500">{item.description}</div>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* User Section */}
              <div className="pt-6 border-t border-gray-700/50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg text-base">
                    {getInitials(userProfile?.full_name || userProfile?.email || 'User')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {userProfile?.full_name || 'Trading User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {userProfile?.email || 'user@tradingbot.com'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/settings"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-2 p-3 rounded-lg text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/settings/profile"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-2 p-3 rounded-lg text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4" aria-hidden="true" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors touch-manipulation active:scale-98"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span className="font-semibold">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default UserHeader