"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/store/authStore'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User,
  LogOut,
  Settings,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Bell,
  Brain,
  Home,
  PieChart,
  BarChart3,
  Activity,
  Menu,
  X
} from 'lucide-react'

interface AlpacaAccount {
  account_number: string
  portfolio_value: string
  buying_power: string
  cash: string
  day_trade_buying_power: string
  regt_buying_power: string
  long_market_value: string
  short_market_value: string
  equity: string
  last_equity: string
  multiplier: string
  currency: string
  accrued_fees: string
  pending_transfer_out: string
  pending_transfer_in: string
  pattern_day_trader: boolean
  trade_suspended_by_user: boolean
  trading_blocked: boolean
  transfers_blocked: boolean
  account_blocked: boolean
  created_at: string
  shorting_enabled: boolean
  long_market_value_change: string
  percent_change: string
  daychange: string
  daychange_percent: string
}

interface BotStatus {
  isRunning: boolean
  uptime: number
  tradesExecuted: number
  successRate: number
  totalPnL: number
}

interface UserHeaderProps {
  botStatus?: BotStatus
  isOnline?: boolean
  isLiveTrading?: boolean
}

export default function UserHeader({ botStatus, isOnline = true, isLiveTrading = false }: UserHeaderProps) {
  const { user, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Navigation menu items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'trading', label: 'AI Trading', icon: Activity, path: '/dashboard/trading' },
    // { id: 'positions', label: 'Positions', icon: PieChart, path: '/positions' },
    { id: 'orders', label: 'Orders', icon: BarChart3, path: '/orders' },
    // { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ]

  // Handle click outside to close dropdown and mobile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setShowMobileMenu(false)
      }
    }

    if (showDropdown || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDropdown, showMobileMenu])

  // Fetch Alpaca account data
  const { data: accountResponse, isLoading } = useQuery({
    queryKey: ['alpaca-account'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) throw new Error('Failed to fetch account data')
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!user, // Only fetch if user is authenticated
  })

  // Extract account data from the response
  const accountData = accountResponse?.success ? accountResponse.data : null

  const formatCurrency = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Number(amount))
  }

  const formatPercentage = (percent: string | number | undefined) => {
    const num = Number(percent)
    if (isNaN(num)) return '+0.00%'
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
  }

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // Navigation will be handled by middleware
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  if (!user) return null

  return (
    <header className="bg-gradient-to-r from-gray-900/90 to-blue-900/30 border-b border-gray-700/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">AI Trading Bot</h1>
                {/* <p className="text-xs text-gray-400">Powered by Alpaca API</p> */}
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Account Info & User Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Connection Status */}
            {/* <div className="hidden sm:flex items-center space-x-2 px-2 md:px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <span className="text-sm" aria-hidden="true">
                {isOnline ? '📡' : '🔴'}
              </span>
              <span className="text-xs md:text-sm font-medium text-gray-300 hidden md:inline">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div> */}

            {/* Bot Status */}
            {/* {botStatus && (
              <div className="hidden sm:flex items-center space-x-2 px-2 md:px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div
                  className={`w-2 h-2 rounded-full ${
                    botStatus.isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span className="text-xs md:text-sm font-medium text-gray-300 hidden md:inline">
                  {botStatus.isRunning ? 'Active' : 'Stopped'}
                </span>
              </div>
            )} */}

            {/* Trading Mode Badge */}
            <div
              className={`hidden lg:flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                isLiveTrading
                  ? 'bg-red-900/50 text-red-300 border border-red-500/50'
                  : 'bg-blue-900/50 text-blue-300 border border-blue-500/50'
              }`}
            >
              {isLiveTrading ? '🔴 LIVE' : '📝 PAPER'}
            </div>

            {/* Portfolio Value - Desktop only */}
            {accountData && !isLoading && (
              <div className="hidden lg:flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Portfolio</div>
                  <div className="text-sm font-bold text-white">
                    {formatCurrency(accountData.portfolio_value)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-400">Day P&L</div>
                  <div className={`text-sm font-bold flex items-center ${
                    Number(accountData.dayPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {Number(accountData.dayPnL || 0) >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {formatCurrency(accountData.dayPnL || 0)}
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="hidden lg:flex items-center space-x-4">
                <div className="animate-pulse">
                  <div className="h-3 w-20 bg-gray-700 rounded mb-1"></div>
                  <div className="h-4 w-24 bg-gray-700 rounded"></div>
                </div>
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors hidden sm:block">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(user.email || '')}
                </div>
                {/* <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-white">{user.email}</div>
                  <div className="text-xs text-gray-400">Trader</div>
                </div> */}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-30">
                  <div className="p-4 border-b border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(user.email || '')}
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.email}</div>
                        <div className="text-sm text-gray-400">
                          Member since {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Summary for Mobile */}
                  {accountData && (
                    <div className="p-4 border-b border-gray-700/50 md:hidden">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Portfolio</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(accountData.portfolio_value)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Day P&L</span>
                          <span className={
                            Number(accountData.dayPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }>
                            {formatCurrency(accountData.dayPnL || 0)}
                            ({formatPercentage(accountData.dayReturn ? accountData.dayReturn * 100 : 0)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Account #</span>
                          <span className="text-white font-mono text-sm">
                            {accountData.account_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                      <span>Trading Settings</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors">
                      <DollarSign className="w-4 h-4" />
                      <span>Account Details</span>
                    </button>
                  </div>

                  <div className="p-2 border-t border-gray-700/50">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-700/50 bg-gray-900/95 backdrop-blur-xl">
            <nav className="px-4 py-3 space-y-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Mobile Account Summary */}
            {accountData && (
              <div className="px-4 py-3 border-t border-gray-700/50">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Portfolio</span>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(accountData.portfolio_value)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Day P&L</span>
                    <span className={`text-sm font-bold flex items-center ${
                      Number(accountData.dayPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {Number(accountData.dayPnL || 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {formatCurrency(accountData.dayPnL || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Account #</span>
                    <span className="text-xs font-mono text-white">
                      {accountData.account_number}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Bot Status */}
            {botStatus && botStatus.isRunning && (
              <div className="px-4 py-3 border-t border-gray-700/50">
                <div className="text-xs text-gray-400 mb-2 font-semibold uppercase">Bot Statistics</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Uptime</div>
                    <div className="text-sm font-bold text-white">{formatUptime(botStatus.uptime)}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Trades</div>
                    <div className="text-sm font-bold text-white">{botStatus.tradesExecuted}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Success</div>
                    <div className="text-sm font-bold text-green-400">{botStatus.successRate}%</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">P&L</div>
                    <div className={`text-sm font-bold ${botStatus.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${Math.abs(botStatus.totalPnL).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}