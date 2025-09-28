
// Sign In Component

import { AlertCircle, Mail, Lock, Loader2, ArrowRight } from "lucide-react"
import { useState } from "react"
import InputField from "../ui/InputField"
import AuthLayout from "./AuthLayout"



export const SignIn = ({ 
  onSignUp, 
  onForgotPassword,
  onAdminLogin,
  onSignIn
}: {
  onSignUp: () => void
  onForgotPassword: () => void
  onAdminLogin?: () => void
  onSignIn?: (email: string, password: string) => Promise<void>
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSignIn) return
    
    setIsLoading(true)
    setError('')

    try {
      await onSignIn(formData.email, formData.password)
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    }))
    if (error) setError('')
  }

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to access your AI trading dashboard"
    >
      {/* Error Alert */}
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
          value={formData.email}
          onChange={handleChange('email')}
          icon={Mail}
          disabled={isLoading}
        />

        <InputField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange('password')}
          icon={Lock}
          disabled={isLoading}
          showToggle={true}
          onToggle={() => setShowPassword(!showPassword)}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange('rememberMe')}
              className="rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-gray-900"
              disabled={isLoading}
            />
            <span className="ml-2 text-sm text-gray-400">Remember me</span>
          </label>
          
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-cyan-400 hover:text-cyan-300"
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.email || !formData.password}
          className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center shadow-lg shadow-cyan-500/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </form>

      {/* Admin Login Quick Access */}
      {/* {onAdminLogin && (
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400 text-sm font-medium">Admin Access</p>
              <p className="text-purple-300 text-xs">Quick login for demonstration</p>
            </div>
            <button
              onClick={onAdminLogin}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Admin Login
            </button>
          </div>
        </div>
      )} */}

      <div className="text-center mt-8">
        <p className="text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={onSignUp}
            className="text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            Sign up here
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}