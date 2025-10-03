// src/lib/trading/core-trading-hooks.ts


import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { alpacaClient } from '../alpaca/unified-client'


// ===== TYPES =====
export interface TradingPosition {
  symbol: string
  qty: number
  market_value: number
  current_price: number
  avg_entry_price: number
  unrealized_pl: number
}

export interface OrderRequest {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  time_in_force: 'day' | 'gtc'
  limit_price?: number
}

// ===== SUPABASE TRADING HISTORY LOGGING =====
export const logTradeToSupabase = async (tradeData: any) => {
  const { data, error } = await supabase
    .from('trade_history')
    .insert([tradeData])
  
  if (error) {
    console.error('Error logging trade:', error)
    throw error
  }
  return data
}

// ===== REACT QUERY HOOKS =====
export const usePositionsQuery = () => {
  return useQuery<TradingPosition[]>('positions', async () => {
    return await alpacaClient.getPositions()
  }, {
    refetchInterval: 30000, // Update every 30 seconds
    staleTime: 60000, // Consider data stale after 1 minute
  })
}

export const usePlaceOrderMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    async (orderDetails: OrderRequest) => {
      // Place order via Alpaca
      const order = await alpacaClient.createOrder({
        ...orderDetails,
        time_in_force: orderDetails.time_in_force || 'day'
      })
      
      // Log trade to Supabase
      await logTradeToSupabase({
        ...order,
        created_at: new Date().toISOString()
      })
      
      return order
    },
    {
      // Optimistic update
      onMutate: async (newOrder) => {
        // Cancel any previous positions query to prevent race conditions
        await queryClient.cancelQueries('positions')
        
        // Snapshot previous state
        const previousPositions = queryClient.getQueryData('positions')
        
        // Optimistically update positions
        queryClient.setQueryData('positions', (old: TradingPosition[] = []) => {
          // Simulate order impact on positions
          const updatedPositions = [...old]
          const existingPositionIndex = updatedPositions.findIndex(
            p => p.symbol === newOrder.symbol
          )
          
          if (existingPositionIndex !== -1) {
            // Update existing position
            updatedPositions[existingPositionIndex] = {
              ...updatedPositions[existingPositionIndex],
              qty: newOrder.side === 'buy' 
                ? updatedPositions[existingPositionIndex].qty + newOrder.qty
                : updatedPositions[existingPositionIndex].qty - newOrder.qty
            }
          } else if (newOrder.side === 'buy') {
            // Add new position if buying
            updatedPositions.push({
              symbol: newOrder.symbol,
              qty: newOrder.qty,
              market_value: 0,
              current_price: 0,
              avg_entry_price: 0,
              unrealized_pl: 0
            })
          }
          
          return updatedPositions
        })
        
        return { previousPositions }
      },
      // Rollback on error
      onError: (err, newOrder, context) => {
        queryClient.setQueryData('positions', context.previousPositions)
      },
      // Refetch positions after successful mutation
      onSettled: () => {
        queryClient.invalidateQueries('positions')
      }
    }
  )
}

// ===== RISK MANAGEMENT HOOK =====
export const useRiskManagement = () => {
  const { data: positions } = usePositionsQuery()
  
  const calculatePortfolioRisk = () => {
    if (!positions) return { totalRisk: 0, riskBreakdown: {} }
    
    const totalPositionValue = positions.reduce(
      (sum, pos) => sum + pos.market_value, 
      0
    )
    
    const riskBreakdown = positions.reduce((risks, pos) => {
      risks[pos.symbol] = {
        positionValue: pos.market_value,
        percentageOfPortfolio: (pos.market_value / totalPositionValue) * 100,
        unrealizedPL: pos.unrealized_pl
      }
      return risks
    }, {})
    
    return {
      totalRisk: totalPositionValue,
      riskBreakdown
    }
  }
  
  return {
    calculatePortfolioRisk
  }
}

// ===== ZUSTAND STORE FOR TRADING STATE =====
// interface TradingStore {
//   tradingMode: 'paper' | 'live'
//   maxRiskPerTrade: number
//   setTradingMode: (mode: 'paper' | 'live') => void
//   setMaxRiskPerTrade: (risk: number) => void
// }

// export const useTradingStore = create<TradingStore>(
//   devtools(
//     persist(
//       (set) => ({
//         tradingMode: 'paper',
//         maxRiskPerTrade: 0.02, // 2% of portfolio
//         setTradingMode: (mode) => set({ tradingMode: mode }),
//         setMaxRiskPerTrade: (risk) => set({ maxRiskPerTrade: risk })
//       }),
//       { name: 'trading-store' }
//     )
//   )
// )

// ===== COMPREHENSIVE ORDER MANAGEMENT =====
// export const useOrderManagement = () => {
//   const placeOrderMutation = usePlaceOrderMutation()
//   const { calculatePortfolioRisk } = useRiskManagement()
//   const { data: positions } = usePositionsQuery()
//   const tradingStore = useTradingStore()
  
//   const executeTradeWithRiskCheck = async (orderRequest: OrderRequest) => {
//     const { totalRisk, riskBreakdown } = calculatePortfolioRisk()
//     const maxRiskPerTrade = tradingStore.maxRiskPerTrade
    
//     // Risk calculation logic
//     const potentialRisk = orderRequest.qty * 
//       (await alpacaClient.getLatestPrice(orderRequest.symbol))
    
//     if (potentialRisk > (totalRisk * maxRiskPerTrade)) {
//       throw new Error('Trade exceeds risk tolerance')
//     }
    
//     return placeOrderMutation.mutateAsync(orderRequest)
//   }
  
//   return {
//     executeTradeWithRiskCheck,
//     cancelOrder: alpacaClient.cancelOrder,
//     cancelAllOrders: alpacaClient.cancelAllOrders
//   }
// }