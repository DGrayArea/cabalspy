"use client";

import { useState, Suspense, lazy } from "react";
import Image from "next/image";
import Link from "next/link";
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

  // Determine chain from token data
  const chainRoute = token.chain === "bsc" ? "bsc" : "sol";

  return (
    <>
      <Link
        href={`/${chainRoute}/${token.id}`}
        className="block bg-panel border-2 border-gray-800/50 rounded-xl p-3 sm:p-4 md:p-5 hover:border-[var(--primary-border)] transition-all w-full shadow-sm hover:shadow-md"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Token Icon */}
          <div className="flex-shrink-0 relative group/token">
            {token.image && !imageError ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden ring-2 ring-gray-800/50">
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center ring-2 ring-gray-800/50 text-lg sm:text-xl shadow-lg shadow-[var(--primary)]/10">
                {token.icon}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover/token:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/token:opacity-100 rounded-xl cursor-pointer">
              <ExternalLink className="w-3 h-3 text-[var(--primary-text)] cursor-pointer" />
            </div>
          </div>

          {/* Token Info - Main Section */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            {/* First Row: Name, Symbol, Time */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                {token.name}
              </h3>
              <span className="text-xs sm:text-sm text-gray-400 font-medium">
                {token.symbol}
              </span>
              <span className="hidden sm:inline text-xs text-[var(--primary-text)] font-medium">
                @{token.symbol.toLowerCase()}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 cursor-pointer" />
                {token.time}
              </span>
            </div>

            {/* Second Row: Metrics - Responsive Grid */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="flex items-center gap-1 sm:gap-1.5 text-green-400">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer flex-shrink-0" />
                <span className="font-medium hidden sm:inline">MC:</span>
                <span className="truncate">
                  {formatCurrency(token.marketCap)}
                </span>
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5 text-blue-400">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer flex-shrink-0" />
                <span className="font-medium hidden sm:inline">V:</span>
                <span className="truncate">{formatCurrency(token.volume)}</span>
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5 text-purple-400">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer flex-shrink-0" />
                <span className="font-medium hidden sm:inline">TX:</span>
                <span>{formatNumber(token.transactions)}</span>
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5 sm:ml-2">
                <span className="text-green-400 font-medium text-xs sm:text-sm">
                  {buyCount}
                </span>
                <span className="text-gray-600">/</span>
                <span className="text-red-400 font-medium text-xs sm:text-sm">
                  {sellCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section: Percentage & Buy Button */}
          <div className="flex-shrink-0 flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {/* Percentage Change */}
            <div
              className={`text-right ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                )}
                <span className="font-bold text-base sm:text-lg">
                  {isPositive ? "+" : ""}
                  {percentageChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTradingPanel(true);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-primary-dark hover:bg-primary-darker text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer" />
              <span className="hidden sm:inline">Buy</span>
              <span className="sm:hidden">Buy</span>
            </button>
          </div>
        </div>
      </Link>

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
