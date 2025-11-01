'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Plus, RefreshCw, Send, Copy, Check } from 'lucide-react';

export default function WalletManager() {
  const { user } = useAuth();
  const { wallet, isLoading, error, createWallet, sendTransaction, refreshBalance } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateWallet = async () => {
    if (!walletName.trim()) return;

    try {
      await createWallet(walletName.trim());
      setShowCreateModal(false);
      setWalletName('');
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
  };

  const handleSendTransaction = async () => {
    if (!sendTo.trim() || !sendAmount.trim()) return;

    try {
      await sendTransaction(sendTo.trim(), sendAmount.trim());
      setShowSendModal(false);
      setSendTo('');
      setSendAmount('');
    } catch (error) {
      console.error('Failed to send transaction:', error);
    }
  };

  const copyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect to Access Wallet</h3>
          <p className="text-gray-400">Please sign in to manage your wallet</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Wallet Connected</h3>
          <p className="text-gray-400 mb-4">Create a new wallet to start trading</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Wallet
          </button>
        </div>

        {/* Create Wallet Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Create New Wallet</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Wallet Name
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="Enter wallet name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateWallet}
                    disabled={isLoading || !walletName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                  >
                    {isLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
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
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Wallet</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshBalance}
            disabled={isLoading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-400 mb-1">Address</div>
          <div className="flex items-center gap-2">
            <code className="bg-gray-700 px-2 py-1 rounded text-sm font-mono flex-1">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </code>
            <button
              onClick={copyAddress}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">Balance</div>
          <div className="text-xl font-semibold">
            {wallet.balance} {wallet.network === 'ethereum' ? 'ETH' : wallet.network.toUpperCase()}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Send Transaction Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Send Transaction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  To Address
                </label>
                <input
                  type="text"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="Enter recipient address"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSendTransaction}
                  disabled={isLoading || !sendTo.trim() || !sendAmount.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => setShowSendModal(false)}
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

