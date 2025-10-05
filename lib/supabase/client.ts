import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Singleton instances
let browserClient: SupabaseClient<Database> | null = null
let serverClient: SupabaseClient<Database> | null = null

/**
 * Create or return singleton browser client (client-side only)
 * Uses @supabase/ssr for Next.js App Router compatibility
 */
export const createClient = (): SupabaseClient<Database> => {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

/**
 * Create or return singleton server client with service role key
 * Server-side only - bypasses RLS for admin operations
 */
export const createServerSupabaseClient = (): SupabaseClient<Database> => {
  if (!serverClient && typeof window === 'undefined') {
    serverClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }
  return serverClient || browserClient!
}

/**
 * Legacy export - singleton client instance
 * For backwards compatibility with existing code
 */
export const supabase = createClient()