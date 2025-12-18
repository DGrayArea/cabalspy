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
        console.log(`📄 Loading more for ${filter}...`);
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
      console.log("🔴 Mobula Pulse disabled");
      setIsLoading(false);
      return;
    }

    console.log("🟢 Mobula Pulse: Starting auto-refresh...");
    setIsLoading(true);

    // Start auto-refresh
    mobulaPulseManager.startAutoRefresh(() => {
      console.log("🔄 Mobula Pulse: Data refreshed");
      updateTokens();
    });

    // Initial update
    updateTokens();
    setIsLoading(false);

    // Cleanup
    return () => {
      console.log("🔴 Mobula Pulse: Stopping auto-refresh");
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
