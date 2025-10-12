import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MultiStrategyEngine, MultiStrategySignal, StrategySignalWithMeta } from '@/lib/strategies/MultiStrategyEngine'
import { StrategyPerformance, StrategyComparison } from '@/lib/strategies/MultiStrategyPerformanceTracker'
import { getCurrentUserId } from '@/lib/auth/demo-user'

export interface UseMultiStrategyEngineOptions {
  autoStart?: boolean
  refreshInterval?: number
  autoSelectBest?: boolean
  enabledStrategies?: string[]
}

export interface MultiStrategyState {
  isRunning: boolean
  currentSignal: MultiStrategySignal | null
  bestStrategy: StrategyPerformance | null
  comparison: StrategyComparison | null
  lastUpdate: Date | null
}

export const useMultiStrategyEngine = (options: UseMultiStrategyEngineOptions = {}) => {
  const {
    autoStart = false,
    refreshInterval = 30000, // 30 seconds
    autoSelectBest = true,
    enabledStrategies = ['rsi', 'macd', 'bollinger', 'ma_crossover', 'mean_reversion']
  } = options

  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)
  const engineRef = useRef<MultiStrategyEngine | null>(null)
  const [state, setState] = useState<MultiStrategyState>({
    isRunning: false,
    currentSignal: null,
    bestStrategy: null,
    comparison: null,
    lastUpdate: null
  })

  // Initialize user ID
  useEffect(() => {
    const initUserId = async () => {
      const id = await getCurrentUserId()
      setUserId(id)
    }
    initUserId()
  }, [])

  // Initialize engine when user ID is available
  useEffect(() => {
    if (userId && !engineRef.current) {
      engineRef.current = new MultiStrategyEngine(userId, autoSelectBest)

      // Configure enabled strategies
      const allStrategies = ['rsi', 'macd', 'bollinger', 'ma_crossover', 'mean_reversion']
      allStrategies.forEach(strategyId => {
        engineRef.current?.setStrategyEnabled(
          strategyId,
          enabledStrategies.includes(strategyId)
        )
      })

      // Load historical performance
      engineRef.current.loadPerformanceHistory()
    }
  }, [userId, autoSelectBest, enabledStrategies])

  /**
   * Fetch strategy performance comparison from Supabase
   */
  const { data: performanceData, isLoading: isLoadingPerformance, refetch: refetchPerformance } = useQuery({
    queryKey: ['strategyPerformance', userId],
    queryFn: async () => {
      if (!engineRef.current) return null
      return engineRef.current.getStrategyComparison()
    },
    enabled: !!userId && !!engineRef.current,
    refetchInterval: state.isRunning ? refreshInterval : false
  })

  /**
   * Analyze market with all strategies using Alpaca data
   */
  const analyzeMarket = useCallback(async (symbol: string) => {
    if (!engineRef.current) {
      console.error('❌ Multi-strategy engine not initialized')
      throw new Error('Multi-strategy engine not initialized')
    }

    console.log(`🔍 Fetching market data for ${symbol} from Alpaca API...`)

    try {
      // Fetch real market data from Alpaca API
      const apiUrl = `/api/alpaca/bars?symbol=${symbol}&timeframe=1Day&limit=100`
      console.log(`📡 API Request: ${apiUrl}`)

      const response = await fetch(apiUrl)
      console.log(`📡 API Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Error response:`, errorText)
        throw new Error(`Failed to fetch market data from Alpaca: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log(`📊 Received data:`, { hasbars: !!data.bars, barCount: data.bars?.length || 0 })

      const marketData = data.bars || []

      if (marketData.length === 0) {
        console.warn('⚠️ No market data available from Alpaca for', symbol)
        throw new Error('No market data available from Alpaca')
      }

      console.log(`✅ Successfully fetched ${marketData.length} bars for ${symbol}`)

      // Analyze with all strategies
      console.log(`🧠 Analyzing ${symbol} with all strategies...`)
      const multiSignal = await engineRef.current.analyzeAllStrategies(symbol, marketData)

      console.log(`✅ Multi-strategy analysis complete:`, {
        recommendedAction: multiSignal.recommendedSignal.action,
        confidence: multiSignal.recommendedSignal.confidence,
        consensus: multiSignal.consensus
      })

      // Update state
      setState(prev => ({
        ...prev,
        currentSignal: multiSignal,
        bestStrategy: multiSignal.bestStrategy.performance,
        lastUpdate: new Date()
      }))

      return multiSignal
    } catch (error) {
      console.error('❌ Error analyzing market with multi-strategy engine:', error)
      throw error
    }
  }, [])

  /**
   * Record trade execution for a specific strategy
   */
  const recordTradeMutation = useMutation({
    mutationFn: async ({
      strategyId,
      symbol,
      side,
      quantity,
      entryPrice,
      exitPrice,
      pnl
    }: {
      strategyId: string
      symbol: string
      side: 'buy' | 'sell'
      quantity: number
      entryPrice: number
      exitPrice?: number
      pnl?: number
    }) => {
      if (!engineRef.current) throw new Error('Engine not initialized')

      await engineRef.current.recordTradeExecution(
        strategyId,
        symbol,
        side,
        quantity,
        entryPrice,
        exitPrice,
        pnl
      )
    },
    onSuccess: () => {
      // Invalidate and refetch performance data
      queryClient.invalidateQueries({ queryKey: ['strategyPerformance', userId] })
      refetchPerformance()
    }
  })

  /**
   * Start multi-strategy analysis
   */
  const start = useCallback(async () => {
    console.log('🔄 Start function called', {
      hasEngine: !!engineRef.current,
      isRunning: state.isRunning,
      userId
    })

    if (!engineRef.current) {
      console.warn('⚠️ Cannot start: engine not initialized')
      return
    }

    if (state.isRunning) {
      console.warn('⚠️ Cannot start: already running')
      return
    }

    setState(prev => ({ ...prev, isRunning: true }))
    console.log('🚀 Multi-strategy engine started')

    try {
      // Load performance history from Supabase
      console.log('📊 Loading performance history from Supabase...')
      await engineRef.current.loadPerformanceHistory()

      // Initial comparison
      console.log('📊 Getting initial strategy comparison...')
      const comparison = engineRef.current.getStrategyComparison()
      console.log('📊 Strategy comparison:', {
        hasRanking: !!comparison.ranking,
        rankingLength: comparison.ranking?.length || 0,
        topStrategy: comparison.topStrategy?.strategyName
      })

      setState(prev => ({
        ...prev,
        comparison,
        bestStrategy: comparison.topStrategy
      }))

      console.log('✅ Multi-strategy engine fully initialized')
    } catch (error) {
      console.error('❌ Error starting multi-strategy engine:', error)
    }
  }, [state.isRunning, userId])

  /**
   * Stop multi-strategy analysis
   */
  const stop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentSignal: null
    }))
    console.log('🛑 Multi-strategy engine stopped')
  }, [])

  /**
   * Auto-start if enabled
   */
  useEffect(() => {
    if (autoStart && engineRef.current && !state.isRunning) {
      start()
    }
  }, [autoStart, start, state.isRunning])

  /**
   * Update comparison when performance data changes
   */
  useEffect(() => {
    if (performanceData) {
      console.log('Performance data updated:', {
        hasRanking: !!performanceData.ranking,
        rankingLength: performanceData.ranking?.length || 0,
        topStrategy: performanceData.topStrategy?.strategyName,
        allStrategiesCount: performanceData.allStrategies?.length || 0
      })

      setState(prev => ({
        ...prev,
        comparison: performanceData,
        bestStrategy: performanceData.topStrategy
      }))
    }
  }, [performanceData])

  /**
   * Get specific strategy performance
   */
  const getStrategyPerformance = useCallback((strategyId: string): StrategyPerformance | null => {
    if (!engineRef.current) return null
    return engineRef.current.getPerformanceTracker().getStrategyPerformance(strategyId)
  }, [])

  /**
   * Enable/disable a strategy
   */
  const setStrategyEnabled = useCallback((strategyId: string, enabled: boolean) => {
    if (!engineRef.current) return
    engineRef.current.setStrategyEnabled(strategyId, enabled)
    console.log(`Strategy ${strategyId} ${enabled ? 'enabled' : 'disabled'}`)
  }, [])

  /**
   * Set manual weight for a strategy
   */
  const setStrategyWeight = useCallback((strategyId: string, weight: number) => {
    if (!engineRef.current) return
    engineRef.current.setStrategyWeight(strategyId, weight)
    console.log(`Strategy ${strategyId} weight set to ${weight}`)
  }, [])

  /**
   * Toggle auto-select best strategy
   */
  const setAutoSelectBest = useCallback((enabled: boolean) => {
    if (!engineRef.current) return
    engineRef.current.setAutoSelectBest(enabled)
    console.log(`Auto-select best strategy: ${enabled ? 'enabled' : 'disabled'}`)
  }, [])

  /**
   * Toggle auto-switch to best strategy
   */
  const toggleAutoSwitch = useCallback(() => {
    if (!engineRef.current) return
    const currentStats = engineRef.current.getSwitchingStats()
    engineRef.current.setAutoSwitchEnabled(!currentStats.autoSwitchEnabled)
    refetchPerformance()
  }, [refetchPerformance])

  /**
   * Manually switch to a specific strategy
   */
  const manualSwitchStrategy = useCallback((strategyId: string): boolean => {
    if (!engineRef.current) return false
    const success = engineRef.current.setActiveStrategy(strategyId)
    if (success) {
      refetchPerformance()
    }
    return success
  }, [refetchPerformance])

  /**
   * Trigger auto-switch check
   */
  const checkAutoSwitch = useCallback(() => {
    if (!engineRef.current) return null
    const result = engineRef.current.autoSwitchToBestStrategy()
    if (result.switched) {
      refetchPerformance()
    }
    return result
  }, [refetchPerformance])

  /**
   * Get current active strategy
   */
  const getCurrentStrategy = useCallback(() => {
    if (!engineRef.current) return null
    return engineRef.current.getCurrentActiveStrategy()
  }, [])

  /**
   * Get switching statistics
   */
  const getSwitchingStats = useCallback(() => {
    if (!engineRef.current) return null
    return engineRef.current.getSwitchingStats()
  }, [])

  /**
   * Periodically check for auto-switching when running
   */
  useEffect(() => {
    if (state.isRunning && engineRef.current) {
      const interval = setInterval(() => {
        checkAutoSwitch()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [state.isRunning, refreshInterval, checkAutoSwitch])

  return {
    // State
    isRunning: state.isRunning,
    currentSignal: state.currentSignal,
    bestStrategy: state.bestStrategy,
    comparison: state.comparison,
    lastUpdate: state.lastUpdate,
    isLoadingPerformance,
    currentStrategy: getCurrentStrategy(),
    switchingStats: getSwitchingStats(),

    // Actions
    start,
    stop,
    analyzeMarket,
    recordTrade: recordTradeMutation.mutate,
    getStrategyPerformance,
    setStrategyEnabled,
    setStrategyWeight,
    setAutoSelectBest,
    toggleAutoSwitch,
    manualSwitchStrategy,
    checkAutoSwitch,
    refetchPerformance,

    // Engine instance
    engine: engineRef.current
  }
}
