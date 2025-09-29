"use client"

import React from 'react'
import Link from 'next/link'
import {
  Brain,
  TrendingUp,
  Shield,
  Zap,
  Target,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle,
  Star,
  Bot
} from 'lucide-react'

export default function LandingPage() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Trading",
      description: "Advanced machine learning algorithms analyze market patterns and execute trades with precision."
    },
    {
      icon: TrendingUp,
      title: "Real-Time Market Data",
      description: "Direct integration with Alpaca API for live market data and instant trade execution."
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Built-in safety features with configurable stop-losses and position sizing."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Execute trades in milliseconds with our optimized trading engine."
    },
    {
      icon: Target,
      title: "Smart Analytics",
      description: "Comprehensive portfolio analytics and performance tracking."
    },
    {
      icon: BarChart3,
      title: "Paper Trading",
      description: "Test strategies risk-free with $1M virtual portfolio before going live."
    }
  ]

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Market Analysis" },
    { value: "<100ms", label: "Trade Execution" },
    { value: "10+", label: "AI Strategies" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">AI Trading Bot</span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/auth/signin"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/25"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-8">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI-Powered
            </span>
            <br />
            Trading Revolution
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Harness the power of artificial intelligence to trade smarter, faster, and more profitably.
            Our advanced algorithms analyze market patterns in real-time and execute trades with precision.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-cyan-500/25 flex items-center"
            >
              Start Trading Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="/auth/signin"
              className="border border-gray-600 hover:border-gray-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center"
            >
              <Bot className="w-5 h-5 mr-2" />
              View Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">
            Why Choose Our AI Trading Platform?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Experience the future of trading with our cutting-edge AI technology and comprehensive feature set.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-gray-900/80 to-blue-900/30 rounded-3xl border border-gray-700/50 p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Trade with Confidence
              </h3>
              <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                Our AI analyzes millions of data points every second to identify profitable trading opportunities.
                Start with paper trading to perfect your strategy, then scale to live trading with confidence.
              </p>

              <div className="space-y-4">
                {[
                  "Real-time market analysis with ML algorithms",
                  "Automated risk management and stop-losses",
                  "24/7 market monitoring and execution",
                  "Comprehensive backtesting and optimization",
                  "Direct Alpaca API integration for fast execution"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/30">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-semibold text-white">Live Performance</h4>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">LIVE</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Portfolio Value</span>
                  <span className="text-white font-semibold">$1,247,892</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Today's P&L</span>
                  <span className="text-green-400 font-semibold">+$12,847 (+1.04%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Trades</span>
                  <span className="text-white font-semibold">2,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400 font-semibold">87.3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-3xl border border-cyan-500/20 p-12">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your AI Trading Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of traders who trust our AI to maximize their portfolio performance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-cyan-500/25 flex items-center"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <div className="text-gray-400 text-sm">
              No credit card required • Start with $1M paper trading
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AI Trading Bot</span>
            </div>

            <div className="text-gray-400 text-sm">
              © 2024 AI Trading Bot. Powered by Alpaca API and Supabase.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}