import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient<Database> | null = null
let serverSupabaseInstance: SupabaseClient<Database> | null = null

export const supabase = (() => {
  if (typeof window !== 'undefined' && !supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'ai-trading-bot-auth-v1', // Unique key to prevent conflicts
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } else if (typeof window === 'undefined' && !supabaseInstance) {
    // Server-side client (no auth storage)
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return supabaseInstance!
})()

export const createServerSupabaseClient = () => {
  if (!serverSupabaseInstance) {
    serverSupabaseInstance = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }
  return serverSupabaseInstance
}

