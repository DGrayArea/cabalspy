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
import { useMobulaPulse } from "@/hooks/useMobulaPulse";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useFilterState } from "@/hooks/useFilterState";
import { TokenData } from "@/types/token";
import { env } from "@/lib/env";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/context/AuthContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useViewport } from "@/context/ViewportContext";
import { useRouter } from "next/navigation";
import { verifyNftOwnership } from "@/services/verify-nft";
import { CompactTokenCard } from "@/components/CompactTokenCard";
import { TokenListCard } from "@/components/TokenListCard";
import { TokenMarquee } from "@/components/TokenMarquee";
import { SearchModal } from "@/components/SearchModal";
import TokenComparison from "@/components/TokenComparison";
import {
  TokenListSkeleton,
  MarqueeSkeleton,
} from "@/components/TokenCardSkeleton";
import LaunchpadStatsCard from "@/components/LaunchpadStatsCard";
import CallsFeed from "@/components/CallsFeed";
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
  Loader2,
  Lock,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

// Local component imports
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from "@/utils/format";

// Lazy load components that are not immediately needed
const DisplaySettingsModal = lazy(() => import("@/components/DisplaySettingsModal").then(module => ({ default: module.DisplaySettingsModal })));
const WalletSettingsModal = lazy(() => import("@/services/WalletSettingsModal").then(module => ({ default: module.WalletSettingsModal })));

function AuthCallbackHandler() {
  const { handleAuthCallback, refreshSession, login } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const discordAuth = searchParams.get("discord_auth");
    const telegramAuth = searchParams.get("telegram_auth");
    const dataStr = searchParams.get("data");

    if (code && state) {
      handleAuthCallback(code, state).finally(() => {
        router.replace("/");
      });
    } else if (discordAuth === "success") {
      // Always refresh the server session first so checkAccess sees the updated user
      refreshSession().finally(() => {
        router.replace("/");
      });
    } else if (telegramAuth === "success") {
      // Telegram bot redirected back — refresh server session (cookie already set by callback route)
      refreshSession().finally(() => {
        router.replace("/");
      });
    }
  }, [searchParams, handleAuthCallback, refreshSession, login, router]);

  return null;
}


export default function Home() {
  const { isAuthenticated, user, isLoggingIn, isLoading: authLoading } = useAuth();
  const { watchlist } = useWatchlist();
  const { displaySettings, setDisplaySettings } = useSettings();
  const router = useRouter();

  // Redirect unauthenticated users to auth page
  useEffect(() => {
    if (!isAuthenticated && !isLoggingIn) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoggingIn, router]);

  const [chain, setChain] = useState<"sol" | "bsc" | "all">("all");
  const [filter, setFilter] = useFilterState("trending");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [comparingToken, setComparingToken] = useState<TokenData | null>(null);
  const [sortBy, setSortBy] = useState<"marketCap" | "volume" | "priceChange" | "none">("none");
  const [activeAdvancedFilters, setActiveAdvancedFilters] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cabalspy_adv_filters");
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [slippage, setSlippage] = useState("0.5");
  const [quickBuyAmount, setQuickBuyAmount] = useState("0.1");

  const mobulaEnabled = !!env.NEXT_PUBLIC_USE_MOBULA;
  const { 
    tokens: mobulaTokensByFilter, 
    isLoading: isLoading, 
    refresh: refreshMobula 
  } = useMobulaPulse(mobulaEnabled);

  const isLoadingMore = false; // Placeholder if not implemented in current useMobulaPulse
  const observerTarget = { current: null }; // Placeholder

  const refresh = useCallback(() => {
    refreshMobula();
  }, [refreshMobula]);

  const tokensToDisplay = useMemo(() => {
    if (!mobulaTokensByFilter) return [];
    
    let list;
    if (filter === "watchlist") {
      // Convert WatchlistToken to TokenData structure for CompactTokenCard
      list = watchlist.map(t => ({
        id: t.mint,
        symbol: t.symbol,
        name: t.name,
        image: t.image,
        chain: t.network,
        marketCap: 0, // Placeholder
        volume: 0,
        priceChange24h: 0,
      })) as any[];
    } else {
      list = [...(mobulaTokensByFilter[filter] || [])];
    }
    
    // Sort by selected metric
    if (sortBy === "marketCap") {
      list.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    } else if (sortBy === "volume") {
      list.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (sortBy === "priceChange") {
      list.sort((a, b) => {
        const aChange = a.priceChange24h || 0;
        const bChange = b.priceChange24h || 0;
        return Math.abs(bChange) - Math.abs(aChange);
      });
    }
    
    // Filter by chain
    if (chain !== "all") {
      list = list.filter(t => t.chain?.toLowerCase() === (chain === "sol" ? "solana" : "bsc"));
    }

    // Filter by protocol if selected
    if (selectedProtocols.length > 0) {
      list = list.filter(t => t.protocol && selectedProtocols.includes(t.protocol.toLowerCase()));
    }

    // Advanced metric filters
    if (activeAdvancedFilters.includes("MC < $100K")) {
      list = list.filter(t => (t.marketCap || 0) < 100_000);
    }
    if (activeAdvancedFilters.includes("MC > $1M")) {
      list = list.filter(t => (t.marketCap || 0) > 1_000_000);
    }
    if (activeAdvancedFilters.includes("HIGH VOL")) {
      // Top 20% by volume
      const sorted = [...list].sort((a, b) => (b.volume || 0) - (a.volume || 0));
      list = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
    }
    if (activeAdvancedFilters.includes("TOP TRADES")) {
      list = list.filter(t => ((t as any).trades24h || 0) > 50);
    }

    return list;
  }, [filter, chain, mobulaTokensByFilter, selectedProtocols, sortBy, activeAdvancedFilters]);

  const featuredTokens = useMemo(() => {
    if (!mobulaTokensByFilter) return [];
    return mobulaTokensByFilter.featured || [];
  }, [mobulaTokensByFilter]);

  const showSkeleton = isLoading && tokensToDisplay.length === 0;

  const filterCounts = useMemo(() => {
    if (!mobulaTokensByFilter) return { trending: 0, new: 0, finalStretch: 0, graduated: 0, latest: 0, marketCap: 0 };
    
    return {
      trending: mobulaTokensByFilter.trending.length,
      new: mobulaTokensByFilter.new.length,
      finalStretch: mobulaTokensByFilter.finalStretch.length,
      graduated: mobulaTokensByFilter.graduated.length,
      latest: mobulaTokensByFilter.latest.length,
      marketCap: mobulaTokensByFilter.marketCap.length,
      watchlist: watchlist.length,
    };
  }, [mobulaTokensByFilter, watchlist]);

  const [isAuthorizing, setIsAuthorizing] = useState(true);

  // Access Control Guard
  useEffect(() => {
    // Don't run the check while session is still loading — avoids premature /access-denied
    if (authLoading || isLoggingIn || !isAuthenticated) return;

    const checkAccess = async () => {
      // If we have no user yet (e.g. Turnkey auth but sync still in flight), wait
      if (!user) {
        // Give the sync a moment — if it resolves we'll re-run via the dependency change
        return;
      }

      // If authenticated, check roles, NFT, or admin level
      if (user?.accessLevel === 'admin' || user?.accessLevel === 'holder') {
        setIsAuthorizing(false);
        return; // Access granted
      }

      const discordUser = user as any;
      const hasDiscordRole = discordUser?.roles?.some((r: string) => 
        ["1440085206785720413", "1386648661391441920"].includes(r)
      );

      if (hasDiscordRole) {
        setIsAuthorizing(false);
        return; // Access granted
      }

      // Check NFT as fallback
      if (user?.walletAddress) {
        const hasNft = await verifyNftOwnership(user.walletAddress);
        if (hasNft) {
          setIsAuthorizing(false);
          return; // Access granted
        }
      }

      // If we reach here, no access
      router.push("/access-denied");
    };

    checkAccess();
  }, [isAuthenticated, authLoading, isLoggingIn, user, router]);

  const getChainLogo = (c: "solana" | "bsc") => {
    // Current logos are missing in public, using null to trigger fallback icons
    return null;
  };

  const formatCurrency = formatCurrencyUtil;
  const formatNumber = formatNumberUtil;

  // Prevent Flash of Unauthenticated Content (FOUC)
  if (authLoading || isLoggingIn || !isAuthenticated || isAuthorizing) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

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

      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />

      {/* Overall Terminal Container - Full Fluid Width */}
      <div className="relative z-10 w-full px-2 sm:px-6 pt-20 sm:pt-24 pb-8">
        <div className="flex flex-col gap-4">
          {/* Chain & Metric Filters - Edge-to-Edge Alignment */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 mb-8 w-full">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              {/* Chain Filter */}
              <div className="flex items-center gap-2 p-1.5 rounded-[2rem] glass border border-white/10 shadow-xl bg-black/20 shrink-0">
                {[
                  { id: "all", label: "ALL", logo: null },
                  { id: "sol", label: "SOL", logo: "solana" },
                  { id: "bsc", label: "BSC", logo: "bsc" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChain(c.id as any)}
                    className={`cursor-pointer px-3 sm:px-6 py-2 sm:py-2.5 rounded-[1.5rem] text-[8px] sm:text-[9px] font-black tracking-[0.2em] transition-all flex items-center gap-1.5 sm:gap-2 ${
                      chain === c.id
                        ? "bg-primary text-black shadow-neon scale-105"
                        : "text-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {c.id === "sol" && <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-primary/20 rounded-full flex items-center justify-center text-[8px] font-bold">S</div>}
                    {c.id === "bsc" && <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-secondary/20 rounded-full flex items-center justify-center text-[8px] font-bold">B</div>}
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Metric Filter */}
              <div className="flex items-center gap-2 p-1.5 rounded-[2rem] glass border border-white/10 shadow-xl bg-black/20">
                {[
                  { id: "none", label: "ALL" },
                  { id: "marketCap", label: "MCAP" },
                  { id: "volume", label: "VOL" },
                  { id: "priceChange", label: "24H" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSortBy(m.id as any)}
                    className={`cursor-pointer px-3 sm:px-6 py-2 sm:py-2.5 rounded-[1.5rem] text-[8px] sm:text-[9px] font-black tracking-[0.2em] transition-all ${
                      sortBy === m.id
                        ? "bg-secondary text-white shadow-secondary-neon scale-105"
                        : "text-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 px-6 py-2 rounded-full glass border border-white/5 bg-primary/5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                Live Terminal Active
              </span>
            </div>
          </div>
        </div>

        {/* Top Featured Tokens Marquee */}
        <div className="mb-8 sm:mb-16 animate-fade-in mt-4 sm:mt-8">
          <div className="px-4 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-black italic tracking-tight">
              TOP FEATURED
            </h2>
          </div>
          {featuredTokens.length > 0 ? (
            <div className="glass rounded-3xl p-3 sm:p-4 border border-white/10 overflow-hidden">
              <TokenMarquee tokens={featuredTokens} speed="slow" />
            </div>
          ) : (
            <MarqueeSkeleton />
          )}
        </div>

        {/* Filter Tabs with Counts - Sticky below Navbar - Full Width Expansion */}
        <div className="mb-12 w-full sticky top-14 sm:top-16 bg-app/90 backdrop-blur-2xl z-40 py-2 -mx-2 sm:-mx-6 px-2 sm:px-6 border-y border-white/5 shadow-2xl overflow-hidden">
          <div className="w-full flex items-center justify-between gap-4 h-12">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x px-2 h-full">
              {[
                {
                  id: "trending",
                  label: "TRENDING",
                  count: filterCounts.trending ?? 0,
                  icon: TrendingUpIcon,
                  accent: "primary",
                },
                {
                  id: "new",
                  label: "NEW PAIRS",
                  count: filterCounts.new ?? 0,
                  icon: Sparkles,
                  accent: "secondary",
                },
                {
                  id: "finalStretch",
                  label: "FINAL STRETCH",
                  count: filterCounts.finalStretch ?? 0,
                  icon: Zap,
                  accent: "accent",
                },
                {
                  id: "graduated",
                  label: "GRADUATED",
                  count: filterCounts.graduated ?? 0,
                  icon: CheckCircle2,
                  accent: "primary",
                },
                {
                  id: "latest",
                  label: "LATEST",
                  count: filterCounts.latest ?? 0,
                  icon: Clock,
                  accent: "muted",
                },
                {
                  id: "marketCap",
                  label: "TOP MC",
                  count: filterCounts.marketCap ?? 0,
                  icon: BarChart3,
                  accent: "muted",
                },
                {
                  id: "watchlist",
                  label: "WATCHLIST",
                  count: filterCounts.watchlist ?? 0,
                  icon: Star,
                  accent: "primary",
                },
              ].map(({ id, label, count, icon: Icon, accent }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id as typeof filter)}
                  className={`group shrink-0 relative cursor-pointer px-3 sm:px-5 rounded-xl sm:rounded-2xl transition-all flex items-center gap-2 sm:gap-3 whitespace-nowrap overflow-hidden snap-start h-10 sm:h-11 ${
                    filter === id ? "text-white" : "text-muted hover:text-white"
                  }`}
                >
                  {filter === id && (
                    <div
                      className={`absolute inset-0 bg-${accent}/10 border border-${accent}/20 animate-fade-in`}
                    />
                  )}
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 ${filter === id ? `text-${accent}` : "opacity-50"}`}
                  />
                  <div className="flex flex-col items-start relative z-10">
                    <span className="text-[9px] sm:text-[10px] font-black tracking-[0.1em]">
                      {label}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold opacity-40 group-hover:opacity-60 transition-opacity">
                      {count.toLocaleString()} ITEMS
                    </span>
                  </div>
                  {filter === id && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${accent} shadow-neon`}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-center sm:self-auto py-1">
              <button
                onClick={() => setShowProtocolModal(true)}
                className={`p-3 glass rounded-2xl transition-all group relative h-11 flex items-center justify-center ${
                  selectedProtocols.length > 0 && selectedProtocols.length < 22 ? "border-primary/60 shadow-neon-sm" : "hover:border-primary/40"
                }`}
                title="Protocol Filters"
              >
                <Sliders className={`w-4 h-4 transition-colors ${
                  selectedProtocols.length > 0 && selectedProtocols.length < 22 ? "text-primary" : "text-muted group-hover:text-primary"
                }`} />
                {selectedProtocols.length > 0 && selectedProtocols.length < 22 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-black text-[8px] font-black rounded-full flex items-center justify-center border border-black shadow-lg">
                    {selectedProtocols.length}
                  </span>
                )}
              </button>
              <div className="h-8 w-px bg-white/5 mx-1" />
              <button
                className="p-3 glass rounded-2xl hover:border-white/20 transition-all opacity-50 hover:opacity-100 h-11 flex items-center justify-center"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>
        </div>

        {/* Icons and Display dropdown */}
        <div className="mb-8 flex items-center gap-4 justify-end px-4">
          <div className="flex items-center gap-2 glass p-1.5 rounded-2xl border-white/5">
            {[
              { icon: Bell, title: "Notifications" },
              { icon: Volume2, title: "Sound" },
              { icon: Calendar, title: "Calendar" },
            ].map((item, idx) => (
              <button
                key={idx}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all group"
                title={item.title}
              >
                <item.icon className="w-4 h-4 text-muted group-hover:text-white" />
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDisplaySettings(!showDisplaySettings)}
              className={`px-3 sm:px-6 py-2 sm:py-3 bg-panel border rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 ${
                showDisplaySettings
                  ? "border-primary text-primary bg-primary/5 shadow-neon"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-white"
              }`}
            >
              Terminal Settings
              <ChevronDownIcon
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform duration-300 ${showDisplaySettings ? "rotate-180" : ""}`}
              />
            </button>
            {showDisplaySettings && (
              <Suspense fallback={null}>
                <div className="absolute top-full right-0 mt-4 z-50 animate-fade-in">
                  <DisplaySettingsModal
                    onClose={() => setShowDisplaySettings(false)}
                    displaySettings={displaySettings}
                    setDisplaySettings={setDisplaySettings}
                  />
                </div>
              </Suspense>
            )}
          </div>
        </div>

        {/* Responsive Grid Layout */}
        <div className="pb-32">
          {showSkeleton ? (
            <div className="px-4">
              <TokenListSkeleton count={12} />
            </div>
          ) : tokensToDisplay.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 glass rounded-4xl border-white/5 mx-4">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                <Activity className="w-10 h-10 text-muted" />
              </div>
              <h3 className="text-xl font-black italic text-muted">
                NO SIGNALS DETECTED
              </h3>
              <p className="text-xs font-bold text-muted/50 uppercase tracking-widest mt-2">
                Adjust your filters or wait for new data
              </p>
            </div>
          ) : (
            <div className="w-full">
              {/* Full Width Token Grid - No Sidebars */}
              <main className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
                  {tokensToDisplay.map((token: TokenData) => (
                    <CompactTokenCard
                      key={token.id}
                      token={token}
                      formatCurrency={formatCurrency}
                      formatNumber={formatNumber}
                      displaySettings={displaySettings}
                      quickBuyAmount={quickBuyAmount}
                      onCompare={() => setComparingToken(token)}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel element */}
                {mobulaEnabled && (
                  <div ref={observerTarget} className="py-12 flex justify-center">
                    {isLoadingMore && (
                      <div className="flex items-center gap-3 text-muted">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Scanning blockchain...</span>
                      </div>
                    )}
                  </div>
                )}
              </main>
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
        <DialogContent className="sm:max-w-2xl bg-panel border border-white/10 rounded-4xl shadow-2xl p-0 overflow-hidden outline-none">
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black italic text-white flex items-center gap-3">
                <Sliders className="w-6 h-6 text-primary" />
                ADVANCED DISCOVERY FILTERS
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8">
              {/* Quick Filters Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black italic text-muted uppercase tracking-[0.2em]">Quick Metrics</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "MC < $100K", icon: TrendingDown },
                    { label: "MC > $1M", icon: TrendingUp },
                    { label: "HIGH VOL", icon: Activity },
                    { label: "TOP TRADES", icon: Users },
                  ].map((f) => {
                    const isActive = activeAdvancedFilters.includes(f.label);
                    return (
                      <button 
                        key={f.label} 
                        onClick={() => {
                          setActiveAdvancedFilters(prev => {
                            const next = prev.includes(f.label)
                              ? prev.filter(p => p !== f.label)
                              : [...prev, f.label];
                            if (typeof window !== "undefined") {
                              localStorage.setItem("cabalspy_adv_filters", JSON.stringify(next));
                            }
                            return next;
                          });
                        }}
                        className={`px-4 py-2.5 rounded-2xl border transition-all text-[10px] font-black italic flex items-center gap-2 group cursor-pointer ${
                          isActive 
                            ? "bg-primary/20 border-primary text-primary shadow-neon-sm" 
                            : "bg-white/5 border-white/5 hover:border-primary/30 hover:text-white"
                        }`}
                      >
                        <f.icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted group-hover:text-primary"}`} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Protocols Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black italic text-muted uppercase tracking-[0.2em]">Launchpads & Protocols</h4>
                  <button
                    onClick={() => {
                      const pList = ["pump","raydium","meteora","meteora-amm","meteora-amm-v2","orca","bonk","bags","moonshot","heaven","daos-fun","candle","sugar","believe","jupiter-studio","moonit","boop","launchlab","dynamic-bc","mayhem","pump-amm","wavebreak"];
                      setSelectedProtocols(selectedProtocols.length === pList.length ? [] : pList);
                    }}
                    className="text-[9px] font-black italic text-primary hover:text-primary/70 transition-colors cursor-pointer uppercase tracking-widest"
                  >
                    {selectedProtocols.length === 22 ? "Unselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "pump", label: "Pump", color: "bg-green-500" },
                    { id: "raydium", label: "Raydium", color: "bg-blue-500" },
                    { id: "meteora", label: "Meteora", color: "bg-purple-500" },
                    { id: "meteora-amm", label: "Meteora AMM", color: "bg-purple-400" },
                    { id: "meteora-amm-v2", label: "Meteora AMM V2", color: "bg-purple-300" },
                    { id: "orca", label: "Orca", color: "bg-cyan-500" },
                    { id: "bonk", label: "Bonk", color: "bg-orange-500" },
                    { id: "bags", label: "Bags", color: "bg-yellow-500" },
                    { id: "moonshot", label: "Moonshot", color: "bg-pink-500" },
                    { id: "heaven", label: "Heaven", color: "bg-indigo-500" },
                    { id: "daos-fun", label: "Daos.fun", color: "bg-teal-500" },
                    { id: "candle", label: "Candle", color: "bg-red-500" },
                    { id: "sugar", label: "Sugar", color: "bg-rose-500" },
                    { id: "believe", label: "Believe", color: "bg-emerald-500" },
                    { id: "jupiter-studio", label: "Jupiter Studio", color: "bg-violet-500" },
                    { id: "moonit", label: "Moonit", color: "bg-sky-500" },
                    { id: "boop", label: "Boop", color: "bg-lime-500" },
                    { id: "launchlab", label: "LaunchLab", color: "bg-amber-500" },
                    { id: "dynamic-bc", label: "Dynamic BC", color: "bg-fuchsia-500" },
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
                            isSelected ? prev.filter((p) => p !== protocol.id) : [...prev, protocol.id]
                          );
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black italic transition-all cursor-pointer border-2 flex items-center gap-2 ${
                          isSelected
                            ? "bg-primary/10 text-white border-primary"
                            : "bg-white/5 text-gray-500 border-transparent hover:border-white/10"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${protocol.color} ${isSelected ? "opacity-100 shadow-[0_0_8px_currentColor]" : "opacity-30"}`} />
                        <span>{protocol.label.toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between pt-6 border-t border-white/5">
              <button
                onClick={() => {
                   setSelectedProtocols([]);
                   setActiveAdvancedFilters([]);
                   if (typeof window !== "undefined") {
                     localStorage.removeItem("cabalspy_adv_filters");
                   }
                }}
                className="text-xs font-black italic text-muted hover:text-white transition-colors cursor-pointer uppercase tracking-widest"
              >
                Reset All
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowProtocolModal(false)}
                  className="px-6 py-3 bg-white/5 text-gray-400 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer font-black italic text-xs uppercase"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowProtocolModal(false);
                    refresh();
                  }}
                  className="px-10 py-3 bg-primary text-black rounded-2xl hover:bg-primary-light transition-all cursor-pointer font-black italic text-xs uppercase shadow-neon"
                >
                  Apply Filters
                </button>
              </div>
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

      {/* Token Comparison Overlay */}
      {comparingToken && (
        <TokenComparison
          tokenA={comparingToken}
          availableTokens={tokensToDisplay}
          onClose={() => setComparingToken(null)}
        />
      )}
    </div>
  );
}
