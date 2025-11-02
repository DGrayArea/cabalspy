'use client';

import { useState, useEffect, useCallback } from 'react';
import { pumpAPIService } from '@/services/websocket';
import { TokenData } from '@/types/token';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [finalStretch, setFinalStretch] = useState<TokenData[]>([]);
  const [migrated, setMigrated] = useState<TokenData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTokenUpdate = useCallback((token: TokenData) => {
    setTokens(prevTokens => {
      const existingIndex = prevTokens.findIndex(t => t.id === token.id);
      
      if (existingIndex >= 0) {
        // Update existing token
        const updatedTokens = [...prevTokens];
        updatedTokens[existingIndex] = token;
        return updatedTokens;
      } else {
        // Add new token
        return [token, ...prevTokens].slice(0, 50); // Keep only latest 50 tokens
      }
    });
  }, []);

  useEffect(() => {
    // Subscribe to token updates
    pumpAPIService.subscribeToTokenUpdates(handleTokenUpdate);
    pumpAPIService.subscribeToFinalStretch((arr: TokenData[]) => {
      setFinalStretch(arr);
    });
    pumpAPIService.subscribeToMigration((arr: TokenData[]) => {
      setMigrated(arr);
    });

    // Connect to WebSocket
    pumpAPIService.connect();

    // Set up connection status listeners
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    const handleError = (err: Error | unknown) => {
      const message = err instanceof Error ? err.message : 'WebSocket error';
      setError(message);
    };

    pumpAPIService.onConnected(handleConnected);
    pumpAPIService.onDisconnected(handleDisconnected);
    pumpAPIService.onError(handleError);

    return () => {
      pumpAPIService.disconnect();
    };
  }, [handleTokenUpdate]);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    // This would send a message through the WebSocket
    console.log('Sending message:', message);
  }, []);

  return {
    isConnected,
    tokens,
    finalStretch,
    migrated,
    error,
    sendMessage
  };
};

