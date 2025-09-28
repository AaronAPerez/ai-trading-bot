import React from 'react'
import {
  Brain,
} from 'lucide-react'

/**
 * Updated Authentication Components with AI Trading Colors
 * 
 * Primary Colors:
 * - Electric Blues & Cyans: #00D4FF, #0066CC, #1E3A8A
 * - AI Purples: #6366F1, #8B5CF6, #A855F7  
 * - Financial Greens: #10B981, #059669, #065F46
 * 
 * @author Aaron A Perez
 * @version 3.0.0 - AI Color Scheme & Fixed Redirects
 */

// =============================================================================
// Shared Components with AI Colors
// =============================================================================

const AuthLayout = ({ children, title, subtitle }: {
  children: React.ReactNode
  title: string
  subtitle: string
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-black px-4 py-8">
      {/* Enhanced Background Effects with AI Colors */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo Header with AI Colors */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl mb-6">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400">{subtitle}</p>
        </div>

        {/* Main Content */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout;