# 🏦 Hedge Fund Engine - User Guide

## Overview

The Hedge Fund Engine is a professional-grade trading system that orchestrates a complete trading cycle with five integrated components:

1. **Signal Generation** - Multi-strategy analysis using real Alpaca market data
2. **Risk Management** - Comprehensive risk checks before every trade
3. **Trade Execution** - Real order placement via Alpaca API
4. **Analytics** - Performance tracking and trade history in Supabase
5. **AI Learning** - Continuous strategy improvement through outcome analysis

## Accessing the UI

### Method 1: Navigation Menu
1. Go to your dashboard at `/dashboard`
2. Click on **🏦 Hedge Fund Engine** in the sidebar navigation

### Method 2: Quick Actions
1. On the main dashboard page
2. Click the **Hedge Fund Engine** card under "Quick Actions"

### Method 3: Direct URL
Navigate directly to: `/dashboard/hedge-fund`

## Dashboard Features

### 🎯 Engine Status Panel

**Location:** Top of the page

**Displays:**
- Overall system health (Healthy/Degraded/Offline)
- Alpaca API connection status
- Supabase database connection status
- Current trading mode (Paper/Live)

**Color Indicators:**
- 🟢 Green: System healthy and operational
- 🟡 Yellow: System degraded (partial functionality)
- 🔴 Red: System offline (trading suspended)

### 🎮 Trading Cycle Control

**Location:** Second panel from top

**Features:**
- **Symbol Input**: Enter any stock symbol (e.g., AAPL, TSLA, NVDA)
- **Strategy Selector**: Choose specific strategy or let AI auto-select
  - Auto-Select Best (recommended)
  - Momentum
  - Mean Reversion
  - Breakout
- **Amount**: Set notional trading amount in dollars
- **Execute Cycle**: Run complete trading cycle
- **Dry Run**: Test without placing real orders

**How to Run a Trade:**
1. Enter a symbol (e.g., "AAPL")
2. Select a strategy or leave on "Auto-Select"
3. Set the dollar amount you want to trade
4. Click **Execute Cycle** (or **Dry Run** to test)

**Cycle Results Show:**
- Status (Executed/Rejected/Hold/Error)
- Signal confidence percentage
- Execution reason
- Order ID (if successful)
- Total cycle latency in milliseconds

### 📊 Performance Metrics

**Location:** Below trading control

**4 Key Metrics:**
1. **Total Trades**: Number of completed trades
2. **Success Rate**: Percentage of profitable trades
3. **Total Volume**: Dollar value traded
4. **Active Strategies**: Number of strategies running

### 🧠 Strategy Performance

**Location:** Middle section

**Shows for Each Strategy:**
- Strategy name (Momentum, Mean Reversion, etc.)
- Win rate percentage
- Sharpe ratio (risk-adjusted returns)
- Total P&L (profit/loss)
- Number of trades executed

**Use This To:**
- Identify best performing strategies
- See which strategies work for current market conditions
- Make informed decisions on strategy selection

### 📈 Recent Trades Table

**Location:** Lower section

**Columns:**
- **Symbol**: Stock ticker traded
- **Side**: BUY or SELL
- **Quantity**: Number of shares
- **Price**: Execution price per share
- **Value**: Total trade value
- **Status**: FILLED, PENDING, REJECTED
- **Time**: Trade timestamp

**Features:**
- Shows last 10 trades
- Color-coded buy/sell indicators
- Real-time updates

### ⚡ Activity Log

**Location:** Bottom of page

**Shows:**
- System events
- Risk checks
- Trade executions
- Errors and warnings
- Timestamps for all events

**Activity Types:**
- 🔵 SYSTEM: Engine status changes
- 🟡 RISK: Risk evaluation results
- 🟢 TRADE: Successful executions
- 🔴 ERROR: Failed operations

## API Endpoints

The UI connects to these backend endpoints:

### GET /api/hedge-fund/status
Returns engine status and health information

**Query Parameters:**
- `userId` (optional): User identifier
- `mode` (optional): 'paper' or 'live'

### GET /api/hedge-fund/analytics
Returns comprehensive analytics and performance data

**Query Parameters:**
- `userId` (optional): User identifier
- `mode` (optional): 'paper' or 'live'

### POST /api/hedge-fund/run-cycle
Executes a complete trading cycle

**Request Body:**
```json
{
  "symbol": "AAPL",
  "strategy": "momentum",
  "notionalAmount": 1000,
  "userId": "test-user",
  "mode": "paper",
  "dryRun": false
}
```

## Trading Cycle Flow

When you click "Execute Cycle", here's what happens:

```
1️⃣ SIGNAL GENERATION
   ↓ Fetch market data from Alpaca
   ↓ Run strategy analysis
   ↓ Generate BUY/SELL/HOLD signal with confidence

2️⃣ RISK EVALUATION
   ↓ Check portfolio exposure
   ↓ Verify buying power
   ↓ Validate position size
   ↓ Approve or reject trade

3️⃣ EXECUTION (if approved)
   ↓ Create order request
   ↓ Submit to Alpaca API
   ↓ Monitor order status
   ↓ Return execution result

4️⃣ ANALYTICS
   ↓ Record trade in Supabase
   ↓ Update performance metrics
   ↓ Log activity

5️⃣ AI LEARNING
   ↓ Calculate prediction accuracy
   ↓ Update strategy performance
   ↓ Generate recommendations
```

## Configuration

### Trading Mode

**Paper Trading (Default):**
- Uses Alpaca paper trading account
- Virtual money, zero risk
- Perfect for testing and learning
- Same market data and execution flow

**Live Trading:**
- Real money, real trades
- Requires funded Alpaca account
- Use with caution
- All safety checks still apply

### Risk Parameters

The engine enforces these safety limits:

- **Max Drawdown**: 15% (trading stops if exceeded)
- **Max Exposure**: 50% of portfolio
- **Max Position Size**: 10% per trade
- **Max Daily Loss**: 5%
- **Min Confidence**: 60% for trade execution
- **Max Open Positions**: 10 concurrent trades

## Best Practices

### For Testing
1. Start with dry runs to understand the system
2. Use small dollar amounts ($100-$500)
3. Test with liquid stocks (AAPL, MSFT, GOOGL)
4. Review strategy performance before going live

### For Production
1. Let the system accumulate data (20+ trades per strategy)
2. Use "Auto-Select Best" for strategy selection
3. Monitor activity log for warnings
4. Set appropriate position sizes based on account value
5. Review performance metrics weekly

### Strategy Selection
- **Auto-Select**: Best for general use (system picks top performer)
- **Momentum**: Good in trending markets
- **Mean Reversion**: Good in ranging markets
- **Breakout**: Good for capturing volatility expansions

## Troubleshooting

### "System Offline" Status
- Check internet connection
- Verify Alpaca API credentials
- Check Supabase connection
- Review browser console for errors

### "Risk Check Rejected"
- Trade violated risk parameters
- Check account buying power
- Reduce position size
- Review portfolio exposure

### "Execution Failed"
- Alpaca API error
- Invalid symbol
- Market closed
- Insufficient funds
- Check activity log for details

## Support

For issues or questions:
- Check the Activity Log for detailed error messages
- Review the [HedgeFundEngine.ts](lib/hedge-fund-engine/HedgeFundEngine.ts) implementation
- Check API logs in `/api/hedge-fund/*` routes
- Review Supabase database tables for data issues

## Technical Details

**Frontend Component:**
- `components/dashboard/HedgeFundEngineDashboard.tsx`

**Backend APIs:**
- `app/api/hedge-fund/run-cycle/route.ts`
- `app/api/hedge-fund/status/route.ts`
- `app/api/hedge-fund/analytics/route.ts`

**Core Engine:**
- `lib/hedge-fund-engine/HedgeFundEngine.ts`
- `lib/hedge-fund-engine/SignalEngine.ts`
- `lib/hedge-fund-engine/RiskEngine.ts`
- `lib/hedge-fund-engine/ExecutionRouter.ts`
- `lib/hedge-fund-engine/AnalyticsEngine.ts`
- `lib/hedge-fund-engine/LearningEngine.ts`

**Data Sources:**
- Market Data: Alpaca API (real-time bars)
- Execution: Alpaca Trading API
- Storage: Supabase PostgreSQL
- Learning: AI feedback loops

---

**Built with:**
- Next.js 14
- React Query
- Alpaca Markets API
- Supabase
- TypeScript
