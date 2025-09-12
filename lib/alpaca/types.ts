/**
 * Comprehensive Alpaca API TypeScript Definitions
 * 
 * @author Trading Platform Team
 * @version 5.0.0 - Production Ready
 */

// =============================================================================
// Core Account Types
// =============================================================================

export interface AlpacaAccount {
  id: string
  account_number: string
  status: 'ONBOARDING' | 'SUBMISSION_FAILED' | 'SUBMITTED' | 'ACCOUNT_UPDATED' | 'APPROVAL_PENDING' | 'ACTIVE' | 'REJECTED'
  crypto_status?: 'ACTIVE' | 'INACTIVE'
  currency: string
  buying_power: string
  regt_buying_power: string
  daytrading_buying_power: string
  non_marginable_buying_power: string
  cash: string
  accrued_fees: string
  pending_transfer_out: string
  pending_transfer_in: string
  portfolio_value: string
  pattern_day_trader: boolean
  trading_blocked: boolean
  transfers_blocked: boolean
  account_blocked: boolean
  created_at: string
  trade_suspended_by_user: boolean
  multiplier: string
  shorting_enabled: boolean
  equity: string
  last_equity: string
  long_market_value: string
  short_market_value: string
  initial_margin: string
  maintenance_margin: string
  last_maintenance_margin: string
  sma: string
  daytrade_count: number
  balance_asof?: string
}

// =============================================================================
// Position Types
// =============================================================================

export interface AlpacaPosition {
  asset_id: string
  symbol: string
  exchange: string
  asset_class: 'us_equity' | 'crypto'
  avg_entry_price: string
  qty: string
  side: 'long' | 'short'
  market_value: string
  cost_basis: string
  unrealized_pl: string
  unrealized_plpc: string
  unrealized_intraday_pl: string
  unrealized_intraday_plpc: string
  current_price?: string
  lastday_price?: string
  change_today?: string
}

// =============================================================================
// Order Types
// =============================================================================

export interface AlpacaOrder {
  id: string
  client_order_id: string
  created_at: string
  updated_at: string
  submitted_at: string
  filled_at?: string
  expired_at?: string
  canceled_at?: string
  failed_at?: string
  replaced_at?: string
  replaced_by?: string
  replaces?: string
  asset_id: string
  symbol: string
  asset_class: 'us_equity' | 'crypto'
  notional?: string
  qty: string
  filled_qty: string
  filled_avg_price?: string
  order_class: 'simple' | 'bracket' | 'oco' | 'oto'
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  side: 'buy' | 'sell'
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'
  limit_price?: string
  stop_price?: string
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated'
  extended_hours: boolean
  legs?: AlpacaOrderLeg[]
  trail_percent?: string
  trail_price?: string
  hwm?: string
}

export interface AlpacaOrderLeg {
  id: string
  side: 'buy' | 'sell'
  symbol: string
  notional?: string
  qty: string
}

export interface CreateOrderRequest {
  symbol: string
  qty?: number
  notional?: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'
  limit_price?: number
  stop_price?: number
  trail_price?: number
  trail_percent?: number
  extended_hours?: boolean
  client_order_id?: string
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto'
  take_profit?: {
    limit_price: number
  }
  stop_loss?: {
    stop_price: number
    limit_price?: number
  }
}

// =============================================================================
// Market Data Types
// =============================================================================

export interface AlpacaQuote {
  symbol: string
  timestamp: string
  timeframe: string
  bid_price: number
  bid_size: number
  ask_price: number
  ask_size: number
  bid_exchange?: string
  ask_exchange?: string
  tape?: string
}

export interface AlpacaLatestQuote {
  t: string // timestamp
  ax: string // ask exchange
  ap: number // ask price
  as: number // ask size
  bx: string // bid exchange
  bp: number // bid price
  bs: number // bid size
  c: string[] // conditions
  z: string // tape
}

export interface AlpacaTrade {
  timestamp: string
  price: number
  size: number
  exchange?: string
  conditions?: string[]
  tape?: string
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

export interface AlpacaSnapshot {
  symbol: string
  latest_trade?: AlpacaTrade
  latest_quote?: AlpacaQuote
  minute_bar?: AlpacaBar
  daily_bar?: AlpacaBar
  prev_daily_bar?: AlpacaBar
}

// =============================================================================
// WebSocket Types
// =============================================================================

export interface AlpacaWebSocketMessage {
  T: string // message type
  S: string // symbol
  t?: string // timestamp
  [key: string]: any
}

export interface AlpacaTradeUpdate extends AlpacaWebSocketMessage {
  T: 'trade_updates'
  event: 'new' | 'fill' | 'partial_fill' | 'canceled' | 'expired' | 'done_for_day' | 'replaced' | 'rejected'
  order: AlpacaOrder
}

export interface AlpacaQuoteUpdate extends AlpacaWebSocketMessage {
  T: 'q'
  S: string // symbol
  ax: string // ask exchange
  ap: number // ask price
  as: number // ask size
  bx: string // bid exchange
  bp: number // bid price
  bs: number // bid size
  t: string // timestamp
  c: string[] // conditions
  z: string // tape
}

export interface AlpacaTradeStreamUpdate extends AlpacaWebSocketMessage {
  T: 't'
  S: string // symbol
  i: number // trade ID
  x: string // exchange
  p: number // price
  s: number // size
  t: string // timestamp
  c: string[] // conditions
  z: string // tape
}

export interface AlpacaBarUpdate extends AlpacaWebSocketMessage {
  T: 'b'
  S: string // symbol
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
  t: string // timestamp
  n: number // trade count
  vw: number // volume weighted average price
}

// =============================================================================
// API Response Types
// =============================================================================

export interface AlpacaApiResponse<T> {
  data?: T
  message?: string
  code?: number
}

export interface AlpacaPaginatedResponse<T> {
  data: T[]
  next_page_token?: string
}

export interface AlpacaQuotesResponse {
  quotes: Record<string, AlpacaLatestQuote>
  next_page_token?: string
}

export interface AlpacaBarsResponse {
  bars: Record<string, AlpacaBar[]>
  next_page_token?: string
}

export interface AlpacaTradesResponse {
  trades: Record<string, AlpacaTrade[]>
  next_page_token?: string
}

// =============================================================================
// Clock and Calendar Types
// =============================================================================

export interface AlpacaClock {
  timestamp: string
  is_open: boolean
  next_open: string
  next_close: string
}

export interface AlpacaCalendarDay {
  date: string
  open: string
  close: string
}

// =============================================================================
// Asset Types
// =============================================================================

export interface AlpacaAsset {
  id: string
  class: 'us_equity' | 'crypto'
  exchange: string
  symbol: string
  name?: string
  status: 'active' | 'inactive'
  tradable: boolean
  marginable: boolean
  shortable: boolean
  easy_to_borrow: boolean
  fractionable: boolean
  min_order_size?: string
  min_trade_increment?: string
  price_increment?: string
  maintenance_margin_requirement?: number
  attributes?: string[]
}

// =============================================================================
// Portfolio History Types
// =============================================================================

export interface AlpacaPortfolioHistory {
  timestamp: number[]
  equity: number[]
  profit_loss: number[]
  profit_loss_pct: number[]
  base_value: number
  timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day'
  extended_hours?: boolean
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface AlpacaConfig {
  key: string
  secret: string
  paper?: boolean
  baseUrl?: string
  dataUrl?: string
  rateLimit?: boolean
  maxRetries?: number
  timeout?: number
  verbose?: boolean
}

export interface AlpacaCredentials {
  key: string
  secret: string
  oauth?: string
}

// =============================================================================
// Connection and Status Types
// =============================================================================

export interface ConnectionStatus {
  connected: boolean
  authenticated: boolean
  paperTrading: boolean
  accountStatus: string
  marketOpen: boolean
  lastUpdate: Date
  error?: string
  rateLimitRemaining?: number
  rateLimitReset?: Date
}

export interface AlpacaAccountStatus {
  account: AlpacaAccount
  buyingPower: number
  cash: number
  portfolioValue: number
  dayPnL: number
  totalPnL: number
  positions: AlpacaPosition[]
  orders: AlpacaOrder[]
  dayTradeCount: number
  isPatternDayTrader: boolean
}

// =============================================================================
// Trading Strategy Types
// =============================================================================

export interface AlpacaStrategySignal {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  quantity: number
  price: number
  stopLoss?: number
  takeProfit?: number
  reasoning: string
  timestamp: Date
  strategyId: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface AlpacaBacktestResult {
  strategy: string
  symbol: string
  startDate: string
  endDate: string
  initialCapital: number
  finalValue: number
  totalReturn: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  maxDrawdown: number
  sharpeRatio: number
  trades: AlpacaTrade[]
}

// =============================================================================
// Risk Management Types
// =============================================================================

export interface AlpacaRiskLimits {
  maxPositionSize: number // Percentage of portfolio
  maxDailyLoss: number // Dollar amount
  maxOrderValue: number // Dollar amount per order
  allowedSymbols?: string[] // Whitelist
  blockedSymbols?: string[] // Blacklist
  tradingHours: {
    preMarket: boolean
    regularHours: boolean
    afterHours: boolean
  }
  dayTradingEnabled: boolean
  marginEnabled: boolean
}

export interface AlpacaRiskMetrics {
  portfolioValue: number
  cashBalance: number
  marginUsed: number
  dayPnL: number
  unrealizedPnL: number
  realizedPnL: number
  maxDrawdown: number
  volatility: number
  sharpeRatio: number
  beta: number
  riskScore: number // 1-10 scale
}

// =============================================================================
// Market Data Request Types
// =============================================================================

export interface AlpacaQuoteRequest {
  symbols: string[]
  feed?: 'iex' | 'sip'
  currency?: string
}

export interface AlpacaBarsRequest {
  symbols: string[]
  timeframe: '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | '1Day' | '1Week' | '1Month'
  start?: string | Date
  end?: string | Date
  limit?: number
  adjustment?: 'raw' | 'split' | 'dividend' | 'all'
  feed?: 'iex' | 'sip'
  asof?: string
  page_token?: string
}

export interface AlpacaTradesRequest {
  symbols: string[]
  start?: string | Date
  end?: string | Date
  limit?: number
  feed?: 'iex' | 'sip'
  page_token?: string
}

export interface AlpacaSnapshotRequest {
  symbols: string[]
  feed?: 'iex' | 'sip'
  currency?: string
}

// =============================================================================
// WebSocket Subscription Types
// =============================================================================

export interface AlpacaWebSocketSubscription {
  trades?: string[]
  quotes?: string[]
  bars?: string[]
  updatedBars?: string[]
  dailyBars?: string[]
  statuses?: string[]
  lulds?: string[]
  corrections?: string[]
  cancelErrors?: string[]
}

export interface AlpacaWebSocketAuth {
  action: 'auth'
  key: string
  secret: string
}

export interface AlpacaWebSocketSubscribe {
  action: 'subscribe'
  trades?: string[]
  quotes?: string[]
  bars?: string[]
  updatedBars?: string[]
  dailyBars?: string[]
  statuses?: string[]
  lulds?: string[]
  corrections?: string[]
  cancelErrors?: string[]
}

// =============================================================================
// Error Types
// =============================================================================

export interface AlpacaError {
  code: number
  message: string
  details?: any
  timestamp: Date
  endpoint?: string
  method?: string
}

export interface AlpacaApiError extends Error {
  code: number
  response?: Response
  details?: any
}

// =============================================================================
// Utility Types
// =============================================================================

export type AlpacaTimeframe = '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | '1Day' | '1Week' | '1Month'

export type AlpacaOrderSide = 'buy' | 'sell'

export type AlpacaOrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'

export type AlpacaTimeInForce = 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'

export type AlpacaOrderStatus = 
  | 'new' 
  | 'partially_filled' 
  | 'filled' 
  | 'done_for_day' 
  | 'canceled' 
  | 'expired' 
  | 'replaced' 
  | 'pending_cancel' 
  | 'pending_replace' 
  | 'accepted' 
  | 'pending_new' 
  | 'accepted_for_bidding' 
  | 'stopped' 
  | 'rejected' 
  | 'suspended' 
  | 'calculated'

export type AlpacaAccountStatusType = 
  | 'ONBOARDING' 
  | 'SUBMISSION_FAILED' 
  | 'SUBMITTED' 
  | 'ACCOUNT_UPDATED' 
  | 'APPROVAL_PENDING' 
  | 'ACTIVE' 
  | 'REJECTED'

export type AlpacaAssetClass = 'us_equity' | 'crypto'

export type AlpacaAssetStatus = 'active' | 'inactive'

// =============================================================================
// Advanced Types for Professional Trading
// =============================================================================

export interface AlpacaOrderValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  estimatedCost: number
  estimatedCommission: number
  marginRequired: number
  buyingPowerRequired: number
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
    factors: string[]
    score: number
  }
}

export interface AlpacaPositionAnalysis {
  position: AlpacaPosition
  currentPrice: number
  dayChange: number
  dayChangePercent: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  realizedPnL: number
  avgCost: number
  marketValue: number
  allocation: number // Percentage of portfolio
  riskContribution: number
  beta: number
  correlation: number
  recommendation: 'HOLD' | 'REDUCE' | 'INCREASE' | 'CLOSE'
}

export interface AlpacaPortfolioAnalysis {
  account: AlpacaAccount
  positions: AlpacaPositionAnalysis[]
  performance: {
    totalReturn: number
    dayReturn: number
    weekReturn: number
    monthReturn: number
    yearReturn: number
    sharpeRatio: number
    maxDrawdown: number
    volatility: number
    beta: number
    alpha: number
  }
  risk: AlpacaRiskMetrics
  diversification: {
    sectorAllocation: Record<string, number>
    assetAllocation: Record<string, number>
    concentrationRisk: number
    correlationMatrix: Record<string, Record<string, number>>
  }
  recommendations: {
    rebalancing: AlpacaStrategySignal[]
    riskReduction: string[]
    opportunityAlerts: string[]
  }
}

// =============================================================================
// Export All Types
// =============================================================================

export type {
  // Core API types
  AlpacaAccount,
  AlpacaPosition,
  AlpacaOrder,
  AlpacaQuote,
  AlpacaBar,
  AlpacaTrade,
  
  // Request types
  CreateOrderRequest,
  AlpacaBarsRequest,
  AlpacaQuoteRequest,
  
  // Response types
  AlpacaApiResponse,
  AlpacaPaginatedResponse,
  AlpacaQuotesResponse,
  AlpacaBarsResponse,
  
  // Configuration
  AlpacaConfig,
  ConnectionStatus,
  
  // Advanced features
  AlpacaStrategySignal,
  AlpacaRiskMetrics,
  AlpacaPortfolioAnalysis
}

// =============================================================================
// Default Export for Convenience
// =============================================================================

export default {
  // Re-export commonly used types
  type AlpacaAccount,
  type AlpacaPosition,
  type AlpacaOrder,
  type AlpacaQuote,
  type AlpacaBar,
  type CreateOrderRequest,
  type AlpacaConfig,
  type ConnectionStatus
}
  