/**
 * Modular Supabase Fetch Wrapper with Conflict-Safe Logic
 *
 * This wrapper handles bot_metrics submissions with proper conflict resolution
 * using Supabase's REST API directly, bypassing client library issues.
 */

import { createClient } from './client'

export interface BotMetricPayload {
  user_id: string
  is_running?: boolean
  uptime?: number
  trades_executed?: number
  recommendations_generated?: number
  success_rate?: number
  total_pnl?: number
  daily_pnl?: number
  risk_score?: number
  last_activity?: string
  updated_at?: string
}

export interface SubmitOptions {
  /**
   * If true, uses upsert logic with merge-duplicates preference
   * This will update existing records instead of creating duplicates
   */
  upsert?: boolean

  /**
   * Custom conflict column (defaults to 'user_id' for bot_metrics)
   */
  conflictColumn?: string

  /**
   * Whether to return the created/updated record
   */
  returnRecord?: boolean
}

/**
 * Submit bot metrics using direct REST API call with conflict-safe logic
 *
 * @param metricPayload - The bot metrics data to submit
 * @param opts - Options for upsert behavior and conflict resolution
 * @returns The created/updated record
 */
export async function submitBotMetric(
  metricPayload: BotMetricPayload,
  opts: SubmitOptions = { upsert: true, conflictColumn: 'user_id', returnRecord: true }
): Promise<any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase credentials not configured')
  }

  const endpoint = `${supabaseUrl}/rest/v1/bot_metrics`

  // Get user session for auth token
  let authToken = anonKey
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      authToken = session.access_token
    }
  } catch (error) {
    console.warn('[submitBotMetric] Could not get session, using anon key:', error)
  }

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'Prefer': opts.upsert
      ? 'resolution=merge-duplicates,return=representation'
      : 'return=representation',
  }

  // For upsert, we need to specify which column to check for conflicts
  // The bot_metrics table has a UNIQUE constraint on user_id
  const queryParams = opts.returnRecord ? '?select=*' : ''

  // Ensure updated_at is set
  const payload = {
    ...metricPayload,
    updated_at: metricPayload.updated_at || new Date().toISOString()
  }

  try {
    console.log('[submitBotMetric] Submitting to:', endpoint)
    console.log('[submitBotMetric] Payload:', payload)
    console.log('[submitBotMetric] Upsert mode:', opts.upsert)

    const res = await fetch(`${endpoint}${queryParams}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[submitBotMetric] Failed: ${res.status} ${res.statusText}`, errorText)

      // If conflict occurs and we're not in upsert mode, retry with upsert
      if (res.status === 409 && !opts.upsert) {
        console.warn('[submitBotMetric] Conflict detected (409), retrying with upsert=true')
        return submitBotMetric(metricPayload, { ...opts, upsert: true })
      }

      throw new Error(`Supabase error ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    console.log('[submitBotMetric] Success:', data)
    return data
  } catch (err) {
    console.error('[submitBotMetric] Exception:', err)
    throw err
  }
}

/**
 * Fetch bot metrics for a specific user
 *
 * @param userId - The user ID to fetch metrics for
 * @returns The bot metrics record or null if not found
 */
export async function fetchBotMetrics(userId: string): Promise<any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase credentials not configured')
  }

  const endpoint = `${supabaseUrl}/rest/v1/bot_metrics`

  // Get user session for auth token
  let authToken = anonKey
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      authToken = session.access_token
    }
  } catch (error) {
    console.warn('[fetchBotMetrics] Could not get session, using anon key:', error)
  }

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  }

  try {
    const res = await fetch(`${endpoint}?user_id=eq.${userId}&select=*`, {
      method: 'GET',
      headers,
    })

    if (!res.ok) {
      if (res.status === 404 || res.status === 406) {
        // No record found
        return null
      }
      const errorText = await res.text()
      throw new Error(`Supabase error ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    return data?.[0] || null
  } catch (err) {
    console.error('[fetchBotMetrics] Exception:', err)
    throw err
  }
}

/**
 * Update bot metrics using PATCH method (alternative to upsert)
 * This directly updates the record if it exists, avoiding conflicts
 *
 * @param userId - The user ID whose metrics to update
 * @param updates - The fields to update
 * @returns The updated record
 */
export async function updateBotMetrics(
  userId: string,
  updates: Partial<BotMetricPayload>
): Promise<any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase credentials not configured')
  }

  const endpoint = `${supabaseUrl}/rest/v1/bot_metrics`

  // Get user session for auth token
  let authToken = anonKey
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      authToken = session.access_token
    }
  } catch (error) {
    console.warn('[updateBotMetrics] Could not get session, using anon key:', error)
  }

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  try {
    const res = await fetch(`${endpoint}?user_id=eq.${userId}&select=*`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[updateBotMetrics] Failed: ${res.status} ${res.statusText}`, errorText)
      throw new Error(`Supabase error ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    return data?.[0] || null
  } catch (err) {
    console.error('[updateBotMetrics] Exception:', err)
    throw err
  }
}

/**
 * Upsert bot metrics using the Supabase client library
 * This is a fallback method that uses the client library instead of direct fetch
 *
 * @param metricPayload - The bot metrics data to upsert
 * @returns The upserted record
 */
export async function upsertBotMetricsViaClient(
  metricPayload: BotMetricPayload
): Promise<any> {
  const supabase = createClient()

  const payload = {
    ...metricPayload,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('bot_metrics')
    .upsert(payload)
    .select()
    .single()

  if (error) {
    console.error('[upsertBotMetricsViaClient] Error:', error)
    throw error
  }

  return data
}
