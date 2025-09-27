// COMPLETE TRADING TYPES - TypeScript Definitions
// src/types/trading.ts

// CORE TYPES


export type EngineType = 'STANDARD' | 'ADVANCED' | 'PROFESSIONAL' | 'CUSTOM'
export type TradingMode = 'PAPER' | 'LIVE'
export type TradeAction = 'BUY' | 'SELL' | 'HOLD'
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ExecutionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type FillStatus = 'FILLED' | 'PARTIAL' | 'PENDING' | 'REJECTED'
export type EngineStatus = 'INITIALIZING' | 'RUNNING' | 'STOPPED' | 'ERROR'
export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertType = 'EXPOSURE' | 'DRAWDOWN' | 'CONCENTRATION' | 'CORRELATION' | 'VOLATILITY'
export type MarketCondition = 'BULL' | 'BEAR' | 'SIDEWAYS'
export type AIStrategy = 'ML_ENHANCED' | 'NEURAL_NETWORK' | 'ENSEMBLE' | 'TECHNICAL' | 'SENTIMENT'

// ===============================================
// MARKET DATA TYPES
// ===============================================

export interface MarketData {
  symbol: string
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap?: number
  trades?: number
}

export interface Quote {
  symbol: string
  bid: number
  ask: number
  bidSize: number
  askSize: number
  timestamp: Date
}

export interface Trade {
  symbol: string
  price: number
  size: number
  timestamp: Date
  conditions?: string[]
}

// ===============================================
// PORTFOLIO & POSITIONS
// ===============================================

export interface Portfolio {
  totalValue: number
  dayPnL: number
  totalPnL: number
  buyingPower: number
  cash: number
  portfolioValue: number
  equity: number
  lastDayEquity: number
  daytradeCount: number
  daytradeCountToday: number
  accountType: 'PAPER' | 'LIVE'
  currency: string
  timestamp?: Date
}

export interface Position {
  symbol: string
  qty: number
  side: 'long' | 'short'
  marketValue: number
  avgCostPerShare?: number
  costBasis: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  currentPrice: number
  changeToday: number
  changeTodayPercent: number
  entryTime?: Date
  stopLoss?: number
  takeProfit?: number
}

// ===============================================
// TRADING SIGNALS & RECOMMENDATIONS
// ===============================================

export interface TradeSignal {
  symbol: string
  action: TradeAction
  confidence: number
  reason: string
  timestamp: Date
  riskScore: number
  strategy: string
  metadata?: {
    aiScore?: number
    targetPrice?: number
    stopLoss?: number
    sentimentScore?: number
    technicalScore?: number
    [key: string]: any
  }
}
export interface TechnicalSummary {
  rsi: number
  macd: number
  sma20: number
  volume: number
}

export interface SentimentBreakdown {
  newsScore: number
  socialScore: number
  fearGreedScore: number
}

export interface MLFeatures {
  model: string
  features: string[]
  predictionStrength: number
}

export interface ExecutionMetadata {
  volatility: number
  technicalSummary?: TechnicalSummary
  sentimentBreakdown?: SentimentBreakdown
  mlFeatures?: MLFeatures
  recommendationSource: string
  executed?: boolean
  executedAt?: Date
  orderId?: string
  executionPrice?: number
}

export interface AIRecommendation {
  maxSafeAmount: number | undefined
  id: string
  symbol: string
  action: TradeAction
  confidence: number
  currentPrice: number
  targetPrice: number
  stopLoss: number
  reasoning: string[]
  riskScore: number
  aiScore: number
  timestamp: string
  expiresAt: string
  safetyChecks: SafetyChecks
  executionMetadata: ExecutionMetadata
}

export interface SafetyChecks {
  passedRiskCheck: boolean
  withinDailyLimit: boolean
  positionSizeOk: boolean
  correlationCheck: boolean
  volumeCheck: boolean
  volatilityCheck: boolean
  marketHoursCheck: boolean
  warnings: string[]
}

export interface AIRecommendationSummary {
  total: number
  buySignals: number
  sellSignals: number
  avgConfidence: number
  highConfidenceCount: number
}

export interface AIRecommendationsListProps {
  recommendations: AIRecommendation[]
  onExecuteRecommendation?: (recommendation: AIRecommendation) => Promise<void>
  onExecute?: (recommendation: AIRecommendation) => Promise<void>
  isLoading?: boolean
  error?: string | Error | null
}

// ===============================================
// TECHNICAL ANALYSIS TYPES
// ===============================================

export interface TechnicalIndicators {
  sma?: Record<number, number>
  ema?: Record<number, number>
  rsi?: number
  macd?: {
    macd: number
    signal: number
    histogram: number
  }
  bollinger?: {
    upper: number
    middle: number
    lower: number
  }
  stochastic?: {
    k: number
    d: number
  }
  williamsR?: number
  atr?: number
  obv?: number
  adx?: number
}

export interface TechnicalSignal {
  name: string
  value: number
  signal: 'BUY' | 'SELL' | 'NEUTRAL'
  strength: number
  confidence: number
}

// ===============================================
// SENTIMENT ANALYSIS TYPES
// ===============================================

export interface SentimentData {
  newsScore: number
  socialScore: number
  fearGreedScore: number
  technicalSentiment: number
  confidence: number
  sources: string[]
  details: {
    newsCount: number
    socialCount: number
    fearGreedIndex?: number
    keyPhrases: string[]
  }
}

export interface NewsArticle {
  title: string
  description: string
  url: string
  publishedAt: Date
  source: string
}

export interface SocialMediaPost {
  content: string
  sentiment: number
  platform: string
  timestamp: Date
  engagement?: number
}

// ===============================================
// RISK MANAGEMENT TYPES
// ===============================================

export interface RiskMetrics {
  portfolioValue: number
  totalExposure: number
  dailyPnL: number
  drawdown: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  var95: number
  expectedShortfall: number
}

export interface PositionRisk {
  symbol: string
  exposure: number
  exposurePercent: number
  unrealizedPnL: number
  unrealizedPercent: number
  riskScore: number
  beta: number
  correlation: number
  timeHeld: number
  stopLossDistance: number
  riskRewardRatio: number
}

export interface RiskAlert {
  level: AlertLevel
  type: AlertType
  message: string
  value: number
  threshold: number
  timestamp: Date
  recommendation: string
}

export interface RiskAssessment {
  canTrade: boolean
  riskLevel: RiskLevel
  reason: string
  metrics: RiskMetrics
  positionRisks: PositionRisk[]
  alerts: RiskAlert[]
  timestamp: Date
  recommendations: string[]
}

// ===============================================
// EXECUTION TYPES
// ===============================================

export interface ExecutionResult {
  success: boolean
  orderId?: string
  executionPrice?: number
  quantity?: number
  timestamp: Date
  error?: string
  metadata: Record<string, any>
}

export interface OrderRequest {
  symbol: string
  quantity?: number
  notional?: number
  side: 'buy' | 'sell'
  type: OrderType
  time_in_force: TimeInForce
  limit_price?: number
  stop_price?: number
  client_order_id?: string
  extended_hours?: boolean
}

export interface Order {
  id: string
  client_order_id?: string
  symbol: string
  asset_class: string
  qty: number
  filled_qty: number
  side: 'buy' | 'sell'
  type: OrderType
  time_in_force: TimeInForce
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated'
  created_at: Date
  updated_at: Date
  submitted_at?: Date
  filled_at?: Date
  expired_at?: Date
  canceled_at?: Date
  failed_at?: Date
  limit_price?: number
  stop_price?: number
  filled_avg_price?: number
  order_class: 'simple' | 'bracket' | 'oco' | 'oto'
  legs?: Order[]
  trail_price?: number
  trail_percent?: number
  hwm?: number
  commission?: number
}

// ===============================================
// BOT CONFIGURATION TYPES
// ===============================================

export interface BotConfiguration {
  enabled: boolean
  mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  strategies: BotStrategy[]
  riskManagement: BotRiskConfig
  executionSettings: BotExecutionConfig
  scheduleSettings: BotScheduleConfig
}

export interface BotStrategy {
  id: string
  name: string
  type: AIStrategy
  enabled: boolean
  weight: number
  parameters: Record<string, any>
  performance: StrategyPerformance
}

export interface BotRiskConfig {
  maxPositionSize: number
  maxDailyLoss: number
  maxDrawdown: number
  minConfidence: number
  stopLossPercent: number
  takeProfitPercent: number
  correlationLimit: number
}

export interface BotExecutionConfig {
  autoExecute: boolean
  minConfidenceForOrder: number
  maxOrdersPerDay: number
  orderSizePercent: number
  slippageTolerance: number
  marketHoursOnly: boolean
}

export interface BotScheduleConfig {
  tradingHours: {
    start: string
    end: string
  }
  excludedDays: string[]
  cooldownMinutes: number
}

export interface StrategyPerformance {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
}

// ===============================================
// ACTIVITY & LOGGING TYPES
// ===============================================

export interface BotActivityLog {
  id: string
  timestamp: Date
  type: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
  symbol?: string
  message: string
  status: 'completed' | 'failed' | 'pending'
  executionTime?: number
  details?: string
  metadata?: Record<string, any>
}

export interface TradeHistory {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  value: number
  timestamp: Date
  status: FillStatus
  strategy?: string
  pnl?: number
  fees?: number
  orderId?: string
}

export interface BotMetrics {
  isRunning: boolean
  uptime: number
  tradesExecuted: number
  recommendationsGenerated: number
  successRate: number
  totalPnL: number
  dailyPnL: number
  riskScore: number
  lastActivity?: Date
}

// ===============================================
// ALPACA SPECIFIC TYPES
// ===============================================

export interface AlpacaAccount {
  id: string
  account_number: string
  status: 'ACTIVE' | 'ACCOUNT_UPDATED' | 'APPROVAL_PENDING' | 'SUBMISSION_FAILED' | 'SUBMITTED' | 'ACCOUNT_CLOSED' | 'RESTRICTED'
  currency: string
  buying_power: number
  regt_buying_power: number
  daytrading_buying_power: number
  non_marginable_buying_power: number
  cash: number
  accrued_fees: number
  pending_transfer_out: number
  pending_transfer_in: number
  portfolio_value: number
  pattern_day_trader: boolean
  trading_blocked: boolean
  transfers_blocked: boolean
  account_blocked: boolean
  created_at: Date
  trade_suspended_by_user: boolean
  multiplier: number
  shorting_enabled: boolean
  equity: number
  last_equity: number
  long_market_value: number
  short_market_value: number
  initial_margin: number
  maintenance_margin: number
  last_maintenance_margin: number
  sma: number
  daytrade_count: number
}

export interface AlpacaPosition {
  asset_id: string
  symbol: string
  exchange: string
  asset_class: 'us_equity' | 'crypto'
  avg_entry_price: number
  qty: number
  side: 'long' | 'short'
  market_value: number
  cost_basis: number
  unrealized_pl: number
  unrealized_plpc: number
  unrealized_intraday_pl: number
  unrealized_intraday_plpc: number
  current_price: number
  lastday_price: number
  change_today: number
  qty_available: number
}

export interface AlpacaBar {
  t: string // timestamp
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
  n?: number // trade count
  vw?: number // volume weighted average price
}

// ===============================================
// WEBSOCKET DATA TYPES
// ===============================================

export interface MarketDataStream {
  type: 'trade' | 'quote' | 'bar'
  symbol: string
  timestamp: Date
  data: Trade | Quote | MarketData
}

export interface WebSocketMessage {
  stream: string
  data: any
  timestamp: Date
}

// ===============================================
// UTILITY TYPES
// ===============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface PerformanceMetrics {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  calmarRatio: number
  winRate: number
  profitFactor: number
  avgTradeDuration: number
  totalTrades: number
}

// ===============================================
// COMPONENT PROP TYPES
// ===============================================

export interface DashboardLayoutProps {
  children: React.ReactNode
  isLiveTrading: boolean
  onToggleMode: () => void
  botStatus: BotMetrics
}

export interface PortfolioOverviewProps {
  portfolio: Portfolio
  positions: Position[]
  isLoading?: boolean
  error?: string
}

// ===============================================
// HOOK TYPES
// ===============================================

export interface UseAlpacaTradingReturn {
  account: AlpacaAccount | null
  positions: AlpacaPosition[]
  orders: Order[]
  isConnected: boolean
  isLoading: boolean
  error: string | null
  executeOrder: (orderRequest: OrderRequest) => Promise<ExecutionResult>
  cancelOrder: (orderId: string) => Promise<boolean>
  getMarketData: (symbol: string) => Promise<MarketData | null>
  refreshData: () => Promise<void>
}

export interface UseAIRecommendationsReturn {
  recommendations: AIRecommendation[]
  isGenerating: boolean
  error: string | null
  generateRecommendation: (symbol: string) => Promise<AIRecommendation | null>
  executeRecommendation: (recommendation: AIRecommendation) => Promise<ExecutionResult | null>
  refreshRecommendations: () => Promise<void>
}

export interface UseBotConfigurationReturn {
  config: BotConfiguration
  isLoading: boolean
  error: string | null
  updateConfig: (newConfig: Partial<BotConfiguration>) => Promise<void>
  startBot: () => Promise<void>
  stopBot: () => Promise<void>
  resetConfig: () => void
}