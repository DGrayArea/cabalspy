"use client";

import { useState, useCallback } from "react";
import { TokenData } from "@/types/token";
import {
  fetchCustomFilter,
  CustomFilterOptions,
} from "@/services/mobula-pulse";
import { logger } from "@/lib/logger";

export function useCustomFilter() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [currentConfig, setCurrentConfig] =
    useState<CustomFilterOptions | null>(null);

  /**
   * Apply a new custom filter
   */
  const applyFilter = useCallback(async (config: CustomFilterOptions) => {
    setIsLoading(true);
    setError(null);
    setCurrentOffset(0);
    setCurrentConfig(config);

    try {
      console.log("🔍 Applying custom filter:", config);
      const results = await fetchCustomFilter(config, 0);
      setTokens(results);
      setHasMore(results.length >= config.limit);
      console.log(`✅ Custom filter returned ${results.length} tokens`);
    } catch (err) {
      logger.error("Error applying custom filter:", err);
      setError("Failed to apply filter. Please try again.");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load more tokens (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!currentConfig || isLoading || !hasMore) return;

    setIsLoading(true);
    const newOffset = currentOffset + currentConfig.limit;

    try {
      console.log(`📄 Loading more at offset ${newOffset}...`);
      const results = await fetchCustomFilter(currentConfig, newOffset);

      if (results.length === 0) {
        setHasMore(false);
        console.log("📭 No more results");
      } else {
        // Merge with existing tokens (avoid duplicates)
        const existingIds = new Set(tokens.map((t) => t.id));
        const newTokens = results.filter((t) => !existingIds.has(t.id));
        setTokens([...tokens, ...newTokens]);
        setCurrentOffset(newOffset);
        setHasMore(results.length >= currentConfig.limit);
        console.log(`✅ Added ${newTokens.length} more tokens`);
      }
    } catch (err) {
      logger.error("Error loading more tokens:", err);
      setError("Failed to load more tokens.");
    } finally {
      setIsLoading(false);
    }
  }, [currentConfig, currentOffset, tokens, isLoading, hasMore]);

  /**
   * Clear filter and results
   */
  const clearFilter = useCallback(() => {
    setTokens([]);
    setCurrentConfig(null);
    setCurrentOffset(0);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    tokens,
    isLoading,
    error,
    hasMore,
    applyFilter,
    loadMore,
    clearFilter,
    hasActiveFilter: currentConfig !== null,
    currentConfig,
  };
}
