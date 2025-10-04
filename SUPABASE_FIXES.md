# Supabase Multiple Client Instances Fix

## Issues Fixed

### 1. Multiple GoTrueClient Instances Warning
**Problem:** Multiple Supabase clients were being created across the application, causing warnings and potential undefined behavior.

**Solution:** Implemented singleton pattern in `lib/supabaseClient.ts`

### 2. API Error: `/api/orders/history` 500 Error
**Problem:** Missing `orders` table in Supabase database.

**Solution:** Created database migration SQL file.

## Changes Made

### 1. Centralized Supabase Client ([lib/supabaseClient.ts](lib/supabaseClient.ts))

**Before:**
```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**After:**
```typescript
// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient<Database> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'ai-trading-bot-auth',  // Unique storage key
        autoRefreshToken: true,
      },
    })
  }
  return supabaseInstance
})()
```

**Benefits:**
- ✅ Only one client instance per browser context
- ✅ Unique storage key prevents conflicts
- ✅ Consistent authentication state
- ✅ Better performance (no duplicate connections)

### 2. Updated API Routes

All order API routes now use centralized client:

**Files Updated:**
- [app/api/orders/save/route.ts](app/api/orders/save/route.ts)
- [app/api/orders/history/route.ts](app/api/orders/history/route.ts)
- [app/api/orders/statistics/route.ts](app/api/orders/statistics/route.ts)

**Change:**
```typescript
// Before
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)

// After
import { createServerSupabaseClient } from '@/lib/supabaseClient'
const supabase = createServerSupabaseClient()
```

### 3. Database Migration

Created SQL migration file: [supabase/migrations/create_orders_table.sql](supabase/migrations/create_orders_table.sql)

**To apply migration:**

#### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/create_orders_table.sql`
4. Click **Run** to execute the migration

#### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

#### Option 3: Manual Execution
```bash
# Connect to your Supabase database via psql
psql postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Then paste the SQL from create_orders_table.sql
```

## Database Schema

The `orders` table includes:

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,       -- Alpaca order ID
  symbol TEXT NOT NULL,                 -- Stock symbol
  side TEXT NOT NULL,                   -- 'buy' or 'sell'
  type TEXT NOT NULL,                   -- Order type
  qty NUMERIC,                          -- Quantity in shares
  notional NUMERIC,                     -- Value in dollars
  filled_qty NUMERIC DEFAULT 0,         -- Filled quantity
  filled_avg_price NUMERIC,             -- Average fill price
  limit_price NUMERIC,                  -- Limit price (if applicable)
  stop_price NUMERIC,                   -- Stop price (if applicable)
  status TEXT NOT NULL,                 -- Order status
  time_in_force TEXT,                   -- Time in force
  order_class TEXT,                     -- Order class
  created_at TIMESTAMPTZ NOT NULL,      -- Creation timestamp
  updated_at TIMESTAMPTZ NOT NULL,      -- Last update timestamp
  submitted_at TIMESTAMPTZ NOT NULL,    -- Submission timestamp
  filled_at TIMESTAMPTZ,                -- Fill timestamp
  extended_hours BOOLEAN DEFAULT FALSE, -- Extended hours flag
  user_id UUID REFERENCES auth.users(id) -- User reference
);
```

**Indexes Created:**
- `idx_orders_order_id` - Fast lookup by Alpaca order ID
- `idx_orders_symbol` - Filter by symbol
- `idx_orders_status` - Filter by status
- `idx_orders_created_at` - Time-based queries
- `idx_orders_user_id` - User-specific queries
- `idx_orders_filled_at` - Filled orders queries

**Row Level Security (RLS):**
- ✅ Enabled for all operations
- Users can only view their own orders
- Service role (API) can insert/update orders

## Verification

After applying these fixes:

1. **No more warnings:**
   ```
   ✅ No "Multiple GoTrueClient instances" warning
   ```

2. **API endpoints working:**
   ```bash
   # Test order history
   curl http://localhost:3000/api/orders/history?limit=10

   # Test statistics
   curl http://localhost:3000/api/orders/statistics
   ```

3. **Database table exists:**
   ```sql
   SELECT * FROM orders LIMIT 1;
   ```

## Testing

Run the development server:
```bash
npm run dev
```

Navigate to the dashboard and check:
- ✅ No console warnings
- ✅ Live orders section displays without errors
- ✅ Order statistics show correct data

## Additional Notes

### Environment Variables Required

Make sure these are in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### If You Still See Warnings

1. **Clear browser cache and localStorage:**
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Check for other Supabase client creations:**
   ```bash
   # Search for createClient calls
   grep -r "createClient" --include="*.ts" --include="*.tsx"
   ```

## Summary

✅ **Fixed:** Multiple Supabase client instances
✅ **Fixed:** Missing orders table
✅ **Created:** Database migration SQL
✅ **Updated:** All API routes to use singleton client
✅ **Added:** Row Level Security policies
✅ **Added:** Database indexes for performance

All errors should now be resolved!
