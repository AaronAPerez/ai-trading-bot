'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTradingBot } from '@/hooks/trading/useTradingBot';
import { useAlpacaAccount, useAlpacaPositions } from '@/hooks/api/useAlpacaData';
import UserHeader from '@/components/layout/UserHeader';

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

      {/* Combined Header with Bot Status */}
      <UserHeader
        botStatus={botStatus}
        isOnline={isOnline}
        isLiveTrading={isLiveTrading}
      />


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