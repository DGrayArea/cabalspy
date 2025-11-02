'use client';

import { useState, useEffect, useCallback } from 'react';
import { turnkeyService } from '@/services/turnkey';
import { useAuth } from '@/context/AuthContext';

export interface WalletInfo {
  id: string;
  name: string;
  address: string;
  balance: string;
  network: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWallet = useCallback(async (walletName: string) => {
    if (!user) {
      throw new Error('User must be authenticated to create a wallet');
    }

    try {
      setIsLoading(true);
      setError(null);

      const walletId = await turnkeyService.createWallet(user.id, walletName);
      
      // Get wallet details
      const walletDetails = await turnkeyService.getWallet(walletId);
      const addresses = await turnkeyService.getWalletAddresses(walletId);
      
      if (addresses && addresses.length > 0) {
        const address = addresses[0].address;
        const balance = await turnkeyService.getWalletBalance(address);
        
        const walletInfo: WalletInfo = {
          id: walletId,
          name: walletName,
          address,
          balance: balance.balance,
          network: balance.network
        };

        setWallet(walletInfo);
        return walletInfo;
      }

      throw new Error('Failed to get wallet address');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadWallet = useCallback(async (walletId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const walletDetails = await turnkeyService.getWallet(walletId);
      const addresses = await turnkeyService.getWalletAddresses(walletId);
      
      if (addresses && addresses.length > 0) {
        const address = addresses[0].address;
        const balance = await turnkeyService.getWalletBalance(address);
        
        const walletInfo: WalletInfo = {
          id: walletId,
          name: walletDetails.walletName || 'My Wallet',
          address,
          balance: balance.balance,
          network: balance.network
        };

        setWallet(walletInfo);
        return walletInfo;
      }

      throw new Error('Failed to load wallet');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTransaction = useCallback(async (
    to: string,
    value: string,
    data?: string
  ) => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await turnkeyService.sendTransaction(
        wallet.id,
        wallet.address, // This should be accountId, but using address for now
        to,
        value,
        data
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;

    try {
      const balance = await turnkeyService.getWalletBalance(wallet.address);
      setWallet(prev => prev ? { ...prev, balance: balance.balance } : null);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [wallet]);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!wallet) return;

    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [wallet, refreshBalance]);

  return {
    wallet,
    isLoading,
    error,
    createWallet,
    loadWallet,
    sendTransaction,
    refreshBalance
  };
};

