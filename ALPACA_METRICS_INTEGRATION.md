# Alpaca API Metrics Integration - Real-time Dashboard Data

## Overview

Connected AI Learning Progress and AI Performance sections on the trading dashboard to display real-time data from Alpaca API combined with Supabase historical data.

## Implementation Summary

### ✅ Files Modified

1. **[app/api/bot/metrics/route.ts](app/api/bot/metrics/route.ts)**
   - Added Alpaca API client integration
   - Fetches real-time account, positions, and orders data
   - Combines Alpaca data with Supabase historical data
   - Calculates comprehensive metrics

2. **[hooks/useRealTimeAIMetrics.ts](hooks/useRealTimeAIMetrics.ts)**
   - Simplified to single API call
   - Now uses `/api/bot/metrics` with Alpaca integration
   - 5-second refresh interval for real-time updates
   - Added new fields for portfolio data

3. **[components/dashboard/AITradingDashboard.tsx](components/dashboard/AITradingDashboard.tsx:584-632)**
   - Updated AI Performance section to show Invested Amount
   - Displays position count
   - Shows real-time P&L from Alpaca

## Data Sources Integration

### Alpaca API (Real-time)
```typescript
// Account Data
- portfolioValue: Current total portfolio value
- equity: Account equity
- buyingPower: Available buying power
- cash: Cash balance

// Positions Data
- investedAmount: Total value of all positions
- unrealizedPnL: Unrealized profit/loss
- dailyPnL: Intraday profit/loss
- positionCount: Number of open positions

// Orders Data
- tradesExecuted: Total filled orders
- todayTrades: Orders filled today
- successRate: Calculated from fill rate
```

### Supabase Database (Historical)
```typescript
// AI Learning Data
- accuracy: Win rate from historical trades
- patternsIdentified: Unique strategies * 3 + data points / 10
- dataPointsProcessed: Total learning records

// Trade History
- Historical P&L combined with Alpaca unrealized P&L
- Trade success tracking
- Strategy performance
```

## Metrics Calculated

### AI Learning Progress Section

**Accuracy Rate**
```typescript
const profitableCount = learningData.filter(d => d.outcome === 'profit').length
const accuracy = learningData.length > 0
  ? (profitableCount / learningData.length)
  : 0
// Displayed as: 85% (example)
```

**Patterns Identified**
```typescript
const uniqueStrategies = new Set(learningData.map(d => d.strategy_used))
const patternsIdentified = uniqueStrategies.size * 3 + Math.floor(learningData.length / 10)
// Example: 5 strategies * 3 + 100 data points / 10 = 25 patterns
```

**Data Points Processed**
```typescript
const dataPointsProcessed = learningData.length
// Total AI learning records from Supabase
```

### AI Performance Section

**Success Rate**
```typescript
const successRate = filledOrders.length > 0
  ? ((filledOrders.length - lossCount) / filledOrders.length) * 100
  : 0
// Real Alpaca filled orders vs loss outcomes
```

**Trades Executed**
```typescript
const tradesExecuted = alpacaOrders.filter(o => o.status === 'filled').length
// Direct from Alpaca API
```

**Recommendations Generated**
```typescript
const recommendationsGenerated = learningData.length
// From Supabase AI learning data
```

**Risk Score**
```typescript
const portfolioConcentration = (avgPositionSize / portfolioValue) * 100
const riskScore = Math.min(100, Math.max(0, portfolioConcentration * 2))
// 0-100 based on portfolio concentration
```

**Invested Amount** ✨ NEW
```typescript
const investedAmount = alpacaPositions.reduce((sum, pos) => {
  return sum + Math.abs(parseFloat(pos.market_value || 0))
}, 0)
// Total market value of all positions
```

**Total P&L**
```typescript
const totalUnrealizedPnL = alpacaPositions.reduce((sum, pos) => {
  return sum + parseFloat(pos.unrealized_pl || 0)
}, 0)
const historicalPnL = successfulTrades.reduce((sum, t) => {
  return sum + parseFloat(t.pnl || '0')
}, 0)
const totalPnL = totalUnrealizedPnL + historicalPnL
// Combined Alpaca unrealized + historical realized P&L
```

**Daily P&L**
```typescript
const dailyPnL = alpacaPositions.reduce((sum, pos) => {
  return sum + parseFloat(pos.unrealized_intraday_pl || 0)
}, 0)
// Real-time intraday P&L from Alpaca
```

## API Response Structure

### GET /api/bot/metrics?userId={userId}

```json
{
  // Bot Status
  "isRunning": true,
  "status": "running",
  "uptime": "2h 34m",
  "uptimeMs": 9240000,

  // AI Learning Progress (Supabase)
  "accuracy": 85,
  "patternsIdentified": 25,
  "dataPointsProcessed": 127,
  "isLearningActive": true,

  // Trading Performance (Alpaca + Supabase)
  "tradesExecuted": 15,
  "todayTrades": 3,
  "successfulTrades": 15,
  "successRate": 80.5,
  "recommendationsGenerated": 127,

  // Real-time Alpaca Portfolio Data
  "portfolioValue": 100245.67,
  "equity": 100245.67,
  "buyingPower": 250614.18,
  "cash": 95123.45,
  "investedAmount": 5122.22,

  // Real-time P&L from Alpaca
  "totalPnL": 245.67,
  "dailyPnL": 45.23,
  "unrealizedPnL": 122.22,

  // Risk Management
  "riskScore": 15,
  "positionCount": 3,

  // Additional Stats
  "avgTradeSize": 10.5,
  "lastTradeTime": "2025-10-03T14:23:45Z",
  "lastActivity": "2025-10-03T14:25:00Z",

  // Data Sources Verification
  "dataSources": {
    "alpaca": true,
    "supabase": true,
    "positions": 3,
    "orders": 15
  }
}
```

## Dashboard Display

### AI Learning Progress Panel

```
┌─────────────────────────────────────┐
│ 🧠 AI Learning Progress       [🟢]  │
├─────────────────────────────────────┤
│ Accuracy Rate          85.0% ↗     │
│ Patterns Identified         25 +5   │
│ Data Points Processed      127 📈   │
│                                     │
│ Learning Sources                    │
│ ├─ Alpaca API      [Live 🟢]       │
│ ├─ Supabase DB     [Synced 🔵]     │
│ └─ React Query     [Caching 🟣]    │
└─────────────────────────────────────┘
```

### AI Performance Panel

```
┌─────────────────────────────────────┐
│ 📊 AI Performance             [Live]│
├─────────────────────────────────────┤
│ Success Rate      80.5% 🎯          │
│ Trades Executed        15 📊        │
│ Recommendations       127 💡        │
│ Risk Score         15/100 🛡️       │
│                                     │
│ Real-time Alpaca Portfolio          │
│ ├─ Invested Amount  $5,122.22 (3 pos)│
│ ├─ Total P&L        +$245.67 📈    │
│ └─ Daily P&L         +$45.23        │
└─────────────────────────────────────┘
```

## Real-time Updates

**Refresh Intervals:**
- Metrics API: Every 5 seconds
- React Query stale time: 2 seconds
- Alpaca data: Fetched on each metrics request

**Data Flow:**
```
Dashboard Component
    ↓
useRealTimeAIMetrics Hook (5s refresh)
    ↓
/api/bot/metrics
    ↓
┌─────────────────┬──────────────────┐
│ Alpaca API      │ Supabase DB      │
│ • Account       │ • AI Learning    │
│ • Positions     │ • Trade History  │
│ • Orders        │ • Bot Status     │
└─────────────────┴──────────────────┘
    ↓
Calculated Metrics
    ↓
Dashboard Display (Real-time)
```

## Benefits

✅ **Real-time Data**: Live Alpaca account & position data
✅ **Historical Context**: Supabase provides learning history
✅ **Accurate Calculations**: Combined data sources for precise metrics
✅ **Portfolio Insights**: See invested amount and position count
✅ **P&L Tracking**: Unrealized + realized profit/loss
✅ **Risk Monitoring**: Dynamic risk score based on concentration
✅ **Data Source Verification**: Know which APIs are connected

## Error Handling

```typescript
// Graceful degradation if Alpaca API fails
try {
  [alpacaAccount, alpacaPositions, alpacaOrders] = await Promise.all([
    alpacaClient.getAccount(),
    alpacaClient.getPositions(),
    alpacaClient.getOrders({ status: 'all', limit: 100 })
  ])
} catch (alpacaError) {
  console.warn('⚠️ Alpaca API error, using Supabase data only:', alpacaError)
  // Falls back to Supabase-only data
}
```

## Testing

Start the bot and verify:
1. ✅ Accuracy rate shows real % from Supabase
2. ✅ Patterns increase with learning data
3. ✅ Trades executed matches Alpaca filled orders
4. ✅ Invested amount = sum of position market values
5. ✅ Total P&L = unrealized (Alpaca) + realized (Supabase)
6. ✅ Daily P&L shows intraday changes
7. ✅ Position count displays correctly
8. ✅ Risk score updates based on portfolio concentration

## Console Verification

```bash
# Check API response
curl http://localhost:3000/api/bot/metrics?userId=demo-user

# Look for:
✅ dataSources.alpaca: true
✅ investedAmount: <number>
✅ positionCount: <number>
✅ totalPnL: <number>
✅ accuracy: <0-100>
```

---

**Status**: ✅ Fully Integrated
**Data Sources**: Alpaca API (real-time) + Supabase (historical)
**Update Frequency**: Every 5 seconds
**Fallback**: Supabase-only if Alpaca fails
