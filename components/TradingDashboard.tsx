// 'use client'

// // ===============================================
// // MAIN TRADING DASHBOARD COMPONENT
// // components/TradingDashboard.tsx
// // ===============================================

// import { useState } from 'react'
// import { useAccount, usePositions, useRecommendations } from '@/hooks/useTradingData'
// import { useUnifiedTradingStore } from '@/store/unifiedTradingStore'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/Button'
// import { Play, Pause, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
// import { RecommendationCard } from './RecommendationCard'

// export function TradingDashboard() {
//   const [userId] = useState('demo-user') // Replace with actual user ID from auth

//   // Fetch data using React Query hooks
//   const { data: account, isLoading: accountLoading, refetch: refetchAccount } = useAccount()
//   const { data: positions, isLoading: positionsLoading, refetch: refetchPositions } = usePositions()
//   const { data: recommendations, isLoading: recsLoading, refetch: refetchRecs } = useRecommendations(userId)

//   // Bot state from Zustand store
//   const botRunning = useUnifiedTradingStore((state) => state.bot.isRunning)
//   const toggleBot = useUnifiedTradingStore((state) => state.toggleBot)

//   // Loading state
//   if (accountLoading && !account) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-center">
//           <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
//           <p className="text-lg">Loading trading dashboard...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="container mx-auto p-4 md:p-6 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//         <div>
//           <h1 className="text-3xl font-bold">AI Trading Dashboard</h1>
//           <p className="text-muted-foreground mt-1">
//             Paper Trading Mode • Alpaca API Connected
//           </p>
//         </div>

//         <div className="flex gap-2">
//           <Button
//             onClick={() => {
//               refetchAccount()
//               refetchPositions()
//               refetchRecs()
//             }}
//             variant="outline"
//             size="sm"
//           >
//             <RefreshCw className="w-4 h-4 mr-2" />
//             Refresh All
//           </Button>

//           <Button
//             onClick={toggleBot}
//             variant={botRunning ? 'destructive' : 'default'}
//             size="lg"
//           >
//             {botRunning ? (
//               <>
//                 <Pause className="mr-2 h-4 w-4" />
//                 Stop Bot
//               </>
//             ) : (
//               <>
//                 <Play className="mr-2 h-4 w-4" />
//                 Start Bot
//               </>
//             )}
//           </Button>
//         </div>
//       </div>

//       {/* Account Overview Cards */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm font-medium text-muted-foreground">
//               Portfolio Value
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               ${parseFloat(account?.portfolio_value || '0').toLocaleString('en-US', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//               })}
//             </div>
//             <p className="text-xs text-muted-foreground mt-1">
//               Total account value
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm font-medium text-muted-foreground">
//               Buying Power
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               ${parseFloat(account?.buying_power || '0').toLocaleString('en-US', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//               })}
//             </div>
//             <p className="text-xs text-muted-foreground mt-1">
//               Available to trade
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm font-medium text-muted-foreground">
//               Open Positions
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {positions?.length || 0}
//             </div>
//             <p className="text-xs text-muted-foreground mt-1">
//               Active trades
//             </p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm font-medium text-muted-foreground">
//               Today's P&L
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className={`text-2xl font-bold ${
//               parseFloat(account?.equity || '0') - parseFloat(account?.last_equity || '0') >= 0
//                 ? 'text-green-600'
//                 : 'text-red-600'
//             }`}>
//               ${(parseFloat(account?.equity || '0') - parseFloat(account?.last_equity || '0')).toLocaleString('en-US', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//               })}
//             </div>
//             <p className="text-xs text-muted-foreground mt-1">
//               Daily performance
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Positions Table */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Open Positions</CardTitle>
//           <CardDescription>Your current trading positions</CardDescription>
//         </CardHeader>
//         <CardContent>
//           {positionsLoading ? (
//             <div className="flex items-center justify-center py-8">
//               <RefreshCw className="w-6 h-6 animate-spin" />
//             </div>
//           ) : positions && positions.length > 0 ? (
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead>
//                   <tr className="border-b">
//                     <th className="text-left p-3 font-medium">Symbol</th>
//                     <th className="text-right p-3 font-medium">Qty</th>
//                     <th className="text-right p-3 font-medium">Entry Price</th>
//                     <th className="text-right p-3 font-medium">Current Price</th>
//                     <th className="text-right p-3 font-medium">Market Value</th>
//                     <th className="text-right p-3 font-medium">P&L</th>
//                     <th className="text-right p-3 font-medium">P&L %</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {positions.map((position: any) => {
//                     const pnl = parseFloat(position.unrealized_pl || '0')
//                     const pnlPercent = parseFloat(position.unrealized_plpc || '0') * 100
//                     const isProfit = pnl >= 0

//                     return (
//                       <tr key={position.symbol} className="border-b hover:bg-muted/50">
//                         <td className="p-3 font-semibold">{position.symbol}</td>
//                         <td className="text-right p-3">{position.qty}</td>
//                         <td className="text-right p-3">
//                           ${parseFloat(position.avg_entry_price).toFixed(2)}
//                         </td>
//                         <td className="text-right p-3">
//                           ${parseFloat(position.current_price).toFixed(2)}
//                         </td>
//                         <td className="text-right p-3">
//                           ${parseFloat(position.market_value).toLocaleString('en-US', {
//                             minimumFractionDigits: 2,
//                             maximumFractionDigits: 2
//                           })}
//                         </td>
//                         <td className={`text-right p-3 font-semibold ${
//                           isProfit ? 'text-green-600' : 'text-red-600'
//                         }`}>
//                           {isProfit ? '+' : ''}${pnl.toFixed(2)}
//                         </td>
//                         <td className={`text-right p-3 font-semibold ${
//                           isProfit ? 'text-green-600' : 'text-red-600'
//                         }`}>
//                           {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
//                         </td>
//                       </tr>
//                     )
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <div className="text-center py-12">
//               <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
//               <p className="text-lg font-medium">No open positions</p>
//               <p className="text-sm text-muted-foreground mt-1">
//                 Execute AI recommendations to start trading
//               </p>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* AI Recommendations */}
//       <Card>
//         <CardHeader>
//           <CardTitle>AI Trading Signals</CardTitle>
//           <CardDescription>
//             AI-generated trading recommendations with risk analysis
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           {recsLoading ? (
//             <div className="flex items-center justify-center py-8">
//               <RefreshCw className="w-6 h-6 animate-spin" />
//             </div>
//           ) : recommendations && recommendations.length > 0 ? (
//             <div className="space-y-4">
//               {recommendations.map((rec: any) => (
//                 <RecommendationCard
//                   key={rec.id}
//                   recommendation={rec}
//                   userId={userId}
//                   accountBalance={parseFloat(account?.equity || '100000')}
//                 />
//               ))}
//             </div>
//           ) : (
//             <div className="text-center py-12">
//               <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
//               <p className="text-lg font-medium">No active recommendations</p>
//               <p className="text-sm text-muted-foreground mt-1">
//                 Generate new signals to get AI-powered trading suggestions
//               </p>
//               <Button className="mt-4" onClick={refetchRecs}>
//                 <RefreshCw className="w-4 h-4 mr-2" />
//                 Refresh Recommendations
//               </Button>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   )
// }