# Supabase Free Tier Optimization Guide

This application is optimized for Supabase Free tier (500 MB database limit).

## 📊 Free Tier Limits
- **Database Size**: 500 MB
- **API Requests**: Unlimited
- **Active Users**: 50,000/month
- **Bandwidth**: 5 GB egress/month
- **Storage**: 1 GB file storage

## 🚀 Setup Instructions

### 1. Run the Optimization Migration

In your Supabase Dashboard:

1. Go to **SQL Editor**: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/optimize_for_free_tier.sql`
4. Click **Run**

This will:
- ✅ Add indexes for efficient cleanup queries
- ✅ Create automatic cleanup functions
- ✅ Set up data retention policies:
  - **trade_history**: 90 days
  - **bot_activity_logs**: 30 days
  - **ai_learning_data**: 60 days
  - **market_sentiment**: 7 days
- ✅ Add database size monitoring functions
- ✅ Optimize TEXT columns to save space

### 2. Schedule Automatic Cleanup (Optional but Recommended)

**Option A: Using Supabase Edge Functions (Recommended)**

1. Install Supabase CLI: `npm install -g supabase`
2. Create edge function:
```bash
supabase functions new database-cleanup
```

3. Add this code to the function:
```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('cleanup_all_old_data')

  if (error) throw error

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

4. Deploy: `supabase functions deploy database-cleanup`
5. Set up cron in Supabase Dashboard → Edge Functions → Add Schedule:
   - Function: `database-cleanup`
   - Schedule: `0 2 * * *` (Daily at 2 AM)

**Option B: Using External Cron Service**

Use a service like [cron-job.org](https://cron-job.org) or GitHub Actions to call:
```
POST https://your-app.vercel.app/api/database/cleanup
```

### 3. Monitor Database Usage

**Check database size:**
```bash
curl https://your-app.vercel.app/api/database/cleanup
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": [...],
    "summary": {
      "totalSize": "145.23 MB",
      "limit": "500 MB",
      "percentUsed": "29.05%",
      "remainingSpace": "354.77 MB",
      "needsCleanup": false
    }
  }
}
```

**Manual cleanup:**
```bash
curl -X POST https://your-app.vercel.app/api/database/cleanup
```

## 💡 Best Practices for Free Tier

### 1. Use Batch Operations

Instead of individual inserts:
```typescript
// ❌ Bad - Multiple API requests
for (const log of logs) {
  await supabaseService.logBotActivity(userId, log)
}

// ✅ Good - Single batched request
await supabaseService.logBotActivityBatched(userId, log) // Auto-batches
```

### 2. Limit Query Results

```typescript
// ❌ Bad - Fetches all records
const logs = await supabase.from('bot_activity_logs').select('*')

// ✅ Good - Limit results
const logs = await supabase
  .from('bot_activity_logs')
  .select('*')
  .limit(100)
  .order('created_at', { ascending: false })
```

### 3. Use Indexes

All queries on `user_id`, `symbol`, `created_at`, and `timestamp` are indexed for performance.

### 4. Regular Cleanup

**Automatic (Recommended):**
- Set up scheduled Edge Function (see above)

**Manual:**
```typescript
import { supabaseService } from '@/lib/database/supabase-utils'

// Trigger cleanup
await supabaseService.triggerDatabaseCleanup()

// Check stats
await supabaseService.getDatabaseStats()
```

### 5. Monitor Storage Usage

Add this to your admin dashboard:

```typescript
'use client'

import { useEffect, useState } from 'react'

export function DatabaseStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/database/cleanup')
      .then(res => res.json())
      .then(data => setStats(data.data))
  }, [])

  if (!stats) return null

  const percentUsed = parseFloat(stats.summary.percentUsed)
  const isWarning = percentUsed > 80

  return (
    <div className={isWarning ? 'text-red-500' : ''}>
      <h3>Database Usage</h3>
      <p>{stats.summary.totalSize} / {stats.summary.limit}</p>
      <p>{stats.summary.percentUsed} used</p>
      {isWarning && (
        <button onClick={() => fetch('/api/database/cleanup', { method: 'POST' })}>
          Clean Up Now
        </button>
      )}
    </div>
  )
}
```

## 📈 Data Retention Policies

| Table | Retention Period | Reason |
|-------|-----------------|--------|
| `trade_history` | 90 days | Historical trades for reporting |
| `bot_activity_logs` | 30 days | Recent activity for debugging |
| `ai_learning_data` | 60 days | AI model training data |
| `market_sentiment` | 7 days | Real-time sentiment only |
| `bot_metrics` | Permanent | Current metrics only (1 row per user) |
| `profiles` | Permanent | User profiles |

## 🔧 Troubleshooting

### Database approaching 500 MB limit

1. **Check what's using space:**
```sql
SELECT * FROM get_database_stats();
```

2. **Manual cleanup:**
```sql
SELECT * FROM cleanup_all_old_data();
```

3. **Aggressive cleanup (if needed):**
```sql
-- Keep only last 30 days of trades
DELETE FROM trade_history WHERE created_at < NOW() - INTERVAL '30 days';

-- Keep only last 7 days of logs
DELETE FROM bot_activity_logs WHERE created_at < NOW() - INTERVAL '7 days';

-- Reclaim space
VACUUM FULL;
```

### Cleanup not running automatically

1. Verify Edge Function is deployed: `supabase functions list`
2. Check cron schedule in Dashboard
3. Manually trigger: `supabase functions invoke database-cleanup`

## 📚 API Endpoints

### GET `/api/database/cleanup`
Get database statistics

### POST `/api/database/cleanup`
Trigger manual cleanup

## 🚨 Alerts

Set up monitoring alerts when database usage exceeds 80%:

1. Add to your monitoring service (e.g., Sentry, DataDog)
2. Or add simple email notification in cleanup Edge Function
3. Or add to your admin dashboard (see DatabaseStats component above)

## ✅ Verification Checklist

- [ ] Optimization migration executed in Supabase
- [ ] Edge Function deployed for automatic cleanup
- [ ] Cron schedule configured (daily at 2 AM)
- [ ] Database stats endpoint tested
- [ ] Manual cleanup endpoint tested
- [ ] Monitoring dashboard added
- [ ] Alerts configured for >80% usage

## 📞 Support

If you need help:
1. Check database stats: `GET /api/database/cleanup`
2. Review Supabase logs in Dashboard
3. Check Edge Function logs
4. Verify RLS policies are correct
