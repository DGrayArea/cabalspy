'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, LogOut, Wallet } from 'lucide-react';

export default function AuthButton() {
  const { user, logout, connectWallet, login } = useAuth();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const handleGoogleLogin = async () => {
    try {
      // Get OAuth URL from API
      const response = await fetch('/api/auth/google');
      if (!response.ok) {
        throw new Error('Failed to initiate Google OAuth');
      }

      const { authUrl } = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google login error:', error);
      alert('Failed to initiate Google login. Please check console for details.');
    }
  };

  const handleTelegramLogin = async () => {
    try {
      // Telegram Login Widget integration
      // This requires the Telegram Web App SDK
      // For now, show instructions
      alert(
        'Telegram login requires Telegram Web App integration.\n\n' +
        '1. Initialize Telegram Web App SDK:\n' +
        '   window.Telegram.WebApp.ready()\n\n' +
        '2. Get user data from:\n' +
        '   window.Telegram.WebApp.initData\n\n' +
        '3. Send to /api/auth/telegram to verify'
      );
    } catch (error) {
      console.error('Telegram login error:', error);
    }
  };

  const handleWalletConnect = () => {
    if (walletAddress.trim()) {
      connectWallet(walletAddress.trim());
      setShowWalletModal(false);
      setWalletAddress('');
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {user.avatar && (
            <img 
              src={user.avatar} 
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <div className="text-sm font-medium">{user.name}</div>
            {user.walletAddress && (
              <div className="text-xs text-gray-400">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!user.walletAddress && (
            <button
              onClick={() => setShowWalletModal(true)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
          
          <button
            onClick={logout}
            className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Wallet Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Connect Wallet</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter your wallet address"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleWalletConnect}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google
      </button>
      
      <button
        onClick={handleTelegramLogin}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
        Telegram
      </button>
    </div>
  );
}

