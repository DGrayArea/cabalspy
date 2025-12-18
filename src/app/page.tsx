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
import { useSearchParams, usePathname } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMobulaTokensWithFallback } from "@/hooks/useMobulaTokensWithFallback";
import { TokenData } from "@/types/token";
import { env } from "@/lib/env";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/context/AuthContext";
import { useViewport } from "@/context/ViewportContext";
import { CompactTokenCard } from "@/components/CompactTokenCard";
import { TokenListCard } from "@/components/TokenListCard";
import { TokenMarquee } from "@/components/TokenMarquee";
import { SearchModal } from "@/components/SearchModal";
import LaunchpadStatsCard from "@/components/LaunchpadStatsCard";
import { pumpFunService } from "@/services/pumpfun";
import { protocolService } from "@/services/protocols";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  FileText,
  Palette,
  MessageCircle,
  Sliders,
  Circle,
} from "lucide-react";
import { getChainLogo } from "@/utils/platformLogos";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import axios from "axios";

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
  const { isDesktop, isMobile } = useViewport();
  const {
    tokens: wsTokens,
    solanaTokens,
    bscTokens,
    migrated: wsMigratedTokens,
    isLoading: wsLoading,
    error: wsError,
    isConnected,
  } = useWebSocket();

  // useEffect(() => {
  //   const testEndpoint = async () => {
  //     const response = await axios.get(
  //       "https://api.mobula.io/api/2/pulse?chainId=solana:solana&poolTypes=pumpfun&poolTypes=meteora&poolTypes=moonshot&poolTypes=jupiter&poolTypes=raydium&poolTypes=moonit&poolTypes=letsbonk&limit=100"
  //     );

  //     const postResponse = await axios.post(
  //       "https://api.mobula.io/api/2/pulse",
  //       {
  //         assetMode: true,
  //         views: [
  //           {
  //             name: "trending",
  //             chainId: ["solana:solana"],
  //             poolTypes: [
  //               "pumpfun",
  //               "meteora",
  //               "moonshot",
  //               "jupiter",
  //               "raydium",
  //               "moonit",
  //               "letsbonk",
  //             ],
  //             sortBy: "volume_1h",
  //             sortOrder: "desc",
  //             limit: 100,
  //           },
  //           {
  //             name: "price-gainers",
  //             chainId: ["solana:solana"],
  //             poolTypes: [
  //               "pumpfun",
  //               "meteora",
  //               "moonshot",
  //               "jupiter",
  //               "raydium",
  //               "moonit",
  //               "letsbonk",
  //             ],
  //             sortBy: "price_change_24h",
  //             sortOrder: "desc",
  //             limit: 100,
  //           },
  //           {
  //             name: "quality-tokens",
  //             chainId: ["solana:solana"],
  //             poolTypes: [
  //               "pumpfun",
  //               "meteora",
  //               "moonshot",
  //               "jupiter",
  //               "raydium",
  //               "moonit",
  //               "letsbonk",
  //             ],
  //             sortBy: "volume_1h",
  //             sortOrder: "desc",
  //             limit: 100,
  //           },
  //           {
  //             name: "high-volume",
  //             chainId: ["solana:solana"],
  //             poolTypes: [
  //               "pumpfun",
  //               "meteora",
  //               "moonshot",
  //               "jupiter",
  //               "raydium",
  //               "moonit",
  //               "letsbonk",
  //             ],
  //             sortBy: "volume_1h",
  //             sortOrder: "desc",
  //             limit: 100,
  //             filters: {
  //               volume_1h: { gte: 1000 },
  //               market_cap: { gte: 5000, lte: 50000 },
  //               trades_1h: { gte: 10 },
  //             },
  //           },
  //         ],
  //       }
  //     );

  //   };

  //   testEndpoint();
  // }, []);

  // Filter state - must be declared before mobulaTokens useMemo
  const [filter, setFilter] = useState<
    | "trending"
    | "new"
    | "finalStretch"
    | "latest"
    | "featured"
    | "graduated"
    | "marketCap"
  >("trending");

  // Try Mobula first for price changes, fallback to WebSocket if it fails
  // TEMPORARILY DISABLED - Commented out while debugging 500 errors
  const mobulaEnabled = false; // env.NEXT_PUBLIC_USE_MOBULA;
  // console.log("🔧 Mobula Config:", {
  //   enabled: mobulaEnabled,
  //   envVar: process.env.NEXT_PUBLIC_USE_MOBULA,
  //   wsTokensCount: wsTokens.length,
  // });

  // Fetch Mobula tokens for all views
  // TEMPORARILY DISABLED - Commented out while debugging 500 errors
  // const { tokens: mobulaTrending, mobulaAvailable: trendingAvailable } =
  //   useMobulaTokensWithFallback({
  //     view: "trending",
  //     limit: 100,
  //     fallbackTokens: wsTokens,
  //     fallbackLoading: wsLoading,
  //     fallbackError: wsError,
  //     enabled: mobulaEnabled,
  //   });

  // const { tokens: mobulaNew, mobulaAvailable: newAvailable } =
  //   useMobulaTokensWithFallback({
  //     view: "new",
  //     limit: 100,
  //     fallbackTokens: wsTokens,
  //     fallbackLoading: wsLoading,
  //     fallbackError: wsError,
  //     enabled: mobulaEnabled,
  //   });

  // const { tokens: mobulaBonding, mobulaAvailable: bondingAvailable } =
  //   useMobulaTokensWithFallback({
  //     view: "bonding",
  //     limit: 100,
  //     fallbackTokens: wsTokens,
  //     fallbackLoading: wsLoading,
  //     fallbackError: wsError,
  //     enabled: mobulaEnabled,
  //   });

  // const { tokens: mobulaBonded, mobulaAvailable: bondedAvailable } =
  //   useMobulaTokensWithFallback({
  //     view: "bonded",
  //     limit: 100,
  //     fallbackTokens: wsTokens,
  //     fallbackLoading: wsLoading,
  //     fallbackError: wsError,
  //     enabled: mobulaEnabled,
  //   });

  // const { tokens: mobulaSafe, mobulaAvailable: safeAvailable } =
  //   useMobulaTokensWithFallback({
  //     view: "safe",
  //     limit: 100,
  //     fallbackTokens: wsTokens,
  //     fallbackLoading: wsLoading,
  //     fallbackError: wsError,
  //     enabled: mobulaEnabled,
  //   });

  // Temporary fallback values while Mobula is disabled
  const mobulaTrending: TokenData[] = [];
  const trendingAvailable = false;
  const mobulaNew: TokenData[] = [];
  const newAvailable = false;
  const mobulaBonding: TokenData[] = [];
  const bondingAvailable = false;
  const mobulaBonded: TokenData[] = [];
  const bondedAvailable = false;
  const mobulaSafe: TokenData[] = [];
  const safeAvailable = false;

  // Use appropriate Mobula tokens based on current filter
  const mobulaTokens = useMemo(() => {
    switch (filter) {
      case "trending":
        return trendingAvailable
          ? mobulaTrending.filter((t: any) => t._mobula)
          : [];
      case "new":
        return newAvailable ? mobulaNew.filter((t: any) => t._mobula) : [];
      case "finalStretch":
        return bondingAvailable
          ? mobulaBonding.filter((t: any) => t._mobula)
          : [];
      case "graduated":
        return bondedAvailable
          ? mobulaBonded.filter((t: any) => t._mobula)
          : [];
      case "marketCap":
        return trendingAvailable
          ? mobulaTrending.filter((t: any) => t._mobula)
          : [];
      case "featured":
        return safeAvailable ? mobulaSafe.filter((t: any) => t._mobula) : [];
      case "latest":
        return newAvailable ? mobulaNew.filter((t: any) => t._mobula) : [];
      default:
        return [];
    }
  }, [
    filter,
    trendingAvailable,
    newAvailable,
    bondingAvailable,
    bondedAvailable,
    safeAvailable,
    mobulaTrending,
    mobulaNew,
    mobulaBonding,
    mobulaBonded,
    mobulaSafe,
  ]);

  const mobulaAvailable =
    trendingAvailable ||
    newAvailable ||
    bondingAvailable ||
    bondedAvailable ||
    safeAvailable;

  // For backward compatibility, use trending as default
  // TEMPORARILY DISABLED - Commented out while debugging 500 errors
  // const { tokens, isLoading, error, source } = useMobulaTokensWithFallback({
  //   view: "trending",
  //   limit: 100,
  //   fallbackTokens: wsTokens,
  //   fallbackLoading: wsLoading,
  //   fallbackError: wsError,
  //   enabled: mobulaEnabled,
  // });

  // Temporary fallback values while Mobula is disabled
  const tokens = wsTokens;
  const isLoading = wsLoading;
  const error = wsError;
  const source = "fallback";

  // useEffect(() => {
  //   console.log("📊 Final Token Status:", {
  //     source,
  //     mobulaAvailable,
  //     tokenCount: tokens.length,
  //     isLoading,
  //     error,
  //     mobulaTokensCount: tokens.filter((t: any) => t._mobula).length,
  //     nonMobulaTokensCount: tokens.filter((t: any) => !t._mobula).length,
  //   });

  //   // Log sample of tokens being displayed
  //   if (tokens.length > 0) {
  //     console.log(
  //       "🎯 Tokens to Display Sample:",
  //       tokens.slice(0, 3).map((t: any) => ({
  //         symbol: t.symbol,
  //         name: t.name,
  //         isMobula: t._mobula,
  //         hasPriceChanges: t.percentages?.length > 0,
  //         priceChanges: t.percentages,
  //       }))
  //     );
  //   }
  // }, [source, mobulaAvailable, tokens.length, isLoading, error, tokens]);

  // Get user from auth context
  const { user, turnkeyUser, turnkeySession } = useAuth();
  // User is authenticated if either user exists OR turnkeyUser/turnkeySession exists
  const isAuthenticated = user || turnkeyUser || turnkeySession;

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
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([
    "pump",
    "raydium",
    "meteora",
    "orca",
    "moonshot",
    "jupiter-studio",
  ]);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
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
  // Store protocol tokens per filter type to prevent reverting on rerenders
  // CRITICAL: Track which filter was active when tokens were fetched to prevent cross-contamination
  const [protocolTokensByFilter, setProtocolTokensByFilter] = useState<{
    new: TokenData[];
    finalStretch: TokenData[];
    graduated: TokenData[];
  }>({
    new: [],
    finalStretch: [],
    graduated: [],
  });
  const [lastFetchedFilter, setLastFetchedFilter] = useState<
    typeof filter | null
  >(null);
  const [isLoadingPumpFun, setIsLoadingPumpFun] = useState(false);
  const [isLoadingProtocols, setIsLoadingProtocols] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
    (
      pumpFunData: Awaited<ReturnType<typeof pumpFunService.fetchLatest>>,
      isFromGraduatedEndpoint = false
    ) => {
      return pumpFunData.map((info) => {
        // Use creation timestamp for time calculation (not migration timestamp)
        // For migrated/graduated tokens, we still want to show time since creation
        // PumpFunTokenInfo should have createdTimestamp from parseTokenData
        const creationTimestamp = (info as any).createdTimestamp;
        const timeFromCreation = formatTimeFromTimestamp(creationTimestamp);

        // CRITICAL: If token comes from graduated endpoint, it's ALWAYS migrated
        // No need to check API fields - the endpoint itself guarantees migration status
        const isMigrated = isFromGraduatedEndpoint || info.isMigrated === true;
        const migrationTimestamp = info.migrationTimestamp;
        const raydiumPool = info.raydiumPool;

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
          // CRITICAL: Preserve migration indicators - these are the source of truth
          isMigrated: isMigrated,
          migrationTimestamp: migrationTimestamp,
          raydiumPool: raydiumPool,
          // CRITICAL: Use bondingProgress from API if available (more accurate than calculating from MC)
          // API provides bondingCurveProgress as 0-100, we convert to 0-1
          // For migrated tokens, always 1.0 regardless of API value
          bondingProgress: isMigrated
            ? 1.0
            : info.bondingProgress !== undefined
              ? info.bondingProgress
              : undefined,
          // Preserve reserves if available
          reserves: info.reserves,
          // Preserve additional data for token pages
          numHolders: (info as any).numHolders,
          holders: (info as any).holders,
          buyTransactions: (info as any).buyTransactions,
          sellTransactions: (info as any).sellTransactions,
          // Include decimals from API response
          decimals: info.decimals,
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
        // console.log("🔄 Fetching pump.fun tokens directly from client...");

        // Call pumpfun service directly from client (better for rate limits - each user makes their own requests)
        const fetchTokens = async (type: string) => {
          try {
            switch (type) {
              case "latest":
                return await pumpFunService.fetchLatest(100);
              case "featured":
                // Featured endpoint is often unavailable, fail silently
                return await pumpFunService.fetchFeatured(100).catch(() => []);
              case "graduated":
                return await pumpFunService.fetchGraduated(100);
              case "marketCap":
                return await pumpFunService.fetchByMarketCap(100);
              default:
                return [];
            }
          } catch (err) {
            // Silently fail for featured, log others
            if (type !== "featured") {
              console.error(`❌ Failed to fetch ${type}:`, err);
            }
            return [];
          }
        };

        // Fetch all types with delays to avoid rate limiting
        const latest = await fetchTokens("latest");

        // Wait 500ms between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
        const featured = await fetchTokens("featured");

        await new Promise((resolve) => setTimeout(resolve, 500));
        const graduated = await fetchTokens("graduated");

        await new Promise((resolve) => setTimeout(resolve, 500));
        const marketCap = await fetchTokens("marketCap");

        // console.log("✅ Pump.fun API results:", {
        //   latest: latest.length,
        //   featured: featured.length,
        //   graduated: graduated.length,
        //   marketCap: marketCap.length,
        //   migrated: migrated.length,
        // });

        // Convert and store each type
        // CRITICAL: Tokens from graduated endpoint are ALWAYS migrated - no need to check API fields
        const convertedLatest = convertPumpFunToTokenData(latest, false);
        const convertedFeatured = convertPumpFunToTokenData(featured, false);
        const convertedGraduated = convertPumpFunToTokenData(graduated, true); // Mark as migrated automatically
        const convertedMarketCap = convertPumpFunToTokenData(marketCap, false);

        // console.log("✅ Converted tokens:", {
        //   latest: convertedLatest.length,
        //   featured: convertedFeatured.length,
        //   graduated: convertedGraduated.length,
        //   marketCap: convertedMarketCap.length,
        //   migrated: convertedMigrated.length,
        // });

        setPumpFunTokensByType({
          latest: convertedLatest,
          featured: convertedFeatured,
          graduated: convertedGraduated,
          marketCap: convertedMarketCap,
        });

        // Store migrated tokens separately (graduated = migrated)
        setPumpFunMigratedTokens(convertedGraduated);
        if (convertedGraduated.length > 0) {
          // console.log(
          //   "📦 Migrated tokens from pump.fun:",
          //   convertedGraduated.length
          // );
        }
      } catch (error) {
        // console.error("❌ Failed to fetch pump.fun tokens:", error);
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

  // Fetch featured tokens for marquee (mixed from pump.fun and Jupiter trending)
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Fetch from both pump.fun and Jupiter trending
        // Featured endpoint is often unavailable, fail silently
        const [pumpFunFeatured, jupiterTrending] = await Promise.all([
          pumpFunService.fetchFeatured(15).catch(() => {
            // Silently fail - featured endpoint is often unavailable
            return [];
          }),
          protocolService.fetchJupiterTopTrending(10).catch(() => []),
        ]);

        // Convert pump.fun tokens
        const convertedPumpFun = convertPumpFunToTokenData(
          pumpFunFeatured,
          false
        );

        // Convert Jupiter trending tokens
        const convertedJupiter = jupiterTrending.map((token: any) => ({
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          icon: "🪙",
          image: token.image,
          time: token.createdTimestamp
            ? formatTimeFromTimestamp(token.createdTimestamp)
            : "0s",
          createdTimestamp: token.createdTimestamp,
          marketCap: token.marketCap || 0,
          volume: token.volume || token.volume24h || 0,
          fee: 0,
          transactions: 0,
          percentages: [0, 0, 0, 0, 0],
          price: token.priceUsd || token.price || 0,
          activity: {
            Q: 0,
            views: 0,
            holders: 0,
            trades: 0,
          },
          chain: token.chain || "solana",
          source: token.protocol,
          dexscreener: undefined,
          bondingProgress: token.bondingProgress || 0,
          isMigrated: token.isMigrated || false,
          migrationTimestamp: token.migrationTimestamp,
        }));

        // Combine and sort by timestamp (newest first), then cap at 20
        const combined = [...convertedPumpFun, ...convertedJupiter]
          .sort((a, b) => {
            const aTime = a.createdTimestamp || 0;
            const bTime = b.createdTimestamp || 0;
            return bTime - aTime;
          })
          .slice(0, 20);

        setFeaturedTokens(combined);
      } catch (error) {
        console.error("Failed to fetch featured tokens:", error);
      }
    };

    fetchFeatured();
    // Refresh featured tokens every 2 minutes
    const interval = setInterval(fetchFeatured, 120000);
    return () => clearInterval(interval);
  }, [convertPumpFunToTokenData, formatTimeFromTimestamp]);

  // Fetch tokens from multiple protocols based on selected tab and protocols
  useEffect(() => {
    const fetchProtocolTokens = async () => {
      setIsLoadingProtocols(true);
      try {
        console.log("🔄 Fetching protocol tokens directly from client...", {
          protocols: selectedProtocols,
          filter,
        });

        // Call protocol service directly from client (better for rate limits)
        const protocolTokenData = await protocolService.fetchTokensByProtocols(
          selectedProtocols as any[],
          filter === "new"
            ? "new"
            : filter === "finalStretch"
              ? "finalStretch"
              : filter === "graduated"
                ? "migrated" // API uses "migrated" but we call it "graduated" in UI
                : undefined
        );

        // Convert ProtocolToken to TokenData format
        const converted = protocolTokenData.map((token: any) => {
          // CRITICAL: Check multiple indicators for migration status
          const isMigrated =
            token.isMigrated === true ||
            !!token.migrationTimestamp ||
            !!token.raydiumPool ||
            token.bondingProgress === 1.0 ||
            (token.bondingProgress && token.bondingProgress >= 1.0);

          // For migrated/graduated tokens, bonding progress should ALWAYS be 100%
          // NOTE: Migrated = Graduated (same thing - token completed bonding curve)
          // For non-migrated, calculate from SOL reserves (preferred) or market cap (fallback)
          const bondingProgress = isMigrated
            ? 1.0
            : token.bondingProgress !== undefined && token.bondingProgress < 1.0
              ? token.bondingProgress
              : (() => {
                  // Pump.fun bonding curve target is ~69 SOL (not fixed USD)
                  // If SOL reserves available, use them (more accurate as SOL price changes)
                  const solReserves =
                    (token as any).reserves?.sol ||
                    (token as any).solReserves ||
                    (token as any).realSolReserves ||
                    (token as any).virtualSolReserves;

                  if (solReserves && solReserves > 0) {
                    const SOL_TARGET = 69; // Pump.fun target is ~69 SOL
                    return Math.min(Math.max(solReserves / SOL_TARGET, 0), 1.0);
                  }

                  // Fallback: Calculate from market cap (less accurate, varies with SOL price)
                  // Pump.fun bonding curve completes at 69 SOL
                  // At current SOL price (~$137), that's approximately $9,453
                  const SOL_PRICE_APPROX = 137; // Current approximate SOL price
                  const bondingCurveTargetUSD = 69 * SOL_PRICE_APPROX; // ~$9,453
                  return token.marketCap
                    ? Math.min(
                        (token.marketCap || 0) / bondingCurveTargetUSD,
                        1.0
                      )
                    : 0;
                })();

          return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            icon: "🪙",
            image: token.image,
            time: token.createdTimestamp
              ? formatTimeFromTimestamp(token.createdTimestamp)
              : token.migrationTimestamp
                ? formatTimeFromTimestamp(token.migrationTimestamp)
                : "0s",
            createdTimestamp: token.createdTimestamp,
            marketCap: token.marketCap || 0,
            volume: token.volume || token.volume24h || 0,
            fee: 0,
            transactions: 0,
            percentages: [0, 0, 0, 0, token.priceChange24h || 0],
            price: token.priceUsd || token.price || 0,
            activity: {
              Q: 0,
              views: 0,
              holders: 0,
              trades: 0,
            },
            chain: token.chain || "solana",
            source: token.protocol,
            dexscreener: undefined,
            // Store bonding progress and migration status for display
            bondingProgress: bondingProgress,
            isMigrated: isMigrated,
            migrationTimestamp: token.migrationTimestamp,
            raydiumPool: token.raydiumPool,
          };
        });

        // CRITICAL: Filter converted tokens based on filter type to ensure data integrity
        let filteredConverted = converted;
        if (filter === "new") {
          // NEW: Must exclude ALL migrated tokens
          filteredConverted = converted.filter((token: any) => {
            return (
              !token.isMigrated &&
              !token.migrationTimestamp &&
              !token.raydiumPool &&
              token.bondingProgress !== 1.0 &&
              token.bondingProgress < 1.0
            );
          });
        } else if (filter === "finalStretch") {
          // FINAL STRETCH: Must exclude migrated AND have bonding progress 90-100%
          filteredConverted = converted.filter((token: any) => {
            const isNotMigrated =
              !token.isMigrated &&
              !token.migrationTimestamp &&
              !token.raydiumPool &&
              token.bondingProgress !== 1.0;
            if (!isNotMigrated) return false;
            const bondingProgress =
              token.bondingProgress ||
              Math.min((token.marketCap || 0) / (69 * 137), 1.0); // 69 SOL * ~$137
            return bondingProgress >= 0.9 && bondingProgress < 1.0;
          });
        } else if (filter === "graduated") {
          // GRADUATED: Must ONLY include migrated/graduated tokens
          filteredConverted = converted.filter((token: any) => {
            return (
              token.isMigrated ||
              token.migrationTimestamp ||
              token.raydiumPool ||
              token.bondingProgress === 1.0
            );
          });
        }

        // CRITICAL: Only store tokens for the CURRENT filter to prevent cross-contamination
        // Track which filter these tokens belong to
        setProtocolTokensByFilter((prev) => ({
          ...prev,
          [filter]: filteredConverted,
        }));
        setLastFetchedFilter(filter);

        console.log(
          `✅ Fetched ${converted.length} tokens from protocols for ${filter} tab`,
          { protocols: selectedProtocols, rawCount: protocolTokenData.length }
        );

        // Log protocol breakdown
        const protocolBreakdown: Record<string, number> = {};
        converted.forEach((token: any) => {
          const protocol = token.source || "unknown";
          protocolBreakdown[protocol] = (protocolBreakdown[protocol] || 0) + 1;
        });
        console.log("📊 Protocol breakdown:", protocolBreakdown);
      } catch (error) {
        console.error("❌ Failed to fetch protocol tokens:", error);
      } finally {
        setIsLoadingProtocols(false);
      }
    };

    // Only fetch protocol tokens for protocol-based filters
    // CRITICAL: Clear tracking when switching filters to prevent cross-contamination
    if (
      filter === "new" ||
      filter === "finalStretch" ||
      filter === "graduated"
    ) {
      // Clear tokens for other filters to prevent stale data
      setProtocolTokensByFilter((prev) => ({
        new: filter === "new" ? prev.new : [],
        finalStretch: filter === "finalStretch" ? prev.finalStretch : [],
        graduated: filter === "graduated" ? prev.graduated : [],
      }));

      // Reset tracking - will be set when fetch completes
      setLastFetchedFilter(null);

      fetchProtocolTokens();
    } else {
      // Clear all protocol tokens when switching to pump.fun filters
      setProtocolTokensByFilter({
        new: [],
        finalStretch: [],
        graduated: [],
      });
      setLastFetchedFilter(null);
    }
  }, [filter, selectedProtocols, formatTimeFromTimestamp]);

  // Filter tokens by selected chain
  // Use Mobula tokens if WebSocket tokens are empty, otherwise use WebSocket tokens
  const chainFilteredTokens = useMemo(() => {
    if (chain === "all") return tokens;

    // If WebSocket tokens are empty, filter Mobula tokens by chain
    if (solanaTokens.length === 0 && bscTokens.length === 0) {
      if (chain === "sol") {
        return tokens.filter((t) => t.chain === "solana" || t.chain === "sol");
      }
      if (chain === "bsc") {
        return tokens.filter((t) => t.chain === "bsc");
      }
      return tokens;
    }

    // Use WebSocket tokens if available
    if (chain === "sol")
      return solanaTokens.length > 0
        ? solanaTokens
        : tokens.filter((t) => t.chain === "solana" || t.chain === "sol");
    if (chain === "bsc")
      return bscTokens.length > 0
        ? bscTokens
        : tokens.filter((t) => t.chain === "bsc");
    return tokens;
  }, [tokens, solanaTokens, bscTokens, chain]);
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [quickBuyAmount, setQuickBuyAmount] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quickBuyAmount") || "0.01";
    }
    return "0.01";
  });
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
      // TRENDING filter - Use Mobula trending tokens first
      if (filterType === "trending") {
        if (mobulaTokens.length > 0) {
          console.log(
            `🔍 Filter trending: Using ${mobulaTokens.length} Mobula tokens`
          );
          return mobulaTokens;
        }
        // Fallback to filteredAndSortedTokens
        return filteredAndSortedTokens;
      }

      // For pump.fun filters (latest, featured, marketCap) - prefer Mobula, then pump.fun
      if (
        filterType === "latest" ||
        filterType === "featured" ||
        filterType === "marketCap"
      ) {
        // Try Mobula tokens first for all these filters
        if (mobulaTokens.length > 0) {
          // console.log(
          //   `🔍 Filter ${filterType}: Using ${mobulaTokens.length} Mobula tokens`
          // );
          return mobulaTokens;
        }

        // Return the specific type from pumpFunTokensByType
        const pumpFunTokens = pumpFunTokensByType[filterType] || [];
        // console.log(`🔍 Filter ${filterType}: Found ${pumpFunTokens.length} tokens`);
        return pumpFunTokens;
      }

      // Use protocol tokens for the three main tabs (new, finalStretch, graduated)
      if (
        filterType === "new" ||
        filterType === "finalStretch" ||
        filterType === "graduated"
      ) {
        // Try Mobula tokens first for all these filters
        if (mobulaTokens.length > 0) {
          // console.log(
          //   `🔍 Filter ${filterType}: Using ${mobulaTokens.length} Mobula tokens`
          // );
          return mobulaTokens;
        }

        // CRITICAL: Only use stored tokens if they match the CURRENT filter type AND were fetched for this filter
        // This prevents tokens from one filter leaking into another when switching filters
        const storedProtocolTokens =
          lastFetchedFilter === filterType && protocolTokensByFilter[filterType]
            ? protocolTokensByFilter[filterType]
            : [];

        // CRITICAL: Add safety filters to ensure correct tokens are shown
        // This is a double-check to catch any API issues
        let filteredTokens = storedProtocolTokens;

        if (filterType === "new") {
          // NEW filter: MUST exclude ALL migrated tokens, regardless of what API returns
          filteredTokens = storedProtocolTokens.filter((token: any) => {
            const isNotMigrated =
              !token.isMigrated &&
              !token.migrationTimestamp &&
              !token.raydiumPool &&
              token.bondingProgress !== 1.0 &&
              token.bondingProgress < 1.0;
            return isNotMigrated;
          });
        } else if (filterType === "finalStretch") {
          // FINAL STRETCH: Must exclude migrated tokens AND have bonding progress 90-100%
          filteredTokens = storedProtocolTokens.filter((token: any) => {
            const isNotMigrated =
              !token.isMigrated &&
              !token.migrationTimestamp &&
              !token.raydiumPool &&
              token.bondingProgress !== 1.0 &&
              token.bondingProgress < 1.0;
            if (!isNotMigrated) return false;

            // Calculate bonding progress (prefer SOL reserves, fallback to market cap)
            const solReserves =
              (token as any).reserves?.sol || (token as any).solReserves;
            const bondingProgress =
              token.bondingProgress !== undefined && token.bondingProgress < 1.0
                ? token.bondingProgress
                : solReserves && solReserves > 0
                  ? Math.min(Math.max(solReserves / 69, 0), 1.0) // Use SOL reserves (~69 SOL target)
                  : Math.min((token.marketCap || 0) / (69 * 137), 1.0); // Fallback: 69 SOL * ~$137
            return bondingProgress >= 0.9 && bondingProgress < 1.0;
          });
        } else if (filterType === "graduated") {
          // GRADUATED: Must ONLY include migrated/graduated tokens
          filteredTokens = storedProtocolTokens.filter((token: any) => {
            return (
              token.isMigrated ||
              token.migrationTimestamp ||
              token.raydiumPool ||
              token.bondingProgress === 1.0
            );
          });
        }

        // Only return stored tokens if they exist AND pass the safety filter
        if (filteredTokens.length > 0) {
          // console.log(
          //   `🔍 Filter ${filterType}: Using ${filteredTokens.length} tokens from protocol API (filtered from ${storedProtocolTokens.length})`
          // );
          return filteredTokens;
        }

        // If stored tokens don't exist or are empty, fall through to fallback logic

        // Fallback to pump.fun API tokens (not WebSocket)
        if (filterType === "new") {
          // Prefer pump.fun API tokens over WebSocket tokens for "New" filter
          const pumpFunNewTokens = pumpFunTokensByType.latest || [];
          if (pumpFunNewTokens.length > 0) {
            // Filter for truly new tokens (less than 5 minutes old) AND not migrated
            const veryNewTokens = pumpFunNewTokens.filter((token) => {
              const timeSeconds = parseTimeToSeconds(token.time);
              const isNew = timeSeconds < 300; // Less than 5 minutes
              const isNotMigrated =
                !(token as any).isMigrated &&
                !(token as any).migrationTimestamp &&
                !(token as any).raydiumPool;
              return isNew && isNotMigrated;
            });
            if (veryNewTokens.length > 0) {
              return veryNewTokens;
            }
          }

          // Last resort: WebSocket tokens - exclude migrated tokens
          const newPairs = filteredAndSortedTokens.filter((token) => {
            const timeSeconds = parseTimeToSeconds(token.time);
            const isNew = timeSeconds < 300; // Less than 5 minutes
            const isNotMigrated =
              !(token as any).isMigrated &&
              !(token as any).migrationTimestamp &&
              !(token as any).raydiumPool;
            return isNew && isNotMigrated;
          });
          return newPairs;
        }

        if (filterType === "finalStretch") {
          // Filter tokens with bonding progress 90-100% AND not migrated
          const finalStretch = filteredAndSortedTokens.filter((token) => {
            // Exclude migrated tokens
            const isNotMigrated =
              !(token as any).isMigrated &&
              !(token as any).migrationTimestamp &&
              !(token as any).raydiumPool;
            if (!isNotMigrated) return false;

            // Calculate bonding progress
            // Pump.fun target is ~69 SOL (not fixed USD - varies with SOL price)
            const solReserves =
              (token as any).reserves?.sol ||
              (token as any).solReserves ||
              (token as any).realSolReserves;
            const bondingProgress =
              solReserves && solReserves > 0
                ? Math.min(Math.max(solReserves / 69, 0), 1.0) // Use SOL reserves (more accurate)
                : Math.min((token.marketCap || 0) / (69 * 137), 1.0); // Fallback: 69 SOL * ~$137
            return bondingProgress >= 0.9 && bondingProgress < 1.0;
          });
          // console.log(
          //   `🔍 Filter finalStretch: Found ${finalStretch.length} tokens (fallback)`
          // );
          return finalStretch;
        }

        if (filterType === "graduated") {
          // GRADUATED: Combine all migrated/graduated sources
          const allGraduated = [
            ...(wsMigratedTokens || []),
            ...(pumpFunMigratedTokens || []),
            ...(pumpFunTokensByType.graduated || []),
          ];

          // Deduplicate by ID
          const seen = new Set<string>();
          const unique = allGraduated.filter((token) => {
            if (seen.has(token.id)) return false;
            seen.add(token.id);
            return true;
          });

          if (unique.length > 0) {
            // console.log(
            //   `🔍 Filter graduated: Using ${unique.length} tokens (combined sources)`
            // );
            return unique;
          }

          // Last resort: filter by migration indicators (isMigrated, migrationTimestamp, raydiumPool)
          const graduatedFromWS = filteredAndSortedTokens.filter((token) => {
            // Check for explicit migration indicators
            return (
              (token as any).isMigrated === true ||
              (token as any).migrationTimestamp !== undefined ||
              (token as any).raydiumPool !== undefined
            );
          });
          // console.log(
          //   `🔍 Filter graduated: Found ${graduatedFromWS.length} tokens (fallback)`
          // );
          return graduatedFromWS;
        }
      }

      // CRITICAL: Don't fall back to filteredAndSortedTokens - this causes cross-contamination
      // Each filter should ONLY return tokens from its specific source
      // If no tokens found, return empty array
      console.warn(`⚠️ No tokens found for filter: ${filterType}`);
      return [];
    },
    [
      filteredAndSortedTokens,
      protocolTokensByFilter,
      pumpFunTokensByType,
      pumpFunMigratedTokens,
      wsMigratedTokens,
      mobulaTokens,
    ]
  );

  // Get tokens to display based on selected filter
  const tokensToDisplay = useMemo(() => {
    const tokens = getTokensForFilter(filter);

    // If no tokens match, show empty array (don't show fallback tokens from other filters)
    // Each filter should be isolated - no cross-contamination
    if (tokens.length === 0) {
      return [];
    }

    // CRITICAL: Deduplicate tokens by ID to prevent duplicate React keys
    // Tokens can appear in multiple sources (protocol APIs, pump.fun, WebSocket)
    const seen = new Set<string>();
    const uniqueTokens = tokens.filter((token) => {
      if (seen.has(token.id)) {
        return false; // Skip duplicate
      }
      seen.add(token.id);
      return true;
    });

    return uniqueTokens;
  }, [filter, getTokensForFilter, filteredAndSortedTokens]);

  // Calculate filter counts - must match the data sources used in getTokensForFilter
  const filterCounts = useMemo(() => {
    // For pump.fun filters (latest, featured, marketCap) - use pump.fun tokens
    const latestCount = pumpFunTokensByType.latest.length;
    const featuredCount = pumpFunTokensByType.featured.length;
    const marketCapCount = pumpFunTokensByType.marketCap.length;

    // NOTE: Graduated = Migrated (same thing - token completed bonding curve)
    // Calculate combined count to avoid double counting
    const allMigratedGraduated = [
      ...(wsMigratedTokens || []),
      ...(pumpFunMigratedTokens || []),
      ...(pumpFunTokensByType.graduated || []),
    ];
    const seenMigrated = new Set<string>();
    const uniqueMigratedGraduated = allMigratedGraduated.filter((token) => {
      if (seenMigrated.has(token.id)) return false;
      seenMigrated.add(token.id);
      return true;
    });
    const migratedGraduatedCount = uniqueMigratedGraduated.length;

    // For protocol-based filters (new, finalStretch, graduated)
    // Use the same logic as getTokensForFilter to get accurate counts

    // New count - use protocol tokens if available, otherwise use same fallback logic
    let newCount = 0;
    if (protocolTokensByFilter.new && protocolTokensByFilter.new.length > 0) {
      // CRITICAL: Filter out migrated tokens from count (safety check)
      const filteredNew = protocolTokensByFilter.new.filter((token: any) => {
        return (
          !token.isMigrated &&
          !token.migrationTimestamp &&
          !token.raydiumPool &&
          token.bondingProgress !== 1.0
        );
      });
      newCount = filteredNew.length;
    } else {
      // Try pump.fun latest tokens filtered by time AND not migrated
      const pumpFunNewTokens = pumpFunTokensByType.latest || [];
      const veryNewTokens = pumpFunNewTokens.filter((token) => {
        const timeSeconds = parseTimeToSeconds(token.time);
        const isNew = timeSeconds < 300; // Less than 5 minutes
        const isNotMigrated =
          !(token as any).isMigrated &&
          !(token as any).migrationTimestamp &&
          !(token as any).raydiumPool;
        return isNew && isNotMigrated;
      });
      if (veryNewTokens.length > 0) {
        newCount = veryNewTokens.length;
      } else {
        // Fallback to WebSocket tokens - exclude migrated
        newCount = filteredAndSortedTokens.filter((token) => {
          const timeSeconds = parseTimeToSeconds(token.time);
          const isNew = timeSeconds < 300; // Less than 5 minutes
          const isNotMigrated =
            !(token as any).isMigrated &&
            !(token as any).migrationTimestamp &&
            !(token as any).raydiumPool;
          return isNew && isNotMigrated;
        }).length;
      }
    }

    // Final stretch count - use protocol tokens if available, otherwise use same fallback logic
    let finalStretchCount = 0;
    if (
      protocolTokensByFilter.finalStretch &&
      protocolTokensByFilter.finalStretch.length > 0
    ) {
      // CRITICAL: Filter out migrated tokens and ensure bonding progress is correct
      const filteredFinalStretch = protocolTokensByFilter.finalStretch.filter(
        (token: any) => {
          const isNotMigrated =
            !token.isMigrated &&
            !token.migrationTimestamp &&
            !token.raydiumPool &&
            token.bondingProgress !== 1.0;
          if (!isNotMigrated) return false;
          // Calculate bonding progress (prefer SOL reserves, fallback to market cap)
          const solReserves =
            (token as any).reserves?.sol || (token as any).solReserves;
          const bondingProgress =
            token.bondingProgress !== undefined
              ? token.bondingProgress
              : solReserves && solReserves > 0
                ? Math.min(Math.max(solReserves / 69, 0), 1.0) // Use SOL reserves (~69 SOL target)
                : Math.min((token.marketCap || 0) / (69 * 137), 1.0); // Fallback: 69 SOL * ~$137
          return bondingProgress >= 0.9 && bondingProgress < 1.0;
        }
      );
      finalStretchCount = filteredFinalStretch.length;
    } else {
      // Fallback: filter tokens with bonding progress 90-100% AND not migrated
      finalStretchCount = filteredAndSortedTokens.filter((token) => {
        // Exclude migrated tokens
        const isNotMigrated =
          !(token as any).isMigrated &&
          !(token as any).migrationTimestamp &&
          !(token as any).raydiumPool;
        if (!isNotMigrated) return false;

        // Calculate bonding progress (prefer SOL reserves, fallback to market cap)
        const solReserves =
          (token as any).reserves?.sol || (token as any).solReserves;
        const bondingProgress =
          solReserves && solReserves > 0
            ? Math.min(Math.max(solReserves / 69, 0), 1.0) // Use SOL reserves (~69 SOL target)
            : Math.min((token.marketCap || 0) / (69 * 137), 1.0); // Fallback: 69 SOL * ~$137
        return bondingProgress >= 0.9 && bondingProgress < 1.0;
      }).length;
    }

    // Graduated count - combine all sources and deduplicate
    // NOTE: Graduated = tokens that completed bonding curve and migrated to Raydium
    let graduatedCount = migratedGraduatedCount; // Use the combined deduplicated count calculated above

    // If protocol tokens available, add them and deduplicate
    if (
      protocolTokensByFilter.graduated &&
      protocolTokensByFilter.graduated.length > 0
    ) {
      const allSources = [
        ...uniqueMigratedGraduated,
        ...protocolTokensByFilter.graduated,
      ];
      const seen = new Set<string>();
      graduatedCount = allSources.filter((token: any) => {
        if (seen.has(token.id)) return false;
        seen.add(token.id);
        return true;
      }).length;
    }

    // Trending count - use Mobula trending tokens
    const trendingCount = trendingAvailable
      ? mobulaTrending.filter((t: any) => t._mobula).length
      : filteredAndSortedTokens.length;

    return {
      trending: trendingCount,
      new: newCount,
      finalStretch: finalStretchCount,
      latest: latestCount,
      featured: featuredCount,
      graduated: graduatedCount,
      marketCap: marketCapCount,
    };
  }, [
    filteredAndSortedTokens,
    pumpFunTokensByType,
    protocolTokensByFilter,
    pumpFunMigratedTokens,
    wsMigratedTokens,
    trendingAvailable,
    mobulaTrending,
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
      <Navbar
        showSearch={true}
        onSearchClick={() => setShowSearchModal(true)}
        showRefresh={true}
        onRefreshClick={() => refresh()}
        isLoading={isLoading}
        showWalletSettings={true}
        onWalletSettingsClick={() => setShowWalletSettings(!showWalletSettings)}
      />

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
                  <img
                    src={getChainLogo("solana")}
                    alt="SOL"
                    className="w-5 h-5 rounded-full flex-shrink-0 object-cover"
                    onError={(e) => {
                      // Fallback to gradient if logo fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0 hidden">
                    S
                  </div>
                </button>
                <button
                  onClick={() => setChain("bsc")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    chain === "bsc"
                      ? "bg-primary-dark text-white"
                      : "bg-panel text-gray-400 hover:bg-panel-elev border border-gray-800/50"
                  }`}
                >
                  <img
                    src={getChainLogo("bsc")}
                    alt="BNB"
                    className="w-5 h-5 rounded-full flex-shrink-0 object-cover"
                    onError={(e) => {
                      // Fallback to gradient if logo fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0 hidden">
                    B
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Launchpad Statistics Card */}
          <div className="mb-6 px-3 sm:px-4">
            <LaunchpadStatsCard />
          </div>

          {/* Top Featured Tokens Marquee */}
          {featuredTokens.length > 0 && (
            <div className="mb-6">
              <div className="px-3 sm:px-4 mb-2">
                <h2 className="text-lg font-bold text-white">Top Featured</h2>
              </div>
              <TokenMarquee tokens={featuredTokens} speed="normal" />
            </div>
          )}

          {/* Filter Tabs with Counts */}
          <div className="mb-4 w-full sticky top-[64px] bg-app/98 backdrop-blur-md z-40 py-3 border-b border-gray-800/50 overflow-x-auto scrollbar-hide scroll-smooth shadow-lg -mx-3 sm:-mx-4 px-3 sm:px-4">
            <div className="min-w-max">
              <div className="flex items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
                  {[
                    {
                      id: "trending",
                      label: "Trending",
                      count: filterCounts.trending || 0,
                      icon: TrendingUpIcon,
                      live: true,
                    },
                    {
                      id: "new",
                      label: "New Pairs",
                      count: filterCounts.new,
                      icon: Sparkles,
                      live: true,
                    },
                    {
                      id: "finalStretch",
                      label: "Final Stretch",
                      count: filterCounts.finalStretch || 0,
                      icon: Zap,
                    },
                    {
                      id: "graduated",
                      label: "Graduated",
                      count: filterCounts.graduated,
                      icon: CheckCircle2,
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
                      id: "marketCap",
                      label: "Top MC",
                      count: filterCounts.marketCap,
                      icon: TrendingUp,
                    },
                  ].map(({ id, label, count, icon: Icon, live }) => (
                    <button
                      key={id}
                      onClick={() => setFilter(id as typeof filter)}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 border-2 whitespace-nowrap relative ${
                        filter === id
                          ? "bg-primary-dark text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-panel text-gray-400 hover:text-white hover:bg-panel-elev border-gray-700/50 hover:border-gray-600"
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      <span className="hidden xs:inline">{label}</span>
                      <span className="xs:hidden">{label.split(" ")[0]}</span>
                      {live && (
                        <span className="px-1 py-0.5 rounded bg-red-500 text-white text-[8px] font-bold flex items-center gap-0.5 animate-pulse">
                          <Circle className="w-1 h-1 fill-white" />
                          LIVE
                        </span>
                      )}
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

                {/* Equalizer Icon - Protocol Selector */}
                <button
                  onClick={() => setShowProtocolModal(true)}
                  className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  title="Protocol Filters"
                >
                  <Sliders className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
                </button>
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
                  quickBuyAmount={quickBuyAmount}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      {/* Protocol Selector Modal */}
      <Dialog open={showProtocolModal} onOpenChange={setShowProtocolModal}>
        <DialogContent className="sm:max-w-2xl bg-panel border border-gray-800/50 rounded-xl shadow-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Protocol Filters
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">
                Select protocols to include
              </span>
              <button
                onClick={() => {
                  const allProtocols = [
                    "pump",
                    "raydium",
                    "meteora",
                    "meteora-amm",
                    "meteora-amm-v2",
                    "orca",
                    "bonk",
                    "bags",
                    "moonshot",
                    "heaven",
                    "daos-fun",
                    "candle",
                    "sugar",
                    "believe",
                    "jupiter-studio",
                    "moonit",
                    "boop",
                    "launchlab",
                    "dynamic-bc",
                    "mayhem",
                    "pump-amm",
                    "wavebreak",
                  ];
                  setSelectedProtocols(
                    selectedProtocols.length === allProtocols.length
                      ? []
                      : allProtocols
                  );
                }}
                className="text-xs text-primary hover:text-primary-light transition-colors cursor-pointer"
              >
                {selectedProtocols.length === 22
                  ? "Unselect All"
                  : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { id: "pump", label: "Pump", color: "bg-green-500" },
                { id: "raydium", label: "Raydium", color: "bg-blue-500" },
                { id: "meteora", label: "Meteora", color: "bg-purple-500" },
                {
                  id: "meteora-amm",
                  label: "Meteora AMM",
                  color: "bg-purple-400",
                },
                {
                  id: "meteora-amm-v2",
                  label: "Meteora AMM V2",
                  color: "bg-purple-300",
                },
                { id: "orca", label: "Orca", color: "bg-cyan-500" },
                { id: "bonk", label: "Bonk", color: "bg-orange-500" },
                { id: "bags", label: "Bags", color: "bg-yellow-500" },
                { id: "moonshot", label: "Moonshot", color: "bg-pink-500" },
                { id: "heaven", label: "Heaven", color: "bg-indigo-500" },
                { id: "daos-fun", label: "Daos.fun", color: "bg-teal-500" },
                { id: "candle", label: "Candle", color: "bg-red-500" },
                { id: "sugar", label: "Sugar", color: "bg-rose-500" },
                { id: "believe", label: "Believe", color: "bg-emerald-500" },
                {
                  id: "jupiter-studio",
                  label: "Jupiter Studio",
                  color: "bg-violet-500",
                },
                { id: "moonit", label: "Moonit", color: "bg-sky-500" },
                { id: "boop", label: "Boop", color: "bg-lime-500" },
                { id: "launchlab", label: "LaunchLab", color: "bg-amber-500" },
                {
                  id: "dynamic-bc",
                  label: "Dynamic BC",
                  color: "bg-fuchsia-500",
                },
                { id: "mayhem", label: "Mayhem", color: "bg-red-600" },
                { id: "pump-amm", label: "Pump AMM", color: "bg-green-400" },
                { id: "wavebreak", label: "Wavebreak", color: "bg-blue-400" },
              ].map((protocol) => {
                const isSelected = selectedProtocols.includes(protocol.id);
                return (
                  <button
                    key={protocol.id}
                    onClick={() => {
                      setSelectedProtocols((prev) =>
                        isSelected
                          ? prev.filter((p) => p !== protocol.id)
                          : [...prev, protocol.id]
                      );
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-2 ${
                      isSelected
                        ? "bg-primary-dark text-white border-primary"
                        : "bg-panel text-gray-400 border-gray-700/50 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${protocol.color} ${
                          isSelected ? "opacity-100" : "opacity-50"
                        }`}
                      />
                      <span>{protocol.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowProtocolModal(false)}
                className="px-4 py-2 bg-panel-elev text-gray-300 rounded-lg hover:bg-panel transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Refresh data with new protocols
                  setShowProtocolModal(false);
                  // Trigger data refresh
                  refresh();
                }}
                className="px-4 py-2 bg-primary-dark text-white rounded-lg hover:bg-primary-darker transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Settings Modal - Rendered outside for mobile menu access */}
      {showWalletSettings && isAuthenticated && (
        <Suspense fallback={null}>
          <WalletSettingsModal
            slippage={slippage}
            setSlippage={setSlippage}
            quickBuyAmount={quickBuyAmount}
            setQuickBuyAmount={(value) => {
              setQuickBuyAmount(value);
              if (typeof window !== "undefined") {
                localStorage.setItem("quickBuyAmount", value);
              }
            }}
            onClose={() => setShowWalletSettings(false)}
          />
        </Suspense>
      )}
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
