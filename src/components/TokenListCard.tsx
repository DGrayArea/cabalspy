"use client";

import { useState, Suspense, lazy } from "react";
import Image from "next/image";
import { TokenData } from "@/types/token";
import {
  ExternalLink,
  Clock,
  DollarSign,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";

const TradingPanel = lazy(() => import("@/components/TradingPanel"));

interface TokenListCardProps {
  token: TokenData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function TokenListCard({
  token,
  formatCurrency,
  formatNumber,
}: TokenListCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);

  const percentageChange =
    token.percentages.reduce((sum, p) => sum + p, 0) /
      token.percentages.length || 0;
  const isPositive = percentageChange >= 0;
  const buyCount = Math.floor(token.transactions * 0.55);
  const sellCount = token.transactions - buyCount;

  return (
    <>
      <div className="bg-panel border border-gray-800/50 rounded-lg p-3 hover:border-[var(--primary-border)] transition-all w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
            {/* Token Icon */}
            <div className="flex-shrink-0 relative group/token">
              {token.image && !imageError ? (
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-800/50">
                  <Image
                    src={token.image}
                    alt={token.symbol}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center ring-2 ring-gray-800/50 text-xl shadow-lg shadow-[var(--primary)]/10">
                  {token.icon}
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover/token:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/token:opacity-100 rounded-full cursor-pointer">
                <ExternalLink className="w-3 h-3 text-[var(--primary-text)] cursor-pointer" />
              </div>
            </div>

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{token.name}</h3>
                <span className="text-xs text-gray-400">{token.symbol}</span>
                <span className="text-xs text-[var(--primary-text)]">
                  @{token.symbol.toLowerCase()}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 cursor-pointer" />
                  {token.time}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 cursor-pointer" />
                  MC: {formatCurrency(token.marketCap)}
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3 cursor-pointer" />
                  V: {formatCurrency(token.volume)}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 cursor-pointer" />
                  TX: {formatNumber(token.transactions)}
                </span>
                <span className="text-green-400">{buyCount}</span>
                <span className="text-gray-600">/</span>
                <span className="text-red-400">{sellCount}</span>
              </div>
            </div>
          </div>

          {/* Percentage Change & Buy Button */}
          <div className="flex items-center gap-3 sm:flex-col sm:items-end w-full sm:w-auto justify-between sm:justify-end">
            {/* Percentage Change */}
            <div
              className={`text-right ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
              <div className="flex items-center gap-1 justify-end">
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 cursor-pointer" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 cursor-pointer" />
                )}
                <span className="font-bold">
                  {Math.abs(percentageChange).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={() => setShowTradingPanel(true)}
              className="px-4 py-2 bg-primary-dark hover:bg-primary-darker text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <Zap className="w-4 h-4 cursor-pointer" />
              Buy
            </button>
          </div>
        </div>
      </div>

      {showTradingPanel && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            </div>
          }
        >
          <TradingPanel
            token={token}
            onClose={() => setShowTradingPanel(false)}
          />
        </Suspense>
      )}
    </>
  );
}

