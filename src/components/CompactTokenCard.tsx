"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import Link from "next/link";
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
  Copy,
  Check,
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
  connectedGrid?: boolean; // For desktop connected grid layout
}

export function CompactTokenCard({
  token,
  formatCurrency,
  formatNumber,
  displaySettings,
  connectedGrid = false,
}: CompactTokenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    // If token has creation timestamp, use it directly
    if (token.createdTimestamp) {
      const diff = Date.now() - token.createdTimestamp;
      let display = "";
      if (diff < 60000) {
        display = `${Math.floor(diff / 1000)}s`;
      } else if (diff < 3600000) {
        display = `${Math.floor(diff / 60000)}m`;
      } else {
        display = `${Math.floor(diff / 3600000)}h`;
      }
      return { baseTimestamp: token.createdTimestamp, display };
    }

    // Otherwise, parse from time string (for WebSocket tokens that start from 0)
    const match = token.time.match(/(\d+)([smh])/);
    if (!match) return { baseTimestamp: Date.now(), display: token.time };
    const value = parseInt(match[1]);
    const unit = match[2];
    let seconds = 0;
    switch (unit) {
      case "s":
        seconds = value;
        break;
      case "m":
        seconds = value * 60;
        break;
      case "h":
        seconds = value * 3600;
        break;
    }
    // Store the base timestamp (for newly created tokens, this will be close to now)
    const baseTimestamp = Date.now() - seconds * 1000;
    return { baseTimestamp, display: token.time };
  });

  const priceChange24h = token.percentages?.[token.percentages.length - 1] ?? 0;
  const isPositive = priceChange24h >= 0;
  const isTrending = token.volume > 1000;
  const buyCount = Math.floor(token.transactions * 0.55);
  const sellCount = token.transactions - buyCount;

  // Estimate bonding curve progress based on market cap (Pump.fun completes around $69k)
  const bondingCurveTarget = 69000;
  const bondingProgress = Math.min(
    Math.max(token.marketCap / bondingCurveTarget, 0),
    1
  );

  // Determine chain from token data
  const chainType = token.chain === "bsc" ? "bsc" : "sol";
  const chainRoute = chainType === "bsc" ? "bsc" : "sol";

  const copyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(token.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  // Update time display every second
  useEffect(() => {
    // If token has creation timestamp, use it directly
    if (token.createdTimestamp) {
      const updateTime = () => {
        const diff = Date.now() - token.createdTimestamp!;
        let display = "";

        if (diff < 60000) {
          display = `${Math.floor(diff / 1000)}s`;
        } else if (diff < 3600000) {
          display = `${Math.floor(diff / 60000)}m`;
        } else {
          display = `${Math.floor(diff / 3600000)}h`;
        }

        setCurrentTime({ baseTimestamp: token.createdTimestamp!, display });
      };

      // Update immediately
      updateTime();

      // Update every second
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }

    // Otherwise, parse from time string (for WebSocket tokens)
    const match = token.time.match(/(\d+)([smh])/);
    if (!match) return;

    const value = parseInt(match[1]);
    const unit = match[2];
    let initialSeconds = 0;
    switch (unit) {
      case "s":
        initialSeconds = value;
        break;
      case "m":
        initialSeconds = value * 60;
        break;
      case "h":
        initialSeconds = value * 3600;
        break;
    }

    const baseTimestamp = Date.now() - initialSeconds * 1000;

    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - baseTimestamp) / 1000);
      let display = "";

      if (elapsed < 60) {
        display = `${elapsed}s`;
      } else if (elapsed < 3600) {
        display = `${Math.floor(elapsed / 60)}m`;
      } else {
        display = `${Math.floor(elapsed / 3600)}h`;
      }

      setCurrentTime({ baseTimestamp, display });
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [token.time, token.createdTimestamp]);

  return (
    <>
      <Link
        href={`/${chainRoute}/${token.id}`}
        className={`block bg-panel ${
          connectedGrid
            ? "border-b border-r border-gray-700/50 rounded-none p-3"
            : `border-2 border-gray-800/50 mb-2 rounded-xl p-3`
        } hover:border-[var(--primary-border)] transition-all group cursor-pointer ${connectedGrid ? "" : "shadow-sm hover:shadow-md"}`}
        style={{ visibility: "visible", opacity: 1 }}
      >
        <div className="flex items-start gap-2.5">
          {/* Left: Token Icon */}
          <div className="flex-shrink-0 relative">
            {token.image && !imageError ? (
              <div
                className={`w-10 h-10 ${displaySettings?.circleImages ? "rounded-full" : "rounded-lg"} overflow-hidden ring-2 ring-gray-800/50 relative group/token bg-panel-elev`}
              >
                <img
                  src={token.image}
                  alt={token.symbol}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                  style={{ display: "block" }}
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
                {typeof currentTime === "object"
                  ? currentTime.display
                  : currentTime}
              </span>
              {isTrending && (
                <Flame className="w-3 h-3 text-orange-400 cursor-pointer flex-shrink-0" />
              )}
              <Info className="w-3 h-3 text-gray-500 hover:text-[var(--primary-text)] cursor-pointer flex-shrink-0" />
            </div>

            {/* Activity Icons Row - With Text Labels */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {/* Views Icon with Label */}
              <div className="flex items-center gap-0.5 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                <User className="w-2.5 h-2.5 text-cyan-400" />
                <span className="text-[9px] text-cyan-400 font-medium">
                  {formatNumber(token.activity.views)}
                </span>
              </div>
              {/* Holders Icon with Label */}
              <div className="flex items-center gap-0.5 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                <Users className="w-2.5 h-2.5 text-indigo-400" />
                <span className="text-[9px] text-indigo-400 font-medium">
                  {formatNumber(token.activity.holders)}
                </span>
              </div>
              {/* Trades Icon with Label */}
              <div className="flex items-center gap-0.5 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                <Activity className="w-2.5 h-2.5 text-pink-400" />
                <span className="text-[9px] text-pink-400 font-medium">
                  {formatNumber(token.activity.trades)}
                </span>
              </div>
              {/* Quality Score - Better Label */}
              <div className="flex items-center gap-0.5 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                <span className="text-[8px] text-yellow-400/70 font-medium">
                  Quality
                </span>
                <span className="text-[10px] text-yellow-400 font-bold">
                  {token.activity.Q}
                </span>
              </div>
            </div>

            {/* Price change + Bonding curve */}
            <div className="mb-1.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-500 font-medium">
                    Price Change (24h)
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {priceChange24h > 0 ? "+" : ""}
                    {priceChange24h.toFixed(2)}%
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 font-medium">
                  {formatCurrency(token.price)}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between text-[9px] text-gray-500 mb-0.5">
                  <span>Bonding Curve Progress</span>
                  <span className="text-gray-300 font-semibold">
                    {Math.round(bondingProgress * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-800/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transition-all"
                    style={{ width: `${bondingProgress * 100}%` }}
                  />
                </div>
              </div>
            </div>

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
            <div className="mt-1.5 pt-1.5 border-t border-gray-800/30 flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                <span className="text-gray-500">{token.id.slice(0, 6)}</span>
                <span className="text-gray-600">...</span>
                <span className="text-gray-500">{token.id.slice(-6)}</span>
              </span>
              <button
                onClick={copyAddress}
                className="p-1 hover:bg-panel-elev rounded transition-colors flex items-center justify-center group/copy"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-500 group-hover/copy:text-gray-300 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Right: Buy Button */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTradingPanel(true);
              }}
              className={`${displaySettings?.quickBuySize === "large" ? "px-3 py-2 text-xs" : displaySettings?.quickBuySize === "mega" ? "px-4 py-2.5 text-sm" : displaySettings?.quickBuySize === "ultra" ? "px-5 py-3 text-base" : "px-2.5 py-1.5 text-[10px]"} bg-primary-dark hover:bg-primary-darker text-white font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap`}
            >
              <span>4 O</span>
              <span
                className={`${displaySettings?.quickBuySize === "ultra" ? "text-xs" : displaySettings?.quickBuySize === "mega" ? "text-[10px]" : "text-[8px]"} opacity-80`}
              >
                SOL
              </span>
            </button>
            {/* {token.isPaid && (
              <span className="text-[9px] text-green-400">Paid</span>
            )} */}
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
