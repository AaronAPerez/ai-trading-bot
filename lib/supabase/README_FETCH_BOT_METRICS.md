# Modular Supabase Fetch Wrapper - Bot Metrics

## Overview

This module provides a conflict-safe wrapper for handling `bot_metrics` operations with Supabase, solving the **409 Conflict** error that occurs when attempting to insert duplicate records.

## Problem Statement

When the "Start AI" button is clicked, the application was encountering a **409 Conflict** error:

```
POST https://baycyvjefrgihwivymxb.supabase.co/rest/v1/bot_metrics?select=*
Status: 409 Conflict
Error: 23505 (unique_violation)
```

This occurred because:
1. The `bot_metrics` table has a `UNIQUE` constraint on `user_id`
2. Multiple requests were trying to `INSERT` records for the same user
3. The Supabase client's `onConflict` parameter wasn't working as expected

## Solution

A modular fetch wrapper that:
- Uses direct REST API calls for more control
- Implements proper `upsert` logic with conflict resolution
- Provides automatic retry on 409 errors
- Offers multiple methods (POST with upsert, PATCH for updates, client library fallback)

## Files Created

### 1. `fetchBotMetrics.ts` - Main Wrapper Module

**Location:** `lib/supabase/fetchBotMetrics.ts`

**Functions:**
- `submitBotMetric()` - Submit metrics with upsert logic
- `fetchBotMetrics()` - Get metrics for a user
- `updateBotMetrics()` - Update specific fields using PATCH
- `upsertBotMetricsViaClient()` - Fallback using Supabase client

### 2. `fetchBotMetrics.example.ts` - Usage Examples

**Location:** `lib/supabase/fetchBotMetrics.example.ts`

Contains 7 complete examples showing different use cases.

## Usage

### Basic Upsert (Recommended)

```typescript
import { submitBotMetric } from '@/lib/supabase/fetchBotMetrics'

const result = await submitBotMetric(
  {
    user_id: userId,
    is_running: true,
    uptime: 0,
    trades_executed: 10,
    success_rate: 0.75,
    total_pnl: 150.50
  },
  {
    upsert: true,          // Enable upsert mode
    conflictColumn: 'user_id',
    returnRecord: true
  }
)
```

### Update Specific Fields

```typescript
import { updateBotMetrics } from '@/lib/supabase/fetchBotMetrics'

const result = await updateBotMetrics(userId, {
  is_running: false,
  uptime: 3600,
  last_activity: new Date().toISOString()
})
```

### Fetch Existing Metrics

```typescript
import { fetchBotMetrics } from '@/lib/supabase/fetchBotMetrics'

const metrics = await fetchBotMetrics(userId)
if (metrics) {
  console.log('Trades executed:', metrics.trades_executed)
}
```

## How It Works

### 1. Upsert Logic

The wrapper uses Supabase's `Prefer: resolution=merge-duplicates` header:

```typescript
const headers = {
  'Prefer': 'resolution=merge-duplicates,return=representation'
}
```

This tells Supabase to:
- Merge data if a conflict occurs (update instead of error)
- Return the created/updated record

### 2. Automatic Retry on Conflict

If a 409 conflict occurs and `upsert: false`, the wrapper automatically retries with `upsert: true`:

```typescript
if (res.status === 409 && !opts.upsert) {
  console.warn('Conflict detected, retrying with upsert=true')
  return submitBotMetric(metricPayload, { ...opts, upsert: true })
}
```

### 3. Session-Aware Authentication

The wrapper uses the current user's session token when available:

```typescript
const { data: { session } } = await supabase.auth.getSession()
if (session?.access_token) {
  authToken = session.access_token
}
```

This ensures RLS policies are respected.

## Integration

The wrapper has been integrated into:

### `app/api/ai/bot-control/route.ts`

**Before:**
```typescript
await supabaseService.upsertBotMetrics(userId, {
  is_running: true,
  uptime: 0,
  last_activity: new Date().toISOString()
})
```

**After:**
```typescript
await submitBotMetric({
  user_id: userId,
  is_running: true,
  uptime: 0,
  last_activity: new Date().toISOString()
}, {
  upsert: true,
  conflictColumn: 'user_id',
  returnRecord: false
})
```

## Benefits

### ✅ Conflict Resolution
- No more 409 errors when starting the bot
- Automatic handling of duplicate records

### ✅ Multiple Methods
- Direct REST API for maximum control
- PATCH for efficient partial updates
- Client library fallback option

### ✅ Type Safety
- Full TypeScript support
- Typed payload and options

### ✅ Error Handling
- Automatic retry on conflicts
- Detailed error logging
- Graceful fallbacks

### ✅ Session Awareness
- Uses authenticated session when available
- Falls back to anon key if needed
- Respects RLS policies

## Database Schema

The `bot_metrics` table has the following structure:

```sql
CREATE TABLE bot_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,  -- ⚠️ UNIQUE constraint on user_id
  is_running BOOLEAN DEFAULT FALSE,
  uptime BIGINT DEFAULT 0,
  trades_executed INTEGER DEFAULT 0,
  recommendations_generated INTEGER DEFAULT 0,
  success_rate DECIMAL DEFAULT 0,
  total_pnl DECIMAL DEFAULT 0,
  daily_pnl DECIMAL DEFAULT 0,
  risk_score DECIMAL DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The `UNIQUE` constraint on `user_id` is what triggers the 409 conflict when trying to insert duplicate records.

## Testing

Test the wrapper by:

1. **Start the bot** - Should work without 409 errors
2. **Start again** - Should update existing record
3. **Check logs** - Should see `[submitBotMetric] Success`

## Troubleshooting

### Still getting 409 errors?

1. Check that `upsert: true` is set in options
2. Verify the `Prefer` header includes `resolution=merge-duplicates`
3. Check browser console for detailed error messages

### Not updating existing records?

1. Ensure `user_id` matches exactly
2. Check RLS policies allow updates
3. Try using `updateBotMetrics()` instead

### TypeScript errors?

1. Ensure `BotMetricPayload` type matches your schema
2. Update type definitions in `fetchBotMetrics.ts`

## Future Enhancements

- [ ] Add batch operations support
- [ ] Implement optimistic updates
- [ ] Add metrics caching layer
- [ ] Create React hooks wrapper
- [ ] Add metrics aggregation helpers

## Related Files

- `lib/database/supabase-utils.ts` - Legacy utility (still used for other operations)
- `lib/database/tradingStorage.ts` - Updated to remove `onConflict` parameter
- `lib/supabase/init-database.ts` - Updated to use proper upsert
- `app/api/ai/bot-control/route.ts` - Main integration point

## References

- [Supabase Upsert Documentation](https://supabase.com/docs/guides/api/using-upsert)
- [PostgreSQL ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [Supabase REST API](https://postgrest.org/en/stable/references/api/preferences.html)
