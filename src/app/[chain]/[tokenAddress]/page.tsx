"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  DollarSign,
  BarChart3,
  Copy,
  Check,
  Share2,
  Star,
  Shield,
  Clock,
  Zap,
  RefreshCw,
  User,
  Wallet,
  Bell,
  Volume2,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/format";
import { TokenData } from "@/types/token";
import AuthButton from "@/components/AuthButton";
import { WalletSettingsModal } from "@/services/WalletSettingsModal";
import { pumpFunService } from "@/services/pumpfun";
import { dexscreenerService } from "@/services/dexscreener";
import { multiChainTokenService } from "@/services/multichain-tokens";
import { TokenChart } from "@/components/TokenChart";

interface TokenDetailData {
  chain: string;
  address: string;
  data: {
    base?: TokenData;
    pumpfun?: {
      mint?: string;
      logo?: string;
      name: string;
      symbol: string;
      description?: string;
      price?: number;
      priceUsd?: number;
      marketCap?: number;
      volume?: number;
      isMigrated: boolean;
      migrationTimestamp?: number;
      raydiumPool?: string;
      socials?: {
        website?: string;
        twitter?: string;
        telegram?: string;
      };
      reserves?: {
        sol?: number;
        token?: number;
      };
      priceChange24h?: number;
      bondingProgress?: number; // 0-1
      numHolders?: number;
      transactions?: number;
      buyTransactions?: number;
      sellTransactions?: number;
      createdTimestamp?: number;
      holders?: Array<{
        address?: string;
        wallet?: string;
        publicKey?: string;
        balance?: number | string;
        amount?: number | string;
        tokens?: number | string;
        percentage?: number | string;
        pct?: number | string;
        percent?: number | string;
        isDev?: boolean;
        dev?: boolean;
        creator?: boolean;
        label?: string;
        tag?: string;
      }>;
    };
    dexscreener?: {
      logo?: string;
      priceUsd?: number;
      priceChange24h?: number;
      priceChange6h?: number;
      priceChange1h?: number;
      volume24h?: number;
      liquidity?: number;
      fdv?: number;
      socials?: Array<{ type: string; url: string }>;
      websites?: Array<{ label: string; url: string }>;
      dexUrl?: string;
    };
    transactions?: unknown[];
    holders?: unknown[];
  };
}

export default function TokenDetailPage() {
  return (
    <Suspense fallback={<TokenDetailPageSkeleton />}>
      <TokenDetailContent />
    </Suspense>
  );
}

function TokenDetailContent() {
  const params = useParams();
  const router = useRouter();
  const chain = params.chain as string;
  const tokenAddress = params.tokenAddress as string;

  const [tokenData, setTokenData] = useState<TokenDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"trades" | "holders" | "info">(
    "trades"
  );
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [slippage, setSlippage] = useState<string>("1");
  const [quickBuyAmount, setQuickBuyAmount] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quickBuyAmount") || "0.1";
    }
    return "0.1";
  });
  const [timeDisplay, setTimeDisplay] = useState<string>("");
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch SOL price from CoinGecko or Jupiter
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        // Try CoinGecko first (free, no API key needed)
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        if (response.ok) {
          const data = await response.json();
          if (data.solana?.usd) {
            setSolPrice(data.solana.usd);
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch SOL price from CoinGecko:", error);
      }

      // Fallback: Try Jupiter price API
      try {
        const jupiterResponse = await fetch(
          "https://price.jup.ag/v4/price?ids=SOL"
        );
        if (jupiterResponse.ok) {
          const jupiterData = await jupiterResponse.json();
          if (jupiterData.data?.SOL?.price) {
            setSolPrice(jupiterData.data.SOL.price);
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch SOL price from Jupiter:", error);
      }

      // Final fallback: Use approximate price
      setSolPrice(150); // Approximate SOL price
    };

    fetchSolPrice();
  }, []);

  // Update time display client-side only to avoid hydration mismatch
  // Must be before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (!tokenData) {
      setTimeDisplay("");
      return;
    }

    const baseToken = tokenData?.data?.base;
    const pumpfunData = tokenData?.data?.pumpfun;
    const createdTimestamp =
      pumpfunData?.createdTimestamp || baseToken?.createdTimestamp;

    if (!createdTimestamp) {
      setTimeDisplay(baseToken?.time || "Unknown");
      return;
    }

    const updateTime = () => {
      const diff = Date.now() - createdTimestamp;
      if (diff < 60000) {
        setTimeDisplay(`${Math.floor(diff / 1000)}s`);
      } else if (diff < 3600000) {
        setTimeDisplay(`${Math.floor(diff / 60000)}m`);
      } else {
        setTimeDisplay(`${Math.floor(diff / 3600000)}h`);
      }
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [tokenData]);

  useEffect(() => {
    if (!chain || !tokenAddress) return;

    const fetchTokenData = async () => {
      try {
        setLoading(true);

        // Validate chain
        const validChains = ["sol", "solana", "bsc"];
        const normalizedChain = chain.toLowerCase();
        if (!validChains.includes(normalizedChain)) {
          throw new Error(
            `Invalid chain. Must be one of: ${validChains.join(", ")}`
          );
        }

        // Fetch token data from multiple sources directly (better for rate limits)
        const tokenData: TokenDetailData["data"] = {};

        // For Solana tokens, try pump.fun first
        if (normalizedChain === "sol" || normalizedChain === "solana") {
          try {
            const pumpFunData =
              await pumpFunService.fetchTokenInfo(tokenAddress);
            if (pumpFunData) {
              tokenData.pumpfun = pumpFunData;
            }
          } catch (error) {
            console.warn("Failed to fetch pump.fun data", error);
          }
        }

        // Fetch DexScreener data (works for both Solana and BSC)
        try {
          const dexScreenerChain =
            normalizedChain === "sol" || normalizedChain === "solana"
              ? "solana"
              : "bsc";
          const dexScreenerData = await dexscreenerService.fetchTokenInfo(
            dexScreenerChain,
            tokenAddress
          );
          if (dexScreenerData) {
            tokenData.dexscreener = dexScreenerData;
          }
        } catch (error) {
          console.warn("Failed to fetch DexScreener data", error);
        }

        // Get token from multi-chain service cache
        const allTokens = [
          ...multiChainTokenService.getSolanaTokens(),
          ...multiChainTokenService.getBSCTokens(),
        ];
        const cachedToken = allTokens.find(
          (t) => t.id.toLowerCase() === tokenAddress.toLowerCase()
        );
        if (cachedToken) {
          tokenData.base = cachedToken;
        }

        setTokenData({
          chain: normalizedChain,
          address: tokenAddress,
          data: tokenData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [chain, tokenAddress]);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <TokenDetailPageSkeleton />;
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
          <p className="text-gray-400 mb-6">
            {error || "Unable to load token data"}
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-primary-dark text-white rounded-lg hover:bg-primary-dark/90 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const baseToken = tokenData?.data?.base;
  const pumpfunData = tokenData?.data?.pumpfun;
  const dexscreenerData = tokenData?.data?.dexscreener;

  // Merge data from all sources
  const tokenName = pumpfunData?.name || baseToken?.name || "Unknown Token";
  const tokenSymbol = pumpfunData?.symbol || baseToken?.symbol || "UNKNOWN";
  const tokenImage =
    dexscreenerData?.logo ||
    pumpfunData?.logo ||
    baseToken?.image ||
    baseToken?.icon;
  const description = pumpfunData?.description;
  const price =
    dexscreenerData?.priceUsd ||
    pumpfunData?.priceUsd ||
    pumpfunData?.price ||
    baseToken?.price ||
    0;
  const marketCap =
    pumpfunData?.marketCap || baseToken?.marketCap || dexscreenerData?.fdv || 0;
  const volume =
    dexscreenerData?.volume24h || pumpfunData?.volume || baseToken?.volume || 0;
  // Get price change - prefer shorter timeframes (1h, 6h) over 24h
  const priceChange =
    dexscreenerData?.priceChange1h ??
    dexscreenerData?.priceChange6h ??
    pumpfunData?.priceChange24h ??
    dexscreenerData?.priceChange24h ??
    0;
  const priceChangeLabel =
    dexscreenerData?.priceChange1h !== undefined
      ? "1h"
      : dexscreenerData?.priceChange6h !== undefined
        ? "6h"
        : "24h";
  const isMigrated = pumpfunData?.isMigrated || false;
  // Use bondingProgress from pump.fun if available, otherwise calculate from baseToken
  const bondingProgress =
    pumpfunData?.bondingProgress !== undefined
      ? pumpfunData?.bondingProgress
      : baseToken?.activity?.Q !== undefined
        ? (baseToken?.activity?.Q ?? 0) / 100 // Convert from percentage to 0-1
        : 0;
  const bondingCurveProgress = (bondingProgress ?? 0) * 100; // Convert to percentage for display
  // Only use reserves if they exist, are > 0, and token is not migrated
  // API might return stale/incorrect data, so validate against bonding curve progress
  const rawSolReserves = pumpfunData?.reserves?.sol;
  const rawTokenReserves = pumpfunData?.reserves?.token;
  // Only show reserves if:
  // 1. Token is not migrated (migrated tokens don't have bonding curve reserves)
  // 2. Reserves are > 0
  // 3. Bonding curve progress > 0% (if 0%, there are no reserves)
  const solReserves =
    !isMigrated &&
    rawSolReserves !== undefined &&
    rawSolReserves > 0 &&
    bondingCurveProgress > 0
      ? rawSolReserves
      : undefined;
  const tokenReserves =
    !isMigrated &&
    rawTokenReserves !== undefined &&
    rawTokenReserves > 0 &&
    bondingCurveProgress > 0
      ? rawTokenReserves
      : undefined;
  // Calculate liquidity: For migrated tokens use DexScreener, for bonding curve tokens calculate from SOL reserves
  // Only calculate from reserves if they're valid (> 0 and not migrated)
  const liquidity =
    dexscreenerData?.liquidity ||
    (solReserves !== undefined && solReserves > 0 && solPrice
      ? solReserves * solPrice
      : 0) ||
    0;
  const numHolders =
    pumpfunData?.numHolders || baseToken?.activity?.holders || 0;
  const holders = pumpfunData?.holders || [];
  const transactions =
    pumpfunData?.transactions || baseToken?.transactions || 0;
  const buyTransactions = pumpfunData?.buyTransactions;
  const sellTransactions = pumpfunData?.sellTransactions;
  const socials = pumpfunData?.socials || dexscreenerData?.socials;
  const createdTimestamp =
    pumpfunData?.createdTimestamp || baseToken?.createdTimestamp;

  return (
    <div className="min-h-screen bg-app text-white pb-16">
      {/* Header - Same as home page */}
      <header className="border-b border-panel bg-panel/80 backdrop-blur-sm sticky top-0 z-50 w-full">
        <div className="w-full px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Back Button, Logo and Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
              <button
                onClick={() => router.back()}
                className="p-1.5 sm:p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <Link
                href="/"
                className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 cursor-pointer"
              >
                <Image
                  src="/logo.jpg"
                  alt="Cabalspy Logo"
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-gray-800/50 flex-shrink-0"
                  unoptimized
                />
                <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent text-base sm:text-xl font-bold whitespace-nowrap">
                  CABALSPY
                </span>
              </Link>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/"
                  className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </Link>
                <Link
                  href="/pulse"
                  className="text-sm text-white font-medium cursor-pointer"
                >
                  Pulse
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Profile
                </Link>
              </nav>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="p-1.5 sm:p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 sm:w-4 sm:h-4 cursor-pointer" />
              </button>
              <Link
                href="/profile"
                className="p-1.5 sm:p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95 hidden sm:flex"
                title="Profile"
              >
                <User className="w-4 h-4 sm:w-4 sm:h-4 cursor-pointer" />
              </Link>
              {/* Wallet Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowWalletSettings(!showWalletSettings)}
                  className="p-1.5 sm:p-2 hover:bg-panel-elev rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Wallet Settings"
                >
                  <Wallet className="w-4 h-4 sm:w-4 sm:h-4 cursor-pointer" />
                </button>
                {showWalletSettings && (
                  <Suspense fallback={null}>
                    <WalletSettingsModal
                      slippage={slippage}
                      setSlippage={setSlippage}
                      quickBuyAmount={quickBuyAmount}
                      setQuickBuyAmount={setQuickBuyAmount}
                      onClose={() => setShowWalletSettings(false)}
                    />
                  </Suspense>
                )}
              </div>
              <div className="hidden sm:block">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full py-4 sm:py-6">
        {/* Token Overview Card */}
        <div className="px-3 sm:px-4 mb-4 sm:mb-6">
          <div className="bg-panel border border-gray-800/50 rounded-xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              {/* Left: Token Info */}
              <div className="flex items-start gap-4 flex-1">
                {tokenImage ? (
                  <div
                    className="relative w-16 h-fit md:w-20 md:h-fit flex-shrink-0"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <Image
                        src={tokenImage}
                        alt={tokenSymbol}
                        fill
                        className="object-cover"
                        style={{
                          borderRadius: "50%",
                        }}
                        sizes="(max-width: 768px) 64px, 80px"
                        unoptimized
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/20 flex items-center justify-center flex-shrink-0 text-2xl">
                    {tokenSymbol[0] || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl md:text-3xl font-bold truncate">
                      {tokenName}
                    </h2>
                    <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="px-2 py-1 bg-gray-800/50 rounded text-xs font-medium uppercase">
                      {chain === "sol" || chain === "solana" ? "SOL" : "BSC"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Price:</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(price)}
                      </span>
                      {priceChange !== 0 && (
                        <span
                          className={`text-sm flex items-center gap-1 ${
                            priceChange >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {priceChange >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {Math.abs(priceChange).toFixed(2)}% (
                          {priceChangeLabel})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">
                        {timeDisplay || baseToken?.time || "Unknown"}
                      </span>
                    </div>
                  </div>
                  {/* Description */}
                  {description && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  )}
                  {/* Contract Address */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">CA:</span>
                    <code className="text-xs bg-panel-elev px-2 py-1 rounded font-mono">
                      {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-8)}
                    </code>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:bg-panel-elev rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <a
                      href={
                        chain === "sol" || chain === "solana"
                          ? `https://solscan.io/token/${tokenAddress}`
                          : `https://bscscan.com/token/${tokenAddress}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-panel-elev rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                    {/* Social Links */}
                    {socials && !Array.isArray(socials) && (
                      <div className="flex items-center gap-2 ml-2">
                        {socials?.website && (
                          <a
                            href={socials.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-panel-elev rounded transition-colors"
                            title="Website"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-400" />
                          </a>
                        )}
                        {socials?.twitter && (
                          <a
                            href={socials.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-panel-elev rounded transition-colors"
                            title="Twitter"
                          >
                            <svg
                              className="w-4 h-4 text-blue-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                            </svg>
                          </a>
                        )}
                        {socials?.telegram && (
                          <a
                            href={socials.telegram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-panel-elev rounded transition-colors"
                            title="Telegram"
                          >
                            <svg
                              className="w-4 h-4 text-blue-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.559z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:min-w-[400px]">
                <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                  <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(marketCap)}
                  </div>
                </div>
                <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                  <div className="text-xs text-gray-400 mb-1">Liquidity</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(liquidity)}
                  </div>
                </div>
                <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                  <div className="text-xs text-gray-400 mb-1">24h Volume</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(volume)}
                  </div>
                </div>
                <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                  <div className="text-xs text-gray-400 mb-1">B.Curve</div>
                  <div className="text-lg font-bold">
                    {(bondingCurveProgress ?? 0).toFixed(2)}%
                  </div>
                  {solReserves !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {(solReserves ?? 0).toFixed(2)} SOL
                      {solPrice && solReserves !== undefined && (
                        <span className="text-gray-400 ml-1">
                          ({formatCurrency((solReserves ?? 0) * solPrice)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="mt-4 pt-4 border-t border-gray-800/50 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Holders</div>
                  <div className="text-sm font-semibold">
                    {formatNumber(numHolders)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Transactions</div>
                  <div className="text-sm font-semibold">
                    {formatNumber(transactions)}
                  </div>
                  {buyTransactions !== undefined &&
                    sellTransactions !== undefined && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatNumber(buyTransactions)} buy /{" "}
                        {formatNumber(sellTransactions)} sell
                      </div>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="text-sm font-semibold">
                    {isMigrated ? (
                      <span className="text-green-400">Migrated</span>
                    ) : (
                      <span className="text-yellow-400">Active</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Fee</div>
                  <div className="text-sm font-semibold">
                    {baseToken?.fee?.toFixed(2) || "0.00"}%
                  </div>
                </div>
              </div>
            </div>
            {/* Reserves Info (if available from pump.fun) */}
            {(solReserves !== undefined || tokenReserves !== undefined) && (
              <div className="mt-4 pt-4 border-t border-gray-800/50">
                <div className="text-xs text-gray-400 mb-2">
                  Bonding Curve Reserves
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {solReserves !== undefined && (
                    <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">
                        SOL Reserves
                      </div>
                      <div className="text-sm font-semibold">
                        {(solReserves ?? 0).toFixed(4)} SOL
                      </div>
                      {solPrice && solReserves !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          ≈ {formatCurrency((solReserves ?? 0) * solPrice)}
                        </div>
                      )}
                    </div>
                  )}
                  {tokenReserves !== undefined && (
                    <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">
                        Token Reserves
                      </div>
                      <div className="text-sm font-semibold">
                        {formatNumber(tokenReserves)}
                      </div>
                      {solPrice &&
                        solReserves !== undefined &&
                        (price ?? 0) > 0 &&
                        tokenReserves !== undefined && (
                          <div className="text-xs text-gray-500 mt-1">
                            ≈{" "}
                            {formatCurrency(
                              (tokenReserves ?? 0) * (price ?? 0)
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart and Trading Panel */}
        <div className="px-3 sm:px-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Chart Area - 2/3 width on desktop */}
            <div className="lg:col-span-2 bg-panel border border-gray-800/50 rounded-xl p-4 md:p-6">
              <div className="h-[400px] md:h-[500px] bg-panel-elev rounded-lg border border-gray-800/50 p-4">
                {pumpfunData ? (
                  <TokenChart
                    mintAddress={tokenAddress}
                    tokenSymbol={tokenSymbol}
                    isPumpFun={true}
                    createdTimestamp={createdTimestamp}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        Chart available for pump.fun tokens
                      </p>
                      <p className="text-xs mt-1">
                        Chart data will load for pump.fun tokens
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trading Panel - 1/3 width on desktop */}
            <div className="bg-panel border border-gray-800/50 rounded-xl p-4 md:p-6">
              <h3 className="text-lg font-bold mb-4">Trade</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-4 rounded-lg font-semibold transition-colors">
                    Buy
                  </button>
                  <button className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-4 rounded-lg font-semibold transition-colors">
                    Sell
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0.0"
                    className="w-full bg-panel-elev border border-gray-800/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2 mt-2">
                    {[0.01, 0.1, 1, 10].map((val) => (
                      <button
                        key={val}
                        className="flex-1 bg-panel-elev hover:bg-panel border border-gray-800/50 rounded px-2 py-1 text-xs transition-colors"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="w-full bg-primary-dark hover:bg-primary-dark/90 text-white py-3 rounded-lg font-semibold transition-colors">
                  Buy {tokenSymbol}
                </button>
                <div className="pt-4 border-t border-gray-800/50 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bought</span>
                    <span>Ξ0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sold</span>
                    <span>Ξ0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Holding</span>
                    <span>0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PnL</span>
                    <span className="text-green-400">+0 (+0%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="px-3 sm:px-4">
          <div className="bg-panel border border-gray-800/50 rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-800/50">
              {[
                { id: "trades", label: "Trades" },
                {
                  id: "holders",
                  label: `Holders (${numHolders || 0})`,
                },
                { id: "info", label: "Token Info" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 md:p-6">
              {activeTab === "trades" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Transaction Statistics
                    </h3>
                    <span className="text-sm text-gray-400">
                      {transactions || 0} total
                    </span>
                  </div>
                  {pumpfunData &&
                  (buyTransactions !== undefined ||
                    sellTransactions !== undefined) ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Total Transactions
                        </div>
                        <div className="text-2xl font-bold">
                          {transactions || 0}
                        </div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Buy Transactions
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {buyTransactions ?? 0}
                        </div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Sell Transactions
                        </div>
                        <div className="text-2xl font-bold text-red-400">
                          {sellTransactions ?? 0}
                        </div>
                      </div>
                    </div>
                  ) : transactions > 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm mb-1">
                        Transaction history coming soon
                      </p>
                      <p className="text-xs text-gray-500">
                        We&apos;re working on integrating real-time transaction
                        data
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-12">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No transactions yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "holders" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Top Holders</h3>
                    <span className="text-sm text-gray-400">
                      {numHolders || 0} total holders
                    </span>
                  </div>
                  {pumpfunData &&
                  Array.isArray(holders) &&
                  holders.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-4 text-xs text-gray-400 pb-2 border-b border-gray-800/50">
                        <div>Rank</div>
                        <div>Address</div>
                        <div className="text-right">Balance</div>
                        <div className="text-right">Percentage</div>
                      </div>
                      {holders.slice(0, 10).map((holder, index: number) => {
                        const address =
                          holder.address ||
                          holder.wallet ||
                          holder.publicKey ||
                          "Unknown";
                        const balance =
                          holder.balance || holder.amount || holder.tokens || 0;
                        const percentage =
                          holder.percentage ||
                          holder.pct ||
                          holder.percent ||
                          0;
                        const isDev =
                          holder.isDev ||
                          holder.dev ||
                          holder.creator ||
                          address === pumpfunData?.mint;
                        const label =
                          holder.label ||
                          holder.tag ||
                          (isDev ? "Dev" : undefined);

                        return (
                          <div
                            key={index}
                            className="grid grid-cols-4 gap-4 py-2 border-b border-gray-800/30 hover:bg-panel-elev rounded px-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{index + 1}</span>
                              {label && (
                                <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded">
                                  {label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <code className="text-xs font-mono truncate">
                                {address.length > 20
                                  ? `${address.slice(0, 8)}...${address.slice(-8)}`
                                  : address}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(address);
                                }}
                                className="text-gray-500 hover:text-white transition-colors"
                                title="Copy address"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right font-medium">
                              {formatNumber(parseFloat(balance.toString()))}
                            </div>
                            <div className="text-right font-medium text-primary">
                              {typeof percentage === "number"
                                ? percentage.toFixed(2)
                                : parseFloat(percentage.toString()).toFixed(2)}
                              %
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : numHolders > 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm mb-1">Holders list coming soon</p>
                      <p className="text-xs text-gray-500">
                        We&apos;re working on integrating holder data from the
                        blockchain
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-12">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No holders yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "info" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4">
                      Token Statistics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Top 10 H.
                        </div>
                        <div className="text-lg font-bold">21.85%</div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">Dev H.</div>
                        <div className="text-lg font-bold">2%</div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Snipers H.
                        </div>
                        <div className="text-lg font-bold">2.71%</div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Insiders
                        </div>
                        <div className="text-lg font-bold">3.66%</div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          Bundlers
                        </div>
                        <div className="text-lg font-bold">37.63%</div>
                      </div>
                      <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                        <div className="text-xs text-gray-400 mb-1">
                          LP Burned
                        </div>
                        <div className="text-lg font-bold text-green-400">
                          100%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  {(pumpfunData?.socials || dexscreenerData?.socials) && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Links</h4>
                      <div className="flex flex-wrap gap-2">
                        {pumpfunData?.socials?.twitter && (
                          <a
                            href={pumpfunData?.socials?.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-panel-elev hover:bg-panel border border-gray-800/50 rounded-lg text-sm transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Twitter
                          </a>
                        )}
                        {pumpfunData?.socials?.website && (
                          <a
                            href={pumpfunData?.socials?.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-panel-elev hover:bg-panel border border-gray-800/50 rounded-lg text-sm transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Website
                          </a>
                        )}
                        {dexscreenerData?.dexUrl && (
                          <a
                            href={dexscreenerData?.dexUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-panel-elev hover:bg-panel border border-gray-800/50 rounded-lg text-sm transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on DEX
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar - Same as home page */}
      <footer className="fixed bottom-0 left-0 right-0 bg-panel border-t border-gray-800/50 px-3 sm:px-4 py-2.5 z-40 w-full">
        <div className="w-full flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <button className="px-3 py-1 text-xs bg-panel-elev hover:bg-panel rounded border border-gray-800/50 text-gray-400 hover:text-white transition-colors cursor-pointer font-medium">
              PRESET 1
            </button>
            <span className="text-xs text-gray-400 font-medium">10</span>
          </div>

          {/* Center Navigation */}
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/profile"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              <span>Wallet</span>
            </Link>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Activity</span>
            </a>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <select className="px-2 py-1 bg-panel-elev border border-gray-800/50 rounded text-xs text-gray-300 focus:outline-none cursor-pointer hover:bg-panel transition-colors">
              <option>All Chains</option>
              <option>Solana</option>
              <option>BSC</option>
            </select>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TokenDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-app text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="bg-panel border border-gray-800/50 rounded-xl p-6 mb-6 animate-pulse">
          <div className="h-8 bg-gray-800/50 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-800/50 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}
