// ===============================================
// REACT QUERY CLIENT CONFIGURATION
// lib/queryClient.ts
// ===============================================

import { QueryClient } from '@tanstack/react-query'

/**
 * Global Query Client for React Query
 * Configures default options for all queries and mutations
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data remains fresh for 30 seconds
      staleTime: 30 * 1000,

      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Refetch data when window regains focus
      refetchOnWindowFocus: true,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Retry failed requests once
      retry: 1,

      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on mount if data is still fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,

      // Show error notifications by default
      onError: (error) => {
        console.error('Mutation error:', error)
      },
    },
  },
})

/**
 * Query keys for better type safety and cache management
 */
export const QUERY_KEYS = {
  // Account & Portfolio
  ACCOUNT: 'account',
  POSITIONS: 'positions',
  ORDERS: 'orders',

  // AI & Recommendations
  RECOMMENDATIONS: 'recommendations',
  AI_METRICS: 'ai-metrics',

  // Risk Management
  RISK_ASSESSMENT: 'risk-assessment',
  RISK_REPORT: 'risk-report',

  // Market Data
  MARKET_QUOTE: 'market-quote',
  MARKET_BARS: 'market-bars',
  MARKET_STATUS: 'market-status',

  // Bot Activity
  BOT_METRICS: 'bot-metrics',
  BOT_ACTIVITY: 'bot-activity',
  TRADE_HISTORY: 'trade-history',
} as const