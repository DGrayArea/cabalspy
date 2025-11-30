'use client';

import { useAuth } from '@/context/AuthContext';
import WalletManager from '@/components/WalletManager';
import { User, Mail, Calendar, Wallet, CheckCircle2, Shield, Clock, Settings } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, turnkeyUser, turnkeySession, isLoading } = useAuth();
  const isAuthenticated = user || turnkeyUser || turnkeySession;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  // Generate Dicebear avatar URL
  const displayUser = user || turnkeyUser;
  const seed = displayUser?.email || displayUser?.name || displayUser?.userId || "user";
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  
  const displayName = user?.name || turnkeyUser?.userName || turnkeyUser?.userEmail || "User";
  const displayEmail = user?.email || turnkeyUser?.userEmail || "";
  const userId = user?.id || turnkeyUser?.userId || "";
  const orgId = turnkeySession?.organizationId || "";
  
  // Format session expiry
  const sessionExpiry = turnkeySession?.expiry 
    ? new Date(turnkeySession.expiry * 1000).toLocaleString()
    : null;

  return (
    <div className="min-h-screen bg-app text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Profile & Settings</h1>
            <p className="text-gray-400">Manage your account and preferences</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Information Card */}
            <div className="lg:col-span-2 bg-panel border border-gray-800/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                User Information
              </h2>
              
              <div className="space-y-6">
                {/* Avatar and Name */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-800/50">
                  <div className="relative">
                    <img 
                      src={avatarUrl} 
                      alt={displayName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-800/50"
                    />
                    {turnkeySession && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-panel flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1">{displayName}</h3>
                    {displayEmail && (
                      <p className="text-gray-400 text-sm">{displayEmail}</p>
                    )}
                    {turnkeySession && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="text-xs text-green-400 font-medium">Turnkey Authenticated</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-4">
                  {displayEmail && (
                    <div className="flex items-center gap-3 p-3 bg-panel-elev/50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">Email</div>
                        <div className="text-sm font-medium truncate">{displayEmail}</div>
                      </div>
                    </div>
                  )}
                  
                  {userId && (
                    <div className="flex items-center gap-3 p-3 bg-panel-elev/50 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">User ID</div>
                        <div className="text-sm font-mono text-gray-300 truncate">{userId}</div>
                      </div>
                    </div>
                  )}

                  {orgId && (
                    <div className="flex items-center gap-3 p-3 bg-panel-elev/50 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">Organization</div>
                        <div className="text-sm font-mono text-gray-300 truncate">{orgId}</div>
                      </div>
                    </div>
                  )}

                  {sessionExpiry && (
                    <div className="flex items-center gap-3 p-3 bg-panel-elev/50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">Session Expires</div>
                        <div className="text-sm font-medium">{sessionExpiry}</div>
                      </div>
                    </div>
                  )}

                  {user?.createdAt && (
                    <div className="flex items-center gap-3 p-3 bg-panel-elev/50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">Joined</div>
                        <div className="text-sm font-medium">
                          {new Date(user.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Management */}
            <div>
              <WalletManager />
            </div>
          </div>

          {/* Settings Section */}
            <div className="mt-8 bg-panel rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Notifications</h3>
                  <p className="text-sm text-gray-400">Receive notifications for new tokens</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-trading</h3>
                  <p className="text-sm text-gray-400">Enable automatic trading based on signals</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Dark Mode</h3>
                  <p className="text-sm text-gray-400">Use dark theme</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
