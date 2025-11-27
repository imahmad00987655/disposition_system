'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, MessageSquare, FileText, TrendingUp, Clock, Activity, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { teamDashboardAPI } from '@/lib/api';
import type { TeamDashboardData, AgentStats, RecentActivity } from '@/lib/types';
import { formatDateTime, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const TeamDashboard: React.FC = () => {
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { showToast } = useToast();

  // Check authorization on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get code from multiple sources
      const agentCode = sessionStorage.getItem('ccms_agentCode');
      const agentName = sessionStorage.getItem('ccms_agentName');
      
      // Also check URL for user_no
      const urlParams = new URLSearchParams(window.location.search);
      const userNo = urlParams.get('user_no');
      
      // Check if user is Rizwan Manager (code: 48)
      const code = agentCode || userNo;
      if (code === '48' || (agentName && agentName.toLowerCase().includes('rizwan'))) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadTeamStats();
    }
  }, [dateRange, selectedAgent, isAuthorized]);

  const loadTeamStats = async () => {
    setLoading(true);
    try {
      const response = await teamDashboardAPI.fetchTeamStats({
        dateRange,
        agent: selectedAgent || undefined,
      });

      if (response.success && response.data) {
        setData(response.data);
      } else {
        if (response.error?.includes('Unauthorized')) {
          setIsAuthorized(false);
        }
        showToast('error', response.error || 'Failed to load team statistics');
      }
    } catch (error) {
      showToast('error', 'Failed to load team statistics');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'complaint':
        return '📋';
      case 'customer':
        return '👤';
      case 'dds':
        return '🚚';
      case 'order':
        return '📦';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'complaint':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      case 'dds':
        return 'bg-purple-100 text-purple-800';
      case 'order':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show unauthorized message
  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            This dashboard is only available for <strong>Rizwan Manager</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Please login with code: <strong>48</strong>, username: <strong>rizwan</strong>, password: <strong>hello</strong>
          </p>
        </Card>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 w-full"></div>
          ))}
        </div>
        <div className="skeleton h-96 w-full"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available</p>
        <Button onClick={loadTeamStats} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const { summary, agent_stats, recent_activities, daily_stats } = data;

  // Get unique agent names for filter
  const agentNames = Array.from(new Set(agent_stats.map(a => a.agent_name))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Team Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor team performance and activities
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month')}
              className="border-none outline-none text-sm font-medium text-gray-700 bg-transparent"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
            <Users className="w-4 h-4 text-gray-500" />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="border-none outline-none text-sm font-medium text-gray-700 bg-transparent min-w-[150px]"
            >
              <option value="">All Agents</option>
              {agentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          
          <Button
            onClick={loadTeamStats}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total Agents</p>
              <p className="text-3xl font-bold text-blue-700">{summary.total_agents}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Complaints Handled</p>
              <p className="text-3xl font-bold text-purple-700">{summary.total_complaints}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Total Comments</p>
              <p className="text-3xl font-bold text-green-700">{summary.total_comments}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">New Customers</p>
              <p className="text-3xl font-bold text-orange-700">{summary.total_customers}</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Performance Table */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Agent Performance</h2>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Agent</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Complaints</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Comments</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Customers</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">DDS</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {agent_stats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No agent data available for selected period
                      </td>
                    </tr>
                  ) : (
                    agent_stats
                      .sort((a, b) => b.total_activities - a.total_activities)
                      .map((agent, index) => (
                        <tr
                          key={agent.agent_name}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800">{agent.agent_name}</div>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                              {agent.unique_complaints}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                              {agent.comments_count}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                              {agent.customers_registered}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                              {agent.dds_updates}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm">
                              {agent.total_activities}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            {agent.last_activity ? (
                              <div className="flex items-center justify-end gap-1 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                {formatDateTime(agent.last_activity)}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Recent Activities */}
        <div>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Recent Activities</h2>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recent_activities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recent activities</p>
              ) : (
                recent_activities.map((activity, index) => (
                  <div
                    key={`${activity.id}-${index}`}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActivityColor(activity.activity_type)}`}>
                            {activity.comment_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{activity.comment}</p>
                        <p className="text-xs text-gray-500 mt-1">by {activity.agent_name}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Daily Statistics Chart */}
      {daily_stats.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Daily Statistics</h2>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="space-y-4">
            {daily_stats.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{formatDate(day.date)}</span>
                  <span className="text-xs text-gray-500">
                    {day.agents_count} agent{day.agents_count !== 1 ? 's' : ''} active
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium mb-1">Complaints</p>
                    <p className="text-lg font-bold text-blue-700">{day.complaints_count}</p>
                  </div>
                  <div className="flex-1 bg-green-100 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium mb-1">Comments</p>
                    <p className="text-lg font-bold text-green-700">{day.comments_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

