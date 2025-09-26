// ===============================================
// AI RECOMMENDATIONS HOOKS - Client Integration  
// src/hooks/useAIRecommendations.ts
// ===============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAIStore, useBotWebSocket } from '@/hooks/useWebSocket'
import type { AIRecommendation } from '@/types/trading'

// ===============================================
// MAIN AI RECOMMENDATIONS HOOK
// ===============================================

/**
 * Comprehensive hook for managing AI recommendations
 */
export const useAIRecommendations = (options?: {
  autoRefresh?: boolean
  refreshInterval?: number
  minConfidence?: number
  maxResults?: number
  symbols?: string[]
}) => {
  const queryClient = useQueryClient()
  const { sendRecommendationFeedback } = useBotWebSocket()
  
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    minConfidence = 60,
    maxResults = 15,
    symbols
  } = options || {}

  // ============ FETCH RECOMMENDATIONS ============
  
  const {
    data: recommendationsData,
    isLoading,
    error,
    refetch: refreshRecommendations
  } = useQuery({
    queryKey: ['ai-recommendations', { minConfidence, maxResults, symbols }],
    queryFn: async () => {
      const params = new URLSearchParams({
        minConfidence: minConfidence.toString(),
        limit: maxResults.toString()
      })
      
      if (symbols && symbols.length > 0) {
        params.append('symbols', symbols.join(','))
      }

      const response = await fetch(`/api/ai-recommendations?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch recommendations')
      }

      return response.json()
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 15000, // Consider data stale after 15 seconds
  })

  const recommendations = recommendationsData?.data?.recommendations || []
  const summary = recommendationsData?.data?.summary || {}

  // ============ GENERATE NEW RECOMMENDATIONS ============
  
  const generateRecommendationMutation = useMutation({
    mutationFn: async (params?: { symbol?: string; forceRefresh?: boolean }) => {
      const response = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generate',
          symbol: params?.symbol,
          forceRefresh: params?.forceRefresh
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate recommendations')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })
    }
  })

  // ============ SINGLE SYMBOL ANALYSIS ============
  
  const analyzeSymbolMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'analyze',
          symbol: symbol.toUpperCase()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze symbol')
      }

      return response.json()
    }
  })

  // ============ EXECUTE RECOMMENDATION ============
  
  const executeRecommendationMutation = useMutation({
    mutationFn: async (recommendation: AIRecommendation) => {
      // First validate the recommendation is still valid
      const validationResponse = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'validate',
          recommendationId: recommendation.id
        })
      })

      const validationData = await validationResponse.json()
      if (!validationData.data?.isValid) {
        throw new Error('Recommendation is no longer valid')
      }

      // Execute the trade via trading API
      const executeResponse = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: recommendation.symbol,
          action: recommendation.action,
          recommendationId: recommendation.id,
          confidence: recommendation.confidence
        })
      })

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json()
        throw new Error(errorData.error || 'Failed to execute recommendation')
      }

      const result = await executeResponse.json()
      
      // Send feedback via WebSocket
      sendRecommendationFeedback(recommendation.id, true, result)
      
      return result
    },
    onSuccess: (data, recommendation) => {
      console.log(`✅ Executed recommendation for ${recommendation.symbol}`)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    },
    onError: (error, recommendation) => {
      console.error(`❌ Failed to execute recommendation for ${recommendation.symbol}:`, error)
      // Send failure feedback
      sendRecommendationFeedback(recommendation.id, false, { error: error.message })
    }
  })

  // ============ RECOMMENDATION FEEDBACK ============
  
  const sendFeedbackMutation = useMutation({
    mutationFn: async (feedback: {
      recommendationId: string
      type: 'executed' | 'rejected' | 'expired'
      result?: 'profit' | 'loss' | 'pending'
      notes?: string
    }) => {
      const response = await fetch('/api/ai-recommendations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'feedback',
          recommendationId: feedback.recommendationId,
          feedback
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send feedback')
      }

      return response.json()
    }
  })

  // ============ HELPER FUNCTIONS ============

  const generateSingle = useCallback((symbol: string) => {
    return generateRecommendationMutation.mutateAsync({ symbol })
  }, [generateRecommendationMutation])

  const generateAll = useCallback((forceRefresh = false) => {
    return generateRecommendationMutation.mutateAsync({ forceRefresh })
  }, [generateRecommendationMutation])

  const analyzeSymbol = useCallback((symbol: string) => {
    return analyzeSymbolMutation.mutateAsync(symbol)
  }, [analyzeSymbolMutation])

  const executeRecommendation = useCallback((recommendation: AIRecommendation) => {
    return executeRecommendationMutation.mutateAsync(recommendation)
  }, [executeRecommendationMutation])

  const sendFeedback = useCallback((feedback: Parameters<typeof sendFeedbackMutation.mutateAsync>[0]) => {
    return sendFeedbackMutation.mutateAsync(feedback)
  }, [sendFeedbackMutation])

  const rejectRecommendation = useCallback((recommendationId: string, reason?: string) => {
    return sendFeedback({
      recommendationId,
      type: 'rejected',
      notes: reason
    })
  }, [sendFeedback])

  // ============ FILTERED RECOMMENDATIONS ============

  const filteredRecommendations = recommendations.filter((rec: AIRecommendation) => {
    // Filter by confidence
    if (rec.confidence < minConfidence) return false
    
    // Filter by symbols if specified
    if (symbols && symbols.length > 0 && !symbols.includes(rec.symbol)) return false
    
    // Filter out expired recommendations
    if (new Date(rec.expiresAt) <= new Date()) return false
    
    return true
  })

  // ============ GROUPED RECOMMENDATIONS ============

  const groupedRecommendations = filteredRecommendations.reduce((groups: Record<string, AIRecommendation[]>, rec: AIRecommendation) => {
    if (!groups[rec.action]) {
      groups[rec.action] = []
    }
    groups[rec.action].push(rec)
    return groups
  }, {})

  // ============ STATISTICS ============

  const statistics = {
    total: filteredRecommendations.length,
    buySignals: groupedRecommendations.BUY?.length || 0,
    sellSignals: groupedRecommendations.SELL?.length || 0,
    highConfidence: filteredRecommendations.filter((r: AIRecommendation) => r.confidence >= 80).length,
    averageConfidence: filteredRecommendations.length > 0 
      ? Math.round(filteredRecommendations.reduce((sum: number, r: AIRecommendation) => sum + r.confidence, 0) / filteredRecommendations.length)
      : 0,
    averageAIScore: filteredRecommendations.length > 0
      ? Math.round(filteredRecommendations.reduce((sum: number, r: AIRecommendation) => sum + r.aiScore, 0) / filteredRecommendations.length)
      : 0
  }

  return {
    // Data
    recommendations: filteredRecommendations,
    groupedRecommendations,
    summary,
    statistics,
    
    // Loading states
    isLoading,
    isGenerating: generateRecommendationMutation.isPending,
    isAnalyzing: analyzeSymbolMutation.isPending,
    isExecuting: executeRecommendationMutation.isPending,
    
    // Errors
    error,
    generateError: generateRecommendationMutation.error,
    analyzeError: analyzeSymbolMutation.error,
    executeError: executeRecommendationMutation.error,
    
    // Actions
    refreshRecommendations,
    generateSingle,
    generateAll,
    analyzeSymbol,
    executeRecommendation,
    sendFeedback,
    rejectRecommendation,
    
    // Utilities
    lastUpdated: recommendationsData?.data?.generatedAt
  }
}

// ===============================================
// RECOMMENDATION FILTERING HOOK
// ===============================================

/**
 * Hook for advanced recommendation filtering and sorting
 */
export const useRecommendationFilters = (recommendations: AIRecommendation[]) => {
  const [filters, setFilters] = useState({
    action: 'ALL' as 'ALL' | 'BUY' | 'SELL',
    minConfidence: 60,
    maxRisk: 50,
    symbols: [] as string[],
    sortBy: 'confidence' as 'confidence' | 'aiScore' | 'timestamp' | 'symbol',
    sortDirection: 'desc' as 'asc' | 'desc'
  })

  const filteredAndSorted = recommendations
    .filter(rec => {
      if (filters.action !== 'ALL' && rec.action !== filters.action) return false
      if (rec.confidence < filters.minConfidence) return false
      if (rec.riskScore > filters.maxRisk) return false
      if (filters.symbols.length > 0 && !filters.symbols.includes(rec.symbol)) return false
      return true
    })
    .sort((a, b) => {
      const multiplier = filters.sortDirection === 'asc' ? 1 : -1
      
      switch (filters.sortBy) {
        case 'confidence':
          return (a.confidence - b.confidence) * multiplier
        case 'aiScore':
          return (a.aiScore - b.aiScore) * multiplier
        case 'timestamp':
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * multiplier
        case 'symbol':
          return a.symbol.localeCompare(b.symbol) * multiplier
        default:
          return 0
      }
    })

  const updateFilter = useCallback((key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      action: 'ALL',
      minConfidence: 60,
      maxRisk: 50,
      symbols: [],
      sortBy: 'confidence',
      sortDirection: 'desc'
    })
  }, [])

  return {
    filteredRecommendations: filteredAndSorted,
    filters,
    updateFilter,
    resetFilters,
    resultsCount: filteredAndSorted.length
  }
}

// ===============================================
// RECOMMENDATION EXECUTION HOOK
// ===============================================

/**
 * Hook for managing recommendation execution with confirmation flows
 */
export const useRecommendationExecution = () => {
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set())
  const [confirmationQueue, setConfirmationQueue] = useState<AIRecommendation[]>([])
  
  const { executeRecommendation } = useAIRecommendations()

  const requestExecution = useCallback((recommendation: AIRecommendation) => {
    setConfirmationQueue(prev => [...prev, recommendation])
  }, [])

  const confirmExecution = useCallback(async (recommendation: AIRecommendation) => {
    setExecutingIds(prev => new Set(prev).add(recommendation.id))
    setConfirmationQueue(prev => prev.filter(r => r.id !== recommendation.id))
    
    try {
      await executeRecommendation(recommendation)
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setExecutingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recommendation.id)
        return newSet
      })
    }
  }, [executeRecommendation])

  const cancelExecution = useCallback((recommendationId: string) => {
    setConfirmationQueue(prev => prev.filter(r => r.id !== recommendationId))
  }, [])

  const isExecuting = useCallback((recommendationId: string) => {
    return executingIds.has(recommendationId)
  }, [executingIds])

  const hasPendingConfirmation = useCallback((recommendationId: string) => {
    return confirmationQueue.some(r => r.id === recommendationId)
  }, [confirmationQueue])

  return {
    executingIds,
    confirmationQueue,
    requestExecution,
    confirmExecution,
    cancelExecution,
    isExecuting,
    hasPendingConfirmation
  }
}

// ===============================================
// RECOMMENDATION PERFORMANCE TRACKING
// ===============================================

/**
 * Hook for tracking recommendation performance and success rates
 */
export const useRecommendationPerformance = () => {
  const [performanceData, setPerformanceData] = useState({
    executedCount: 0,
    successfulCount: 0,
    failedCount: 0,
    totalPnL: 0,
    averageHoldTime: 0,
    bestPerformer: null as AIRecommendation | null,
    worstPerformer: null as AIRecommendation | null
  })

  const trackExecution = useCallback((recommendation: AIRecommendation, result: {
    success: boolean
    pnl?: number
    executionPrice?: number
    holdTime?: number
  }) => {
    setPerformanceData(prev => ({
      ...prev,
      executedCount: prev.executedCount + 1,
      successfulCount: prev.successfulCount + (result.success ? 1 : 0),
      failedCount: prev.failedCount + (result.success ? 0 : 1),
      totalPnL: prev.totalPnL + (result.pnl || 0),
      // Update best/worst performers based on PnL
      bestPerformer: !prev.bestPerformer || (result.pnl || 0) > (prev.bestPerformer as any).pnl 
        ? { ...recommendation, pnl: result.pnl } as any
        : prev.bestPerformer,
      worstPerformer: !prev.worstPerformer || (result.pnl || 0) < (prev.worstPerformer as any).pnl
        ? { ...recommendation, pnl: result.pnl } as any
        : prev.worstPerformer
    }))
  }, [])

  const getSuccessRate = useCallback(() => {
    return performanceData.executedCount > 0 
      ? (performanceData.successfulCount / performanceData.executedCount) * 100
      : 0
  }, [performanceData])

  const getMetrics = useCallback(() => ({
    successRate: getSuccessRate(),
    totalExecuted: performanceData.executedCount,
    totalPnL: performanceData.totalPnL,
    averagePnL: performanceData.executedCount > 0 
      ? performanceData.totalPnL / performanceData.executedCount 
      : 0,
    bestPerformer: performanceData.bestPerformer,
    worstPerformer: performanceData.worstPerformer
  }), [performanceData, getSuccessRate])

  return {
    performanceData,
    trackExecution,
    getSuccessRate,
    getMetrics
  }
}

// ===============================================
// REAL-TIME RECOMMENDATION UPDATES
// ===============================================

/**
 * Hook for real-time recommendation updates via WebSocket
 */
export const useRealTimeRecommendations = () => {
  const { recommendations: aiStoreRecommendations, addRecommendation } = useAIStore()
  const queryClient = useQueryClient()
  const [liveUpdates, setLiveUpdates] = useState<AIRecommendation[]>([])

  // Listen for real-time recommendation updates
  useEffect(() => {
    const handleRecommendationUpdate = (recommendation: AIRecommendation) => {
      // Add to live updates
      setLiveUpdates(prev => {
        const filtered = prev.filter(r => r.id !== recommendation.id)
        return [recommendation, ...filtered].slice(0, 50) // Keep last 50 updates
      })

      // Update AI store
      addRecommendation(recommendation)

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New AI Recommendation: ${recommendation.action} ${recommendation.symbol}`, {
          body: `${recommendation.confidence}% confidence - ${recommendation.reasoning[0]}`,
          icon: '/icons/ai-recommendation.png',
          tag: recommendation.id
        })
      }
    }

    // In a real implementation, you'd subscribe to WebSocket events
    // wsClient.on('ai_recommendation', handleRecommendationUpdate)

    // Cleanup
    return () => {
      // wsClient.off('ai_recommendation', handleRecommendationUpdate)
    }
  }, [addRecommendation, queryClient])

  const clearLiveUpdates = useCallback(() => {
    setLiveUpdates([])
  }, [])

  return {
    liveUpdates,
    hasNewUpdates: liveUpdates.length > 0,
    clearLiveUpdates,
    latestUpdate: liveUpdates[0] || null
  }
}

// ===============================================
// RECOMMENDATION COMPARISON HOOK
// ===============================================

/**
 * Hook for comparing multiple recommendations
 */
export const useRecommendationComparison = () => {
  const [selectedRecommendations, setSelectedRecommendations] = useState<AIRecommendation[]>([])

  const addToComparison = useCallback((recommendation: AIRecommendation) => {
    setSelectedRecommendations(prev => {
      if (prev.some(r => r.id === recommendation.id)) return prev
      return [...prev, recommendation].slice(0, 5) // Max 5 comparisons
    })
  }, [])

  const removeFromComparison = useCallback((recommendationId: string) => {
    setSelectedRecommendations(prev => prev.filter(r => r.id !== recommendationId))
  }, [])

  const clearComparison = useCallback(() => {
    setSelectedRecommendations([])
  }, [])

  const getComparisonMetrics = useCallback(() => {
    if (selectedRecommendations.length === 0) return null

    return {
      averageConfidence: selectedRecommendations.reduce((sum, r) => sum + r.confidence, 0) / selectedRecommendations.length,
      averageAIScore: selectedRecommendations.reduce((sum, r) => sum + r.aiScore, 0) / selectedRecommendations.length,
      averageRiskScore: selectedRecommendations.reduce((sum, r) => sum + r.riskScore, 0) / selectedRecommendations.length,
      actions: {
        buy: selectedRecommendations.filter(r => r.action === 'BUY').length,
        sell: selectedRecommendations.filter(r => r.action === 'SELL').length
      },
      sectors: [...new Set(selectedRecommendations.map(r => r.symbol))],
      bestConfidence: Math.max(...selectedRecommendations.map(r => r.confidence)),
      lowestRisk: Math.min(...selectedRecommendations.map(r => r.riskScore))
    }
  }, [selectedRecommendations])

  return {
    selectedRecommendations,
    comparisonCount: selectedRecommendations.length,
    addToComparison,
    removeFromComparison,
    clearComparison,
    getComparisonMetrics,
    canAddMore: selectedRecommendations.length < 5
  }
}

// ===============================================
// RECOMMENDATION ALERTS HOOK
// ===============================================

/**
 * Hook for managing recommendation alerts and notifications
 */
export const useRecommendationAlerts = () => {
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    minConfidence: 80,
    watchSymbols: [] as string[],
    alertTypes: {
      highConfidence: true,
      buySignals: true,
      sellSignals: true,
      riskWarnings: true
    }
  })

  const [activeAlerts, setActiveAlerts] = useState<Array<{
    id: string
    type: 'high_confidence' | 'buy_signal' | 'sell_signal' | 'risk_warning'
    recommendation: AIRecommendation
    timestamp: Date
    acknowledged: boolean
  }>>([])

  const checkForAlerts = useCallback((recommendations: AIRecommendation[]) => {
    if (!alertSettings.enabled) return

    const newAlerts: typeof activeAlerts = []

    recommendations.forEach(rec => {
      // High confidence alert
      if (alertSettings.alertTypes.highConfidence && rec.confidence >= alertSettings.minConfidence) {
        newAlerts.push({
          id: `high_conf_${rec.id}`,
          type: 'high_confidence',
          recommendation: rec,
          timestamp: new Date(),
          acknowledged: false
        })
      }

      // Buy signal alert
      if (alertSettings.alertTypes.buySignals && rec.action === 'BUY') {
        newAlerts.push({
          id: `buy_${rec.id}`,
          type: 'buy_signal',
          recommendation: rec,
          timestamp: new Date(),
          acknowledged: false
        })
      }

      // Sell signal alert
      if (alertSettings.alertTypes.sellSignals && rec.action === 'SELL') {
        newAlerts.push({
          id: `sell_${rec.id}`,
          type: 'sell_signal',
          recommendation: rec,
          timestamp: new Date(),
          acknowledged: false
        })
      }

      // Risk warning alert
      if (alertSettings.alertTypes.riskWarnings && rec.riskScore > 70) {
        newAlerts.push({
          id: `risk_${rec.id}`,
          type: 'risk_warning',
          recommendation: rec,
          timestamp: new Date(),
          acknowledged: false
        })
      }
    })

    setActiveAlerts(prev => [...prev, ...newAlerts])
  }, [alertSettings])

  const acknowledgeAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }, [])

  const clearAcknowledgedAlerts = useCallback(() => {
    setActiveAlerts(prev => prev.filter(alert => !alert.acknowledged))
  }, [])

  const updateAlertSettings = useCallback((newSettings: Partial<typeof alertSettings>) => {
    setAlertSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const unacknowledgedCount = activeAlerts.filter(alert => !alert.acknowledged).length

  return {
    alertSettings,
    activeAlerts,
    unacknowledgedCount,
    checkForAlerts,
    acknowledgeAlert,
    clearAcknowledgedAlerts,
    updateAlertSettings
  }
}

// ===============================================
// EXPORT UTILITY FUNCTIONS
// ===============================================

/**
 * Utility functions for working with recommendations
 */
export const recommendationUtils = {
  /**
   * Format recommendation confidence as percentage
   */
  formatConfidence: (confidence: number): string => {
    return `${confidence}%`
  },

  /**
   * Get risk level label
   */
  getRiskLevel: (riskScore: number): 'Low' | 'Medium' | 'High' => {
    if (riskScore <= 30) return 'Low'
    if (riskScore <= 60) return 'Medium'
    return 'High'
  },

  /**
   * Calculate potential profit/loss
   */
  calculatePotentialPL: (recommendation: AIRecommendation, shares: number): {
    profit: number
    loss: number
  } => {
    const { currentPrice, targetPrice, stopLoss } = recommendation
    
    if (recommendation.action === 'BUY') {
      return {
        profit: (targetPrice - currentPrice) * shares,
        loss: (currentPrice - stopLoss) * shares
      }
    } else {
      return {
        profit: (currentPrice - targetPrice) * shares,
        loss: (stopLoss - currentPrice) * shares
      }
    }
  },

  /**
   * Check if recommendation is expired
   */
  isExpired: (recommendation: AIRecommendation): boolean => {
    return new Date(recommendation.expiresAt) <= new Date()
  },

  /**
   * Get time until expiration
   */
  getTimeUntilExpiration: (recommendation: AIRecommendation): {
    minutes: number
    isExpiringSoon: boolean
  } => {
    const now = new Date()
    const expiresAt = new Date(recommendation.expiresAt)
    const diffMs = expiresAt.getTime() - now.getTime()
    const minutes = Math.max(0, Math.floor(diffMs / 60000))
    
    return {
      minutes,
      isExpiringSoon: minutes <= 5 && minutes > 0
    }
  },

  /**
   * Generate summary text for recommendation
   */
  generateSummary: (recommendation: AIRecommendation): string => {
    const confidence = recommendation.confidence
    const action = recommendation.action
    const symbol = recommendation.symbol
    const risk = recommendationUtils.getRiskLevel(recommendation.riskScore)
    
    return `${action} ${symbol} with ${confidence}% confidence (${risk} risk)`
  },

  /**
   * Sort recommendations by priority
   */
  sortByPriority: (recommendations: AIRecommendation[]): AIRecommendation[] => {
    return [...recommendations].sort((a, b) => {
      // Priority: High confidence + Low risk first
      const priorityA = a.confidence * (100 - a.riskScore) / 100
      const priorityB = b.confidence * (100 - b.riskScore) / 100
      return priorityB - priorityA
    })
  }
}