// 'use client'

// import { useAutoExecution } from "@/hooks/trading/useAutoExecution"
// import { useTradingBot } from "@/hooks/trading/useTradingBot"
// import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
// import AIRecommendationsList from "@/components/dashboard/AIRecommendationsList"
// import AIBotActivity from "@/components/dashboard/AIBotActivity"
// import useAIBotActivity from "@/hooks/useAIBotActivity"
// import TradesOrdersTable from "@/components/dashboard/TradesOrdersTable"
// import AILiveTradesTable from "@/components/dashboard/AILiveTradesTable"
// import { Bot, Activity, Settings, TrendingUp, AlertCircle, Zap } from 'lucide-react'

// // Default bot configuration
// const defaultBotConfig = {
//   alpaca: {
//     baseUrl: 'https://paper-api.alpaca.markets',
//     apiKey: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
//     secretKey: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || ''
//   },
//   trading: {
//     maxPositionSize: 10,
//     riskLevel: 0.02
//   },
//   mode: 'BALANCED' as const,
//   maxPositionSize: 10,
//   stopLossPercent: 5,
//   takeProfitPercent: 15,
//   minimumConfidence: 75,
//   watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
// }

// export default function TradingPage() {
//   const tradingBot = useTradingBot()
//   const autoExecution = useAutoExecution(tradingBot.engine)
//   const account = useAlpacaAccount()
//   const positions = useAlpacaPositions()
//   const aiActivity = useAIBotActivity({
//     refreshInterval: 5000,
//     maxActivities: 8,
//     autoStart: false
//   })

//   // Enhanced start function that starts both bot and activity monitoring
//   const handleStart = async (config: any) => {
//     await tradingBot.startBot(config)
//     await aiActivity.startSimulation()
//   }

//   // Enhanced stop function that stops both bot and activity monitoring
//   const handleStop = async () => {
//     await tradingBot.stopBot()
//     await aiActivity.stopSimulation()
//   }

//   // Calculate financial metrics
//   const totalBalance = account.data ? parseFloat(account.data.equity) : 0
//   const buyingPower = account.data ? parseFloat(account.data.buying_power) : 0
//   const investedAmount = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.market_value) || 0), 0) : 0
//   const totalPnL = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.unrealized_pl) || 0), 0) : 0
//   const dayPnL = account.data ? parseFloat(account.data.portfolio_value || '0') - parseFloat(account.data.last_equity || '0') : 0

//   const formatCurrency = (value: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     }).format(value)
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
//       <div className="space-y-8 p-1">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
//           <div className="mb-4 sm:mb-0">
//             <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//               AI Trading Engine
//             </h1>
//             <p className="text-gray-400 mt-2 flex items-center">
//               <Bot size={16} className="mr-2" />
//               Advanced algorithmic trading powered by machine learning
//             </p>
//           </div>
//           <div className="flex items-center space-x-3">
//             <div className="bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2">
//               <span className="text-blue-400 text-sm font-medium">Paper Trading</span>
//             </div>
//           </div>
//         </div>

//         {/* AI Trading Controls and Status */}
//         <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-2xl p-6 shadow-2xl">
//           {/* AI Trading Bot Button */}
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center space-x-3">
//               <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
//                 <Bot size={24} className="text-white" />
//               </div>
//               <div>
//                 <h2 className="text-2xl font-bold text-white">AI Trading Control</h2>
//                 <p className="text-gray-300">Manage your automated trading strategy</p>
//               </div>
//             </div>

//             <div className="flex items-center space-x-4">
//               <div className="flex items-center space-x-6">
//                 <div className={`flex items-center space-x-2`}>
//                   <div className={`w-3 h-3 rounded-full ${
//                     tradingBot.metrics.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
//                   }`} />
//                   <span className={`text-md font-medium ${
//                     tradingBot.metrics.isRunning ? 'text-green-400' : 'text-gray-400'
//                   }`}>
//                     {tradingBot.metrics.isRunning ? 'Active' : 'Inactive'}
//                   </span>
//                 </div>
//                 <button
//                   onClick={tradingBot.metrics.isRunning ? handleStop : () => handleStart(defaultBotConfig)}
//                   className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg hover:shadow-xl transform hover:scale-105 ${
//                     tradingBot.metrics.isRunning
//                       ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
//                       : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
//                   }`}
//                 >
//                   {tradingBot.metrics.isRunning ? 'Stop' : 'Start'} AI Bot
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Key Financial Metrics */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//             <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700/50">
//               <div className="flex items-center space-x-2 mb-2">
//                 <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
//                   <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
//                   </svg>
//                 </div>
//                 <span className="text-gray-300 text-sm font-medium">Total Balance</span>
//               </div>
//               <div className="text-xl font-bold text-white">
//                 {account.isLoading ? (
//                   <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
//                 ) : (
//                   formatCurrency(totalBalance)
//                 )}
//               </div>
//               <div className="text-xs text-gray-400 mt-1">
//                 Buying Power: {formatCurrency(buyingPower)}
//               </div>
//             </div>

//             <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700/50">
//               <div className="flex items-center space-x-2 mb-2">
//                 <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
//                   <TrendingUp size={16} className="text-blue-400" />
//                 </div>
//                 <span className="text-gray-300 text-sm font-medium">Invested Amount</span>
//               </div>
//               <div className="text-xl font-bold text-white">
//                 {positions.isLoading ? (
//                   <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
//                 ) : (
//                   formatCurrency(investedAmount)
//                 )}
//               </div>
//               <div className="text-xs text-gray-400 mt-1">
//                 {positions.data ? `${positions.data.length} positions` : 'No positions'}
//               </div>
//             </div>

//             <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700/50">
//               <div className="flex items-center space-x-2 mb-2">
//                 <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
//                   <Activity size={16} className="text-yellow-400" />
//                 </div>
//                 <span className="text-gray-300 text-sm font-medium">Total P&L</span>
//               </div>
//               <div className="text-xl font-bold">
//                 {positions.isLoading || account.isLoading ? (
//                   <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
//                 ) : (
//                   <span className={totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
//                     {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
//                   </span>
//                 )}
//               </div>
//               <div className="text-xs text-gray-400 mt-1">
//                 Today: {dayPnL >= 0 ? '+' : ''}{formatCurrency(dayPnL)}
//               </div>
//             </div>
//           </div>

//           {/* Trading Activity Feed */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {/* AI Bot Activity Feed */}
//             <div className="bg-gray-900/30 rounded-xl border border-gray-700/50">
//               <div className="p-4 border-b border-gray-700/50">
//                 <div className="flex items-center space-x-2">
//                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
//                   <h4 className="text-lg font-semibold text-white">AI Bot Activity</h4>
//                 </div>
//               </div>
//               <div className="p-4 h-80 overflow-y-auto">
//                 {aiActivity.activities.length > 0 || aiActivity.isSimulating ? (
//                   <AIBotActivity
//                     refreshInterval={5000}
//                     maxActivities={6}
//                     showControls={false}
//                     compact={true}
//                   />
//                 ) : (
//                   <div className="text-center py-12">
//                     <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
//                     <div className="text-gray-400 text-sm">
//                       Start the AI Trading Bot to see activity feed
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* AI Live Trades */}
//             <div>
//               <AILiveTradesTable
//                 maxItems={8}
//                 compact={true}
//                 showHeader={true}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Bot Configuration Panel */}
//         <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
//           <div className="flex items-center space-x-2 mb-6">
//             <Settings size={20} className="text-purple-400" />
//             <h3 className="text-xl font-bold text-white">Trading Configuration</h3>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//             <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
//               <div className="text-sm text-gray-400 mb-1">Max Position Size</div>
//               <div className="text-lg font-semibold text-white">${defaultBotConfig.maxPositionSize}</div>
//             </div>
//             <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
//               <div className="text-sm text-gray-400 mb-1">Stop Loss</div>
//               <div className="text-lg font-semibold text-red-400">{defaultBotConfig.stopLossPercent}%</div>
//             </div>
//             <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
//               <div className="text-sm text-gray-400 mb-1">Take Profit</div>
//               <div className="text-lg font-semibold text-green-400">{defaultBotConfig.takeProfitPercent}%</div>
//             </div>
//             <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
//               <div className="text-sm text-gray-400 mb-1">Min Confidence</div>
//               <div className="text-lg font-semibold text-blue-400">{defaultBotConfig.minimumConfidence}%</div>
//             </div>
//           </div>

//           <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
//             <div className="flex items-center space-x-2 mb-2">
//               <AlertCircle size={16} className="text-blue-400" />
//               <span className="text-blue-400 font-medium text-sm">Trading Mode</span>
//             </div>
//             <p className="text-gray-300 text-sm">
//               Currently running in <span className="font-semibold text-blue-400">paper trading mode</span>.
//               All trades are simulated with virtual money for safe learning and testing.
//             </p>
//           </div>
//         </div>

//         {/* AI Recommendations */}
//         <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
//           <div className="flex items-center space-x-2 mb-6">
//             <Zap size={20} className="text-yellow-400" />
//             <h3 className="text-xl font-bold text-white">AI Recommendations</h3>
//           </div>
//           <AIRecommendationsList
//             recommendations={[]}
//             onExecuteRecommendation={async (rec) => {
//               console.log('Executing recommendation:', rec)
//             }}
//             isLoading={false}
//           />
//         </div>

//         {/* All Trading Activity */}
//         <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
//           <div className="flex items-center space-x-2 mb-6">
//             <Activity size={20} className="text-gray-400" />
//             <h3 className="text-xl font-bold text-white">All Trading Activity</h3>
//             <span className="text-xs text-gray-500">(Manual + AI Trades)</span>
//           </div>
//           <TradesOrdersTable
//             maxItems={15}
//             compact={false}
//             showTrades={true}
//             showOrders={true}
//             useRealData={true}
//           />
//         </div>
//       </div>
//     </div>
//   )
// }