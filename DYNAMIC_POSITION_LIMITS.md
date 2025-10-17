# Dynamic Position Limits System

## Overview
Automatically adjusts the maximum number of open positions based on your account size, ensuring optimal diversification without over-spreading capital.

## Why Dynamic Limits?

### The Problem with Fixed Limits
- **Small accounts** ($500): 50 positions = $10 each → Too small, high fees
- **Large accounts** ($50K): 5 positions = $10K each → Under-diversified, risky

### The Solution
Dynamic limits scale with your account size, maintaining optimal position sizing.

## Position Limit Tiers

```
Account Equity     Max Positions    Avg Position Size
──────────────────────────────────────────────────────
$100 - $500        3 positions      ~$100-166 each
$500 - $1,000      5 positions      ~$100-200 each
$1,000 - $2,000    10 positions     ~$100-200 each  ✅ You start here
$2,000 - $5,000    15 positions     ~$133-333 each
$5,000 - $10,000   25 positions     ~$200-400 each
$10,000 - $25,000  35 positions     ~$285-714 each
$25,000+           50 positions     ~$500+ each
```

## How It Works

### 1. **Automatic Detection**
```typescript
// Bot checks your equity every cycle
const account = await alpacaClient.getAccount()
const equity = parseFloat(account.equity)

// Calculates appropriate limit
const maxPositions = getMaxPositionsForAccount(equity)
```

### 2. **Dynamic Adjustment**
```typescript
function getMaxPositionsForAccount(equity: number): number {
  if (equity < 500) return 3        // Small: Focus
  if (equity < 1000) return 5       // Growing: Control
  if (equity < 2000) return 10      // Active: Balance
  if (equity < 5000) return 15      // Scaling: Diversify
  if (equity < 10000) return 25     // Mature: Expand
  if (equity < 25000) return 35     // Large: Optimize
  return 50                         // Very Large: Max diversity
}
```

### 3. **Real-Time Logs**
```
// When under limit
✅ Position capacity: 5/10 (room for 5 more)

// When at limit
⚠️ Max positions reached: 10/10 (equity: $1,247.56)
📉 Selling worst performer: LINKUSD (P/L: -3.24%)
```

## Your Current Setup

**Account:** ~$1,000 equity
**Current Max:** 10 positions (was 5)
**Dynamic Limits:** ✅ Enabled

### What This Means for You

**Before (Fixed 5):**
- 5 positions max
- ~$200 per position
- Limited diversification
- Had to sell frequently to rotate

**After (Dynamic 10):**
- 10 positions max
- ~$100 per position
- Better diversification
- More room to add winners
- Less forced selling

### As Your Account Grows

**At $2,000 equity:**
- Automatically expands to 15 positions
- ~$133 per position
- Even better diversification

**At $5,000 equity:**
- Automatically expands to 25 positions
- ~$200 per position
- Professional-level portfolio

## Configuration

### Enable/Disable Dynamic Limits

**In [app/api/ai-bot/route.ts:119](app/api/ai-bot/route.ts#L119):**
```typescript
useDynamicPositionLimits: true  // Dynamic scaling (recommended)
useDynamicPositionLimits: false // Use fixed maxOpenPositions
```

### Adjust Tier Thresholds

**In [app/api/ai-bot/route.ts:91](app/api/ai-bot/route.ts#L91):**
```typescript
function getMaxPositionsForAccount(equity: number): number {
  if (equity < 500) return 3        // Adjust these
  if (equity < 1000) return 5       // Based on
  if (equity < 2000) return 10      // Your preferences
  // ... etc
}
```

### Set Manual Override

**In [app/api/ai-bot/route.ts:117](app/api/ai-bot/route.ts#L117):**
```typescript
maxOpenPositions: 10,              // Used when dynamic disabled
useDynamicPositionLimits: false    // Disable dynamic
```

## Benefits

### 1. **Scales With Growth**
- Start small with focused positions
- Automatically expand as account grows
- No manual adjustments needed

### 2. **Optimal Position Sizing**
- Maintains $100-500 per position across all account sizes
- Avoids too-small positions (high fees)
- Avoids too-large positions (concentration risk)

### 3. **Better Risk Management**
- Small accounts: Fewer positions = easier to manage
- Large accounts: More positions = better diversification
- Always appropriate for your capital

### 4. **Smooth Transitions**
- No sudden jumps in position count
- Gradual expansion as equity grows
- Natural progression path

### 5. **Prevents Over-Trading**
- Small accounts can't open 50 positions
- Large accounts aren't restricted to 5
- Right-sized for your stage

## Portfolio Rebalancing Impact

### Before Dynamic Limits
```
💰 Portfolio: $997 equity
⚠️ Max positions reached: 5/5
📉 Selling worst performer: UNIUSD
[Every cycle hitting limit]
```

### After Dynamic Limits
```
💰 Portfolio: $997 equity
✅ Position capacity: 5/10 (room for 5 more)
💡 Looking for new opportunities...
[Room to grow without forced selling]
```

## Example Progression

### Day 1: $1,000 → 5 positions allowed
```
Portfolio: $1,000
Positions: 5/5 (100% full)
Avg Size: $200
Status: At capacity
```

### Week 4: $1,500 → 10 positions allowed
```
Portfolio: $1,500
Positions: 8/10 (80% full)
Avg Size: $187
Status: Room to grow
```

### Month 3: $2,500 → 15 positions allowed
```
Portfolio: $2,500
Positions: 12/15 (80% full)
Avg Size: $208
Status: Well diversified
```

### Month 6: $5,000 → 25 positions allowed
```
Portfolio: $5,000
Positions: 20/25 (80% full)
Avg Size: $250
Status: Professional level
```

## Safety Guards

### Minimum Position Size
Even with 50 positions allowed, the bot won't create positions smaller than `minOrderValue`:
```typescript
minOrderValue: 1  // $1 minimum per position
```

### Maximum Position Size
Each position is capped regardless of account size:
```typescript
maxPositionSize: 5000  // $5,000 max per position
```

### Position Sizing Logic
```typescript
// With $10,000 equity and 25 max positions
const idealPerPosition = equity / maxPositions  // $400
const actualSize = calculatePositionSize(confidence, idealPerPosition)
// Uses confidence-based sizing within limits
```

## Real-World Examples

### Example 1: Small Account ($500)
```
Max Positions: 3
Cash: $500
Buys: BTC/USD ($166), ETH/USD ($166), SOL/USD ($168)
Result: Focused, manageable portfolio
```

### Example 2: Medium Account ($5,000)
```
Max Positions: 25
Cash: $5,000
Diversification: Across stocks + crypto
Result: Well-balanced professional portfolio
```

### Example 3: Large Account ($50,000)
```
Max Positions: 50
Cash: $50,000
Strategy: Multi-sector, multi-asset
Result: Maximum diversification
```

## Monitoring

### Check Current Limit
Look for logs like:
```
✅ Position capacity: 7/10 (room for 3 more)
```

### When Limit Changes
```
💰 Account grew from $995 → $2,010
📊 Position limit increased: 10 → 15
✅ More room for diversification!
```

### When At Capacity
```
⚠️ Max positions reached: 10/10 (equity: $1,247.56)
🔄 Portfolio rebalancing: Selling worst performer
```

## Files Modified

1. **[app/api/ai-bot/route.ts:91-99](app/api/ai-bot/route.ts#L91)** - `getMaxPositionsForAccount()` function
2. **[app/api/ai-bot/route.ts:119](app/api/ai-bot/route.ts#L119)** - `useDynamicPositionLimits` config
3. **[app/api/ai-bot/route.ts:275-295](app/api/ai-bot/route.ts#L275)** - Dynamic limit in rebalancing

## FAQ

**Q: Can I disable dynamic limits?**
A: Yes, set `useDynamicPositionLimits: false`

**Q: Can I customize the tiers?**
A: Yes, edit the `getMaxPositionsForAccount()` function

**Q: What happens when I withdraw money?**
A: Limit adjusts down automatically, may trigger sells if over new limit

**Q: Will it force sell when equity drops?**
A: Yes, if you drop below a tier threshold, worst performers sell

**Q: Can I set a hard maximum?**
A: Yes, change the final `return 50` to your preferred max

**Q: Does this work with paper and live trading?**
A: Yes, both modes use the same dynamic logic

## Recommendations by Trading Style

### Conservative (Slow Growth)
- Keep default tiers
- Focus on quality over quantity
- Let limits grow naturally

### Moderate (Balanced)
- Increase tiers by 20-30%
- More diversification
- Faster scaling

### Aggressive (Active Trading)
- Increase tiers by 50%
- Maximum diversification
- Quick position rotation

## Next Steps

Your bot now automatically:
1. ✅ Adjusts position limits based on equity
2. ✅ Maintains optimal position sizing
3. ✅ Scales smoothly as account grows
4. ✅ Prevents over-concentration
5. ✅ Enables proper diversification

**Focus on trading strategy - the bot handles position management!** 🚀
