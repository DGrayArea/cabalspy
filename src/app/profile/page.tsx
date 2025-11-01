'use client';

import { useAuth } from '@/context/AuthContext';
import WalletManager from '@/components/WalletManager';
import { User, Mail, Calendar, Wallet } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

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

  if (!user) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Profile & Settings</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Information */}
            <div className="bg-panel rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {user.avatar && (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-16 h-16 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-medium">{user.name}</h3>
                    <p className="text-muted">User ID: {user.id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-sm">
                      Joined: {user.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  {user.telegramId && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">T</span>
                      </div>
                      <span className="text-sm">Telegram Connected</span>
                    </div>
                  )}

                  {user.googleId && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">G</span>
                      </div>
                      <span className="text-sm">Google Connected</span>
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
