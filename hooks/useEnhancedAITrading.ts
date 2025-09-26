// 'use client'

// import { useState, useCallback, useEffect } from 'react'
// import { useAlpacaTrading } from './useAlpacaTrading'

// interface AIRecommendation {
//   wasAutoExecuted: any
//   symbol: string
//   action: 'BUY' | 'SELL' | 'HOLD'
//   confidence: number
//   reason: string
//   timestamp: Date
//   safetyChecks?: {
//     passedRiskCheck: boolean
//     passedVolumeCheck: boolean
//     passedSpreadCheck: boolean
//   }
//   canExecute: boolean
//   executionReason?: string
//   priority: 'LOW' | 'MEDIUM' | 'HIGH'
//   expectedReturn: number
//   riskScore: number
// }

// interface BotConfig {
//   enabled: boolean
//   minimumConfidence: number
//   maxDailyTrades: number
//   maxPositions: number
//   riskLevel: number
//   avoidEarnings: boolean
//   cooldownMinutes: number
// }

// function getBotConfig(): BotConfig {
//   if (typeof window === 'undefined') {
//     return {
//       enabled: false,
//       minimumConfidence: 70,
//       maxDailyTrades: 25,
//       maxPositions: 10,
//       riskLevel: 3,
//       avoidEarnings: false,
//       cooldownMinutes: 5
//     }
//   }

//   const saved = localStorage.getItem('ai-bot-config')
//   return saved ? JSON.parse(saved) : {
//     enabled: false,
//     minimumConfidence: 70,
//     maxDailyTrades: 25,
//     maxPositions: 10,
//     riskLevel: 3,
//     avoidEarnings: false,
//     cooldownMinutes: 5
//   }
// }

// export function useEnhancedAITrading() {
//   const { account, positions, executeOrder } = useAlpacaTrading()
//   const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([])
//   const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)

//   // Generate AI recommendations
//   const generateAIRecommendations = useCallback(async () => {
//     if (!account?.isConnected) return

//     try {
//       setIsGeneratingRecommendations(true)

//       const response = await fetch('/api/ai-recommendations', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           accountBalance: account.totalBalance,
//           positions: positions,
//           preferences: {
//             riskTolerance: 'moderate',
//             tradingStyle: 'swing'
//           }
//         })
//       })

//       if (response.ok) {
//         const recommendations = await response.json()
//         setAIRecommendations(recommendations.map((rec: any) => ({
//           ...rec,
//           timestamp: new Date(rec.timestamp),
//           canExecute: rec.confidence >= 55 && rec.safetyChecks?.passedRiskCheck
//         })))
//       }
//     } catch (error) {
//       console.error('Failed to generate AI recommendations:', error)
//     } finally {
//       setIsGeneratingRecommendations(false)
//     }
//   }, [account, positions])

//   // Execute AI recommendation
//   const executeAIRecommendation = useCallback(async (recommendation: AIRecommendation) => {
//     if (!recommendation.canExecute) {
//       throw new Error('Recommendation not eligible for execution')
//     }

//     // Calculate position size based on confidence and account balance
//     const baseAmount = account!.totalBalance * 0.02 // 2% base position
//     const confidenceMultiplier = recommendation.confidence / 65 // Scale from 65% baseline
//     const riskMultiplier = 1 - (recommendation.riskScore * 0.3)

//     const targetAmount = baseAmount * confidenceMultiplier * riskMultiplier
//     const quantity = Math.floor(targetAmount / 100) // Assuming $100 per share average

//     if (quantity < 1) {
//       throw new Error('Position size too small for execution')
//     }

//     await executeOrder({
//       symbol: recommendation.symbol,
//       quantity: quantity,
//       side: recommendation.action.toLowerCase() as 'buy' | 'sell',
//       type: 'market'
//     })

//     console.log(`✅ AI Recommendation executed: ${recommendation.symbol} ${recommendation.action} ${quantity} shares`)
//   }, [account, executeOrder])

//   return {
//     aiRecommendations,
//     isGeneratingRecommendations,
//     generateAIRecommendations,
//     executeAIRecommendation
//   }
// }

// // Auto-execution hook
// export function useAIBotAutoExecution() {
//   const { aiRecommendations, executeAIRecommendation } = useEnhancedAITrading()
//   const [executedRecommendations, setExecutedRecommendations] = useState<Set<string>>(new Set())
//   const [botConfig, setBotConfig] = useState(() => getBotConfig())

//   useEffect(() => {
//     const autoExecuteQualifyingRecommendations = async () => {
//       if (!botConfig.enabled) return

//       // Filter recommendations that meet execution criteria
//       const qualifyingRecs = aiRecommendations.filter(rec => {
//         const recId = `${rec.symbol}-${rec.action}-${rec.timestamp}`

//         return (
//           // Not already executed
//           !executedRecommendations.has(recId) &&
//           // Meets confidence threshold (with 5% buffer below user setting)
//           rec.confidence >= Math.max(55, botConfig.minimumConfidence - 5) &&
//           // Passes safety checks
//           rec.safetyChecks?.passedRiskCheck &&
//           // Can be executed
//           rec.canExecute &&
//           // Has valid execution reason
//           rec.executionReason?.includes('HIGH CONFIDENCE')
//         )
//       })

//       console.log(`🤖 Bot Auto-Execution: Found ${qualifyingRecs.length} qualifying recommendations`)

//       // Execute up to 3 recommendations per cycle (prevent flooding)
//       const toExecute = qualifyingRecs
//         .sort((a, b) => b.confidence - a.confidence) // Highest confidence first
//         .slice(0, 3)

//       for (const rec of toExecute) {
//         try {
//           console.log(`🚀 AUTO-EXECUTING: ${rec.symbol} ${rec.action} - ${rec.confidence}% confidence`)

//           await executeAIRecommendation(rec)

//           // Mark as executed
//           const recId = `${rec.symbol}-${rec.action}-${rec.timestamp}`
//           setExecutedRecommendations(prev => new Set([...prev, recId]))

//           console.log(`✅ AUTO-EXECUTED: ${rec.symbol} ${rec.action} successfully`)

//           // Add small delay between executions
//           await new Promise(resolve => setTimeout(resolve, 2000))

//         } catch (error) {
//           console.error(`❌ Auto-execution failed for ${rec.symbol}:`, error.message)
//         }
//       }
//     }

//     if (botConfig.enabled) {
//       // Initial execution check
//       autoExecuteQualifyingRecommendations()

//       // Set up periodic execution checks every 30 seconds
//       const interval = setInterval(autoExecuteQualifyingRecommendations, 30000)

//       return () => clearInterval(interval)
//     }
//   }, [botConfig.enabled, aiRecommendations, executedRecommendations, executeAIRecommendation])

//   // Update bot config when it changes
//   useEffect(() => {
//     const interval = setInterval(() => {
//       const currentConfig = getBotConfig()
//       setBotConfig(currentConfig)
//     }, 5000) // Check every 5 seconds

//     return () => clearInterval(interval)
//   }, [])

//   return {
//     isAutoExecutionActive: botConfig.enabled,
//     executedCount: executedRecommendations.size,
//     qualifyingRecommendations: aiRecommendations.filter(rec =>
//       rec.confidence >= Math.max(55, botConfig.minimumConfidence - 5) && rec.canExecute
//     ).length
//   }
// }

// export { getBotConfig }