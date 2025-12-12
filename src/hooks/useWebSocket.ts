"use client";

import { useState, useEffect, useCallback } from "react";
import {
  multiChainTokenService,
  ChainTokenData,
} from "@/services/multichain-tokens";
import { TokenData } from "@/types/token";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [solanaTokens, setSolanaTokens] = useState<TokenData[]>([]);
  const [bscTokens, setBSCTokens] = useState<TokenData[]>([]);
  const [finalStretch, setFinalStretch] = useState<TokenData[]>([]);
  const [migrated, setMigrated] = useState<TokenData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTokenUpdate = useCallback((token: unknown) => {
    const chainToken = token as ChainTokenData;

    setTokens((prevTokens) => {
      const existingIndex = prevTokens.findIndex(
        (t) => t.id === chainToken.id && t.chain === chainToken.chain
      );

      if (existingIndex >= 0) {
        // Update existing token
        const updatedTokens = [...prevTokens];
        updatedTokens[existingIndex] = chainToken;
        return updatedTokens;
      } else {
        // Add new token (keep latest 100 tokens total)
        return [chainToken, ...prevTokens].slice(0, 100);
      }
    });

    // Update chain-specific lists
    if (chainToken.chain === "solana") {
      setSolanaTokens((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === chainToken.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = chainToken;
          return updated;
        }
        return [chainToken, ...prev].slice(0, 50);
      });
    } else if (chainToken.chain === "bsc") {
      setBSCTokens((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === chainToken.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = chainToken;
          return updated;
        }
        return [chainToken, ...prev].slice(0, 50);
      });
    }
  }, []);

  const handleMigrationUpdate = useCallback((token: unknown) => {
    const chainToken = token as ChainTokenData;
    
    setMigrated((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === chainToken.id && t.chain === chainToken.chain);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = chainToken;
        return updated;
      }
      return [chainToken, ...prev].slice(0, 100);
    });
  }, []);

  useEffect(() => {
    // Subscribe to token updates and migration updates from multi-chain service
    multiChainTokenService.on("tokenUpdate", handleTokenUpdate);
    multiChainTokenService.on("migrationUpdate", handleMigrationUpdate);

    // Fetch initial tokens from HTTP APIs
    const loadInitialTokens = async () => {
      try {
        setIsLoading(true);
        const [solana, bsc] = await Promise.all([
          multiChainTokenService.fetchSolanaTokens(),
          multiChainTokenService.fetchBSCTokens(),
        ]);

        // Get initial migrated tokens from service
        const initialMigrated = multiChainTokenService.getMigratedTokens();

        // Set initial tokens
        setSolanaTokens(solana);
        setBSCTokens(bsc);
        setTokens([...solana, ...bsc]);
        setMigrated(initialMigrated);

        // Connect WebSockets for realtime updates
        multiChainTokenService.connectSolana();
        multiChainTokenService.connectBSC();

        setIsConnected(true);
        setIsLoading(false);

        // Debug: Log token counts
        if (process.env.NODE_ENV === "development") {
          // console.log("🔌 WebSocket connected:", {
          //   solana: solana.length,
          //   bsc: bsc.length,
          //   migrated: initialMigrated.length,
          //   total: solana.length + bsc.length,
          // });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load tokens";
        setError(message);
        setIsLoading(false);
        console.error("Error loading initial tokens:", err);
      }
    };

    loadInitialTokens();

    return () => {
      multiChainTokenService.off("tokenUpdate", handleTokenUpdate);
      multiChainTokenService.off("migrationUpdate", handleMigrationUpdate);
      multiChainTokenService.disconnect();
    };
  }, [handleTokenUpdate, handleMigrationUpdate]);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    // console.log("Sending message:", message);
  }, []);

  return {
    isConnected,
    isLoading,
    tokens, // All tokens combined
    solanaTokens, // Solana tokens only
    bscTokens, // BSC tokens only
    finalStretch,
    migrated,
    error,
    sendMessage,
  };
};
