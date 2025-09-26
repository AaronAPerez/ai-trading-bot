
// ===============================================
// BOT CONFIGURATION STORE SLICE
// src/store/slices/botSlice.ts
// ===============================================

import { BotConfiguration, BotMetrics } from "@/types/trading"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

interface BotState {
  config: BotConfiguration | null
  metrics: BotMetrics
  activityLogs: Array<{
    id: string
    timestamp: Date
    type: 'trade' | 'recommendation' | 'system' | 'error'
    message: string
    details?: string
  }>
  engineStatus: 'INITIALIZING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  isInitializing: boolean
  error: string | null
  lastActivity: Date | null
}

interface BotActions {
  startBot: (config: BotConfiguration) => Promise<void>
  stopBot: () => Promise<void>
  updateConfig: (updates: Partial<BotConfiguration>) => void
  updateMetrics: (metrics: Partial<BotMetrics>) => void
  addActivity: (activity: Omit<BotState['activityLogs'][0], 'id' | 'timestamp'>) => void
  clearLogs: () => void
  setError: (error: string | null) => void
  getPerformanceStats: () => {
    totalTrades: number
    winRate: number
    avgExecutionTime: number
    profitFactor: number
  }
}

export type BotStore = BotState & BotActions

const initialBotState: BotState = {
  config: null,
  metrics: {
    isRunning: false,
    uptime: 0,
    tradesExecuted: 0,
    recommendationsGenerated: 0,
    successRate: 0,
    totalPnL: 0,
    dailyPnL: 0,
    riskScore: 0
  },
  activityLogs: [],
  engineStatus: 'STOPPED',
  isInitializing: false,
  error: null,
  lastActivity: null
}

export const useBotStore = create<BotStore>()(
  subscribeWithSelector(
    immer<BotStore>((set, get) => ({
      ...initialBotState,

      startBot: async (config) => {
        set((state) => {
          state.isInitializing = true
          state.error = null
        })

        try {
          const response = await fetch('/api/bot/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to start bot')
          }

          const result = await response.json()

          set((state) => {
            state.config = config
            state.engineStatus = 'RUNNING'
            state.metrics.isRunning = true
            state.isInitializing = false
            state.lastActivity = new Date()
          })

          // Add start activity
          get().addActivity({
            type: 'system',
            message: `Trading bot started in ${config.mode} mode`,
            details: `Strategies: ${config.strategies.map(s => s.name).join(', ')}`
          })

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to start bot'
            state.isInitializing = false
            state.engineStatus = 'ERROR'
          })
          throw error
        }
      },

      stopBot: async () => {
        try {
          const response = await fetch('/api/bot/stop', { method: 'POST' })
          
          if (!response.ok) {
            throw new Error('Failed to stop bot')
          }

          set((state) => {
            state.engineStatus = 'STOPPED'
            state.metrics.isRunning = false
            state.lastActivity = new Date()
          })

          // Add stop activity
          get().addActivity({
            type: 'system',
            message: 'Trading bot stopped',
            details: `Total uptime: ${Math.floor(get().metrics.uptime / 60)}m`
          })

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to stop bot'
          })
          throw error
        }
      },

      updateConfig: (updates) =>
        set((state) => {
          if (state.config) {
            Object.assign(state.config, updates)
          }
        }),

      updateMetrics: (metrics) =>
        set((state) => {
          Object.assign(state.metrics, metrics)
          state.lastActivity = new Date()
        }),

      addActivity: (activity) =>
        set((state) => {
          const newActivity = {
            ...activity,
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
          }
          
          state.activityLogs.unshift(newActivity)
          
          // Keep only last 500 activities
          if (state.activityLogs.length > 500) {
            state.activityLogs = state.activityLogs.slice(0, 500)
          }
          
          state.lastActivity = new Date()
        }),

      clearLogs: () =>
        set((state) => {
          state.activityLogs = []
        }),

      setError: (error) =>
        set((state) => {
          state.error = error
          if (error) {
            get().addActivity({
              type: 'error',
              message: `Bot Error: ${error}`
            })
          }
        }),

      getPerformanceStats: () => {
        const { metrics, activityLogs } = get()
        
        const tradeLogs = activityLogs.filter(log => log.type === 'trade')
        const totalTrades = tradeLogs.length
        
        // Calculate win rate (simplified - would need actual P&L data)
        const winRate = metrics.successRate
        
        // Calculate average execution time (simplified)
        const avgExecutionTime = tradeLogs.length > 0 ? 1500 : 0 // ms
        
        // Calculate profit factor (simplified)
        const profitFactor = metrics.totalPnL > 0 ? 1.2 : 0.8
        
        return {
          totalTrades,
          winRate,
          avgExecutionTime,
          profitFactor
        }
      }
    }))
  )
)
