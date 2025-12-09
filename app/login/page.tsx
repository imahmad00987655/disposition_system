'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, LogIn, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { API_BASE_URL } from '@/lib/api';

// Department logins are now managed via database (dds_access and orders_access tables)

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear sessionStorage when user comes to login page (via back button or direct access)
  // This ensures user must login again even if they have URL with user_no
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear session storage to force re-authentication
      sessionStorage.removeItem('ccms_agentName');
      sessionStorage.removeItem('ccms_agentCode');
      sessionStorage.removeItem('ccms_department');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username || !password) {
        setError('Please enter both username and password');
        setLoading(false);
        return;
      }

      // Authenticate user with database
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}authenticate_user.php`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success' && data.code) {
        // Check if user has department access
        const hasDDSAccess = data.hasDDSAccess || false;
        const hasOrdersAccess = data.hasOrdersAccess || false;
        const isSpecialLogin = data.isSpecialLogin || false;

        if (typeof window !== 'undefined') {
          // Store agent info
          sessionStorage.setItem('ccms_agentName', data.fullName);
          sessionStorage.setItem('ccms_agentCode', data.code.toString());
          
          // Handle special department logins (dds-agent, orders-agent)
          // These should only see their specific department tab
          if (isSpecialLogin) {
            if (hasDDSAccess) {
              sessionStorage.setItem('ccms_department', 'dds');
              router.push('/?department=dds');
              return;
            } else if (hasOrdersAccess) {
              sessionStorage.setItem('ccms_department', 'orders');
              router.push('/?department=orders');
              return;
            }
          }
          
          // Regular users from vwUsers (SQL Server) - give them access to ALL tabs
          // Only restrict if they are department-specific users from database
          // If user has department access from database but is NOT a special login,
          // they still get all tabs (regular vwUsers users)
          
          // Clear department so regular users see all tabs
          sessionStorage.removeItem('ccms_department');
        }

        // Preserve user_no from URL if it exists, otherwise use code from login
        // This ensures URL user_no persists even after back button navigation
        const urlUserNo = searchParams.get('user_no');
        const finalUserNo = urlUserNo || data.code.toString();
        
        // Redirect with preserved user_no from URL, or new code if no URL user_no
        router.push(`/?user_no=${finalUserNo}`);
      } else {
        setError(data.error || 'Invalid username or password');
        setLoading(false);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      
      <div className="relative w-full max-w-md">
        {/* Glassmorphism Card */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white border-opacity-20 p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-4">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Call Center Login</h1>
            <p className="text-white text-opacity-80">Sign in to access your dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-white text-sm font-medium mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white text-opacity-60" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white text-opacity-60" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-300 border-opacity-50 rounded-lg p-3">
                <p className="text-white text-sm text-center">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-white border-opacity-30 hover:border-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Login to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-white border-opacity-20">
            <p className="text-center text-white text-opacity-70 text-sm">
              Call Center Management System
            </p>
            <p className="text-center text-white text-opacity-60 text-xs mt-2">
              Brands: Molty | Celeste | Dura | Superstar | CHF
            </p>
            <p className="text-center text-white text-opacity-80 text-xs mt-4">
              Department access is managed via database. Contact Team Lead for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
