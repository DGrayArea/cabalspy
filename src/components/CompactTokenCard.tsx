"use client";

import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import Link from "next/link";
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
  Image as ImageIcon,
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
import { formatPercent, formatPercentCompact } from "@/utils/format";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { useAuth } from "@/context/AuthContext";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuthButton from "@/components/AuthButton";

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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isQuickBuying, setIsQuickBuying] = useState(false);
  const { user, turnkeyUser, turnkeySession } = useAuth();
  // User is authenticated if either user exists OR turnkeyUser/turnkeySession exists
  const isAuthenticated = user || turnkeyUser || turnkeySession;
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
         <Link
        href={`/${chainRoute}/${tokenAddress}`}
        className={`block group relative transition-all duration-300 ${
          connectedGrid
            ? "border-b border-r border-white/5 rounded-none p-4"
            : "mb-3 rounded-[2rem] p-5 glass border border-white/10 hover:border-primary/40 hover:shadow-neon shadow-2xl"
        }`}
      >
        {/* Animated Background Glow on Hover */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500 rounded-[2rem]" />
        
        <div className="relative z-10 flex items-start gap-4">
          {/* Left: Token Icon with Circular Bonding Progress */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-shrink-0 relative">
                  {/* Bonding Progress Ring */}
                  {!isTokenMigrated && bondingProgress < 1 && bondingProgress > 0 && (
                    <svg
                      className="absolute -inset-2 w-14 h-14 pointer-events-none z-0 transform -rotate-90"
                      viewBox="0 0 56 56"
                    >
                      <circle
                        cx="28"
                        cy="28"
                        r="26"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-white/5"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="26"
                        fill="none"
                        stroke={bondingColor}
                        strokeWidth="2.5"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - bondingProgress)}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out shadow-neon"
                      />
                    </svg>
                  )}
                  
                  {/* Graduated Ring */}
                  {(isTokenMigrated || bondingProgress >= 1) && (
                    <div className="absolute -inset-2 rounded-full border-2 border-primary/40 shadow-neon-strong animate-pulse" />
                  )}

                  <div className={`w-10 h-10 ${displaySettings?.circleImages ? "rounded-full" : "rounded-2xl"} overflow-hidden relative bg-black/40 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    {token.image ? (
                      <Image
                        src={token.image}
                        alt={token.symbol}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                        unoptimized={token.image?.startsWith('data:')}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-lg font-black bg-gradient-to-br from-primary/20 to-secondary/20 italic">
                        {token.symbol?.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Platform logo overlay - bottom right */}
                  {platformLogo && !platformLogoError ? (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden z-30 shadow-lg">
                      <Image
                        src={platformLogo}
                        alt={platformName || "Platform"}
                        fill
                        className="object-cover p-0.5"
                        sizes="16px"
                        onError={() => setPlatformLogoError(true)}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-black rounded-lg border border-white/10 flex items-center justify-center text-[8px] z-30 shadow-lg">
                      {platformIcon}
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
                    {token.image ? (
                      <div className="relative w-5 h-5 rounded overflow-hidden">
                        <Image
                          src={token.image}
                          alt={token.symbol}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            // Hide parent div or handle error visually if needed
                            const target = e.target as HTMLImageElement;
                            if (target && target.style) target.style.display = 'none';
                          }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-[10px]">
                        {token.symbol?.slice(0, 1)}
                      </div>
                    )}
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
                              {formatPercent(mobulaData.priceChange1h)}
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
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-black text-sm tracking-tighter text-white truncate italic uppercase">
                {token.symbol}
              </h3>
              <div className="h-3 w-px bg-white/10" />
              <span className="text-[10px] text-muted font-bold flex items-center gap-1 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-primary" />
                {typeof currentTime === "object" ? currentTime.display : currentTime}
              </span>
              {isTrending && (
                <div className="flex h-2 w-2 rounded-full bg-accent shadow-neon animate-pulse" />
              )}
            </div>

            {/* Activity Icons Row - Premium Terminal Density */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">Views</span>
                <span className="text-[10px] font-bold text-cyan-400 font-mono italic">
                  {formatNumber(token.activity.views)}
                </span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">Holders</span>
                <span className="text-[10px] font-bold text-indigo-400 font-mono italic">
                  {formatNumber(token.activity.holders)}
                </span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">MCap</span>
                <span className="text-[10px] font-black text-primary font-mono italic">
                  {formatCurrency(token.marketCap)}
              </div>
            </div>
          </div>

          {/* Right: Price & Activity Stats */}
          <div className="flex flex-col items-end gap-1 text-right min-w-[80px]">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Price</span>
              <span className="text-sm font-black text-white italic tracking-tighter">
                {formatCurrency(token.price)}
              </span>
            </div>
            
            <div className={`text-[10px] font-black px-2 py-0.5 rounded-md italic ${isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {isPositive ? "+" : ""}{formatPercent(priceChange24h)}
            </div>
          </div>
        </div>

        {/* Action Buttons & Bonding Curve */}
        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between gap-4">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative group/bonding">
            <div 
              className="h-full bg-primary shadow-neon transition-all duration-1000 ease-out"
              style={{ width: `${bondingProgress * 100}%` }}
            />
            {/* Bonding Tooltip Info */}
            <div className="absolute top-[-24px] right-0 text-[8px] font-black text-primary uppercase tracking-widest opacity-0 group-hover/bonding:opacity-100 transition-opacity">
              Progress: {Math.round(bondingProgress * 100)}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTradingPanel(true);
              }}
              className="px-6 py-2 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-colors italic"
            >
              TRADE
            </button>
            <button 
              onClick={copyAddress}
              className="p-2 rounded-full glass border border-white/10 hover:border-white/20 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
            </button>
          </div>
        </div>
        </div>
      </Link>
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
                  isAuthenticated &&
                  turnkeyUser &&
                  address &&
                  connection &&
                  signSolanaTransaction &&
                  (token.chain === "solana" || !token.chain)
                ) {
                  await handleQuickBuy();
                } else if (!isAuthenticated) {
                  setShowLoginModal(true);
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

      {/* Login Required Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-panel border border-gray-800/50 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--primary)]" />
              Login Required
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/30">
              <Zap className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Unlock Trading</h3>
              <p className="text-sm text-gray-400">
                You need to be logged in to buy tokens and access trading features.
              </p>
            </div>
            <div className="w-full pt-2">
              <div className="flex justify-center">
                <AuthButton />
              </div>
            </div>
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-800/50 w-full">
              Requires "Holder" or "Pre-Sale" role.
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
