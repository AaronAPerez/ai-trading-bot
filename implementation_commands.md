# 🚀 AI Trading Bot - Real Data Implementation Commands

## Windows PowerShell Commands (npm)

### Step 1: Environment Setup

```powershell
# Create .env.local file
New-Item -Path .env.local -ItemType File -Force

# Add your REAL credentials to .env.local:
# APCA_API_KEY_ID=your_real_paper_key
# APCA_API_SECRET_KEY=your_real_paper_secret
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_key
# NEXT_PUBLIC_DEMO_MODE=false
# NEXT_PUBLIC_USE_REAL_DATA=true
```

### Step 2: Install Dependencies

```powershell
# Install all required packages
npm install

# Install production dependencies
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest zustand immer

# Verify installation
npm list @tanstack/react-query zustand
```

### Step 3: Database Setup

```powershell
# Test Supabase connection
npm run supabase:test

# Run database migrations
npm run supabase:migration:apply

# Verify tables created
# Go to https://supabase.com/dashboard → SQL Editor → Check tables
```

### Step 4: Remove Mock Data

```powershell
# Delete demo/mock files
Remove-Item -Path "scripts/populate-demo-data.ts" -ErrorAction SilentlyContinue
Remove-Item -Path "lib/services/DemoModeService.ts" -ErrorAction SilentlyContinue

# Search for remaining mock data references
Select-String -Path "lib/**/*.ts" -Pattern "mock|demo|fake|simulate" -ErrorAction SilentlyContinue
```

### Step 5: Create Required API Routes

```powershell
# Create bot control API route
New-Item -Path "app/api/ai/bot-control" -ItemType Directory -Force
# Then add the route.ts file content from artifact

# Create Alpaca proxy routes (if not exist)
New-Item -Path "app/api/alpaca/account" -ItemType Directory -Force
New-Item -Path "app/api/alpaca/positions" -ItemType Directory -Force
New-Item -Path "app/api/alpaca/orders" -ItemType Directory -Force
```

### Step 6: Validation & Testing

```powershell
# Create validation script
New-Item -Path "scripts/validate-real-data.ts" -ItemType File -Force
# Add validation script content

# Add validation script to package.json
# "validate:real-data": "ts-node scripts/validate-real-data.ts"

# Run validation
npm run validate:real-data

# Test Alpaca API connection
npm run alpaca:test

# Test Supabase connection
npm run supabase:test
```

### Step 7: Build & Run

```powershell
# Type check
npm run type-check

# Lint code
npm run lint

# Run tests
npm test

# Build for production
npm run build

# Start development server
npm run dev
```

---

## 📋 Implementation Checklist

### Prerequisites ✅
- [ ] Node.js >= 18.x installed
- [ ] npm >= 9.x installed
- [ ] Alpaca Paper Trading account created
- [ ] Supabase project created (free tier)
- [ ] Git repository initialized

### Environment Configuration ✅
- [ ] `.env.local` file created
- [ ] Real Alpaca API keys added
- [ ] Real Supabase credentials added
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` set
- [ ] No test/demo values in env variables

### Database Setup ✅
- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] All 10 tables created:
  - [ ] `user_profiles`
  - [ ] `trading_accounts`
  - [ ] `trading_strategies`
  - [ ] `trade_history`
  - [ ] `ai_recommendations`
  - [ ] `ai_learning_data`
  - [ ] `market_sentiment`
  - [ ] `bot_metrics`
  - [ ] `bot_activity_logs`
  - [ ] `portfolio_snapshots`
- [ ] RLS policies enabled
- [ ] Service role configured

### Code Implementation ✅
- [ ] Deleted `scripts/populate-demo-data.ts`
- [ ] Deleted `lib/services/DemoModeService.ts`
- [ ] Removed all `generateMock*` functions
- [ ] Removed all `getFallback*` functions
- [ ] Implemented `app/api/ai/bot-control/route.ts`
- [ ] Created `lib/ai/RealAITradingBot.ts`
- [ ] Created `hooks/useRealAlpacaData.ts`
- [ ] Created `store/realTradingStore.ts`
- [ ] Created dashboard component

### React Query Setup ✅
- [ ] `@tanstack/react-query` installed
- [ ] Query client configured
- [ ] Real account query hook created
- [ ] Real positions query hook created
- [ ] Real orders query hook created
- [ ] Real market data query hook created
- [ ] Mutation hooks for orders created
- [ ] Query invalidation setup

### Zustand Store Setup ✅
- [ ] `zustand` installed
- [ ] Real trading store created
- [ ] No mock data in store
- [ ] Persistence middleware configured
- [ ] DevTools middleware enabled
- [ ] State validation implemented

### API Routes ✅
- [ ] `/api/ai/bot-control` - Bot start/stop/status
- [ ] `/api/alpaca/account` - Real account data
- [ ] `/api/alpaca/positions` - Real positions
- [ ] `/api/alpaca/orders` - Real order execution
- [ ] `/api/alpaca/bars` - Real market data
- [ ] `/api/bot-activity` - Real activity logs

### Testing & Validation ✅
- [ ] Validation script created
- [ ] Validation script runs successfully
- [ ] Alpaca API test passes
- [ ] Supabase connection test passes
- [ ] No "mock" warnings in console
- [ ] Test order execution with $1
- [ ] Verify order in Alpaca dashboard
- [ ] Verify data in Supabase dashboard

### Production Readiness ✅
- [ ] TypeScript builds without errors
- [ ] ESLint passes
- [ ] All tests pass
- [ ] Environment variables validated
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting considered
- [ ] Security review completed

---

## 🔍 Verification Commands

### Check Real Data Flow

```powershell
# Start dev server with logging
$env:DEBUG="*"; npm run dev

# In browser console, check for:
# ✅ "Connected to real Alpaca account"
# ✅ "Real buying power: $XXX"
# ❌ Should NOT see: "mock", "demo", "fallback", "simulation"
```

### Monitor Real Orders

```powershell
# Watch logs in terminal while bot runs
# Look for:
# "🚀 Executing REAL trade"
# "✅ REAL order placed successfully"
# "💾 Trade saved to Supabase"
```

### Verify Database

```powershell
# Check Supabase dashboard
# SQL Editor → Run:
# SELECT * FROM trade_history ORDER BY timestamp DESC LIMIT 10;
# Should show real trades with real order IDs
```

---

## 🚨 Troubleshooting

### Issue: "No real data available"
```powershell
# Check Alpaca API keys
$env:APCA_API_KEY_ID
$env:APCA_API_SECRET_KEY

# Test connection manually
npm run alpaca:test
```

### Issue: "Supabase connection failed"
```powershell
# Check Supabase credentials
$env:NEXT_PUBLIC_SUPABASE_URL
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection
npm run supabase:test
```

### Issue: "Mock data detected"
```powershell
# Search for mock references
Select-String -Path "lib/**/*.ts","app/**/*.ts" -Pattern "mock|demo|fake"

# Remove or comment out mock fallbacks
```

### Issue: "Orders not executing"
```powershell
# Check Alpaca account status
# Verify paper trading account is active
# Check buying power is sufficient
# Review bot logs for errors
```

---

## 📊 Success Metrics

Your implementation is SUCCESSFUL when:

✅ **Bot Status Dashboard shows:**
- Real account number from Alpaca
- Real buying power from Alpaca API
- Real equity from Alpaca API
- Real positions count from Alpaca API

✅ **Orders Execute Successfully:**
- Orders appear in Alpaca paper trading dashboard
- Order IDs are real Alpaca order IDs (format: alpaca_order_xxx)
- Positions update in real-time

✅ **Database Records Real Trades:**
- Trades appear in Supabase `trade_history` table
- Each trade has a real Alpaca order_id
- Timestamps are accurate
- All fields populated with real data

✅ **No Mock Data References:**
- Console logs show NO "mock", "demo", "fake", "simulate"
- All API calls go to real Alpaca API
- All database calls go to real Supabase
- Validation script passes 100%

✅ **React Query Working:**
- Real-time data updates every 5-15 seconds
- Account balance changes reflect in UI
- Position updates show immediately
- No stale data warnings

✅ **Zustand State Management:**
- Store contains only real data
- No mock data in persisted state
- State updates trigger UI refreshes
- DevTools show real data flow

---

## 🎯 Next Steps After Setup

1. **Test with Small Amounts**
   ```powershell
   # Execute test trade with $1
   # Verify it appears in Alpaca dashboard
   # Verify it's saved to Supabase
   ```

2. **Monitor for 24 Hours**
   ```powershell
   # Let bot run with autoExecute=false
   # Review recommendations
   # Manually approve good trades
   ```

3. **Enable Auto-Execution** (when confident)
   ```powershell
   # Set autoExecuteOrders=true in config
   # Start with small position sizes
   # Monitor closely for first few trades
   ```

4. **Scale Up**
   ```powershell
   # Increase position sizes gradually
   # Add more symbols to trade
   # Adjust confidence thresholds
   # Optimize strategy parameters
   ```

---

## 📞 Support Resources

- **Alpaca API Docs:** https://alpaca.markets/docs/api-references/trading-api/
- **Supabase Docs:** https://supabase.com/docs
- **React Query Docs:** https://tanstack.com/query/latest/docs/react/overview
- **Zustand Docs:** https://docs.pmnd.rs/zustand/getting-started/introduction

---

## ⚠️ CRITICAL REMINDERS

1. **Always verify real data sources** - Run validation script before every deployment
2. **Never mix mock and real data** - It corrupts learning and analysis
3. **Test with paper trading first** - Never go directly to live trading
4. **Monitor logs constantly** - Watch for unexpected mock data fallbacks
5. **Validate every order** - Check Alpaca dashboard to confirm real execution
6. **Backup database regularly** - Supabase automatic backups + manual exports
7. **Review bot activity daily** - Ensure strategies are performing as expected

---

**Remember:** Alpaca Paper Trading uses REAL market data with FAKE money. Perfect for testing your bot without risk!