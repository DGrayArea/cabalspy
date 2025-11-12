"use client";

import { useState, Suspense, lazy } from "react";
import Image from "next/image";
import { TokenData } from "@/types/token";
import {
  ExternalLink,
  Clock,
  Flame,
  Info,
  User,
  Search,
  Users,
  Grid3x3,
  DollarSign,
  BarChart3,
  Coins,
  Activity,
} from "lucide-react";

const TradingPanel = lazy(() => import("@/components/TradingPanel"));

interface CompactTokenCardProps {
  token: TokenData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  displaySettings?: {
    metricsSize?: "small" | "large";
    quickBuySize?: "small" | "large" | "mega" | "ultra";
    grey?: boolean;
    noDecimals?: boolean;
    circleImages?: boolean;
    progressBar?: boolean;
  };
}

export function CompactTokenCard({
  token,
  formatCurrency,
  formatNumber,
  displaySettings,
}: CompactTokenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);

  const percentageChange =
    token.percentages.reduce((sum, p) => sum + p, 0) /
      token.percentages.length || 0;
  const isPositive = percentageChange >= 0;
  const isTrending = token.volume > 1000;
  const buyCount = Math.floor(token.transactions * 0.55);
  const sellCount = token.transactions - buyCount;

  // Determine chain (default to SOL for now)
  const chainType = "sol"; // Can be enhanced with token.chain property

  return (
    <>
      <div
        className={`bg-panel border-2 ${displaySettings?.spacedTables ? "border-gray-700/50 mb-3" : "border-gray-800/50 mb-2"} rounded-xl p-3 hover:border-[var(--primary-border)] transition-all group cursor-pointer shadow-sm hover:shadow-md`}
      >
        <div className="flex items-start gap-2.5">
          {/* Left: Token Icon */}
          <div className="flex-shrink-0 relative">
            {token.image && !imageError ? (
              <div
                className={`w-10 h-10 ${displaySettings?.circleImages ? "rounded-full" : "rounded-lg"} overflow-hidden ring-2 ring-gray-800/50 relative group/token`}
              >
                <Image
                  src={token.image}
                  alt={token.symbol}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover/token:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/token:opacity-100 cursor-pointer">
                  <ExternalLink className="w-3 h-3 text-[var(--primary-text)] cursor-pointer" />
                </div>
              </div>
            ) : (
              <div
                className={`w-10 h-10 ${displaySettings?.circleImages ? "rounded-full" : "rounded-lg"} bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center ring-2 ring-gray-800/50 text-lg shadow-lg shadow-[var(--primary)]/10`}
              >
                {token.icon}
              </div>
            )}
            {/* Chain indicator */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-panel flex items-center justify-center ${
                chainType === "sol"
                  ? "bg-gradient-to-br from-purple-500 to-blue-500"
                  : "bg-gradient-to-br from-yellow-400 to-orange-500"
              }`}
            >
              <span className="text-[8px] font-bold text-white">
                {chainType === "sol" ? "S" : "B"}
              </span>
            </div>
          </div>

          {/* Middle: Token Info */}
          <div className="flex-1 min-w-0">
            {/* Token Name and Time */}
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-xs truncate">{token.name}</h3>
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                <Clock className="w-2.5 h-2.5 cursor-pointer" />
                {token.time}
              </span>
              {isTrending && (
                <Flame className="w-3 h-3 text-orange-400 cursor-pointer flex-shrink-0" />
              )}
              <Info className="w-3 h-3 text-gray-500 hover:text-[var(--primary-text)] cursor-pointer flex-shrink-0" />
            </div>

            {/* Small Icons Row - More Colorful with Better Styling */}
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 bg-cyan-500/10 rounded border border-cyan-500/20">
                <User className="w-2.5 h-2.5 text-cyan-400 cursor-pointer" />
              </div>
              <div className="p-1 bg-purple-500/10 rounded border border-purple-500/20">
                <Search className="w-2.5 h-2.5 text-purple-400 cursor-pointer" />
              </div>
              <div className="p-1 bg-indigo-500/10 rounded border border-indigo-500/20">
                <Users className="w-2.5 h-2.5 text-indigo-400 cursor-pointer" />
              </div>
              <div className="p-1 bg-pink-500/10 rounded border border-pink-500/20">
                <Grid3x3 className="w-2.5 h-2.5 text-pink-400 cursor-pointer" />
              </div>
              <span className="text-[10px] text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                Q{token.activity.Q}
              </span>
              <div className="p-1 bg-blue-500/10 rounded border border-blue-500/20">
                <Clock className="w-2.5 h-2.5 text-blue-400 cursor-pointer" />
              </div>
            </div>

            {/* Percentage Row - Prominently Displayed */}
            {displaySettings?.progressBar ? (
              <div className="flex items-center gap-0.5 mb-1.5 bg-panel-elev/30 rounded px-1 py-0.5 h-4">
                {token.percentages.map((pct, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-full rounded relative overflow-hidden"
                    style={{
                      backgroundColor:
                        pct > 0
                          ? "rgba(34, 197, 94, 0.2)"
                          : pct < 0
                            ? "rgba(239, 68, 68, 0.2)"
                            : "rgba(107, 114, 128, 0.2)",
                    }}
                  >
                    <div
                      className={`h-full rounded transition-all ${
                        pct > 0
                          ? "bg-green-400"
                          : pct < 0
                            ? "bg-red-400"
                            : "bg-gray-500"
                      }`}
                      style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                    />
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-[8px] font-medium px-0.5 ${
                        pct > 0
                          ? "text-green-300"
                          : pct < 0
                            ? "text-red-300"
                            : "text-gray-400"
                      }`}
                    >
                      {pct > 0 ? "+" : ""}
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-0.5 mb-1.5 bg-panel-elev/30 rounded px-1 py-0.5">
                {token.percentages.map((pct, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-medium px-0.5 ${
                      pct > 0
                        ? "text-green-400"
                        : pct < 0
                          ? "text-red-400"
                          : "text-gray-500"
                    }`}
                  >
                    {pct > 0 ? "+" : ""}
                    {pct.toFixed(0)}%
                  </span>
                ))}
              </div>
            )}

            {/* Metrics Row - More Colorful */}
            <div
              className={`flex items-center gap-2 ${displaySettings?.metricsSize === "large" ? "text-xs" : "text-[10px]"} flex-wrap ${displaySettings?.grey ? "text-gray-400" : ""}`}
            >
              <span
                className={`flex items-center gap-0.5 ${displaySettings?.grey ? "text-gray-400" : "text-green-400"}`}
              >
                <DollarSign className="w-2.5 h-2.5 cursor-pointer" />
                <span className="font-medium">MC:</span>{" "}
                {displaySettings?.noDecimals
                  ? formatCurrency(token.marketCap).replace(/\.\d+/g, "")
                  : formatCurrency(token.marketCap)}
              </span>
              <span
                className={`flex items-center gap-0.5 ${displaySettings?.grey ? "text-gray-400" : "text-blue-400"}`}
              >
                <BarChart3 className="w-2.5 h-2.5 cursor-pointer" />
                <span className="font-medium">V:</span>{" "}
                {displaySettings?.noDecimals
                  ? formatCurrency(token.volume).replace(/\.\d+/g, "")
                  : formatCurrency(token.volume)}
              </span>
              <span
                className={`flex items-center gap-0.5 ${displaySettings?.grey ? "text-gray-400" : "text-yellow-400"}`}
              >
                <Coins className="w-2.5 h-2.5 cursor-pointer" />
                <span className="font-medium">F:</span>{" "}
                {displaySettings?.noDecimals
                  ? Math.round(token.fee)
                  : token.fee.toFixed(3)}
              </span>
              <span
                className={`flex items-center gap-0.5 ${displaySettings?.grey ? "text-gray-400" : "text-purple-400"}`}
              >
                <Activity className="w-2.5 h-2.5 cursor-pointer" />
                <span className="font-medium">TX:</span>{" "}
                {formatNumber(token.transactions)}
              </span>
            </div>
            {/* Token Address/Label */}
            <div className="mt-1.5 pt-1.5 border-t border-gray-800/30">
              <span className="text-[9px] text-gray-500 font-mono">
                {token.id.slice(0, 4)}...{token.id.slice(-4)}
              </span>
            </div>
          </div>

          {/* Right: Buy Button */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <button
              onClick={() => setShowTradingPanel(true)}
              className={`${displaySettings?.quickBuySize === "large" ? "px-3 py-2 text-xs" : displaySettings?.quickBuySize === "mega" ? "px-4 py-2.5 text-sm" : displaySettings?.quickBuySize === "ultra" ? "px-5 py-3 text-base" : "px-2.5 py-1.5 text-[10px]"} bg-primary-dark hover:bg-primary-darker text-white font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap`}
            >
              <span>4 O</span>
              <span
                className={`${displaySettings?.quickBuySize === "ultra" ? "text-xs" : displaySettings?.quickBuySize === "mega" ? "text-[10px]" : "text-[8px]"} opacity-80`}
              >
                SOL
              </span>
            </button>
            {Math.random() > 0.7 && (
              <span className="text-[9px] text-green-400">Paid</span>
            )}
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
