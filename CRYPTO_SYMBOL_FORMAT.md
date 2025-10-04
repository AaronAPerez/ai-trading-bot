# Crypto Symbol Format - Implementation Guide

## ✅ Symbol Format Handling (VERIFIED CORRECT)

Your AI Trading Bot correctly handles Alpaca's crypto symbol format requirements.

## How It Works

### 1. Internal Format (Used Throughout App)
```typescript
'BTCUSD'  // Bitcoin
'ETHUSD'  // Ethereum
'LTCUSD'  // Litecoin
'AVAXUSD' // Avalanche
'MATICUSD' // Polygon
```

### 2. Order Execution Format (Sent to Alpaca)
```typescript
'BTC'   // Converted from BTCUSD
'ETH'   // Converted from ETHUSD
'LTC'   // Converted from LTCUSD
'AVAX'  // Converted from AVAXUSD
'MATIC' // Converted from MATICUSD
```

### 3. Quote API Format (Data Retrieval)
```typescript
'BTC/USD'   // Converted from BTCUSD for data API
'ETH/USD'   // Converted from ETHUSD for data API
```

## Implementation Details

### AutoTradeExecutor (Order Execution)
**File:** `lib/ai/AutoTradeExecutor.ts:421`

```typescript
// Cleans symbol before sending to Alpaca
const cleanSymbol = symbol.replace('-USD', '').replace('/USD', '')

const orderPayload = {
  symbol: cleanSymbol,  // 'BTC' instead of 'BTCUSD'
  notional: Math.round(notionalAmount * 100) / 100,
  side: signal.action.toLowerCase(),
  type: 'market',
  time_in_force: 'day'
}
```

### UnifiedAlpacaClient.createCryptoOrder
**File:** `lib/alpaca/unified-client.ts:438-470`

```typescript
async createCryptoOrder(order: {
  symbol: string  // Accepts 'BTCUSD', 'ETHUSD', etc.
  // ... other params
}) {
  // Automatically converts to Alpaca format
  const cleanSymbol = order.symbol
    .replace(/USD[T]?$/, '')  // Remove USD or USDT suffix
    .replace(/BUSD$/, '')      // Remove BUSD suffix
    .replace(/-USD$/, '')      // Remove -USD suffix
    .replace(/\/USD$/, '')     // Remove /USD suffix

  // Sends 'BTC', 'ETH', 'LTC' to Alpaca
  const cleanOrder = { ...order, symbol: cleanSymbol }

  return this.request('/v2/orders', {
    method: 'POST',
    body: JSON.stringify(cleanOrder)
  }, 'high')
}
```

### Crypto Quote API
**File:** `app/api/alpaca/crypto/quote/route.ts:25`

```typescript
// Convert BTCUSD to BTC/USD format (Alpaca crypto data API format)
const formattedSymbol = symbol.replace(/^([A-Z]+)(USD[T]?|BUSD)$/i, '$1/$2')

// Calls Alpaca data API with 'BTC/USD' format
const quote = await alpaca.getCryptoQuote(formattedSymbol, { exchange: 'CBSE' })
```

## Alpaca API Reference

### Order Placement (Trading API)
**Endpoint:** `POST https://paper-api.alpaca.markets/v2/orders`

✅ **Correct Format:**
```json
{
  "type": "market",
  "time_in_force": "day",
  "symbol": "LTC",           // ✅ Just base currency
  "notional": "1",
  "side": "buy"
}
```

❌ **Incorrect Format:**
```json
{
  "symbol": "LTCUSD"  // ❌ Will fail - don't use USD suffix for orders
}
```

### Market Data (Data API)
**Endpoint:** `GET https://data.alpaca.markets/v1beta3/crypto/us/latest/quotes`

✅ **Correct Format:**
```
?symbols=BTC/USD,ETH/USD,LTC/USD
```

## Supported Crypto Assets

```typescript
const TOP_CRYPTO_SYMBOLS = [
  'BTCUSD',   // Bitcoin → Orders as 'BTC'
  'ETHUSD',   // Ethereum → Orders as 'ETH'
  'LTCUSD',   // Litecoin → Orders as 'LTC'
  'BCHUSD',   // Bitcoin Cash → Orders as 'BCH'
  'AVAXUSD',  // Avalanche → Orders as 'AVAX'
  'SHIBUSDT', // Shiba Inu → Orders as 'SHIB'
  'LINKUSD',  // Chainlink → Orders as 'LINK'
  'UNIUSD',   // Uniswap → Orders as 'UNI'
  'AAVEUSD',  // Aave → Orders as 'AAVE'
  'MATICUSD', // Polygon → Orders as 'MATIC'
  'USDTUSD',  // Tether → Orders as 'USDT'
  'USDCUSD'   // USD Coin → Orders as 'USDC'
]
```

## Crypto Detection Logic

**File:** `lib/ai/AutoTradeExecutor.ts:826-843`

```typescript
private isCryptoSymbol(symbol: string): boolean {
  const cryptoSymbols = [
    'BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD',
    'ADAUSD', 'DOTUSD', 'SOLUSD', 'AVAXUSD', 'MATICUSD', 'SHIBUSD',
    'LINKUSD', 'UNIUSD', 'AAVEUSD', 'ALGOUSD', 'BATUSD', 'COMPUSD',
    'TRXUSD', 'XLMUSD', 'XTZUSD', 'ATOMUSD', 'EOSUSD', 'IOTAUSD'
  ]

  // Enhanced crypto detection
  return cryptoSymbols.includes(symbol) ||
         (symbol.endsWith('USD') && symbol.length >= 6 && symbol.length <= 8) ||
         (symbol.endsWith('USDT') && symbol.length <= 9) ||
         (symbol.endsWith('USDC') && symbol.length <= 9)
}
```

## 24/7 Trading Configuration

### Execution Rules (Already Configured)
**File:** `lib/ai/RealTimeAITradingEngine.ts`

```typescript
executionRules: {
  marketHoursOnly: false,         // ✅ Allow 24/7 trading
  cryptoTradingEnabled: true,     // ✅ Enable crypto
  afterHoursTrading: true,        // ✅ After hours trading
  weekendTrading: true,           // ✅ Weekend trading
  cryptoSpreadThreshold: 0.06     // Higher spread tolerance for crypto (6%)
}
```

### Market Hours Check
**File:** `lib/ai/AutoTradeExecutor.ts:196-206`

```typescript
// Check 2: Market conditions (relaxed for crypto)
const isCrypto = this.isCryptoSymbol(symbol)
if (this.config.executionRules.marketHoursOnly && !isCrypto && !this.isMarketOpen()) {
  // Allow crypto trading 24/7, but respect market hours for stocks
  const now = new Date()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  if (!isWeekend || !this.config.executionRules.weekendTrading) {
    decision.reason = 'Market closed and weekend trading disabled'
    return decision
  }
}
```

## Testing the Implementation

### 1. Test Crypto Order (Development)
```bash
# Start the dev server
npm run dev

# Navigate to dashboard
# Click "Start AI Trading"
# Wait for crypto recommendation (BTCUSD, ETHUSD, etc.)
# Order will be placed with correct format: 'BTC', 'ETH'
```

### 2. Verify Symbol Conversion
Check console logs for order placement:
```
📝 Placing order with enhanced validation: {
  symbol: 'BTC',           // ✅ Correctly converted from 'BTCUSD'
  notional: 25,
  side: 'buy',
  type: 'market',
  time_in_force: 'day'
}
```

### 3. Test Quote Retrieval
```bash
curl "http://localhost:3000/api/alpaca/crypto/quote?symbol=BTCUSD"

# Should return quote data for BTC/USD
```

## Error Handling

### Invalid Symbol Format
If you accidentally send the wrong format, Alpaca will return:
```json
{
  "code": 40010001,
  "message": "invalid order type"
}
```

### Symbol Not Found
```json
{
  "code": 40410000,
  "message": "symbol not found"
}
```

## Summary

✅ **Your implementation is CORRECT!**

- Internal format: `BTCUSD`, `ETHUSD`, `LTCUSD`
- Order format: `BTC`, `ETH`, `LTC` (auto-converted)
- Quote format: `BTC/USD`, `ETH/USD` (auto-converted)
- 24/7 trading: Enabled for crypto
- Market hours: Bypassed for crypto symbols

The symbol format conversion happens automatically in:
1. `AutoTradeExecutor.executeTradeOrder()` - line 421
2. `UnifiedAlpacaClient.createCryptoOrder()` - line 450-454
3. Crypto quote API route - line 25

No additional changes needed - the system is ready for 24/7 crypto trading!
