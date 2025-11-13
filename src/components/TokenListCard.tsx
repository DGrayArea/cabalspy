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
      <div className="bg-panel border-2 border-gray-800/50 rounded-xl p-4 hover:border-[var(--primary-border)] transition-all w-full shadow-sm hover:shadow-md">
        <div className="flex items-center gap-4">
          {/* Token Icon */}
          <div className="flex-shrink-0 relative group/token">
            {token.image && !imageError ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-gray-800/50">
                <Image
                  src={token.image}
                  alt={token.symbol}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center ring-2 ring-gray-800/50 text-xl shadow-lg shadow-[var(--primary)]/10">
                {token.icon}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover/token:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/token:opacity-100 rounded-xl cursor-pointer">
              <ExternalLink className="w-3 h-3 text-[var(--primary-text)] cursor-pointer" />
            </div>
          </div>

          {/* Token Info - Main Section */}
          <div className="flex-1 min-w-0">
            {/* First Row: Name, Symbol, Time */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-bold text-base text-white">{token.name}</h3>
              <span className="text-sm text-gray-400 font-medium">
                {token.symbol}
              </span>
              <span className="text-xs text-[var(--primary-text)] font-medium">
                @{token.symbol.toLowerCase()}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 cursor-pointer" />
                {token.time}
              </span>
            </div>

            {/* Second Row: Metrics */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1.5 text-green-400">
                <DollarSign className="w-4 h-4 cursor-pointer" />
                <span className="font-medium">MC:</span>
                <span>{formatCurrency(token.marketCap)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <BarChart3 className="w-4 h-4 cursor-pointer" />
                <span className="font-medium">V:</span>
                <span>{formatCurrency(token.volume)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <Activity className="w-4 h-4 cursor-pointer" />
                <span className="font-medium">TX:</span>
                <span>{formatNumber(token.transactions)}</span>
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-green-400 font-medium">{buyCount}</span>
                <span className="text-gray-600">/</span>
                <span className="text-red-400 font-medium">{sellCount}</span>
              </div>
            </div>
          </div>

          {/* Right Section: Percentage & Buy Button */}
          <div className="flex-shrink-0 flex items-center gap-4">
            {/* Percentage Change */}
            <div
              className={`text-right ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
              <div className="flex items-center gap-1.5 justify-end">
                {isPositive ? (
                  <ArrowUpRight className="w-5 h-5 cursor-pointer" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 cursor-pointer" />
                )}
                <span className="font-bold text-lg">
                  {isPositive ? "+" : ""}
                  {percentageChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={() => setShowTradingPanel(true)}
              className="px-5 py-2.5 bg-primary-dark hover:bg-primary-darker text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 shadow-lg shadow-primary/20 hover:shadow-primary/30"
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
