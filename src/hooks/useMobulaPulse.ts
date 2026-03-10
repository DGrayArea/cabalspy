"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  // Start loading=true so skeletons stay until real data arrives
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

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
    setIsLoading(false); // Loading done once we have actual data
  }, []);

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

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return;
    }

    // Prevent double-start in StrictMode
    if (startedRef.current) return;
    startedRef.current = true;

    const apiKey = env.NEXT_PUBLIC_MOBULA_API_KEY;
    if (!apiKey || apiKey === "7b7ba456-f454-4a42-a80e-897319cb0ac1") {
      const errorMsg = "Mobula API key not configured";
      setError(errorMsg);
      setIsLoading(false);
      logger.warn(errorMsg);
      return;
    }

    setError(null);
    // isLoading stays true — set to false inside updateTokens on first data

    try {
      mobulaPulseManager.startAutoRefresh(
        () => {
          updateTokens();
          setError(null);
        },
        (err: any) => {
          const errorMessage = err?.message || err?.toString() || "Unknown error fetching Mobula data";
          setError(errorMessage);
          setIsLoading(false); // Unblock UI on error too
          logger.error("Mobula Pulse refresh error:", err);
        }
      );
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Failed to initialize Mobula Pulse";
      setError(errorMessage);
      setIsLoading(false);
      logger.error("Mobula Pulse initialization error:", err);
    }

    return () => {
      mobulaPulseManager.stopAutoRefresh();
      startedRef.current = false;
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
