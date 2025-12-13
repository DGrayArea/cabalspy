"use client";

/**
 * Hook for fetching tokens from Mobula API
 *
 * This provides price changes and chart data that may be missing from other sources
 *
 * Usage:
 *   const { tokens, isLoading, error, refresh } = useMobulaTokens({
 *     view: 'trending',
 *     enabled: true // Set to false to disable
 *   });
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { TokenData } from "@/types/token";
import { mobulaService } from "@/services/mobula";
import { env } from "@/lib/env";

interface UseMobulaTokensOptions {
  view?: "new" | "bonding" | "bonded" | "trending" | "safe";
  chainId?: string[];
  limit?: number;
  sortBy?: string;
  filters?: Record<string, any>;
  enabled?: boolean; // Set to false to disable Mobula
  refreshInterval?: number; // Auto-refresh interval in ms (default: 30000)
}

export const useMobulaTokens = (options: UseMobulaTokensOptions = {}) => {
  const {
    view = "trending",
    chainId,
    limit = 100,
    sortBy,
    filters,
    enabled = env.NEXT_PUBLIC_USE_MOBULA, // Use env var by default
    refreshInterval = 30000,
  } = options;

  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!enabled) {
      console.log("🔴 Mobula disabled - skipping fetch");
      setIsLoading(false);
      return;
    }

    console.log("🟢 Mobula: Starting fetch...", { view, limit, chainId });
    try {
      setIsLoading(true);
      setError(null);

      const data = await mobulaService.fetchTokens({
        view,
        chainId,
        limit,
        sortBy,
        filters,
      });

      console.log("✅ Mobula: Success!", {
        tokenCount: data.length,
        firstToken: data[0]?.symbol,
        hasPriceChanges: data[0]?.percentages?.length > 0,
      });
      setTokens(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch tokens from Mobula";
      setError(errorMessage);
      console.error("❌ Mobula: Error fetching tokens:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, view, chainId, limit, sortBy, JSON.stringify(filters)]);

  useEffect(() => {
    console.log("🔵 Mobula hook mounted", { enabled, view });
    if (!enabled) {
      console.log("🔴 Mobula disabled in useEffect");
      return;
    }

    // Initial fetch
    console.log("🟢 Mobula: Triggering initial fetch...");
    fetchTokens();

    // Set up auto-refresh
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTokens, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTokens, enabled, refreshInterval]);

  return {
    tokens,
    isLoading,
    error,
    refresh: fetchTokens,
    enabled,
  };
};
