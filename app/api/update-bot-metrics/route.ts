// import { NextRequest, NextResponse } from 'next/server'
// import { getCurrentUserId } from '@/lib/auth/demo-user'
// import { supabaseService } from '@/lib/database/supabase-utils'

// export async function POST(request: NextRequest) {
//   try {
//     const userId = getCurrentUserId()

//     // Get AI learning data count for metrics calculation
//     const learningData = await supabaseService.getAILearningData(userId)
//     const totalTrades = learningData.length

//     // Calculate success rate from learning data
//     const profitableTrades = learningData.filter(trade => trade.outcome === 'profit').length
//     const successRate = totalTrades > 0 ? profitableTrades / totalTrades : 0

//     // Calculate total P&L from learning data
//     const totalPnL = learningData.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

//     // Calculate daily P&L (trades from last 24 hours)
//     const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
//     const recentTrades = learningData.filter(trade =>
//       new Date(trade.created_at) > oneDayAgo
//     )
//     const dailyPnL = recentTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

//     // Calculate risk score based on confidence scores
//     const avgConfidence = learningData.length > 0
//       ? learningData.reduce((sum, trade) => sum + trade.confidence_score, 0) / learningData.length
//       : 0
//     const riskScore = Math.max(0, Math.min(100, (1 - avgConfidence) * 100)) // Inverse of confidence

//     // Count recommendations (entries where confidence > 0.7)
//     const recommendationsGenerated = learningData.filter(trade =>
//       trade.confidence_score > 0.7
//     ).length

//     // Update bot metrics with calculated data using service client
//     const serviceClient = supabaseService.getServiceClient()
//     const { error: metricsError } = await serviceClient
//       .from('bot_metrics')
//       .upsert({
//         user_id: userId,
//         is_running: true, // Assume running if we're updating metrics
//         trades_executed: totalTrades,
//         recommendations_generated: recommendationsGenerated,
//         success_rate: successRate,
//         total_pnl: Math.round(totalPnL * 100) / 100,
//         daily_pnl: Math.round(dailyPnL * 100) / 100,
//         risk_score: Math.round(riskScore),
//         last_activity: new Date().toISOString(),
//         updated_at: new Date().toISOString()
//       })

//     if (metricsError) {
//       console.error('Error updating bot metrics:', metricsError)
//     }

//     return NextResponse.json({
//       success: true,
//       metrics: {
//         trades_executed: totalTrades,
//         recommendations_generated: recommendationsGenerated,
//         success_rate: Math.round(successRate * 1000) / 1000,
//         total_pnl: Math.round(totalPnL * 100) / 100,
//         daily_pnl: Math.round(dailyPnL * 100) / 100,
//         risk_score: Math.round(riskScore),
//         learning_data_points: learningData.length
//       }
//     })

//   } catch (error) {
//     console.error('Error updating bot metrics:', error)
//     return NextResponse.json(
//       { error: 'Failed to update bot metrics', details: error.message },
//       { status: 500 }
//     )
//   }
// }