'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenData } from '@/types/token';

// Request deduplication - prevent multiple simultaneous requests
let pendingRequest: Promise<TokenData[]> | null = null;
let requestCache: { data: TokenData[]; timestamp: number } | null = null;
const CACHE_DURATION = 10000; // 10 seconds

export const useTokens = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTokens = useCallback(async () => {
    // Check cache first
    if (requestCache && Date.now() - requestCache.timestamp < CACHE_DURATION) {
      setTokens(requestCache.data);
      setIsLoading(false);
      return;
    }

    // Deduplicate concurrent requests
    if (pendingRequest) {
      try {
        const data = await pendingRequest;
        setTokens(data);
        setIsLoading(false);
        return;
      } catch (err) {
        // If pending request fails, continue with new request
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create request promise for deduplication
      pendingRequest = fetch('/api/tokens', {
        next: { revalidate: 15 }, // Use Next.js fetch cache
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch tokens');
          }
          const data = await response.json();
          return data.tokens || [];
        });

      const data = await pendingRequest;
      setTokens(data);
      
      // Update cache
      requestCache = { data, timestamp: Date.now() };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tokens';
      setError(errorMessage);
      console.error('Error fetching tokens:', err);
    } finally {
      setIsLoading(false);
      pendingRequest = null;
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    
    // Refresh tokens every 30 seconds (respecting cache)
    intervalRef.current = setInterval(fetchTokens, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTokens]);

  return {
    tokens,
    isLoading,
    error,
    refresh: fetchTokens,
  };
};

