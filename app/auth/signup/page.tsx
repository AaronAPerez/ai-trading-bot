'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign Up Temporarily Disabled
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            New user registration is currently unavailable. Please contact support if you need access.
          </p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}