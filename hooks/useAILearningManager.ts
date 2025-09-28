"use client"

import { useState, useCallback, useEffect } from 'react'
import { aiLearningService } from '@/lib/services/AILearningService'

interface AILearningManagerState {
  isRunning: boolean
  isStarting: boolean
  isStopping: boolean
  error: string | null
  lastUpdate: Date | null
  learningStats: {
    totalCycles: number
    tradesProcessed: number
    accuracy: number
    patternsIdentified: number
  }
}

export const useAILearningManager = () => {
  const [state, setState] = useState<AILearningManagerState>({
    isRunning: false,
    isStarting: false,
    isStopping: false,
    error: null,
    lastUpdate: null,
    learningStats: {
      totalCycles: 0,
      tradesProcessed: 0,
      accuracy: 0,
      patternsIdentified: 0
    }
  })

  // Start AI learning service
  const startLearning = useCallback(async () => {
    if (state.isStarting || state.isRunning) return

    setState(prev => ({ ...prev, isStarting: true, error: null }))

    try {
      console.log('🚀 Starting AI Learning Service...')
      await aiLearningService.start()

      setState(prev => ({
        ...prev,
        isRunning: true,
        isStarting: false,
        lastUpdate: new Date()
      }))

      console.log('✅ AI Learning Service started successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start learning'
      console.error('❌ Failed to start AI learning:', errorMessage)

      setState(prev => ({
        ...prev,
        isStarting: false,
        error: errorMessage
      }))
    }
  }, [state.isStarting, state.isRunning])

  // Stop AI learning service
  const stopLearning = useCallback(async () => {
    if (state.isStopping || !state.isRunning) return

    setState(prev => ({ ...prev, isStopping: true, error: null }))

    try {
      console.log('🛑 Stopping AI Learning Service...')
      await aiLearningService.stop()

      setState(prev => ({
        ...prev,
        isRunning: false,
        isStopping: false,
        lastUpdate: new Date()
      }))

      console.log('✅ AI Learning Service stopped successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop learning'
      console.error('❌ Failed to stop AI learning:', errorMessage)

      setState(prev => ({
        ...prev,
        isStopping: false,
        error: errorMessage
      }))
    }
  }, [state.isStopping, state.isRunning])

  // Get current status
  const getStatus = useCallback(() => {
    return {
      canStart: !state.isRunning && !state.isStarting,
      canStop: state.isRunning && !state.isStopping,
      isActive: state.isRunning,
      statusText: state.isRunning
        ? 'Learning Active'
        : state.isStarting
        ? 'Starting...'
        : state.isStopping
        ? 'Stopping...'
        : 'Stopped'
    }
  }, [state])

  // Update stats periodically when learning is active
  useEffect(() => {
    if (!state.isRunning) return

    const updateStats = () => {
      // Get stats from learning service (if available)
      const status = aiLearningService.getStatus()

      setState(prev => ({
        ...prev,
        learningStats: {
          totalCycles: status.totalCycles || prev.learningStats.totalCycles,
          tradesProcessed: status.tradesProcessed || prev.learningStats.tradesProcessed,
          accuracy: status.currentAccuracy || prev.learningStats.accuracy,
          patternsIdentified: status.patternsIdentified || prev.learningStats.patternsIdentified
        },
        lastUpdate: status.lastUpdate ? new Date(status.lastUpdate) : prev.lastUpdate
      }))
    }

    // Update stats every 30 seconds when active
    const interval = setInterval(updateStats, 30000)

    // Initial update
    updateStats()

    return () => clearInterval(interval)
  }, [state.isRunning])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    ...state,
    status: getStatus(),

    // Actions
    startLearning,
    stopLearning,
    clearError,

    // Utils
    isActive: state.isRunning,
    canToggle: !state.isStarting && !state.isStopping
  }
}