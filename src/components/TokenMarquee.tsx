"use client";

import { useState } from "react";
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

  // Duplicate tokens for seamless loop (only for desktop auto-scroll)
  const duplicatedTokens = [...tokens, ...tokens];

  const handleImageError = (tokenId: string) => {
    setImageErrors((prev) => new Set(prev).add(tokenId));
  };

  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full bg-panel/50 border-y border-gray-800/50 py-3">
      <div className=" overflow-x-auto scrollbar-hide scroll-smooth px-2">
        <div className="flex gap-3 min-w-max">
          {tokens.map((token, index) => {
            const hasImageError = imageErrors.has(token.id);
            // Get 24h change from percentages array (last element) or calculate from average
            const priceChange =
              token.percentages && token.percentages.length > 0
                ? token.percentages[4] !== undefined
                  ? token.percentages[4]
                  : token.percentages.reduce((sum, p) => sum + p, 0) /
                    token.percentages.length
                : 0;
            const isPositive = priceChange >= 0;

            return (
              <div
                key={`${token.id}-${index}`}
                className="flex items-center gap-3 px-4 py-2 bg-panel-elev/50 rounded-lg border border-gray-700/30 hover:border-primary/50 transition-all min-w-[240px] sm:min-w-[280px] flex-shrink-0"
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
    </div>
  );
}
