import { alpacaClient } from "@/lib/alpaca/unified-client"
import { useRiskManagement } from "@/lib/trading/core-trading-hooks"
import { useTradingStore } from "@/store/tradingStore"
import { OrderRequest } from "@/types/trading"
import { usePlaceOrderMutation, usePositionsQuery } from "./api/useEnhancedTradingQueries"

// ===== COMPREHENSIVE ORDER MANAGEMENT =====
export const useOrderManagement = () => {
  const placeOrderMutation = usePlaceOrderMutation()
  const { calculatePortfolioRisk } = useRiskManagement()
  const { data: positions } = usePositionsQuery()
  const tradingStore = useTradingStore()
  
  const executeTradeWithRiskCheck = async (orderRequest: OrderRequest) => {
    const { totalRisk, riskBreakdown } = calculatePortfolioRisk()
    const maxRiskPerTrade = tradingStore.maxRiskPerTrade
    
    // Risk calculation logic
    const potentialRisk = orderRequest.qty * 
      (await alpacaClient.getLatestPrice(orderRequest.symbol))
    
    if (potentialRisk > (totalRisk * maxRiskPerTrade)) {
      throw new Error('Trade exceeds risk tolerance')
    }
    
    return placeOrderMutation.mutateAsync(orderRequest)
  }
  
  return {
    executeTradeWithRiskCheck,
    cancelOrder: alpacaClient.cancelOrder,
    cancelAllOrders: alpacaClient.cancelAllOrders
  }
}