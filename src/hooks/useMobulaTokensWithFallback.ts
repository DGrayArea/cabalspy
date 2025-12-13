"use client";

/**
 * Enhanced hook that tries Mobula first, falls back to existing method if it fails
 *
 * Strategy:
 * 1. Try Mobula first (if enabled)
 * 2. If Mobula fails or returns no data → fall back to existing method
 * 3. Merge Mobula price changes with existing token data when available
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { TokenData } from "@/types/token";
import { useMobulaTokens } from "./useMobulaTokens";
import { env } from "@/lib/env";

interface UseMobulaWithFallbackOptions {
  // Mobula options
  view?: "new" | "bonding" | "bonded" | "trending" | "safe";
  chainId?: string[];
  limit?: number;

  // Fallback tokens (from your existing method)
  fallbackTokens: TokenData[];
  fallbackLoading?: boolean;
  fallbackError?: string | null;

  // Enable/disable
  enabled?: boolean;
}

export const useMobulaTokensWithFallback = (
  options: UseMobulaWithFallbackOptions
) => {
  const {
    view = "trending",
    chainId,
    limit = 100,
    fallbackTokens,
    fallbackLoading = false,
    fallbackError = null,
    enabled = env.NEXT_PUBLIC_USE_MOBULA,
  } = options;

  // Try Mobula first
  const {
    tokens: mobulaTokens,
    isLoading: mobulaLoading,
    error: mobulaError,
    enabled: mobulaEnabled,
  } = useMobulaTokens({
    view,
    chainId,
    limit,
    enabled,
  });

  // Log Mobula status
  // useEffect(() => {
  //   console.log("📊 Mobula Fallback Hook Status:", {
  //     enabled,
  //     mobulaEnabled,
  //     mobulaTokensCount: mobulaTokens.length,
  //     mobulaLoading,
  //     mobulaError,
  //     fallbackTokensCount: fallbackTokens.length,
  //   });
  // }, [
  //   enabled,
  //   mobulaEnabled,
  //   mobulaTokens.length,
  //   mobulaLoading,
  //   mobulaError,
  //   fallbackTokens.length,
  // ]);

  // Determine which data source to use
  const mobulaFailed = mobulaError !== null || mobulaTokens.length === 0;
  const useMobula = enabled && !mobulaFailed && mobulaTokens.length > 0;

  // useEffect(() => {
  //   console.log("🎯 Mobula Fallback Decision:", {
  //     useMobula,
  //     mobulaFailed,
  //     mobulaTokensCount: mobulaTokens.length,
  //     enabled,
  //   });
  // }, [useMobula, mobulaFailed, mobulaTokens.length, enabled]);

  // Merge Mobula data with fallback tokens
  const mergedTokens = useMemo(() => {
    if (!useMobula) {
      // Mobula failed or disabled → use fallback
      console.log("📦 Using fallback tokens", { count: fallbackTokens.length });
      return fallbackTokens;
    }

    // If fallback is empty, just use Mobula tokens directly
    if (fallbackTokens.length === 0) {
      // console.log("📦 Fallback empty, using Mobula tokens directly", {
      //   count: mobulaTokens.length,
      //   sampleTokens: mobulaTokens.slice(0, 3).map((t) => ({
      //     symbol: t.symbol,
      //     name: t.name,
      //     price: t.price,
      //     hasPriceChanges: t.percentages.length > 0,
      //     priceChanges: t.percentages,
      //   })),
      // });
      return mobulaTokens;
    }

    // Mobula succeeded and fallback has tokens → merge them
    // console.log("📦 Merging Mobula with fallback", {
    //   mobulaCount: mobulaTokens.length,
    //   fallbackCount: fallbackTokens.length,
    // });

    // Log sample Mobula tokens
    if (mobulaTokens.length > 0) {
      // console.log(
      //   "🔷 Mobula Tokens Sample (first 3):",
      //   mobulaTokens.slice(0, 3).map((t) => ({
      //     symbol: t.symbol,
      //     name: t.name,
      //     price: t.price,
      //     percentages: t.percentages,
      //     priceChange1h: t.dexscreener?.priceChange1h,
      //     priceChange24h: t.dexscreener?.priceChange24h,
      //     marketCap: t.marketCap,
      //     volume: t.volume,
      //     chain: t.chain,
      //     isMobula: (t as any)._mobula,
      //   }))
      // );
    }

    return fallbackTokens.map((fallbackToken) => {
      // Try to find matching Mobula token
      const mobulaToken = mobulaTokens.find(
        (mt) =>
          mt.id === fallbackToken.id ||
          (mt.chain === fallbackToken.chain &&
            mt.symbol === fallbackToken.symbol) ||
          (mt.chain === fallbackToken.chain &&
            mt.id.split(":")[1] === fallbackToken.id.split(":")[1])
      );

      if (mobulaToken && mobulaToken.percentages.length > 0) {
        // ✅ Merge: Use Mobula for price changes, keep fallback for everything else
        return {
          ...fallbackToken,
          // Fill in price changes for chart
          percentages: mobulaToken.percentages,
          // Fill in price change data
          dexscreener: {
            ...fallbackToken.dexscreener,
            priceChange1h:
              mobulaToken.dexscreener?.priceChange1h ||
              fallbackToken.dexscreener?.priceChange1h,
            priceChange24h:
              mobulaToken.dexscreener?.priceChange24h ||
              fallbackToken.dexscreener?.priceChange24h,
            priceChange5m:
              mobulaToken.dexscreener?.priceChange5m ||
              fallbackToken.dexscreener?.priceChange5m,
          },
        };
      }
      return fallbackToken; // Keep original if no match
    });
  }, [fallbackTokens, mobulaTokens, useMobula]);

  // Determine loading state
  const isLoading = useMobula
    ? mobulaLoading || fallbackLoading
    : fallbackLoading;

  // Determine error state
  const error = useMobula ? mobulaError || fallbackError : fallbackError;

  return {
    tokens: mergedTokens,
    isLoading,
    error,
    // Metadata about which source is being used
    source: useMobula ? "mobula" : "fallback",
    mobulaAvailable: useMobula,
    mobulaError: mobulaError,
  };
};
