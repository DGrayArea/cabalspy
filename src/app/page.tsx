"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TokenData } from "@/types/token";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/context/AuthContext";
import { CompactTokenCard } from "@/components/CompactTokenCard";
import { TokenListCard } from "@/components/TokenListCard";
import { TokenMarquee } from "@/components/TokenMarquee";
import { pumpFunService } from "@/services/pumpfun";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  User,
  Settings,
  Grid3x3,
  List,
  Sparkles,
  Clock,
  Zap,
  BarChart3,
  Users,
  Eye,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flame,
  Star,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DollarSign,
  Coins,
  Wallet,
  ArrowUp,
  ArrowDown,
  Minus,
  HelpCircle,
  Link2,
  Copy,
  Share2,
  Menu,
  ChevronDown as ChevronDownIcon,
  X,
  Volume2,
  Calendar,
  Bell,
  HelpCircle as HelpCircleIcon,
  BookOpen,
  Twitter,
} from "lucide-react";

// Lazy load TradingPanel
const TradingPanel = lazy(() => import("@/components/TradingPanel"));
const WalletSettingsModal = lazy(() =>
  import("../services/WalletSettingsModal").then((mod) => ({
    default: mod.WalletSettingsModal,
  }))
);
const DisplaySettingsModal = lazy(
  () => import("../components/DisplaySettingsModal")
);

// Component that uses useSearchParams - must be wrapped in Suspense
function AuthCallbackHandler() {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // Handle OAuth callback
  useEffect(() => {
    // Handle Google OAuth callback
    const authSuccess = searchParams.get("authSuccess");
    const userData = searchParams.get("user");

    if (authSuccess && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        login("google", user);
        // Clean URL
        window.history.replaceState({}, "", "/");
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }

    // Handle Telegram bot auth callback
    const telegramAuth = searchParams.get("telegram_auth");
    const telegramData = searchParams.get("data");

    if (telegramAuth === "success" && telegramData) {
      try {
        const user = JSON.parse(decodeURIComponent(telegramData));
        login("telegram", {
          id: parseInt(user.id),
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url,
        });
        // Clean URL
        window.history.replaceState({}, "", "/");
      } catch (error) {
        console.error("Failed to parse Telegram auth data:", error);
      }
    }
  }, [searchParams, login]);

  return null;
}

export default function PulsePage() {
  // Use WebSocket for realtime token data from:
  // - Solana: pumpapi.io / pumpswap (pumpportal.fun)
  // - BSC: forr.meme
  const {
    tokens,
    solanaTokens,
    bscTokens,
    migrated: wsMigratedTokens,
    isLoading,
    error,
    isConnected,
  } = useWebSocket();

  // Refresh function for manual refresh (if needed)
  const refresh = () => {
    // WebSocket automatically updates, but we can trigger a reconnect if needed
    if (!isConnected) {
      console.log("WebSocket not connected, attempting to reconnect...");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "marketCap" | "volume" | "transactions" | "time"
  >("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<
    "new" | "migrated" | "latest" | "featured" | "graduated" | "marketCap"
  >("new");
  const [chain, setChain] = useState<"all" | "sol" | "bsc">("all");
  const [featuredTokens, setFeaturedTokens] = useState<TokenData[]>([]);
  const [pumpFunTokens, setPumpFunTokens] = useState<TokenData[]>([]);
  const [pumpFunTokensByType, setPumpFunTokensByType] = useState<{
    latest: TokenData[];
    featured: TokenData[];
    graduated: TokenData[];
    marketCap: TokenData[];
  }>({
    latest: [],
    featured: [],
    graduated: [],
    marketCap: [],
  });
  const [pumpFunMigratedTokens, setPumpFunMigratedTokens] = useState<
    TokenData[]
  >([]);
  const [isLoadingPumpFun, setIsLoadingPumpFun] = useState(false);

  // Helper function to format time from timestamp
  const formatTimeFromTimestamp = useCallback(
    (timestamp: number | undefined): string => {
      if (!timestamp) return "0s";
      const now = Date.now();
      // Handle both milliseconds and seconds timestamps
      const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
      const diff = Math.max(0, now - ts);

      if (diff < 60000) {
        return `${Math.floor(diff / 1000)}s`;
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}m`;
      } else {
        return `${Math.floor(diff / 3600000)}h`;
      }
    },
    []
  );

  // Helper function to convert PumpFunTokenInfo to TokenData
  const convertPumpFunToTokenData = useCallback(
    (pumpFunData: Awaited<ReturnType<typeof pumpFunService.fetchLatest>>) => {
      return pumpFunData.map((info) => {
        // Use creation timestamp for time calculation (not migration timestamp)
        // For migrated/graduated tokens, we still want to show time since creation
        // PumpFunTokenInfo should have createdTimestamp from parseTokenData
        const creationTimestamp = (info as any).createdTimestamp;
        const timeFromCreation = formatTimeFromTimestamp(creationTimestamp);

        return {
          id: info.mint || crypto.randomUUID(),
          name: info.name,
          symbol: info.symbol,
          icon: "🪙",
          image: info.logo || undefined,
          time: timeFromCreation,
          // Store creation timestamp for dynamic updates
          createdTimestamp: creationTimestamp,
          marketCap: info.marketCap || 0,
          volume: info.volume || 0,
          fee: 0,
          transactions: 0,
          percentages: info.priceChange24h
            ? [
                info.priceChange24h * 0.2,
                info.priceChange24h * 0.4,
                info.priceChange24h * 0.6,
                info.priceChange24h * 0.8,
                info.priceChange24h,
              ]
            : [0, 0, 0, 0, 0],
          price: info.priceUsd || info.price || 0,
          activity: {
            Q: 0,
            views: 0,
            holders: 0,
            trades: 0,
          },
          chain: "solana" as const,
          source: "pumpfun",
          dexscreener: info.socials
            ? {
                logo: info.logo,
                priceUsd: info.priceUsd,
                socials: info.socials
                  ? [
                      ...(info.socials.website
                        ? [{ type: "website", url: info.socials.website }]
                        : []),
                      ...(info.socials.twitter
                        ? [{ type: "twitter", url: info.socials.twitter }]
                        : []),
                      ...(info.socials.telegram
                        ? [{ type: "telegram", url: info.socials.telegram }]
                        : []),
                    ]
                  : undefined,
              }
            : undefined,
        };
      });
    },
    [formatTimeFromTimestamp]
  );

  // Fetch all pump.fun token types on mount and when needed
  useEffect(() => {
    const fetchAllPumpFunTokens = async () => {
      setIsLoadingPumpFun(true);
      try {
        console.log("🔄 Fetching pump.fun tokens from APIs...");

        // Fetch all types in parallel with detailed error logging
        const [latest, featured, graduated, marketCap, migrated] =
          await Promise.all([
            pumpFunService.fetchLatest(100).catch((err) => {
              console.error("❌ Failed to fetch latest:", err);
              return [];
            }),
            pumpFunService.fetchFeatured(100).catch((err) => {
              console.error("❌ Failed to fetch featured:", err);
              return [];
            }),
            pumpFunService.fetchGraduated(100).catch((err) => {
              console.error("❌ Failed to fetch graduated:", err);
              return [];
            }),
            pumpFunService.fetchByMarketCap(100).catch((err) => {
              console.error("❌ Failed to fetch marketCap:", err);
              return [];
            }),
            pumpFunService.fetchMigratedTokens(100).catch((err) => {
              console.error("❌ Failed to fetch migrated:", err);
              return [];
            }),
          ]);

        console.log("✅ Pump.fun API results:", {
          latest: latest.length,
          featured: featured.length,
          graduated: graduated.length,
          marketCap: marketCap.length,
          migrated: migrated.length,
        });

        // Convert and store each type
        const convertedLatest = convertPumpFunToTokenData(latest);
        const convertedFeatured = convertPumpFunToTokenData(featured);
        const convertedGraduated = convertPumpFunToTokenData(graduated);
        const convertedMarketCap = convertPumpFunToTokenData(marketCap);
        const convertedMigrated = convertPumpFunToTokenData(migrated);

        console.log("✅ Converted tokens:", {
          latest: convertedLatest.length,
          featured: convertedFeatured.length,
          graduated: convertedGraduated.length,
          marketCap: convertedMarketCap.length,
          migrated: convertedMigrated.length,
        });

        setPumpFunTokensByType({
          latest: convertedLatest,
          featured: convertedFeatured,
          graduated: convertedGraduated,
          marketCap: convertedMarketCap,
        });

        // Store migrated tokens separately
        setPumpFunMigratedTokens(convertedMigrated);
        if (convertedMigrated.length > 0) {
          console.log(
            "📦 Migrated tokens from pump.fun:",
            convertedMigrated.length
          );
        }
      } catch (error) {
        console.error("❌ Failed to fetch pump.fun tokens:", error);
      } finally {
        setIsLoadingPumpFun(false);
      }
    };

    fetchAllPumpFunTokens();
    // Refresh every 2 minutes
    const interval = setInterval(fetchAllPumpFunTokens, 120000);
    return () => clearInterval(interval);
  }, [convertPumpFunToTokenData]);

  // Update pumpFunTokens based on current filter
  useEffect(() => {
    if (
      filter === "latest" ||
      filter === "featured" ||
      filter === "graduated" ||
      filter === "marketCap"
    ) {
      setPumpFunTokens(pumpFunTokensByType[filter] || []);
    } else {
      setPumpFunTokens([]);
    }
  }, [filter, pumpFunTokensByType]);

  // Fetch featured tokens for marquee
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const featured = await pumpFunService.fetchFeatured(20);
        const converted: TokenData[] = featured.map((info) => ({
          id: info.mint || crypto.randomUUID(),
          name: info.name,
          symbol: info.symbol,
          icon: "⭐",
          image: info.logo,
          time: "0s",
          marketCap: info.marketCap || 0,
          volume: info.volume || 0,
          fee: 0,
          transactions: 0,
          percentages: info.priceChange24h
            ? [
                info.priceChange24h * 0.2,
                info.priceChange24h * 0.4,
                info.priceChange24h * 0.6,
                info.priceChange24h * 0.8,
                info.priceChange24h,
              ]
            : [0, 0, 0, 0, 0],
          price: info.priceUsd || info.price || 0,
          activity: {
            Q: 0,
            views: 0,
            holders: 0,
            trades: 0,
          },
          chain: "solana",
          source: "pumpfun",
        }));
        setFeaturedTokens(converted);
      } catch (error) {
        console.error("Failed to fetch featured tokens:", error);
      }
    };

    fetchFeatured();
    // Refresh featured tokens every 2 minutes
    const interval = setInterval(fetchFeatured, 120000);
    return () => clearInterval(interval);
  }, []);

  // Filter tokens by selected chain (using chain-specific lists from useWebSocket)
  // This is used for "new" and "migrated" filters - always use WebSocket tokens
  const chainFilteredTokens = useMemo(() => {
    if (chain === "all") return tokens;
    if (chain === "sol") return solanaTokens;
    if (chain === "bsc") return bscTokens;
    return tokens;
  }, [tokens, solanaTokens, bscTokens, chain]);
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [displaySettings, setDisplaySettings] = useState({
    metricsSize: "small" as "small" | "large",
    quickBuySize: "small" as "small" | "large" | "mega" | "ultra",
    grey: false,
    showSearchBar: false,
    noDecimals: false,
    showHiddenTokens: true,
    unhideOnMigrated: true,
    circleImages: false,
    progressBar: true,
    spacedTables: false,
  });

  // Helper function to parse time string to seconds
  const parseTimeToSeconds = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)([smh])/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      default:
        return 0;
    }
  };

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    // Start with chain-filtered tokens (already filtered by chain)
    let filtered = chainFilteredTokens;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query) ||
          token.id.toLowerCase().includes(query)
      );
    }

    // Category filter - will be handled by column display
    // We'll categorize tokens for the three columns

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case "marketCap":
          aValue = a.marketCap;
          bValue = b.marketCap;
          break;
        case "volume":
          aValue = a.volume;
          bValue = b.volume;
          break;
        case "transactions":
          aValue = a.transactions;
          bValue = b.transactions;
          break;
        case "time":
          aValue = parseTimeToSeconds(a.time);
          bValue = parseTimeToSeconds(b.time);
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [chainFilteredTokens, searchQuery, sortBy, sortOrder]);

  // Helper to get tokens for a specific filter
  const getTokensForFilter = useCallback(
    (filterType: typeof filter) => {
      // If using pump.fun filters (latest, featured, graduated, marketCap)
      if (
        filterType === "latest" ||
        filterType === "featured" ||
        filterType === "graduated" ||
        filterType === "marketCap"
      ) {
        // Return the specific type from pumpFunTokensByType
        const tokens = pumpFunTokensByType[filterType] || [];
        console.log(`🔍 Filter ${filterType}: Found ${tokens.length} tokens`);
        return tokens;
      }

      // For "new" filter, show tokens less than 5 minutes old from WebSocket
      if (filterType === "new") {
        const newPairs = filteredAndSortedTokens.filter((token) => {
          const timeSeconds = parseTimeToSeconds(token.time);
          return timeSeconds < 300; // Less than 5 minutes
        });
        console.log(
          `🔍 Filter new: Found ${newPairs.length} tokens from ${filteredAndSortedTokens.length} total`
        );
        return newPairs;
      }

      // For "migrated" filter, prefer WebSocket migrated tokens, then pump.fun API, then fallback
      if (filterType === "migrated") {
        // Prefer WebSocket migrated tokens (from subscribeMigration events)
        if (wsMigratedTokens.length > 0) {
          console.log(
            `🔍 Filter migrated: Using ${wsMigratedTokens.length} tokens from WebSocket migration events`
          );
          return wsMigratedTokens;
        }

        // Fallback to pump.fun migrated tokens if available
        if (pumpFunMigratedTokens.length > 0) {
          console.log(
            `🔍 Filter migrated: Using ${pumpFunMigratedTokens.length} tokens from pump.fun API`
          );
          return pumpFunMigratedTokens;
        }

        // Last resort: filter WebSocket tokens by age/market cap
        const migratedFromWS = filteredAndSortedTokens.filter((token) => {
          const timeSeconds = parseTimeToSeconds(token.time);
          const isOldEnough = timeSeconds >= 300; // At least 5 minutes old
          const hasMarketCap = token.marketCap > 10000; // Has some market cap
          return isOldEnough && hasMarketCap;
        });

        console.log(
          `🔍 Filter migrated: Found ${migratedFromWS.length} tokens from WebSocket (fallback)`
        );
        return migratedFromWS;
      }

      return filteredAndSortedTokens;
    },
    [
      filteredAndSortedTokens,
      pumpFunTokensByType,
      pumpFunMigratedTokens,
      wsMigratedTokens,
    ]
  );

  // Get tokens to display based on selected filter
  const tokensToDisplay = useMemo(() => {
    const tokens = getTokensForFilter(filter);

    // If no tokens match, show all tokens (fallback)
    if (tokens.length === 0 && (filter === "new" || filter === "migrated")) {
      return filteredAndSortedTokens.slice(0, 50);
    }

    return tokens;
  }, [filter, getTokensForFilter, filteredAndSortedTokens]);

  // Calculate filter counts - each filter uses its own data source
  const filterCounts = useMemo(() => {
    // For "new" and "migrated" - use WebSocket tokens
    const newCount = filteredAndSortedTokens.filter((token) => {
      const timeSeconds = parseTimeToSeconds(token.time);
      return timeSeconds < 300; // Less than 5 minutes
    }).length;

    // For migrated count, prefer WebSocket migrated tokens, then pump.fun, then fallback
    const migratedCount =
      wsMigratedTokens.length > 0
        ? wsMigratedTokens.length
        : pumpFunMigratedTokens.length > 0
          ? pumpFunMigratedTokens.length
          : filteredAndSortedTokens.filter((token) => {
              const timeSeconds = parseTimeToSeconds(token.time);
              const isOldEnough = timeSeconds >= 300; // At least 5 minutes old
              const hasMarketCap = token.marketCap > 10000; // Has some market cap
              return isOldEnough && hasMarketCap;
            }).length;

    // For pump.fun filters - use pump.fun tokens
    return {
      new: newCount,
      migrated: migratedCount,
      latest: pumpFunTokensByType.latest.length,
      featured: pumpFunTokensByType.featured.length,
      graduated: pumpFunTokensByType.graduated.length,
      marketCap: pumpFunTokensByType.marketCap.length,
    };
  }, [
    filteredAndSortedTokens,
    pumpFunTokensByType,
    pumpFunMigratedTokens,
    wsMigratedTokens,
  ]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toString();
  };

  return (
    <div className="min-h-screen bg-app text-white pb-16">
      {/* Handle auth callbacks */}
      <Suspense fallback={null}>
        <AuthCallbackHandler />
      </Suspense>
      {/* Header */}
      <header className="border-b border-panel bg-panel/80 backdrop-blur-sm sticky top-0 z-50 w-full">
        <div className="w-full px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-xl font-bold cursor-pointer"
              >
                <Image
                  src="/logo.jpg"
                  alt="Cabalspy Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-800/50"
                  unoptimized
                />
                <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                  CABALSPY
                </span>
              </Link>
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => refresh()}
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 cursor-pointer ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
              <Link
                href="/profile"
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer"
                title="Profile"
              >
                <User className="w-4 h-4 cursor-pointer" />
              </Link>
              {/* Wallet Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowWalletSettings(!showWalletSettings)}
                  className="p-2 hover:bg-panel-elev rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Wallet Settings"
                >
                  <Wallet className="w-4 h-4 cursor-pointer" />
                </button>
                {showWalletSettings && (
                  <Suspense fallback={null}>
                    <WalletSettingsModal
                      slippage={slippage}
                      setSlippage={setSlippage}
                      onClose={() => setShowWalletSettings(false)}
                    />
                  </Suspense>
                )}
              </div>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Chain Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChain("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    chain === "all"
                      ? "bg-primary-dark text-white"
                      : "bg-panel text-gray-400 hover:bg-panel-elev border border-gray-800/50"
                  }`}
                >
                  <span>ALL</span>
                </button>
                <button
                  onClick={() => setChain("sol")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    chain === "sol"
                      ? "bg-primary-dark text-white"
                      : "bg-panel text-gray-400 hover:bg-panel-elev border border-gray-800/50"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    S
                  </div>
                  <span>SOL</span>
                </button>
                <button
                  onClick={() => setChain("bsc")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    chain === "bsc"
                      ? "bg-primary-dark text-white"
                      : "bg-panel text-gray-400 hover:bg-panel-elev border border-gray-800/50"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    B
                  </div>
                  <span>BSC</span>
                </button>
              </div>
            </div>
          </div>

          {/* Featured Tokens Marquee */}
          {featuredTokens.length > 0 && (
            <div className="mb-6">
              <TokenMarquee tokens={featuredTokens} speed="normal" />
            </div>
          )}

          {/* Filter Tabs with Counts */}
          {/* Filter Tabs - Full width edge to edge with horizontal scroll */}
          <div className="mb-4 w-full sticky top-20 bg-app/95 backdrop-blur-sm z-30 py-3 border-b border-gray-800/50 overflow-x-auto scrollbar-hide scroll-smooth">
            <div className="px-3 sm:px-4 min-w-max">
              <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
                {[
                  {
                    id: "new",
                    label: "New Pairs",
                    count: filterCounts.new,
                    icon: Sparkles,
                  },
                  {
                    id: "migrated",
                    label: "Migrated",
                    count: filterCounts.migrated,
                    icon: ArrowUpRight,
                  },
                  {
                    id: "latest",
                    label: "Latest",
                    count: filterCounts.latest,
                    icon: Clock,
                  },
                  {
                    id: "featured",
                    label: "Featured",
                    count: filterCounts.featured,
                    icon: Star,
                  },
                  {
                    id: "graduated",
                    label: "Graduated",
                    count: filterCounts.graduated,
                    icon: CheckCircle2,
                  },
                  {
                    id: "marketCap",
                    label: "Top MC",
                    count: filterCounts.marketCap,
                    icon: TrendingUp,
                  },
                ].map(({ id, label, count, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id as typeof filter)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 border-2 whitespace-nowrap ${
                      filter === id
                        ? "bg-primary-dark text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-panel text-gray-400 hover:text-white hover:bg-panel-elev border-gray-700/50 hover:border-gray-600"
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    <span className="hidden xs:inline">{label}</span>
                    <span className="xs:hidden">{label.split(" ")[0]}</span>
                    <span
                      className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${
                        filter === id
                          ? "bg-white/20 text-white"
                          : "bg-gray-700/50 text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Icons and Display dropdown - Always visible */}
          <div className="mb-4 flex items-center gap-2 justify-end px-3 sm:px-4">
            {/* Icons */}
            <button
              className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </button>
            <button
              className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer"
              title="Sound"
            >
              <Volume2 className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </button>
            <button
              className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer"
              title="Calendar"
            >
              <Calendar className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </button>
            {/* Display dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDisplaySettings(!showDisplaySettings)}
                className={`px-4 py-2.5 bg-panel border-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
                  showDisplaySettings
                    ? "border-primary text-white bg-panel-elev"
                    : "border-gray-700/50 text-gray-300 hover:bg-panel-elev hover:border-gray-600"
                }`}
              >
                Display
                <ChevronDownIcon
                  className={`w-3 h-3 transition-transform ${
                    showDisplaySettings ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showDisplaySettings && (
                <Suspense fallback={null}>
                  <DisplaySettingsModal
                    onClose={() => setShowDisplaySettings(false)}
                    displaySettings={displaySettings}
                    setDisplaySettings={setDisplaySettings}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Grid Layout - Shows tokens based on selected filter */}
        <div className="pb-24 px-3 sm:px-4">
          {tokensToDisplay.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {isLoadingPumpFun ? "Loading..." : "No tokens found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {tokensToDisplay.map((token) => (
                <CompactTokenCard
                  key={token.id}
                  token={token}
                  formatCurrency={formatCurrency}
                  formatNumber={formatNumber}
                  displaySettings={displaySettings}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Bar */}
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
              <Twitter className="w-3.5 h-3.5 text-blue-400" />
              <span>Twitter</span>
            </a>
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-purple-400" />
              <span>Discover</span>
            </Link>
            <Link
              href="/pulse"
              className="text-white font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-green-400" />
              <span>Pulse</span>
            </Link>
            <Link
              href="/profile"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-yellow-400" />
              <span>PnL</span>
            </Link>
          </div>

          {/* Right Section - Stats */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-medium">$104.7K</span>
              <span className="text-blue-400 font-medium">$3550</span>
              <span className="text-purple-400 font-medium">$159.1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-medium">$65.4K</span>
              <span className="text-gray-400">0.0225</span>
              <span className="text-gray-400">0.003</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-400 font-medium">
                Connection is stable
              </span>
            </div>
            <select className="px-2 py-1 bg-panel-elev border border-gray-800/50 rounded text-xs text-gray-300 focus:outline-none cursor-pointer hover:bg-panel transition-colors">
              <option>GLOBAL</option>
            </select>
            <button className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-panel-elev rounded">
              <X className="w-3 h-3" />
            </button>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Docs</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TokenCard({
  token,
  formatCurrency,
  formatNumber,
}: {
  token: TokenData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}) {
  const [imageError, setImageError] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const percentageChange =
    token.percentages.reduce((sum, p) => sum + p, 0) /
      token.percentages.length || 0;
  const isPositive = percentageChange >= 0;
  const isTrending = token.volume > 1000;

  const parseTimeToSeconds = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)([smh])/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      default:
        return 0;
    }
  };

  const isNew = parseTimeToSeconds(token.time) < 300;

  // Calculate buy/sell ratio (mock data - would come from API)
  const buyCount = Math.floor(token.transactions * 0.55);
  const sellCount = token.transactions - buyCount;
  const netValue = token.volume * (isPositive ? 1.1 : 0.9);

  // Generate mini sparkline data
  const sparklineData = useMemo(() => {
    const points = 20;
    const base = 50;
    return Array.from({ length: points }, (_, i) => {
      const variation = Math.sin((i / points) * Math.PI * 2) * 20;
      return base + variation + (isPositive ? 10 : -10);
    });
  }, [isPositive]);

  return (
    <>
      <div className="bg-panel border border-gray-800/50 rounded-xl p-3 hover:border-[var(--primary-border)] transition-all hover:shadow-lg hover:shadow-[var(--primary)]/5 group relative w-full max-w-sm sm:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {token.image && !imageError ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-800/50 relative group/token">
                <Image
                  src={token.image}
                  alt={token.symbol}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover/token:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/token:opacity-100">
                  <ExternalLink className="w-3 h-3 text-[var(--primary-text)]" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center flex-shrink-0 ring-2 ring-gray-800/50 text-xl shadow-lg shadow-[var(--primary)]/10">
                {token.icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-xs truncate">{token.name}</h3>
                {isNew && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-500/30 text-green-400 text-[10px] rounded-md font-medium flex items-center gap-0.5 flex-shrink-0 shadow-sm shadow-green-500/20">
                    <Sparkles className="w-2.5 h-2.5 text-green-400" />
                    NEW
                  </span>
                )}
                <div className="relative group/info">
                  <Info className="w-3 h-3 text-[var(--primary-text)]/70 hover:text-[var(--primary-text)] cursor-pointer transition-colors" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover/info:block z-50">
                    <div className="bg-panel-elev border border-gray-800/50 rounded-lg p-2 text-xs w-48 shadow-xl">
                      <div className="font-medium mb-1 text-[var(--primary-text)]">
                        Token Details
                      </div>
                      <div className="space-y-0.5 text-gray-300">
                        <div className="flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5 text-gray-500" />
                          <span className="text-gray-400 font-mono text-[10px]">
                            {token.id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5 text-green-400" />
                          <span>${token.price.toFixed(6)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="w-2.5 h-2.5 text-yellow-400" />
                          <span>Fee: {token.fee.toFixed(4)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-400">
                  {token.symbol}
                </span>
                <span className="text-[10px] text-gray-600">•</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {token.time}
                </span>
                <span className="text-[10px] text-[var(--primary-text)] ml-1">
                  @{token.symbol.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
          {isTrending && (
            <div className="flex-shrink-0 relative group/trending">
              <div className="relative">
                <Flame className="w-4 h-4 text-orange-400 animate-pulse cursor-pointer" />
                <div className="absolute inset-0 bg-orange-400/20 blur-sm rounded-full"></div>
              </div>
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/trending:block z-50">
                <div className="bg-panel-elev border border-gray-800/50 rounded-lg p-2 text-xs w-32 shadow-xl">
                  <div className="text-orange-400 font-medium flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Trending
                  </div>
                  <div className="text-gray-300">High volume activity</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mini Sparkline Chart */}
        <div className="mb-2 h-8 bg-gradient-to-br from-panel-elev/40 to-panel-elev/20 rounded-md relative overflow-hidden group/chart border border-gray-800/30">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 30"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={`gradient-${token.id}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={isPositive ? "#10b981" : "#ef4444"}
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "#10b981" : "#ef4444"}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <polyline
              points={sparklineData
                .map(
                  (y, i) =>
                    `${(i / sparklineData.length) * 100},${30 - (y / 100) * 30}`
                )
                .join(" ")}
              fill={`url(#gradient-${token.id})`}
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth="2"
              className="transition-all"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/chart:opacity-100 transition-opacity bg-black/30 rounded-md">
            <span
              className={`text-[10px] font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
              {isPositive ? "+" : ""}
              {percentageChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Market Cap & Change */}
        <div className="mb-2 bg-panel-elev/30 rounded-lg p-2 border border-gray-800/20">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5 text-green-400" />
              <span>MC</span>
            </span>
            <div
              className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(percentageChange).toFixed(2)}%
            </div>
          </div>
          <div className="text-base font-bold text-white">
            {formatCurrency(token.marketCap)}
          </div>
        </div>

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary-dark)]/5 rounded-lg p-1.5 border border-[var(--primary-border)] relative group/metric">
            <div className="text-[9px] text-gray-400 mb-0.5 flex items-center gap-0.5">
              <BarChart3 className="w-2.5 h-2.5 text-[var(--primary-text)]" />
              <span>V</span>
            </div>
            <div className="text-xs font-semibold text-[var(--primary-lighter)]">
              {formatCurrency(token.volume)}
            </div>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/metric:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-32 shadow-xl">
                <div className="font-medium text-[var(--primary-text)] flex items-center gap-1">
                  <BarChart3 className="w-2.5 h-2.5" />
                  Volume
                </div>
                <div className="text-gray-300">24h trading volume</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-1.5 border border-purple-500/20 relative group/metric">
            <div className="text-[9px] text-gray-400 mb-0.5 flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5 text-purple-400" />
              <span>TX</span>
            </div>
            <div className="text-xs font-semibold text-purple-300">
              {formatNumber(token.transactions)}
            </div>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/metric:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-36 shadow-xl">
                <div className="font-medium text-purple-400 flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5" />
                  Transactions
                </div>
                <div className="text-green-400">{buyCount} buy</div>
                <div className="text-red-400">{sellCount} sell</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-lg p-1.5 border border-yellow-500/20 relative group/metric">
            <div className="text-[9px] text-gray-400 mb-0.5 flex items-center gap-0.5">
              <Coins className="w-2.5 h-2.5 text-yellow-400" />
              <span>F</span>
            </div>
            <div className="text-xs font-semibold text-yellow-300">
              {token.fee.toFixed(3)}
            </div>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/metric:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-32 shadow-xl">
                <div className="font-medium text-yellow-400 flex items-center gap-1">
                  <Coins className="w-2.5 h-2.5" />
                  Fee
                </div>
                <div className="text-gray-300">Trading fee %</div>
              </div>
            </div>
          </div>
        </div>

        {/* Percentage Bars with Tooltip */}
        <div className="flex items-center gap-0.5 mb-2 relative group/bars bg-panel-elev/20 rounded-md p-1.5 border border-gray-800/20">
          {token.percentages.map((pct, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded transition-all ${
                pct > 0
                  ? "bg-gradient-to-t from-green-500 to-green-400"
                  : pct < 0
                    ? "bg-gradient-to-t from-red-500 to-red-400"
                    : "bg-gray-700"
              }`}
              style={{ opacity: Math.max(0.4, Math.abs(pct) / 100) }}
            />
          ))}
          <div className="absolute left-0 top-full mt-1 hidden group-hover/bars:block z-50">
            <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-40 shadow-xl">
              <div className="font-medium mb-1 text-[var(--primary-text)] flex items-center gap-1">
                <BarChart3 className="w-2.5 h-2.5" />
                Price Change
              </div>
              <div className="space-y-0.5">
                {token.percentages.map((pct, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-gray-400">Bar {idx + 1}:</span>
                    <span
                      className={`font-medium ${pct > 0 ? "text-green-400" : pct < 0 ? "text-red-400" : "text-gray-400"}`}
                    >
                      {pct > 0 ? "+" : ""}
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats Row */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2 pb-2 border-b border-gray-800/30">
          <div className="flex items-center gap-1 relative group/stat px-1.5 py-0.5 rounded hover:bg-panel-elev/50 transition-colors">
            <Eye className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-cyan-300">
              {formatNumber(token.activity.views)}
            </span>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/stat:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-28 shadow-xl">
                <div className="font-medium text-cyan-400 flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5" />
                  Views
                </div>
                <div className="text-gray-300">Total views</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 relative group/stat px-1.5 py-0.5 rounded hover:bg-panel-elev/50 transition-colors">
            <Users className="w-2.5 h-2.5 text-indigo-400" />
            <span className="text-indigo-300">
              {formatNumber(token.activity.holders)}
            </span>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/stat:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-28 shadow-xl">
                <div className="font-medium text-indigo-400 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  Holders
                </div>
                <div className="text-gray-300">Unique holders</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 relative group/stat px-1.5 py-0.5 rounded hover:bg-panel-elev/50 transition-colors">
            <MessageSquare className="w-2.5 h-2.5 text-pink-400" />
            <span className="text-pink-300">
              {formatNumber(token.activity.trades)}
            </span>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/stat:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-28 shadow-xl">
                <div className="font-medium text-pink-400 flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5" />
                  Trades
                </div>
                <div className="text-gray-300">Total trades</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 relative group/stat px-1.5 py-0.5 rounded hover:bg-panel-elev/50 transition-colors">
            <Star className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-amber-300">Q{token.activity.Q}</span>
            <div className="absolute left-0 top-full mt-1 hidden group-hover/stat:block z-50">
              <div className="bg-panel-elev border border-gray-800/50 rounded p-1.5 text-[10px] w-32 shadow-xl">
                <div className="font-medium text-amber-400 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" />
                  Quality Score
                </div>
                <div className="text-gray-300">Token quality rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Net Value & Transaction Count */}
        <div className="flex items-center justify-between text-[10px] mb-2 bg-panel-elev/30 rounded-md px-2 py-1 border border-gray-800/20">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
              N{isPositive ? "+" : ""}
              {formatCurrency(netValue)}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5 text-purple-400" />
              <span className="text-gray-300">{token.transactions}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-panel/50">
            <span className="text-green-400 font-medium">{buyCount}</span>
            <span className="text-gray-600">/</span>
            <span className="text-red-400 font-medium">{sellCount}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowTradingPanel(true)}
          className="w-full py-2 bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary-darker)] hover:from-[var(--primary-darker)] hover:to-[var(--primary-darker)] text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-[var(--primary)]/20 cursor-pointer"
        >
          <Zap className="w-3 h-3 cursor-pointer" />
          Buy {token.symbol}
        </button>
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
