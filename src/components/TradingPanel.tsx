'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/context/AuthContext';
import { TokenData } from '@/types/token';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { pumpApiService } from '@/services/pumpapi';

interface TradingPanelProps {
  token: TokenData;
  onClose: () => void;
}

export default function TradingPanel({ token, onClose }: TradingPanelProps) {
  const { user } = useAuth();
  const { wallet, sendTransaction, isLoading } = useWallet();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrade = async () => {
    if (!user || !wallet) {
      alert('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      const slippageBps = Math.round(parseFloat(slippage) * 100); // percent -> bps

      // Minimal trade call to PumpApi
      const requestBase = {
        mint: token.id, // assuming id is the token mint/address
        side: tradeType,
        amount: amount.trim(),
        slippageBps,
        walletAddress: wallet.address,
      } as const;

      // Optionally request a quote first (could be shown in UI later)
      // const quote = await pumpApiService.getQuote(requestBase);

      const trade =
        tradeType === 'buy'
          ? await pumpApiService.buyToken(requestBase)
          : await pumpApiService.sellToken(requestBase);

      if (trade.status === 'failed') {
        throw new Error(trade.message || 'Trade failed');
      }

      alert(`${tradeType === 'buy' ? 'Buy' : 'Sell'} submitted${trade.txId ? `: ${trade.txId}` : ''}`);
      onClose();
    } catch (error) {
      console.error('Trading error:', error);
      alert('Failed to place trade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-400 mb-4">Please sign in to start trading</p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wallet Required</h3>
            <p className="text-gray-400 mb-4">Please connect your wallet to start trading</p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trade {token.symbol}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Token Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{token.icon}</div>
              <div>
                <div className="font-semibold">{token.name}</div>
                <div className="text-sm text-gray-400">{token.symbol}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-semibold">${token.price}</div>
                <div className="text-sm text-gray-400">MC: ${token.marketCap.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Trade Type Toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setTradeType('buy')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
                tradeType === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Buy
            </button>
            <button
              onClick={() => setTradeType('sell')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
                tradeType === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Sell
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount ({tradeType === 'buy' ? 'SOL' : token.symbol})
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-3 top-2 text-gray-400 text-sm">
                {tradeType === 'buy' ? 'SOL' : token.symbol}
              </div>
            </div>
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Slippage Tolerance (%)
            </label>
            <div className="flex gap-2">
              {['0.1', '0.5', '1.0'].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    slippage === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="Custom"
                className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Trade Summary */}
          {amount && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">Trade Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className={tradeType === 'buy' ? 'text-green-400' : 'text-red-400'}>
                    {tradeType === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>{amount} {tradeType === 'buy' ? 'SOL' : token.symbol}</span>
                </div>
                {tradeType === 'buy' && (
                  <div className="flex justify-between">
                    <span>You'll receive:</span>
                    <span>{(parseFloat(amount) / token.price).toFixed(6)} {token.symbol}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>${token.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage:</span>
                  <span>{slippage}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleTrade}
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                tradeType === 'buy'
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} {token.symbol}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






