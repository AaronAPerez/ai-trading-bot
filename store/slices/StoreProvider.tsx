'use client';
// ===============================================
// COMBINED STORE PROVIDER
// src/store/StoreProvider.tsx
// ===============================================
import React, { useEffect } from 'react'
import { useAIStore } from './aiSlice'
import { useBotStore } from './botSlice'
import { useMarketStore } from './marketSlice'
import { usePortfolioStore } from './portfolioSlice'

interface StoreProviderProps {
  children: React.ReactNode
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const portfolioStore = usePortfolioStore()
  const aiStore = useAIStore()
  const botStore = useBotStore()
  const marketStore = useMarketStore()

  useEffect(() => {
    // Initialize only essential stores on mount
    const initializeStores = async () => {
      try {
        // Initialize portfolio data (essential for balance display)
        await portfolioStore.refreshPortfolio()

        // Do NOT auto-initialize AI recommendations on page load
        // They will be loaded only when the AI bot is started or when explicitly requested
        console.log('📦 Store initialization complete - AI recommendations will load when bot is active')

        // Set up WebSocket connections for real-time data (optional)
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
          try {
            // Initialize market data WebSocket only if WS_URL is configured
            const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL)

            ws.onopen = () => {
              console.log('🔌 WebSocket connected')
              marketStore.setConnectionStatus('connected')
              // Subscribe to watchlist symbols
              marketStore.watchlist.forEach(symbol => {
                ws.send(JSON.stringify({ type: 'subscribe', symbol }))
              })
            }

            ws.onmessage = (event) => {
              const data = JSON.parse(event.data)
              if (data.type === 'price_update') {
                marketStore.updatePrice(data.symbol, data.price, data.change)
              }
            }

            ws.onclose = () => {
              console.log('🔌 WebSocket disconnected')
              marketStore.setConnectionStatus('disconnected')
            }

            ws.onerror = (error) => {
              console.warn('⚠️ WebSocket error (non-critical):', error)
              marketStore.setConnectionStatus('disconnected')
            }

            // Cleanup on unmount
            return () => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.close()
              }
            }
          } catch (error) {
            console.warn('⚠️ WebSocket connection not available (using polling instead):', error)
            marketStore.setConnectionStatus('disconnected')
          }
        } else {
          console.log('📡 WebSocket disabled - using HTTP polling for market data')
          marketStore.setConnectionStatus('disconnected')
        }

      } catch (error) {
        console.error('Failed to initialize stores:', error)
      }
    }

    initializeStores()
  }, [])

  return <>{children}</>
}

// ===============================================
// STORE SELECTORS
// ===============================================

// Portfolio selectors
export const usePortfolioMetrics = () => {
  const portfolioStore = usePortfolioStore()
  return portfolioStore.calculateMetrics()
}

// AI selectors
export const useHighConfidenceRecommendations = (minConfidence = 80) => {
  const aiStore = useAIStore()
  return aiStore.getHighConfidenceRecommendations(minConfidence)
}

// Bot selectors
export const useBotPerformance = () => {
  const botStore = useBotStore()
  return botStore.getPerformanceStats()
}

// Market selectors
export const useWatchlistPrices = () => {
  const marketStore = useMarketStore()
  return marketStore.watchlist.map(symbol => ({
    symbol,
    price: marketStore.getLatestPrice(symbol),
    change: marketStore.getPriceChange(symbol)
  }))
}