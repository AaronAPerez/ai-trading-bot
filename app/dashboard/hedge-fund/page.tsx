'use client'

import HedgeFundEngineDashboard from '@/components/dashboard/HedgeFundEngineDashboard'

export default function HedgeFundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <HedgeFundEngineDashboard userId="test-user" mode="paper" />
    </div>
  )
}
