
// ===============================================
// REAL-TIME MONITORING DASHBOARD
// components/monitoring/MonitoringDashboard.tsx
// ===============================================

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';


export function MonitoringDashboard({ userId }: { userId: string }) {
  const [metrics, setMetrics] = useState({
    totalTrades: 0,
    successRate: 0,
    activeAlerts: 0,
    avgResponseTime: 0,
    recentErrors: [] as any[],
    systemHealth: 'healthy' as 'healthy' | 'degraded' | 'down',
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch real metrics from Supabase
    const fetchMetrics = async () => {
      try {
        // Get bot metrics
        const { data: botMetrics } = await supabase
          .from('bot_metrics')
          .select('*')
          .eq('user_id', userId)
          .single();

        // Get recent activity logs
        const { data: activityLogs } = await supabase
          .from('bot_activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(10);

        // Get error logs
        const { data: errorLogs } = await supabase
          .from('application_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('level', 'error')
          .order('created_at', { ascending: false })
          .limit(5);

        setMetrics({
          totalTrades: botMetrics?.trades_executed || 0,
          successRate: botMetrics?.success_rate || 0,
          activeAlerts: errorLogs?.length || 0,
          avgResponseTime: 150, // Calculate from performance logs
          recentErrors: errorLogs || [],
          systemHealth: errorLogs && errorLogs.length > 5 ? 'degraded' : 'healthy',
        });

        setRecentActivity(activityLogs || []);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_activity_logs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setRecentActivity((prev) => [payload.new, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTrades}</div>
            <p className="text-xs text-gray-400 mt-1">From bot execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-400 mt-1">Trade success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeAlerts}</div>
            <p className="text-xs text-gray-400 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            <p className="text-xs text-gray-400 mt-1">API response time</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                metrics.systemHealth === 'healthy'
                  ? 'bg-green-500'
                  : metrics.systemHealth === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="font-medium capitalize">{metrics.systemHealth}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'trade'
                      ? 'bg-blue-500'
                      : activity.type === 'recommendation'
                      ? 'bg-green-500'
                      : activity.type === 'risk'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{activity.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Logs */}
      {metrics.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recentErrors.map((error, i) => (
                <div
                  key={i}
                  className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg"
                >
                  <div className="text-sm font-medium text-red-400">
                    {error.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(error.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===============================================
// EXPORT EVERYTHING
// ===============================================

// export { initializeSentry, logger, performanceMonitor, AnalyticsTracker };