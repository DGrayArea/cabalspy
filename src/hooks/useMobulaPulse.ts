/**
 * Hook for Mobula Pulse - Clean Implementation
 *
 * Handles:
 * - Auto-refresh with smart merging
 * - GET endpoint (new, bonding, bonded)
 * - POST endpoint (trending, quality, high-volume, price-gainers)
 * - Infinite scroll / pagination
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { TokenData } from "@/types/token";
import {
  mobulaPulseManager,
  FILTER_TO_VIEW_MAPPING,
} from "@/services/mobula-pulse";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type FilterType = keyof typeof FILTER_TO_VIEW_MAPPING;

export function useMobulaPulse(enabled = env.NEXT_PUBLIC_USE_MOBULA) {
  const [tokens, setTokens] = useState<Record<FilterType, TokenData[]>>({
    new: [],
    finalStretch: [],
    graduated: [],
    trending: [],
    featured: [],
    marketCap: [],
    latest: [],
  });
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update tokens from manager cache
   */
  const updateTokens = useCallback(() => {
    const updated: Record<FilterType, TokenData[]> = {
      new: mobulaPulseManager.getTokensForFilter("new"),
      finalStretch: mobulaPulseManager.getTokensForFilter("finalStretch"),
      graduated: mobulaPulseManager.getTokensForFilter("graduated"),
      trending: mobulaPulseManager.getTokensForFilter("trending"),
      featured: mobulaPulseManager.getTokensForFilter("featured"),
      marketCap: mobulaPulseManager.getTokensForFilter("marketCap"),
      latest: mobulaPulseManager.getTokensForFilter("latest"),
    };
    setTokens(updated);
  }, []);

  /**
   * Load more tokens for a specific filter
   */
  const loadMore = useCallback(
    async (filter: FilterType) => {
      if (!enabled) return;

      try {
        await mobulaPulseManager.loadMore(filter, 100);
        updateTokens();
      } catch (err) {
        logger.error(`Error loading more for ${filter}:`, err);
      }
    },
    [enabled, updateTokens]
  );

  /**
   * Initialize and start auto-refresh
   */
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return;
    }

    const apiKey = env.NEXT_PUBLIC_MOBULA_API_KEY;
    if (!apiKey || apiKey === "7b7ba456-f454-4a42-a80e-897319cb0ac1") {
      const errorMsg = "Mobula API key not configured";
      setError(errorMsg);
      setIsLoading(false);
      logger.warn(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      mobulaPulseManager.startAutoRefresh(
        () => {
          updateTokens();
          setError(null);
        },
        (err: any) => {
          const errorMessage = err?.message || err?.toString() || "Unknown error fetching Mobula data";
          setError(errorMessage);
          logger.error("Mobula Pulse refresh error:", err);
        }
      );

      updateTokens();
      setIsLoading(false);
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Failed to initialize Mobula Pulse";
      setError(errorMessage);
      setIsLoading(false);
      logger.error("Mobula Pulse initialization error:", err);
    }

    return () => {
      mobulaPulseManager.stopAutoRefresh();
    };
  }, [enabled, updateTokens]);

  return {
    tokens,
    isLoading,
    error,
    loadMore,
    refresh: updateTokens,
    enabled,
  };
}
