/**
 * Modular Supabase Fetch Wrapper with Conflict-Safe Logic
 *
 * This wrapper handles bot_metrics submissions with proper conflict resolution
 * using Supabase's REST API directly, bypassing client library issues.
 */

import { createClient } from './client'

// Debounce map to prevent duplicate submissions within short timeframes
const pendingSubmissions = new Map<string, Promise<any>>()
const DEBOUNCE_MS = 1000  // Prevent duplicate submissions within 1 second

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
  // FIX: Use Supabase client's upsert() instead of raw POST
  // The Prefer header "resolution=merge-duplicates" doesn't work with raw POST requests

  if (opts.upsert) {
    // Use the client library's upsert which properly handles conflicts
    return upsertBotMetricsViaClient(metricPayload)
  }

  // Fallback to POST for non-upsert operations (not recommended)
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
    'Prefer': 'return=representation',
  }

  const queryParams = opts.returnRecord ? '?select=*' : ''

  // Ensure updated_at is set
  const payload = {
    ...metricPayload,
    updated_at: metricPayload.updated_at || new Date().toISOString()
  }

  try {
    console.log('[submitBotMetric] Submitting to:', endpoint)
    console.log('[submitBotMetric] Payload:', payload)

    const res = await fetch(`${endpoint}${queryParams}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[submitBotMetric] Failed: ${res.status} ${res.statusText}`, errorText)

      // If conflict occurs, switch to upsert mode
      if (res.status === 409) {
        console.warn('[submitBotMetric] Conflict detected (409), switching to upsert via client')
        return upsertBotMetricsViaClient(metricPayload)
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
  const userId = metricPayload.user_id
  const debounceKey = `bot_metrics_${userId}`

  // Check if there's already a pending submission for this user
  if (pendingSubmissions.has(debounceKey)) {
    console.log('[upsertBotMetricsViaClient] Debouncing - returning existing promise')
    return pendingSubmissions.get(debounceKey)
  }

  // Create the submission promise
  const submissionPromise = (async () => {
    try {
      const supabase = createClient()

      const payload = {
        ...metricPayload,
        updated_at: new Date().toISOString()
      }

      console.log('[upsertBotMetricsViaClient] Attempting upsert with payload:', payload)

      // Use upsert with onConflict option to specify the unique column
      const { data, error } = await supabase
        .from('bot_metrics')
        .upsert(payload, {
          onConflict: 'user_id',  // Specify the unique constraint column
          ignoreDuplicates: false  // Update on conflict instead of ignoring
        })
        .select()
        .maybeSingle()  // Use maybeSingle instead of single to avoid errors

      if (error) {
        console.error('[upsertBotMetricsViaClient] Error:', error)

        // If still getting conflict, try UPDATE instead
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.warn('[upsertBotMetricsViaClient] Conflict detected, trying UPDATE instead')

          // Clear the pending submission before retrying
          pendingSubmissions.delete(debounceKey)

          return await updateBotMetrics(payload.user_id, payload)
        }

        throw error
      }

      console.log('[upsertBotMetricsViaClient] Success:', data)
      return data
    } finally {
      // Clear the pending submission after a delay
      setTimeout(() => {
        pendingSubmissions.delete(debounceKey)
      }, DEBOUNCE_MS)
    }
  })()

  // Store the promise
  pendingSubmissions.set(debounceKey, submissionPromise)

  return submissionPromise
}
