"use client";

import { useEffect, useState } from "react";
import { TokenData } from "@/types/token";
import { formatCurrency } from "@/utils/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import Image from "next/image";

interface TokenMarqueeProps {
  tokens: TokenData[];
  speed?: "slow" | "normal" | "fast";
}

export function TokenMarquee({ tokens, speed = "normal" }: TokenMarqueeProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Duplicate tokens for seamless loop
  const duplicatedTokens = [...tokens, ...tokens];

  const handleImageError = (tokenId: string) => {
    setImageErrors((prev) => new Set(prev).add(tokenId));
  };

  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden bg-panel/50 border-y border-gray-800/50 py-3">
      <div className="flex overflow-hidden">
        <div
          className="flex gap-6 whitespace-nowrap"
          style={{
            animation: `scroll ${speed === "slow" ? "60s" : speed === "fast" ? "20s" : "40s"} linear infinite`,
            willChange: "transform",
          }}
        >
          {duplicatedTokens.map((token, index) => {
            const hasImageError = imageErrors.has(token.id);
            const priceChange = token.percentages?.[4] || 0; // 24h change
            const isPositive = priceChange >= 0;

            return (
              <div
                key={`${token.id}-${index}`}
                className="flex items-center gap-3 px-4 py-2 bg-panel-elev/50 rounded-lg border border-gray-700/30 hover:border-primary/50 transition-all min-w-[280px] flex-shrink-0"
              >
                {/* Token Image/Icon */}
                {token.image && !hasImageError ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={token.image}
                      alt={token.symbol}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(token.id)}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-green-500/30 flex items-center justify-center flex-shrink-0 text-lg">
                    {token.icon || "🪙"}
                  </div>
                )}

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">
                      {token.symbol}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {token.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-gray-300">
                      {formatCurrency(token.marketCap)}
                    </span>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{Math.abs(priceChange).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-app to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-app to-transparent pointer-events-none z-10" />
    </div>
  );
}
