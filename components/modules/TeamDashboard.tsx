'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Users, MessageSquare, FileText, TrendingUp, Clock, Activity, RefreshCw, Calendar, Tag, ArrowUp, ArrowDown, Target, Zap, Award, AlertCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tagged' | 'trends'>('overview');
  const { showToast } = useToast();

  // Check authorization on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const agentCode = sessionStorage.getItem('ccms_agentCode');
      const agentName = sessionStorage.getItem('ccms_agentName');
      const urlParams = new URLSearchParams(window.location.search);
      const userNo = urlParams.get('user_no');
      
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

  // Calculate trends and analytics
  const analytics = useMemo(() => {
    if (!data) return null;

    const { agent_stats, daily_stats, tagged_users_stats } = data;
    
    // Calculate average activities per agent
    const avgActivities = agent_stats.length > 0
      ? agent_stats.reduce((sum, a) => sum + a.total_activities, 0) / agent_stats.length
      : 0;

    // Top performers
    const topPerformers = [...agent_stats]
      .sort((a, b) => b.total_activities - a.total_activities)
      .slice(0, 3);

    // Activity distribution
    const activityDistribution = {
      complaints: agent_stats.reduce((sum, a) => sum + a.unique_complaints, 0),
      comments: agent_stats.reduce((sum, a) => sum + a.comments_count, 0),
      customers: agent_stats.reduce((sum, a) => sum + a.customers_registered, 0),
      dds: agent_stats.reduce((sum, a) => sum + a.dds_updates, 0),
    };

    // Tagged users breakdown
    const taggedUsersArray = tagged_users_stats
      ? Object.entries(tagged_users_stats)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      : [];

    // Multiple tagged activities
    const multipleTaggedActivities = data.recent_activities.filter(
      activity => activity.tagged_to && activity.tagged_to.includes(',')
    );

    // Daily trend (last 7 days)
    const trendData = daily_stats.slice(0, 7).reverse();

    return {
      avgActivities: Math.round(avgActivities * 10) / 10,
      topPerformers,
      activityDistribution,
      taggedUsersArray,
      multipleTaggedActivities,
      trendData,
    };
  }, [data]);

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

  // Simple Bar Chart Component
  const SimpleBarChart: React.FC<{ data: Array<{ label: string; value: number; color?: string }>; maxValue?: number }> = ({ 
    data, 
    maxValue 
  }) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);
    
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600 truncate">{item.label}</div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.color || 'bg-gradient-to-r from-purple-500 to-indigo-500'
                }`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <div className="w-12 text-right text-sm font-semibold text-gray-700">{item.value}</div>
          </div>
        ))}
      </div>
    );
  };

  // Line Chart Component for Trends
  const TrendChart: React.FC<{ data: Array<{ date: string; value: number }>; label: string }> = ({ 
    data, 
    label 
  }) => {
    if (data.length === 0) return <p className="text-gray-500 text-center py-8">No trend data available</p>;
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;

    return (
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y * 2}
              x2="400"
              y2={y * 2}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Area under curve */}
          <path
            d={`M 0,200 ${data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * 400;
              const y = 200 - ((d.value - minValue) / range) * 200;
              return `L ${x},${y}`;
            }).join(' ')} L 400,200 Z`}
            fill="url(#gradient)"
          />
          
          {/* Line */}
          <polyline
            points={data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * 400;
              const y = 200 - ((d.value - minValue) / range) * 200;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 400;
            const y = 200 - ((d.value - minValue) / range) * 200;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#8b5cf6"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {data.map((d, i) => (
            <span key={i} className="transform -rotate-45 origin-left">
              {formatDate(d.date).split('-')[0]}
            </span>
          ))}
        </div>
      </div>
    );
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

  if (!data || !analytics) {
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
  const agentNames = Array.from(new Set(agent_stats.map(a => a.agent_name))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Team Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Advanced analytics and performance monitoring
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

      {/* Summary Cards - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total Agents</p>
              <p className="text-3xl font-bold text-blue-700">{summary.total_agents}</p>
              <p className="text-xs text-blue-600 mt-1">Active in period</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Complaints Handled</p>
              <p className="text-3xl font-bold text-purple-700">{summary.total_complaints}</p>
              <p className="text-xs text-purple-600 mt-1">
                {analytics.avgActivities.toFixed(1)} avg per agent
              </p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Total Comments</p>
              <p className="text-3xl font-bold text-green-700">{summary.total_comments}</p>
              <p className="text-xs text-green-600 mt-1">
                {summary.multiple_tagged_count || 0} multi-tagged
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">New Customers</p>
              <p className="text-3xl font-bold text-orange-700">{summary.total_customers}</p>
              <p className="text-xs text-orange-600 mt-1">Registered</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for different views */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('tagged')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'tagged'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Tagged Users ({analytics.taggedUsersArray.length})
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'trends'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Trends & Analytics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Performance Table - Enhanced */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Agent Performance</h2>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-500">Ranked by Activity</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
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
                        <td colSpan={8} className="text-center py-8 text-gray-500">
                          No agent data available for selected period
                        </td>
                      </tr>
                    ) : (
                      agent_stats
                        .sort((a, b) => b.total_activities - a.total_activities)
                        .map((agent, index) => {
                          const isTop3 = index < 3;
                          return (
                            <tr
                              key={agent.agent_name}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              } ${isTop3 ? 'ring-2 ring-purple-200' : ''}`}
                            >
                              <td className="py-3 px-4">
                                {isTop3 ? (
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold text-sm">
                                    {index + 1}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 font-medium">#{index + 1}</span>
                                )}
                              </td>
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
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Activities - Enhanced with Tagged To */}
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
                  recent_activities.map((activity, index) => {
                    const hasMultipleTagged = activity.tagged_to && activity.tagged_to.includes(',');
                    const taggedUsers = activity.tagged_to ? activity.tagged_to.split(',').map(u => u.trim()) : [];
                    
                    return (
                      <div
                        key={`${activity.id}-${index}`}
                        className={`p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${
                          hasMultipleTagged ? 'ring-2 ring-purple-200' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActivityColor(activity.activity_type)}`}>
                                {activity.comment_type}
                              </span>
                              {hasMultipleTagged && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  Multiple
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDateTime(activity.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">{activity.comment}</p>
                            <p className="text-xs text-gray-500 mt-1">by {activity.agent_name}</p>
                            {activity.tagged_to && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {taggedUsers.map((user, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {user}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'tagged' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tagged Users Statistics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Most Tagged Users</h2>
              <Tag className="w-5 h-5 text-gray-500" />
            </div>
            {analytics.taggedUsersArray.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tagged users data</p>
            ) : (
              <SimpleBarChart
                data={analytics.taggedUsersArray.slice(0, 10).map((item, idx) => ({
                  label: item.name,
                  value: item.count,
                  color: idx < 3 
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }))}
              />
            )}
          </Card>

          {/* Multiple Tagged Activities */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Multiple Tagged Activities</h2>
              <AlertCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-lg font-bold text-purple-700">{analytics.multipleTaggedActivities.length}</p>
                  <p className="text-sm text-purple-600">Activities with multiple tagged users</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {analytics.multipleTaggedActivities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No multiple tagged activities</p>
              ) : (
                analytics.multipleTaggedActivities.slice(0, 20).map((activity, index) => {
                  const taggedUsers = activity.tagged_to ? activity.tagged_to.split(',').map(u => u.trim()) : [];
                  return (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg border border-purple-200"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 line-clamp-1">{activity.comment}</p>
                          <p className="text-xs text-gray-500 mt-1">by {activity.agent_name}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {taggedUsers.map((user, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 border border-purple-300"
                              >
                                <Tag className="w-3 h-3" />
                                {user}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trends Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Daily Comments Trend</h2>
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
            <TrendChart
              data={analytics.trendData.map(d => ({
                date: d.date,
                value: d.comments_count
              }))}
              label="Comments"
            />
          </Card>

          {/* Activity Distribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Activity Distribution</h2>
              <Target className="w-5 h-5 text-gray-500" />
            </div>
            <SimpleBarChart
              data={[
                { label: 'Complaints', value: analytics.activityDistribution.complaints, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
                { label: 'Comments', value: analytics.activityDistribution.comments, color: 'bg-gradient-to-r from-green-500 to-green-600' },
                { label: 'Customers', value: analytics.activityDistribution.customers, color: 'bg-gradient-to-r from-purple-500 to-purple-600' },
                { label: 'DDS Updates', value: analytics.activityDistribution.dds, color: 'bg-gradient-to-r from-orange-500 to-orange-600' },
              ]}
            />
          </Card>

          {/* Top Performers */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Top Performers</h2>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analytics.topPerformers.map((agent, index) => (
                <div
                  key={agent.agent_name}
                  className={`p-4 rounded-lg border-2 ${
                    index === 0
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
                      : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? 'bg-yellow-400 text-white'
                        : index === 1
                        ? 'bg-gray-400 text-white'
                        : 'bg-orange-400 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{agent.agent_name}</p>
                      <p className="text-sm text-gray-600">{agent.total_activities} total activities</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {agent.unique_complaints} complaints
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {agent.comments_count} comments
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Daily Statistics Chart - Enhanced */}
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
                  <div className="flex-1 bg-blue-100 rounded-lg p-3 hover:bg-blue-200 transition-colors">
                    <p className="text-xs text-blue-600 font-medium mb-1">Complaints</p>
                    <p className="text-lg font-bold text-blue-700">{day.complaints_count}</p>
                  </div>
                  <div className="flex-1 bg-green-100 rounded-lg p-3 hover:bg-green-200 transition-colors">
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
