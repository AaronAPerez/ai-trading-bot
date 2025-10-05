// "use client"

// import React from 'react'
// import {
//   TrendingUp,
//   TrendingDown,
//   Clock,
//   DollarSign,
//   Activity,
//   CheckCircle,
//   AlertCircle,
//   Zap,
//   Database,
//   RefreshCw
// } from 'lucide-react'
// import { useCompleteLiveOrders } from '@/hooks/useLiveOrders'
// import { useTradingStore } from '@/store/tradingStore'
// import { useQuery } from '@tanstack/react-query'
// import { getAssetIcon } from '@/components/icons/AssetIcons'
// import LiveAIActivity from '../dashboard/LiveAIActivity'

// interface Trade {
//   id: string
//   symbol: string
//   side: 'buy' | 'sell'
//   qty?: string
//   filled_qty: string
//   status: string
//   filled_avg_price?: string
//   limit_price?: string
//   submitted_at: string
//   filled_at?: string
//   type: string
//   time_in_force: string
// }

// interface BotActivity {
//   id: string
//   symbol?: string
//   type: string
//   message: string
//   status: string
//   timestamp: string
//   metadata?: any
// }

// export default function LiveTradesDisplay() {
//   // Use complete live orders hook with Alpaca API, Zustand, React Query, and Supabase integration
//   const {
//     liveOrders,
//     isLoadingLive,
//     statistics,
//     isSyncing,
//   } = useCompleteLiveOrders()


// // const { data: orders, isLoading } = useQuery({
// //   queryKey: ['alpacaOrders'],
// //   queryFn: async () => {
// //     const res = await fetch('/api/alpaca/orders?limit=20')
// //     const json = await res.json()
// //     return json.orders
// //   },
// //   refetchInterval: persistentBotState.isRunning ? 30000 : false
// // })



//   // Fetch recent bot activities from Supabase
//   const { data: activitiesData, isLoading: isLoadingActivities } = useQuery({
//     queryKey: ['bot-activities'],
//     queryFn: async () => {
//       const response = await fetch('/api/ai-bot-activity?limit=15')
//       if (!response.ok) throw new Error('Failed to fetch bot activities')
//       const data = await response.json()
//       return data.activities || []
//     },
//     refetchInterval: 3000, // Refresh every 3 seconds
//   })

//   const trades: Trade[] = liveOrders || []
//   const activities: BotActivity[] = activitiesData || []



//   const getStatusIcon = (status: string) => {
//     switch (status.toLowerCase()) {
//       case 'filled':
//         return <CheckCircle className="w-4 h-4 text-green-400" />
//       case 'accepted':
//       case 'pending':
//         return <Clock className="w-4 h-4 text-yellow-400" />
//       case 'rejected':
//       case 'canceled':
//         return <AlertCircle className="w-4 h-4 text-red-400" />
//       default:
//         return <Activity className="w-4 h-4 text-blue-400" />
//     }
//   }

//   const getSideIcon = (side: string) => {
//     return side.toLowerCase() === 'buy'
//       ? <TrendingUp className="w-4 h-4 text-green-400" />
//       : <TrendingDown className="w-4 h-4 text-red-400" />
//   }

//   const getSideColor = (side: string) => {
//     return side.toLowerCase() === 'buy' ? 'text-green-400' : 'text-red-400'
//   }

//   const formatTime = (timestamp: string) => {
//     return new Date(timestamp).toLocaleTimeString([], {
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit'
//     })
//   }

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2
//     }).format(amount)
//   }

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//       {/* Live Trading Orders - Alpaca API + Zustand + React Query + Supabase */}
//       <div className="bg-gradient-to-br from-gray-900/80 to-blue-900/30 rounded-lg border border-gray-700/50 shadow-2xl">
//         <div className="p-4 border-b border-gray-700/50">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-2">
//               <DollarSign className="w-5 h-5 text-green-400" />
//               <h4 className="text-lg font-semibold text-white">Live Trading Orders</h4>
//             </div>
//             <div className="flex items-center space-x-3">
//               {/* Data Source Indicators */}
//               <div className="flex items-center space-x-1">
//                 <Database className="w-3 h-3 text-blue-400" />
//                 <span className="text-xs text-blue-400">Alpaca</span>
//               </div>
//               {isSyncing && (
//                 <div className="flex items-center space-x-1">
//                   <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
//                   <span className="text-xs text-purple-400">Syncing</span>
//                 </div>
//               )}
//               <div className="flex items-center space-x-2">
//                 <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
//                 <span className="text-sm text-gray-300">
//                   {trades.length} orders
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="p-4">
//           {isLoadingLive ? (
//             <div className="text-center py-8 text-gray-400">
//               <Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />
//               <div>Loading trades from Alpaca...</div>
//             </div>
//           ) : trades.length === 0 ? (
//             <div className="text-center py-8 text-gray-400">
//               <TrendingUp className="w-8 h-8 mx-auto mb-2" />
//               <div>No trades yet</div>
//               <div className="text-sm">Start the AI bot to see live trades</div>
//               <div className="text-xs text-gray-500 mt-2">
//                 Real-time data from Alpaca API
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-3 max-h-80 overflow-y-auto">
//               {trades.map((trade) => {
//                 const quantity = trade.qty || trade.filled_qty || '0'
//                 const price = trade.filled_avg_price || trade.limit_price
//                 const value = price ? parseFloat(quantity) * parseFloat(price) : 0

//                 return (
//                   <div
//                     key={trade.id}
//                     className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 hover:border-blue-500/30 transition-all"
//                   >
//                     <div className="flex items-center justify-between mb-2">
//                       <div className="flex items-center space-x-2">
//                         {getSideIcon(trade.side)}
//                         <span className={`font-bold text-sm ${getSideColor(trade.side)}`}>
//                           {trade.side.toUpperCase()}
//                         </span>
//                         {getAssetIcon(trade.symbol, 'sm')}
//                         <span className="text-white font-mono text-sm">
//                           {trade.symbol}
//                         </span>
//                         <span className="text-xs text-gray-500">
//                           {trade.type.toUpperCase()}
//                         </span>
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         {getStatusIcon(trade.status)}
//                         <span className="text-xs text-gray-300">
//                           {trade.status.toUpperCase()}
//                         </span>
//                       </div>
//                     </div>

//                     <div className="flex items-center justify-between">
//                       <div className="text-sm text-gray-300">
//                         <span className="font-medium">{parseFloat(quantity).toFixed(2)}</span> shares
//                         {price && (
//                           <span className="ml-2">@ {formatCurrency(parseFloat(price))}</span>
//                         )}
//                       </div>
//                       <div className="text-xs text-gray-400">
//                         {formatTime(trade.submitted_at)}
//                       </div>
//                     </div>

//                     {trade.filled_at && (
//                       <div className="mt-1 flex items-center space-x-2">
//                         <CheckCircle className="w-3 h-3 text-green-400" />
//                         <span className="text-xs text-green-300">
//                           Filled at {formatTime(trade.filled_at)}
//                         </span>
//                       </div>
//                     )}

//                     {value > 0 && (
//                       <div className="mt-1 text-right">
//                         <span className="text-sm font-medium text-white">
//                           {formatCurrency(value)}
//                         </span>
//                       </div>
//                     )}

//                     {/* Zustand Store Indicator */}
//                     <div className="mt-2 pt-2 border-t border-gray-700/30 flex items-center justify-between">
//                       <div className="flex items-center space-x-1">
//                         <Database className="w-3 h-3 text-purple-400" />
//                         <span className="text-xs text-purple-300">Zustand Store</span>
//                       </div>
//                       <span className="text-xs text-gray-500">
//                         {trade.time_in_force}
//                       </span>
//                     </div>
//                   </div>
//                 )
//               })}
//             </div>
//           )}

//           {/* Statistics Footer */}
//           {statistics && (
//             <div className="mt-4 pt-4 border-t border-gray-700/30">
//               <div className="grid grid-cols-2 gap-3 text-xs">
//                 <div className="bg-gray-800/30 rounded p-2">
//                   <div className="text-gray-400">Total Orders</div>
//                   <div className="text-white font-bold">{statistics.total || 0}</div>
//                 </div>
//                 <div className="bg-gray-800/30 rounded p-2">
//                   <div className="text-gray-400">Fill Rate</div>
//                   <div className="text-green-400 font-bold">
//                     {statistics.fillRate ? `${(statistics.fillRate * 100).toFixed(1)}%` : '0%'}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>



//       {/* Live AI Activity Feed */}
//       <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/30 rounded-lg border border-gray-700/50 shadow-2xl"> 
//        <div className="p-4 border-b border-gray-700/50">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-2">
//               <Activity className="w-5 h-5 text-purple-400" />
//               <h4 className="text-lg font-semibold text-white">AI Activity Feed</h4>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse"></div>
//               <span className="text-sm text-gray-300">
//                 {activities.length} activities
//               </span>
//             </div>
//           </div>
//         </div>

//         <div className="p-4">
//           {isLoadingActivities ? (
//             <div className="text-center py-8 text-gray-400">
//               <Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />
//               <div>Loading activities...</div>
//             </div>
//           ) : activities.length === 0 ? (
//             <div className="text-center py-8 text-gray-400">
//               <Zap className="w-8 h-8 mx-auto mb-2" />
//               <div>No AI activities yet</div>
//               <div className="text-sm">Start the AI bot to see live analysis</div>
//             </div>
//           ) : (
//             <div className="space-y-2 max-h-80 overflow-y-auto">
//               {activities.map((activity) => (
//                 <div
//                   key={activity.id}
//                   className={`p-3 rounded-lg border-l-4 ${
//                     activity.type === 'trade'
//                       ? 'bg-green-900/20 border-green-400'
//                       : activity.type === 'analysis'
//                       ? 'bg-blue-900/20 border-blue-400'
//                       : activity.type === 'recommendation'
//                       ? 'bg-yellow-900/20 border-yellow-400'
//                       : activity.type === 'error'
//                       ? 'bg-red-900/20 border-red-400'
//                       : 'bg-gray-900/20 border-gray-400'
//                   }`}
//                 >
//                   <div className="flex items-center justify-between mb-1">
//                     <div className="flex items-center space-x-2">
//                       <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
//                         {activity.type.toUpperCase()}
//                       </span>
//                       {activity.symbol && (
//                         <>
//                           {getAssetIcon(activity.symbol, 'sm')}
//                           <span className="text-xs font-mono text-gray-300">
//                             {activity.symbol}
//                           </span>
//                         </>
//                       )}
//                     </div>
//                     <span className="text-xs text-gray-400">
//                       {formatTime(activity.timestamp)}
//                     </span>
//                   </div>
//                   <div className="text-sm text-white">{activity.message}</div>

//                   {activity.metadata?.confidence && (
//                     <div className="mt-1 flex items-center space-x-2">
//                       <Zap className="w-3 h-3 text-yellow-400" />
//                       <span className="text-xs text-yellow-300">
//                         {(activity.metadata.confidence * 100).toFixed(1)}% confidence
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//          )}
//         </div> 
//       </div>
//     </div>
//   )
// }