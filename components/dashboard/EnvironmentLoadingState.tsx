import { RefreshCw } from "lucide-react";
import React from "react";
// Loading State Component
function EnvironmentLoadingState() {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gray-500/20 rounded-full flex items-center justify-center">
          <RefreshCw size={16} className="text-gray-400 animate-spin" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Environment Status</h3>
          <p className="text-sm text-gray-400">Initializing validation...</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['Alpaca API', 'Supabase', 'Trading System'].map((name) => (
          <div key={name} className="bg-white/5 border border-gray-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-4 h-4 bg-gray-500/30 rounded animate-pulse"></div>
              <span className="text-sm text-gray-400">{name}</span>
            </div>
            <div className="text-xs text-gray-500">Checking...</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EnvironmentLoadingState;