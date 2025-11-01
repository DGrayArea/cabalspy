'use client';

import { useState, useEffect, useCallback } from 'react';
import { TokenData } from '@/types/token';

export const useTokens = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/tokens');
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }

      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tokens';
      setError(errorMessage);
      console.error('Error fetching tokens:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    
    // Refresh tokens every 30 seconds
    const interval = setInterval(fetchTokens, 30000);
    
    return () => clearInterval(interval);
  }, [fetchTokens]);

  return {
    tokens,
    isLoading,
    error,
    refresh: fetchTokens,
  };
};

