'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SignIn } from '@/components/auth/SignInForm'


export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      throw new Error(error.message || 'Authentication failed')
    }
  }

  const handleAdminLogin = async () => {
    try {
      await handleSignIn('admin@aitradingbot.com', 'AdminTrading2024!')
    } catch (error) {
      alert('Admin login failed. Please check credentials.')
    }
  }

  return (
    <SignIn
      onSignUp={() => router.push('/auth/signup')}
      onForgotPassword={() => router.push('/auth/forgot')}
      onAdminLogin={handleAdminLogin}
      onSignIn={handleSignIn}
    />
  )
}