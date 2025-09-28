
// =============================================================================
// Sign Up Component
// =============================================================================
'use client';

import { AlertCircle, User, Mail, Lock, Loader2, ArrowRight, Shield } from "lucide-react";
import { useState } from "react"
import InputField from "../ui/InputField";
import AuthLayout from "./AuthLayout";

export const SignUp = ({ 
  onSignIn,
  onSignUp
}: {
  onSignIn: () => void
  onSignUp?: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordStrength, setPasswordStrength] = useState(0)

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1
    if (password.match(/\d/)) strength += 1
    if (password.match(/[^a-zA-Z\d]/)) strength += 1
    return strength
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms and conditions'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !onSignUp) return
    
    setIsLoading(true)
    setErrors({})

    try {
      await onSignUp(formData.email, formData.password, formData.firstName, formData.lastName)
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to create account. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value as string))
    }
    
    // Clear specific field error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return 'bg-gray-600'
      case 1: return 'bg-red-500'
      case 2: return 'bg-amber-500'
      case 3: return 'bg-cyan-500'
      case 4: return 'bg-emerald-500'
      default: return 'bg-gray-600'
    }
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0: return 'Enter a password'
      case 1: return 'Weak'
      case 2: return 'Fair'
      case 3: return 'Good'
      case 4: return 'Strong'
      default: return ''
    }
  }

  return (
    <AuthLayout 
      title="Create Account" 
      subtitle="Join thousands of successful AI traders"
    >
      {/* General Error */}
      {errors.general && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <p className="text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="First Name"
            type="text"
            placeholder="First name"
            value={formData.firstName}
            onChange={handleChange('firstName')}
            error={errors.firstName}
            icon={User}
            disabled={isLoading}
          />
          
          <InputField
            label="Last Name"
            type="text"
            placeholder="Last name"
            value={formData.lastName}
            onChange={handleChange('lastName')}
            error={errors.lastName}
            icon={User}
            disabled={isLoading}
          />
        </div>

        <InputField
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          icon={Mail}
          disabled={isLoading}
        />

        <div>
          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            icon={Lock}
            disabled={isLoading}
            showToggle={true}
            onToggle={() => setShowPassword(!showPassword)}
          />
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Password strength</span>
                <span className="text-xs text-gray-400">{getPasswordStrengthText()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <InputField
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={errors.confirmPassword}
          icon={Lock}
          disabled={isLoading}
          showToggle={true}
          onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        <div>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={handleChange('acceptTerms')}
              className="rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-gray-900 mt-1"
              disabled={isLoading}
            />
            <span className="ml-3 text-sm text-gray-300">
              I agree to the{' '}
              <a href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-red-400 text-sm mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.acceptTerms}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || passwordStrength < 2}
          className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center shadow-lg shadow-cyan-500/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Creating Account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </form>

      <div className="text-center mt-8">
        <p className="text-gray-400">
          Already have an account?{' '}
          <button
            onClick={onSignIn}
            className="text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            Sign in here
          </button>
        </p>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-center text-gray-400 text-sm">
          <Shield className="w-4 h-4 mr-2 text-emerald-400" />
          Your data is protected with bank-level encryption
        </div>
      </div>
    </AuthLayout>
  )
}