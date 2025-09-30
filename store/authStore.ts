"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isSigningOut: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>
  signOut: () => Promise<void>
  getSession: () => Promise<void>
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set, get) => {
  const supabase = createClient()

  return {
    // Initial state
    user: null,
    session: null,
    isLoading: true,
    isSigningOut: false,
    isAuthenticated: false,

    // Actions
    signIn: async (email: string, password: string) => {
      set({ isLoading: true })

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          set({ isLoading: false })
          return { user: null, error: new Error(error.message) }
        }

        if (data.user && data.session) {
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false
          })
          return { user: data.user, error: null }
        }

        set({ isLoading: false })
        return { user: null, error: new Error('Authentication failed') }
      } catch (error) {
        set({ isLoading: false })
        return { user: null, error: error as Error }
      }
    },

    signUp: async (email: string, password: string) => {
      set({ isLoading: true })

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        })

        if (error) {
          set({ isLoading: false })
          return { user: null, error: new Error(error.message) }
        }

        if (data.user) {
          // Note: User might need to confirm email before session is created
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: !!data.session,
            isLoading: false
          })
          return { user: data.user, error: null }
        }

        set({ isLoading: false })
        return { user: null, error: new Error('Sign up failed') }
      } catch (error) {
        set({ isLoading: false })
        return { user: null, error: error as Error }
      }
    },

    signOut: async () => {
      set({ isSigningOut: true })

      try {
        const { error } = await supabase.auth.signOut()

        if (error) {
          console.error('Sign out error:', error)
        }

        // Clear state regardless of error to ensure UI updates
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isSigningOut: false,
          isLoading: false
        })
      } catch (error) {
        console.error('Sign out error:', error)

        // Force clear state even on error
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isSigningOut: false,
          isLoading: false
        })
      }
    },

    getSession: async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Get session error:', error)
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false
          })
          return
        }

        set({
          user: session?.user || null,
          session,
          isAuthenticated: !!session,
          isLoading: false
        })
      } catch (error) {
        console.error('Get session error:', error)
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    },

    initialize: async () => {
      set({ isLoading: true })

      // Get initial session
      await get().getSession()

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        set({
          user: session?.user || null,
          session,
          isAuthenticated: !!session,
          isLoading: false
        })

        // Handle specific events
        if (event === 'SIGNED_OUT') {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      })
    },

    // Utility setters
    setUser: (user: User | null) => {
      set({ user, isAuthenticated: !!user })
    },

    setSession: (session: Session | null) => {
      set({
        session,
        user: session?.user || null,
        isAuthenticated: !!session
      })
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    }
  }
})

// Helper hooks for common auth patterns
export const useAuth = () => {
  const store = useAuthStore()
  return {
    user: store.user,
    session: store.session,
    isLoading: store.isLoading,
    isSigningOut: store.isSigningOut,
    isAuthenticated: store.isAuthenticated,
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
    initialize: store.initialize
  }
}

export const useUser = () => {
  return useAuthStore(state => state.user)
}

export const useIsAuthenticated = () => {
  return useAuthStore(state => state.isAuthenticated)
}