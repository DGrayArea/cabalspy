"use client";

import { useState, useEffect, useMemo, Suspense, lazy } from "react";
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
  Shield,
  AlertTriangle,
  Brain,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Percent,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPlatformLogo,
  getPlatformIcon,
  getChainLogo,
  getPlatformName,
} from "@/utils/platformLogos";
import { aiPlatformDetector } from "@/services/ai-platform-detector";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { useAuth } from "@/context/AuthContext";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

const TradingPanel = lazy(() => import("@/components/TradingPanel"));

const SOL_MINT = "So11111111111111111111111111111111111111112";

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
  quickBuyAmount?: string; // Quick buy amount from wallet settings
}

export function CompactTokenCard({
  token,
  formatCurrency,
  formatNumber,
  displaySettings,
  connectedGrid = false,
  quickBuyAmount = "0.01",
}: CompactTokenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [platformLogoError, setPlatformLogoError] = useState(false);
  const [chainLogoError, setChainLogoError] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isQuickBuying, setIsQuickBuying] = useState(false);
  const { turnkeyUser } = useAuth();
  const { toast, dismiss } = useToast();
  const { address, connection, signSolanaTransaction } = useTurnkeySolana();

  // Debug: Log platform detection
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('Token platform detection:', {
  //       tokenId: token.id.slice(0, 8),
  //       source: (token as any).source,
  //       chain: token.chain,
  //       detectedPlatform: (token as any).source || token.chain || 'pump',
  //       platformLogo: getPlatformLogo((token as any).source || token.chain || 'pump'),
  //     });
  //   }
  // }, [token.id, (token as any).source, token.chain]);
  const handleQuickBuy = async () => {
    if (
      !turnkeyUser ||
      !address ||
      !connection ||
      !signSolanaTransaction ||
      isQuickBuying
    ) {
      return;
    }

    const amount = parseFloat(quickBuyAmount);
    if (!amount || amount <= 0) {
      toast({
        variant: "error",
        title: "Invalid quick buy amount",
      });
      return;
    }

    try {
      setIsQuickBuying(true);
      const loadingToast = toast({
        variant: "info",
        title: `Buying ${token.symbol}...`,
        className: "loading",
      });

      const result = await executeJupiterSwap({
        inputMint: SOL_MINT,
        outputMint: token.id,
        amount,
        // Use decimals from token data if available
        outputDecimals: token.decimals,
        userPublicKey: address,
        slippageBps: 150, // 1.5% default slippage
        connection,
        signTransaction: signSolanaTransaction,
      });

      dismiss(loadingToast.id);

      if (result.success && result.signature) {
        toast({
          variant: "success",
          title: `Successfully bought ${token.symbol}!`,
          description: `Transaction: ${result.signature.slice(0, 8)}...`,
          action: (
            <ToastAction
              altText="View transaction"
              onClick={() => {
                window.open(
                  `https://solscan.io/tx/${result.signature}`,
                  "_blank"
                );
              }}
            >
              View
            </ToastAction>
          ),
        });
      } else {
        toast({
          variant: "error",
          title: `Failed to buy ${token.symbol}`,
          description: result.error || "Unknown error occurred",
        });
      }
    } catch (error: any) {
      console.error("Quick buy error:", error);
      toast({
        variant: "error",
        title: `Failed to buy ${token.symbol}`,
        description: error.message || "Please try again",
      });
    } finally {
      setIsQuickBuying(false);
    }
  };

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

  // Extract Mobula data if available
  const mobulaData = (token as any)._mobulaData;
  const hasMobulaData = !!mobulaData;

  // Calculate buy/sell ratio from Mobula data
  const buySellRatio = mobulaData?.volumeBuy1h && mobulaData?.volumeSell1h
    ? mobulaData.volumeBuy1h / mobulaData.volumeSell1h
    : null;
  const buySellPressure = buySellRatio
    ? buySellRatio > 1.2 ? "bullish" : buySellRatio < 0.8 ? "bearish" : "neutral"
    : null;

  // CRITICAL: Check migration status FIRST using explicit API indicators
  // NEVER infer from market cap or bonding progress - tokens can drop below threshold after migrating
  // API fields: graduationDate (timestamp), poolAddress (Raydium pool), complete (boolean)
  const graduationDate = (token as any).graduationDate;
  const poolAddress = (token as any).poolAddress || (token as any).raydiumPool;
  const isTokenMigrated =
    (token as any).isMigrated === true ||
    (token as any).migrationTimestamp !== undefined ||
    (poolAddress !== undefined && poolAddress !== null && poolAddress !== "") ||
    (token as any).complete === true ||
    (token as any).isComplete === true ||
    (token as any).migrated === true ||
    (token as any).graduated === true ||
    (graduationDate !== null && graduationDate !== undefined) ||
    (token as any).completeTimestamp !== undefined ||
    // Also check if bondingProgress is explicitly 1.0 (migrated)
    (token as any).bondingProgress === 1.0 ||
    (token as any).bondingProgress >= 1.0;

  // CRITICAL: For migrated tokens, ALWAYS set bonding progress to 1.0
  // Even if market cap dropped below threshold, if it's migrated, it's migrated
  // Check migration status FIRST before using any bondingProgress value
  const bondingProgress = isTokenMigrated
    ? 1.0 // Migrated tokens are always 100% - don't recalculate from MC
    : (token as any).bondingProgress !== undefined &&
        (token as any).bondingProgress < 1.0
      ? (token as any).bondingProgress // Use provided progress if not migrated
      : (() => {
          // Only calculate bonding progress for NON-MIGRATED tokens
          // Pump.fun bonding curve target is ~69 SOL (not $69k USD)
          // If SOL reserves are available, use them directly
          const solReserves =
            (token as any).reserves?.sol ||
            (token as any).solReserves ||
            (token as any).realSolReserves ||
            (token as any).virtualSolReserves;

          if (solReserves && solReserves > 0) {
            // Target is 69 SOL for pump.fun bonding curve
            const SOL_TARGET = 69;
            return Math.min(Math.max(solReserves / SOL_TARGET, 0), 1);
          }

          // Fallback: Calculate from market cap using current SOL price
          // Pump.fun bonding curve completes at 69 SOL
          // At current SOL price (~$137), that's approximately $9,453
          // Using a more accurate approximation based on current market conditions
          const SOL_PRICE_APPROX = 137; // Current approximate SOL price in USD
          const SOL_TARGET = 69; // Pump.fun bonding curve target
          const bondingCurveTargetUSD = SOL_TARGET * SOL_PRICE_APPROX; // ~$9,453
          return Math.min(
            Math.max(token.marketCap / bondingCurveTargetUSD, 0),
            1
          );
        })();

  // Determine chain from token data
  const chainType = token.chain === "bsc" ? "bsc" : "sol";
  const chainRoute = chainType === "bsc" ? "bsc" : "sol";

  // Get platform info - memoize to prevent recalculation
  const platformInfo = useMemo(() => {
    // Use AI detector (with intelligent fallback) - fire-and-forget
    const detectedPlatform = aiPlatformDetector.detectPlatform({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      image: token.image,
      source: (token as any).source,
      protocol: (token as any).protocol,
      chain: token.chain,
      raydiumPool: (token as any).raydiumPool,
      createdTimestamp: token.createdTimestamp,
    });

    const logo = getPlatformLogo(detectedPlatform);
    const icon = getPlatformIcon(detectedPlatform);
    const name = getPlatformName(detectedPlatform);

    // Debug logging when platform logo is not found
    if (
      process.env.NODE_ENV === "development" &&
      !logo &&
      detectedPlatform !== "pump"
    ) {
      console.warn("⚠️ No platform logo found:", {
        tokenId: token.id.slice(0, 8),
        source: (token as any).source,
        protocol: (token as any).protocol,
        chain: token.chain,
        detectedPlatform: detectedPlatform,
      });
    }

    return {
      platform: detectedPlatform,
      logo,
      icon,
      name,
    };
  }, [
    (token as any).source,
    (token as any).protocol,
    token.chain,
    token.id,
    token.name,
    token.symbol,
    token.image,
  ]);

  const {
    platform,
    logo: platformLogo,
    icon: platformIcon,
    name: platformName,
  } = platformInfo;
  const chainLogoUrl = getChainLogo(token.chain || "solana");

  // Extract address from token.id (remove chain prefix like "solana:" or "bsc:")
  const tokenAddress = token.id.includes(':') ? token.id.split(':')[1] : token.id;

  // Get platform-specific bonding curve color
  const getPlatformBondingColor = (platform: string | undefined): string => {
    if (!platform) return "#3b82f6"; // Default blue
    
    const normalized = platform.toLowerCase().replace(/[_-]/g, '');
    
    // Platform-specific colors for bonding curve progress
    const platformColors: Record<string, string> = {
      // Pump.fun - green
      pump: "#54D592",
      pumpfun: "#54D592",
      pumpportal: "#54D592",
      'pump.fun': "#54D592",
      
      // Meteora - orange
      meteora: "#FF6B35",
      'met-dbc': "#FF6B35",
      metdbc: "#FF6B35",
      'dynamic-bc': "#FF6B35",
      dynamicbc: "#FF6B35",
      
      // Moonshot - pink
      moonshot: "#FF69B4",
      
      // Moonit - lemon yellow
      moonit: "#FFE44D",
      
      // Lets Bonk - brown
      bonk: "#8B4513",
      'letsbonk.fun': "#8B4513",
      letsbonkfun: "#8B4513",
      letsbonk: "#8B4513",
      
      // Jupiter - lime green
      jupiter: "#00FF88",
      jupiterstudio: "#00FF88",
      'jupiter-studio': "#00FF88",
      'jup-studio': "#00FF88",
      jupstudio: "#00FF88",
      
      // Raydium - blue
      raydium: "#0074D9",
      'raydium-launchlab': "#0074D9",
      raydiumlaunchlab: "#0074D9",
    };
    
    return platformColors[normalized] || "#3b82f6"; // Default blue gradient
  };

  const bondingColor = getPlatformBondingColor(platform);

  const copyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tokenAddress);
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
        href={`/${chainRoute}/${tokenAddress}`}
        className={`block bg-panel ${
          connectedGrid
            ? "border-b border-r border-gray-700/50 rounded-none p-3"
            : `border-2 border-gray-800/50 mb-2 rounded-xl p-3`
        } hover:border-[var(--primary-border)] transition-all group cursor-pointer ${connectedGrid ? "" : "shadow-sm hover:shadow-md"}`}
        style={{ visibility: "visible", opacity: 1 }}
      >
        <div className="flex items-start gap-2.5">
          {/* Left: Token Icon with Circular Bonding Progress */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-shrink-0 relative cursor-help">
                  {/* Bonding Progress Border - single clean border matching logo shape */}
                  {!isTokenMigrated && bondingProgress < 1 && bondingProgress > 0 && (
                    <svg
                      className={`absolute -inset-1 w-12 h-12 pointer-events-none z-0 transform -rotate-90`}
                      viewBox="0 0 48 48"
                      style={{ overflow: 'visible' }}
                    >
                      {(() => {
                        const isCircle = displaySettings?.circleImages;
                        const radius = isCircle ? 22 : 7;
                        const width = 48;
                        const height = 48;
                        // Calculate perimeter
                        const perimeter = isCircle 
                          ? 2 * Math.PI * radius
                          : (width - 2 * radius) * 2 + (height - 2 * radius) * 2 + 2 * Math.PI * radius;
                        const progressLength = perimeter * bondingProgress;
                        const totalLength = perimeter;
                        
                        return (
                          <rect
                            x="0"
                            y="0"
                            width="48"
                            height="48"
                            rx={isCircle ? "24" : "7"}
                            ry={isCircle ? "24" : "7"}
                            fill="none"
                            stroke={bondingColor}
                            strokeWidth="3"
                            strokeDasharray={`${progressLength} ${totalLength}`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                          />
                        );
                      })()}
                    </svg>
                  )}
                  {/* Full colored border for graduated tokens */}
                  {(isTokenMigrated || bondingProgress >= 1) && (
                    <div
                      className={`absolute -inset-1 ${displaySettings?.circleImages ? "rounded-full" : "rounded-lg"} pointer-events-none z-0`}
                      style={{
                        border: `3px solid ${bondingColor}`,
                        borderRadius: displaySettings?.circleImages ? '50%' : '0.5rem'
                      }}
                    />
                  )}
            {token.image && !imageError ? (
              <div
                      className={`w-10 h-10 ${displaySettings?.circleImages ? "rounded-full" : "rounded-lg"} overflow-hidden relative group/token bg-panel-elev z-10`}
                      style={{
                        border: '2px solid rgba(55, 65, 81, 0.5)'
                      }}
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
                {/* Platform logo overlay - bottom right */}
                {platformLogo && !platformLogoError ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center overflow-hidden z-10">
                    <img
                      src={platformLogo}
                      alt={platformName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (process.env.NODE_ENV === "development") {
                          console.warn(
                            `Platform logo failed: ${platform} -> ${platformLogo}`
                          );
                        }
                        setPlatformLogoError(true);
                      }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center text-[8px] z-10">
                    {platformIcon}
                  </div>
                )}
              </div>
            ) : (
              <div
                      className={`w-10 h-10 ${displaySettings?.circleImages ? "rounded-full" : "rounded-lg"} bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center text-lg shadow-lg shadow-[var(--primary)]/10 relative z-10`}
                      style={{
                        border: '2px solid rgba(55, 65, 81, 0.5)'
                      }}
              >
                      {/* Safeguard: if icon is a URL, use symbol fallback instead */}
                      {token.icon && !token.icon.startsWith('http') && !token.icon.startsWith('data:') && !token.icon.startsWith('/')
                        ? token.icon
                        : token.symbol?.charAt(0).toUpperCase() || "🪙"}
                {/* Platform logo overlay - bottom right */}
                {platformLogo && !platformLogoError ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center overflow-hidden z-10">
                    <img
                      src={platformLogo}
                      alt={platformName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (process.env.NODE_ENV === "development") {
                          console.warn(
                            `Platform logo failed: ${platform} -> ${platformLogo}`
                          );
                        }
                        setPlatformLogoError(true);
                      }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center text-[8px] z-10">
                    {platformIcon}
                  </div>
                )}
              </div>
            )}
          </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-xs bg-panel border border-gray-700 text-white z-50"
              >
                <div className="space-y-1.5">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <img
                      src={token.image || undefined}
                      alt={token.symbol}
                      className="w-5 h-5 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {token.name}
                  </div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>Symbol: {token.symbol}</div>
                    <div>Price: {formatCurrency(token.price)}</div>
                    {hasMobulaData && (
                      <>
                        {mobulaData.priceChange1h !== undefined && (
                          <div className="pt-1 border-t border-gray-700">
                            Price Change (1h):{" "}
                            <span
                              className={
                                mobulaData.priceChange1h >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }
                            >
                              {mobulaData.priceChange1h >= 0 ? "+" : ""}
                              {mobulaData.priceChange1h.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {mobulaData.trendingScore1h > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3 h-3 text-orange-400" />
                            Trending Score: {mobulaData.trendingScore1h.toLocaleString()}
                          </div>
                        )}
                        {!isTokenMigrated && bondingProgress < 1 && (
                          <div className="pt-1 border-t border-gray-700">
                            <div className="flex items-center gap-1.5">
                              <Target className="w-3 h-3 text-orange-400" />
                              Bonding: {Math.round(bondingProgress * 100)}%
                            </div>
                            <div className="text-gray-400 text-[10px] mt-0.5">
                              {Math.round((1 - bondingProgress) * 100)}% remaining
                            </div>
                          </div>
                        )}
                        {isTokenMigrated && (
                          <div className="pt-1 border-t border-gray-700">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-green-400" />
                              Graduated
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Middle: Token Info */}
          <div className="flex-1 min-w-0">
            {/* Token Name and Time */}
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-xs truncate">{token.name}</h3>
              {/* Graduated Badge for 100% bonded tokens */}
              {(isTokenMigrated || bondingProgress >= 1) && (
                <span className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-[8px] font-semibold text-green-400 flex items-center gap-0.5 flex-shrink-0">
                  <Zap className="w-2.5 h-2.5" />
                  Graduated
                </span>
              )}
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                <Clock className="w-2.5 h-2.5 cursor-pointer" />
                {typeof currentTime === "object"
                  ? currentTime.display
                  : currentTime}
              </span>
              {isTrending && (
                <Flame className="w-3 h-3 text-orange-400 cursor-pointer flex-shrink-0" />
              )}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-gray-500 hover:text-[var(--primary-text)] cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">Token Info</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>Symbol: {token.symbol}</div>
                        <div>Price: {formatCurrency(token.price)}</div>
                        {hasMobulaData && (
                          <>
                            {mobulaData.priceChange1h !== undefined && (
                              <div className="pt-1 border-t border-gray-700">
                                Price Change (1h):{" "}
                                <span
                                  className={
                                    mobulaData.priceChange1h >= 0
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }
                                >
                                  {mobulaData.priceChange1h >= 0 ? "+" : ""}
                                  {mobulaData.priceChange1h.toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {mobulaData.trendingScore1h > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Flame className="w-3 h-3 text-orange-400" />
                                Trending Score: {mobulaData.trendingScore1h.toLocaleString()}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Activity Icons Row - With Text Labels and Tooltips */}
            <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {/* Views Icon with Label and Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 cursor-help">
                <User className="w-2.5 h-2.5 text-cyan-400" />
                <span className="text-[9px] text-cyan-400 font-medium">
                  {formatNumber(token.activity.views)}
                </span>
              </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-cyan-400" />
                        Views
                      </div>
                      <div className="text-xs text-gray-300">
                        {formatNumber(token.activity.views)} total views
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Holders Icon with Label and Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 cursor-help">
                <Users className="w-2.5 h-2.5 text-indigo-400" />
                <span className="text-[9px] text-indigo-400 font-medium">
                  {formatNumber(token.activity.holders)}
                </span>
              </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-400" />
                        Holders
                      </div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>{formatNumber(token.activity.holders)} total holders</div>
                        {mobulaData?.top10Holdings > 0 && (
                          <div className="pt-1 border-t border-gray-700">
                            Top 10 Holdings: {mobulaData.top10Holdings.toFixed(1)}%
                            {mobulaData.top10Holdings > 50 && (
                              <span className="text-yellow-400 ml-1">⚠️ High concentration</span>
                            )}
                          </div>
                        )}
                        {mobulaData?.devHoldings > 0 && (
                          <div>
                            Dev Holdings: {mobulaData.devHoldings.toFixed(1)}%
                            {mobulaData.devHoldings > 20 && (
                              <span className="text-red-400 ml-1">⚠️ High risk</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Trades Icon with Label and Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20 cursor-help">
                <Activity className="w-2.5 h-2.5 text-pink-400" />
                <span className="text-[9px] text-pink-400 font-medium">
                  {formatNumber(token.activity.trades)}
                </span>
              </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-pink-400" />
                        Trades
                      </div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>{formatNumber(token.activity.trades)} total trades</div>
                        {mobulaData?.trades1h > 0 && (
                          <div className="pt-1 border-t border-gray-700">
                            Trades (1h): {formatNumber(mobulaData.trades1h)}
                          </div>
                        )}
                        {mobulaData?.traders1h > 0 && (
                          <div>
                            Unique Traders (1h): {formatNumber(mobulaData.traders1h)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Quality Score - Smaller badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 bg-yellow-500/10 px-1 py-0.5 rounded border border-yellow-500/20 cursor-help">
                      <Star className="w-2 h-2 text-yellow-400" />
                      <span className="text-[9px] text-yellow-400 font-bold">
                  {token.activity.Q}
                </span>
              </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-yellow-400" />
                        Quality Score
            </div>
                      <div className="text-xs text-gray-300">
                        Quality score: {token.activity.Q}
                        {hasMobulaData && (
                          <div className="mt-1 pt-1 border-t border-gray-700 space-y-0.5">
                            {mobulaData.smartTradersCount > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Brain className="w-3 h-3 text-blue-400" />
                                Smart Traders: {mobulaData.smartTradersCount}
                              </div>
                            )}
                            {mobulaData.proTradersCount > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Star className="w-3 h-3 text-purple-400" />
                                Pro Traders: {mobulaData.proTradersCount}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Price change + Bonding curve / Migrated tag */}
            <TooltipProvider delayDuration={200}>
              <div className="mb-1.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col gap-0.5 cursor-help min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">
                            24h Change
                  </span>
                  <span
                            className={`text-[11px] font-semibold whitespace-nowrap ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {priceChange24h > 0 ? "+" : ""}
                    {priceChange24h.toFixed(2)}%
                  </span>
                </div>
                        {hasMobulaData && mobulaData.priceChange1h !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-gray-500 whitespace-nowrap">
                              1h:
                            </span>
                            <span
                              className={`text-[9px] font-medium whitespace-nowrap ${
                                mobulaData.priceChange1h >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {mobulaData.priceChange1h >= 0 ? "+" : ""}
                              {mobulaData.priceChange1h.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          Price Changes
                        </div>
                        <div className="text-xs text-gray-300 space-y-1">
                          <div>
                            24h:{" "}
                            <span
                              className={
                                isPositive ? "text-green-400" : "text-red-400"
                              }
                            >
                              {priceChange24h > 0 ? "+" : ""}
                              {priceChange24h.toFixed(2)}%
                            </span>
                          </div>
                          {hasMobulaData && (
                            <div className="pt-1 border-t border-gray-700 space-y-0.5">
                              {mobulaData.priceChange1h !== undefined && (
                                <div>
                                  1h:{" "}
                                  <span
                                    className={
                                      mobulaData.priceChange1h >= 0
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }
                                  >
                                    {mobulaData.priceChange1h >= 0 ? "+" : ""}
                                    {mobulaData.priceChange1h.toFixed(2)}%
                                  </span>
                                </div>
                              )}
                              {mobulaData.priceChange5min !== undefined && (
                                <div>
                                  5m:{" "}
                                  <span
                                    className={
                                      mobulaData.priceChange5min >= 0
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }
                                  >
                                    {mobulaData.priceChange5min >= 0 ? "+" : ""}
                                    {mobulaData.priceChange5min.toFixed(2)}%
                                  </span>
                                </div>
                              )}
                              {mobulaData.ath && mobulaData.ath > token.price && (
                                <div className="pt-1 border-t border-gray-700">
                                  ATH: {formatCurrency(mobulaData.ath)}
                                  <span className="text-red-400 ml-1">
                                    (-
                                    {(
                                      ((mobulaData.ath - token.price) /
                                        mobulaData.ath) *
                                      100
                                    ).toFixed(1)}
                                    %)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-end gap-0.5 cursor-help">
                        <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">
                          Price
                        </span>
                        <span className="text-[11px] text-gray-300 font-semibold whitespace-nowrap">
                  {formatCurrency(token.price)}
                </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          Current Price
                        </div>
                        <div className="text-xs text-gray-300">
                          {formatCurrency(token.price)} per token
                          {hasMobulaData && mobulaData.latest_price && (
                            <div className="mt-1 pt-1 border-t border-gray-700">
                              Latest: {formatCurrency(mobulaData.latest_price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
              </div>
              {/* Show migrated tag if migrated, otherwise show bonding curve */}
              {isTokenMigrated ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between cursor-help">
                  <span className="text-[9px] text-gray-500 font-medium">
                    Status
                  </span>
                        <span className="px-2 py-0.5 rounded-md bg-green-500/20 border border-green-500/50 text-[9px] font-semibold text-green-400 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                    Migrated
                  </span>
                </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-green-400" />
                          Token Graduated
                        </div>
                        <div className="text-xs text-gray-300">
                          ✅ Token has graduated from bonding curve
                          {mobulaData?.bondedAt && (
                            <div className="mt-1 pt-1 border-t border-gray-700">
                              Graduated: {new Date(mobulaData.bondedAt).toLocaleDateString()}
                            </div>
                          )}
                          {mobulaData?.poolAddress && (
                <div>
                              Pool: {mobulaData.poolAddress.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex items-center justify-between text-[9px] text-gray-500 mb-1">
                          <span className="flex items-center gap-1">
                            <Target className="w-2.5 h-2.5" />
                            Bonding Progress
                          </span>
                    <span className="text-gray-300 font-semibold">
                      {Math.round(bondingProgress * 100)}%
                    </span>
                  </div>
                        <div className="h-1.5 rounded-full bg-gray-800/60 overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ 
                              width: `${bondingProgress * 100}%`,
                              backgroundColor: bondingColor
                            }}
                    />
                  </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-orange-400" />
                          Bonding Curve Progress
                        </div>
                        <div className="text-xs text-gray-300">
                          {Math.round(bondingProgress * 100)}% complete
                          <div className="mt-1 pt-1 border-t border-gray-700">
                            {Math.round((1 - bondingProgress) * 100)}% remaining until graduation
                          </div>
                          {hasMobulaData && mobulaData.bondingPercentage > 0 && (
                            <div className="mt-1 pt-1 border-t border-gray-700">
                              Mobula Progress: {mobulaData.bondingPercentage.toFixed(1)}%
                </div>
              )}
            </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>

            {/* Metrics Row - More Colorful with Tooltips */}
            <TooltipProvider delayDuration={200}>
            <div
              className={`flex items-center gap-2 ${displaySettings?.metricsSize === "large" ? "text-xs" : "text-[10px]"} flex-wrap ${displaySettings?.grey ? "text-gray-400" : ""}`}
            >
                {/* Market Cap with Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
              <span
                      className={`flex items-center gap-0.5 cursor-help ${displaySettings?.grey ? "text-gray-400" : "text-green-400"}`}
              >
                      <DollarSign className="w-2.5 h-2.5" />
                <span className="font-medium">MC:</span>{" "}
                {displaySettings?.noDecimals
                  ? formatCurrency(token.marketCap).replace(/\.\d+/g, "")
                  : formatCurrency(token.marketCap)}
              </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        Market Cap
                      </div>
                      <div className="text-xs text-gray-300">
                        Total value of all tokens: {formatCurrency(token.marketCap)}
                        {mobulaData?.liquidity && (
                          <div className="mt-1 pt-1 border-t border-gray-700">
                            Liquidity: {formatCurrency(mobulaData.liquidity)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Volume with Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
              <span
                      className={`flex items-center gap-0.5 cursor-help ${displaySettings?.grey ? "text-gray-400" : "text-blue-400"}`}
              >
                      <BarChart3 className="w-2.5 h-2.5" />
                <span className="font-medium">V:</span>{" "}
                {displaySettings?.noDecimals
                  ? formatCurrency(token.volume).replace(/\.\d+/g, "")
                  : formatCurrency(token.volume)}
              </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4" />
                        Volume (24h)
                      </div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>Total: {formatCurrency(token.volume)}</div>
                        {mobulaData?.volumeBuy24h && mobulaData?.volumeSell24h && (
                          <>
                            <div className="pt-1 border-t border-gray-700 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-green-400">
                                <ArrowUpRight className="w-3 h-3" />
                                Buy: {formatCurrency(mobulaData.volumeBuy24h)}
                              </div>
                              <div className="flex items-center gap-1.5 text-red-400">
                                <ArrowDownRight className="w-3 h-3" />
                                Sell: {formatCurrency(mobulaData.volumeSell24h)}
                              </div>
                            </div>
                          </>
                        )}
                        {mobulaData?.volume1h && (
                          <div className="pt-1 border-t border-gray-700">
                            Volume (1h): {formatCurrency(mobulaData.volume1h)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Fee with Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
              <span
                      className={`flex items-center gap-0.5 cursor-help ${displaySettings?.grey ? "text-gray-400" : "text-yellow-400"}`}
              >
                      <Coins className="w-2.5 h-2.5" />
                <span className="font-medium">F:</span>{" "}
                {displaySettings?.noDecimals
                  ? Math.round(token.fee)
                  : token.fee.toFixed(3)}
              </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <Coins className="w-4 h-4" />
                        Fee
                      </div>
                      <div className="text-xs text-gray-300">
                        Platform fee: {token.fee.toFixed(3)}
                        {mobulaData?.security && (
                          <div className="mt-1 pt-1 border-t border-gray-700 space-y-0.5">
                            {mobulaData.security.buyTax && (
                              <div className="flex items-center gap-1.5">
                                <Percent className="w-3 h-3" />
                                Buy Tax: {mobulaData.security.buyTax}%
                              </div>
                            )}
                            {mobulaData.security.sellTax && (
                              <div className="flex items-center gap-1.5">
                                <Percent className="w-3 h-3" />
                                Sell Tax: {mobulaData.security.sellTax}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Transactions with Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
              <span
                      className={`flex items-center gap-0.5 cursor-help ${displaySettings?.grey ? "text-gray-400" : "text-purple-400"}`}
              >
                      <Activity className="w-2.5 h-2.5" />
                <span className="font-medium">TX:</span>{" "}
                {formatNumber(token.transactions)}
              </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4" />
                        Transactions
            </div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>Total: {formatNumber(token.transactions)}</div>
                        {mobulaData?.buys24h && mobulaData?.sells24h && (
                          <div className="pt-1 border-t border-gray-700 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-green-400">
                              <ArrowUpRight className="w-3 h-3" />
                              Buys: {formatNumber(mobulaData.buys24h)}
                            </div>
                            <div className="flex items-center gap-1.5 text-red-400">
                              <ArrowDownRight className="w-3 h-3" />
                              Sells: {formatNumber(mobulaData.sells24h)}
                            </div>
                          </div>
                        )}
                        {mobulaData?.traders1h && (
                          <div className="pt-1 border-t border-gray-700">
                            Unique Traders (1h): {formatNumber(mobulaData.traders1h)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Buy/Sell Pressure Indicator (Mobula only) */}
                {buySellPressure && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`flex items-center gap-0.5 cursor-help ${
                          buySellPressure === "bullish"
                            ? "text-green-400"
                            : buySellPressure === "bearish"
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {buySellPressure === "bullish" ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : buySellPressure === "bearish" ? (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        ) : (
                          <Activity className="w-2.5 h-2.5" />
                        )}
                        <span className="font-medium">
                          {buySellRatio ? buySellRatio.toFixed(2) : "1.00"}x
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          {buySellPressure === "bullish" ? (
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          ) : buySellPressure === "bearish" ? (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          ) : (
                            <Activity className="w-4 h-4" />
                          )}
                          Buy/Sell Ratio (1h)
                        </div>
                        <div className="text-xs text-gray-300">
                          {buySellPressure === "bullish" ? "🐂" : buySellPressure === "bearish" ? "🐻" : "➡️"}{" "}
                          Ratio: {buySellRatio?.toFixed(2)}x
                          <div className="mt-1 pt-1 border-t border-gray-700 space-y-0.5">
                            <div>Buy Volume: {formatCurrency(mobulaData.volumeBuy1h)}</div>
                            <div>Sell Volume: {formatCurrency(mobulaData.volumeSell1h)}</div>
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Security Indicators (Mobula only) */}
                {mobulaData?.security && (
                  <>
                    {mobulaData.security.noMintAuthority && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-0.5 cursor-help text-green-400">
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-sm flex items-center gap-1.5">
                              <Lock className="w-4 h-4 text-green-400" />
                              Mint Revoked
                            </div>
                            <div className="text-xs text-gray-300">
                              ✅ Mint authority removed - cannot create more tokens
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {mobulaData.security.isBlacklisted && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-0.5 cursor-help text-red-400">
                            <AlertTriangle className="w-2.5 h-2.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-sm flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              Blacklisted
                            </div>
                            <div className="text-xs text-gray-300">
                              ⚠️ Token has blacklisted addresses
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}

                {/* Smart Money Indicators (Mobula only) */}
                {mobulaData?.smartTradersCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 cursor-help text-blue-400">
                        <Brain className="w-2.5 h-2.5" />
                        <span className="font-medium">{mobulaData.smartTradersCount}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-blue-400" />
                          Smart Traders
                        </div>
                        <div className="text-xs text-gray-300">
                          {mobulaData.smartTradersCount} smart traders tracking this token
                          {mobulaData.proTradersCount > 0 && (
                            <div className="mt-1 pt-1 border-t border-gray-700">
                              Pro Traders: {mobulaData.proTradersCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* DexScreener Listed (Mobula only) */}
                {mobulaData?.dexscreenerListed && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 cursor-help text-green-400">
                        <Eye className="w-2.5 h-2.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-panel border border-gray-700 text-white z-50"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-green-400" />
                          DexScreener Listed
                        </div>
                        <div className="text-xs text-gray-300">
                          ✅ Listed on DexScreener
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
            {/* Token Address/Label */}
            <div className="mt-1.5 pt-1.5 border-t border-gray-800/30 flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                <span className="text-gray-500">{tokenAddress.slice(0, 6)}</span>
                <span className="text-gray-600">...</span>
                <span className="text-gray-500">{tokenAddress.slice(-6)}</span>
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
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Only execute quick buy if authenticated and wallet is available
                if (
                  turnkeyUser &&
                  address &&
                  connection &&
                  signSolanaTransaction &&
                  (token.chain === "solana" || !token.chain)
                ) {
                  await handleQuickBuy();
                } else {
                  // Otherwise, open trading panel
                  setShowTradingPanel(true);
                }
              }}
              disabled={isQuickBuying}
              className={`${displaySettings?.quickBuySize === "large" ? "px-3 py-2 text-xs" : displaySettings?.quickBuySize === "mega" ? "px-4 py-2.5 text-sm" : displaySettings?.quickBuySize === "ultra" ? "px-5 py-3 text-base" : "px-2.5 py-1.5 text-[10px]"} bg-primary-dark hover:bg-primary-darker disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap`}
            >
              {isQuickBuying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>{quickBuyAmount}</span>
              )}
              {chainLogoUrl && !chainLogoError ? (
                <img
                  src={chainLogoUrl}
                  alt={chainType === "sol" ? "SOL" : "BNB"}
                  className={`${displaySettings?.quickBuySize === "ultra" ? "w-4 h-4" : displaySettings?.quickBuySize === "mega" ? "w-3.5 h-3.5" : "w-3 h-3"} rounded-full object-cover`}
                  onError={() => setChainLogoError(true)}
                  loading="lazy"
                />
              ) : (
                <span
                  className={`${displaySettings?.quickBuySize === "ultra" ? "text-xs" : displaySettings?.quickBuySize === "mega" ? "text-[10px]" : "text-[8px]"} opacity-80`}
                >
                  {chainType === "sol" ? "SOL" : "BNB"}
                </span>
              )}
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
