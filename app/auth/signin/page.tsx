'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/authStore'
import { SignIn } from '@/components/auth/SignInForm'

export default function SignInPage() {
  const router = useRouter()
  const { signIn } = useAuth()

  const handleSignIn = async (email: string, password: string) => {
    const { user, error } = await signIn(email, password)

    if (error) {
      throw error
    }

    if (user) {
      router.push('/dashboard')
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