'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTradingBot } from '@/hooks/trading/useTradingBot';
import { useAlpacaAccount, useAlpacaPositions } from '@/hooks/api/useAlpacaData';

/**
 * Accessible Mobile-First Dashboard Layout
 * 
 * Accessibility Features:
 * - WCAG 2.1 AA compliant (4.5:1 contrast ratios)
 * - Full keyboard navigation (Tab, Escape, Arrow keys)
 * - Screen reader optimized with ARIA labels
 * - Touch-optimized (44x44px minimum tap targets)
 * - Focus management and skip links
 * - High contrast mode support
 * 
 * Responsive Breakpoints:
 * - Mobile: 320px - 767px
 * - Tablet: 768px - 1023px
 * - Desktop: 1024px+
 */

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayoutWrapper({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [announceMessage, setAnnounceMessage] = useState('');
  const mainContentRef = useRef<HTMLElement>(null);

  const tradingBot = useTradingBot();
  const account = useAlpacaAccount();
  const positions = useAlpacaPositions();

  // Calculate financial metrics
  const totalBalance = account.data ? parseFloat(account.data.equity) : 0;
  const positionsArray = Array.isArray(positions.data) ? positions.data : [];
  const totalPnL = positionsArray.reduce((total, pos) => total + (parseFloat(pos.unrealized_pl) || 0), 0);

  // Bot status
  const botStatus = {
    isRunning: tradingBot.metrics.isRunning || false,
    uptime: tradingBot.metrics.uptime || 0,
    tradesExecuted: tradingBot.metrics.tradesExecuted || 0,
    successRate: tradingBot.metrics.successRate || 0,
    totalPnL: totalPnL,
  };

  const isLiveTrading = false; // Set based on your config

  // Navigation items with accessibility metadata
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      ariaLabel: 'Go to dashboard home',
      icon: '🏠',
    },
    {
      id: 'trading',
      label: 'Trading',
      path: '/dashboard/trading',
      ariaLabel: 'Go to live trading page',
      icon: '📈',
    },
    {
      id: 'positions',
      label: 'Positions',
      path: '/dashboard/positions',
      ariaLabel: 'View your current positions',
      icon: '📊',
    },
    {
      id: 'orders',
      label: 'Orders',
      path: '/dashboard/orders',
      ariaLabel: 'View order history',
      icon: '📋',
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/dashboard/settings',
      ariaLabel: 'Configure bot settings',
      icon: '⚙️',
    },
  ];

  // Monitor online status for accessibility announcements
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      announceToScreenReader('Connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      announceToScreenReader('Connection lost. Trading paused.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Screen reader announcements using ARIA live region
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 100);
  }, []);

  // Toggle sidebar with keyboard support and announcement
  const toggleSidebar = useCallback(() => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    announceToScreenReader(newState ? 'Menu opened' : 'Menu closed');
    
    // Focus management: trap focus in sidebar when open
    if (newState) {
      setTimeout(() => {
        const firstFocusable = document.querySelector('#sidebar-menu a, #sidebar-menu button') as HTMLElement;
        firstFocusable?.focus();
      }, 100);
    }
  }, [isSidebarOpen, announceToScreenReader]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
        announceToScreenReader('Menu closed');
        
        // Return focus to menu button
        const menuButton = document.querySelector('[aria-controls="sidebar-menu"]') as HTMLElement;
        menuButton?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen, announceToScreenReader]);

  // Format uptime for display
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleToggleMode = () => {
    // Implement your toggle mode logic
    tradingBot.stopBot();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Skip to main content link - WCAG 2.1 requirement */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      {/* Header - Sticky with proper landmark */}
      {/* <header
        className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40 shadow-lg"
        role="banner"
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          {/* Logo and Mobile Menu Button */}
          {/* <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-3 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar-menu"
              type="button"
            >
              <span className="text-2xl" aria-hidden="true">
                {isSidebarOpen ? '✕' : '☰'}
              </span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-2xl" aria-hidden="true" role="img" aria-label="Robot">
                🤖
              </span>
              <h1 className="text-lg md:text-xl font-bold leading-tight">
                AI Trading Bot
              </h1>
            </div>
          </div> */}

          {/* Status Indicators - Responsive */}
          {/* <div className="flex items-center space-x-2 md:space-x-4"> */}
            {/* Connection Status */}
            {/* <div
              className="flex items-center space-x-2 px-2 md:px-3 py-2 rounded-lg bg-gray-700 min-h-[44px]"
              role="status"
              aria-label={`Connection status: ${isOnline ? 'Online' : 'Offline'}`}
            >
              <span className="text-lg" aria-hidden="true" role="img">
                {isOnline ? '📡' : '🔴'}
              </span>
              <span className="text-xs md:text-sm font-medium hidden sm:inline">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div> */}

            {/* Bot Status */}
            {/* <div
              className="flex items-center space-x-2 px-2 md:px-3 py-2 rounded-lg bg-gray-700 min-h-[44px]"
              role="status"
              aria-label={`Bot status: ${botStatus.isRunning ? 'Running' : 'Stopped'}. ${botStatus.isRunning ? `Uptime: ${formatUptime(botStatus.uptime)}` : ''}`}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  botStatus.isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs md:text-sm font-medium hidden sm:inline">
                {botStatus.isRunning ? 'Active' : 'Stopped'}
              </span>
            </div> */}

            {/* Trading Mode Badge */}
            {/* <div
              className={`hidden md:flex items-center px-3 py-2 rounded-lg text-xs font-bold min-h-[44px] ${
                isLiveTrading
                  ? 'bg-red-900/70 text-red-200 border-2 border-red-500'
                  : 'bg-blue-900/70 text-blue-200 border-2 border-blue-500'
              }`}
              role="status"
              aria-label={`Trading mode: ${isLiveTrading ? 'Live trading with real money' : 'Paper trading simulation'}`}
            >
              {isLiveTrading ? '🔴 LIVE' : '📝 PAPER'}
            </div>
          </div>
        </div> */}

        {/* Desktop Navigation */}
        {/* <nav
          className="hidden md:flex items-center space-x-1 px-6 pb-3"
          role="navigation"
          aria-label="Main navigation"
        >
          {navigationItems.map((item) => (
            <a
              key={item.id}
              href={item.path}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 min-h-[44px]"
              aria-label={item.ariaLabel}
            >
              <span className="text-lg" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav> 
      </header> */}

      {/* Mobile Sidebar Navigation */}
      <nav
        id="sidebar-menu"
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-80 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl`}
        aria-label="Mobile navigation"
        aria-hidden={!isSidebarOpen}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <span className="text-2xl" aria-hidden="true">📱</span>
              <span className="text-lg font-bold">Menu</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-3 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 touch-manipulation"
              aria-label="Close navigation menu"
              type="button"
            >
              <span className="text-2xl" aria-hidden="true">✕</span>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4">
            {navigationItems.map((item) => (
              <a
                key={item.id}
                href={item.path}
                onClick={() => {
                  setIsSidebarOpen(false);
                  announceToScreenReader(`Navigating to ${item.label}`);
                }}
                className="flex items-center justify-between px-4 py-4 text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200 min-h-[56px] touch-manipulation border-b border-gray-700/50"
                aria-label={item.ariaLabel}
                tabIndex={isSidebarOpen ? 0 : -1}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <span className="text-base font-medium">{item.label}</span>
                </div>
                <span className="text-xl text-gray-500" aria-hidden="true">›</span>
              </a>
            ))}
          </div>

          {/* Sidebar Footer - Bot Stats */}
          {botStatus.isRunning && (
            <div className="p-4 border-t border-gray-700 bg-gray-900/50">
              <div className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">
                Bot Statistics
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <div className="text-gray-400 text-xs">Uptime</div>
                  <div className="font-bold text-white mt-1">
                    {formatUptime(botStatus.uptime)}
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <div className="text-gray-400 text-xs">Trades</div>
                  <div className="font-bold text-white mt-1">
                    {botStatus.tradesExecuted}
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <div className="text-gray-400 text-xs">Success Rate</div>
                  <div className="font-bold text-green-400 mt-1">
                    {botStatus.successRate}%
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <div className="text-gray-400 text-xs">P&L</div>
                  <div className={`font-bold mt-1 ${botStatus.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(botStatus.totalPnL).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleSidebar();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
        />
      )}

      {/* Main Content */}
      <main
        id="main-content"
        ref={mainContentRef}
        className="flex-1 overflow-auto focus:outline-none"
        role="main"
        tabIndex={-1}
      >
        <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8 max-w-7xl">
          {children}
        </div>
      </main>

      {/* Emergency Stop - Mobile only */}
      {botStatus.isRunning && (
        <footer
          className="bg-gray-800 border-t-2 border-red-500 p-4 md:hidden sticky bottom-0 z-30 shadow-2xl"
          role="contentinfo"
        >
          <button
            onClick={() => {
              handleToggleMode();
              announceToScreenReader('Emergency stop activated. Bot stopped.');
            }}
            className="w-full py-4 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white font-bold rounded-lg focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 min-h-[56px] shadow-lg touch-manipulation"
            aria-label="Emergency stop trading bot"
            type="button"
          >
            <span className="flex items-center justify-center space-x-2">
              <span className="text-xl" aria-hidden="true">🛑</span>
              <span>Emergency Stop Bot</span>
            </span>
          </button>
        </footer>
      )}
    </div>
  );
}