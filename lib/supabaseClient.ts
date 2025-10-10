import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern to prevent multiple instances across hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __supabase_client__: SupabaseClient<Database> | undefined
  // eslint-disable-next-line no-var
  var __server_supabase_client__: SupabaseClient<Database> | undefined
}

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!globalThis.__supabase_client__) {
    globalThis.__supabase_client__ = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    })
  }
  return globalThis.__supabase_client__
}

// Export the singleton instance - always use this
export const supabase = getSupabaseClient()

export const createServerSupabaseClient = (): SupabaseClient<Database> => {
  if (!globalThis.__server_supabase_client__) {
    globalThis.__server_supabase_client__ = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )
  }
  return globalThis.__server_supabase_client__
}

