'use client';

import { useAuth } from '@/context/AuthContext';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import WalletManager from '@/components/WalletManager';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  Activity, 
  Star,
  Settings,
  ArrowLeft,
  BarChart3,
  DollarSign,
  Clock,
  Shield,
  ExternalLink
} from 'lucide-react';

export default function ProfilePage() {
  const { user, turnkeyUser, turnkeySession, isLoading } = useAuth();
  const { wallets: turnkeyWallets } = useTurnkey();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user && !turnkeyUser) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">Please sign in to view your profile</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Use Turnkey user if available, otherwise use custom user
  const displayUser = turnkeyUser ? {
    id: turnkeyUser.userId,
    name: turnkeyUser.userName,
    email: turnkeyUser.userEmail,
    avatar: undefined,
    createdAt: turnkeyUser.createdAt ? new Date(parseInt(turnkeyUser.createdAt.seconds) * 1000) : new Date(),
  } : user!;

  const hasWallets = (turnkeyWallets && turnkeyWallets.length > 0) || (user?.wallets && Object.keys(user.wallets).length > 0);

  return (
    <div className="min-h-screen bg-app text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold">Profile</h1>
            </div>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <div className="bg-panel border border-gray-800/50 rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                {displayUser.avatar ? (
                  <img 
                    src={displayUser.avatar} 
                    alt={displayUser.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-primary">
                    {displayUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{displayUser.name}</h2>
                {displayUser.email && (
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Mail className="w-4 h-4" />
                    <span>{displayUser.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {displayUser.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  {turnkeySession && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-sm text-green-400 font-medium">Turnkey Authenticated</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-panel border border-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Wallets</span>
                <Wallet className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">
                {hasWallets ? (turnkeyWallets?.length || Object.keys(user?.wallets || {}).length) : 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Connected</div>
            </div>
            <div className="bg-panel border border-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Trades</span>
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs text-gray-500 mt-1">All time</div>
            </div>
            <div className="bg-panel border border-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Portfolio Value</span>
                <DollarSign className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">$0.00</div>
              <div className="text-xs text-gray-500 mt-1">Current</div>
            </div>
            <div className="bg-panel border border-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Win Rate</span>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">-</div>
              <div className="text-xs text-gray-500 mt-1">No trades yet</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Wallet Management */}
              <div className="bg-panel border border-gray-800/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Wallets
                  </h3>
                </div>
                <WalletManager />
              </div>

              {/* Trading Activity */}
              <div className="bg-panel border border-gray-800/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </h3>
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No trading activity yet</p>
                  <p className="text-xs text-gray-500 mt-1">Your trades will appear here</p>
                </div>
              </div>

              {/* Favorite Tokens */}
              <div className="bg-panel border border-gray-800/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Favorite Tokens
                </h3>
                <div className="text-center py-12 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No favorite tokens yet</p>
                  <p className="text-xs text-gray-500 mt-1">Star tokens to track them here</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* User Information */}
              <div className="bg-panel border border-gray-800/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">User ID</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-panel-elev px-2 py-1 rounded font-mono">
                        {displayUser.id.slice(0, 8)}...{displayUser.id.slice(-6)}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(displayUser.id)}
                        className="p-1 hover:bg-panel-elev rounded transition-colors"
                        title="Copy User ID"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {user?.telegramId && (
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">T</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Telegram</div>
                        <div className="text-xs text-gray-400">Connected</div>
                      </div>
                    </div>
                  )}

                  {user?.googleId && (
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">G</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Google</div>
                        <div className="text-xs text-gray-400">Connected</div>
                      </div>
                    </div>
                  )}

                  {turnkeyUser && (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <Shield className="w-8 h-8 text-green-400" />
                      <div>
                        <div className="text-sm font-medium">Turnkey</div>
                        <div className="text-xs text-gray-400">Secure wallet infrastructure</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="bg-panel border border-gray-800/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Notifications</div>
                      <div className="text-xs text-gray-400">New token alerts</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Auto-trading</div>
                      <div className="text-xs text-gray-400">Automated signals</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Email Updates</div>
                      <div className="text-xs text-gray-400">Weekly summaries</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
