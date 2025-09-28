
// =============================================================================
// Forgot Password Component
// =============================================================================

import { CheckCircle, ArrowLeft, AlertCircle, Mail, Loader2 } from "lucide-react"
import { useState } from "react"
import AuthLayout from "./AuthLayout"
import InputField from "../ui/InputField"

export const ForgotPassword = ({ 
  onBackToSignIn 
}: {
  onBackToSignIn: () => void
}) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Your Supabase password reset logic here
      console.log('Sending reset email to:', email)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setIsSuccess(true)
    } catch (err) {
      setError('Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout 
        title="Check Your Email" 
        subtitle="We've sent you a password reset link"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          
          <p className="text-gray-300 mb-6">
            We've sent a password reset link to <strong className="text-white">{email}</strong>
          </p>
          
          <p className="text-sm text-gray-400 mb-8">
            Check your inbox and click the link to reset your password. 
            Don't forget to check your spam folder.
          </p>
          
          <button
            onClick={onBackToSignIn}
            className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Sign In
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Enter your email to receive a reset link"
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={Mail}
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      <div className="text-center mt-8">
        <button
          onClick={onBackToSignIn}
          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </button>
      </div>
    </AuthLayout>
  )
}