"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTokens } from "@/hooks/useTokens";
import { TokenData } from "@/types/token";
import AuthButton from "@/components/AuthButton";
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
} from "lucide-react";

// Lazy load TradingPanel
const TradingPanel = lazy(() => import("@/components/TradingPanel"));
const WalletSettingsModal = lazy(() =>
  import("./WalletSettingsModal").then((mod) => ({
    default: mod.WalletSettingsModal,
  }))
);

export default function PulsePage() {
  const { tokens, isLoading, error, refresh } = useTokens();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "marketCap" | "volume" | "transactions" | "time"
  >("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "trending" | "new" | "migrated">(
    "all"
  );
  const [chain, setChain] = useState<"all" | "sol" | "bsc">("all");
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = tokens;

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

    // Chain filter
    if (chain === "sol") {
      // Filter SOL tokens (for now, all tokens are SOL - can be enhanced with chain property)
      // filtered = filtered.filter((token) => token.chain === "sol");
    } else if (chain === "bsc") {
      // Filter BSC tokens (for now, empty - can be enhanced with chain property)
      // filtered = filtered.filter((token) => token.chain === "bsc");
      filtered = []; // Placeholder until chain property is added
    }
    // "all" shows all tokens

    // Category filter
    if (filter === "new") {
      // Filter tokens created less than 5 minutes ago
      filtered = filtered.filter((token) => {
        const timeSeconds = parseTimeToSeconds(token.time);
        return timeSeconds < 300; // Less than 5 minutes
      });
    } else if (filter === "migrated") {
      // Filter tokens with high market cap (likely migrated to DEX)
      filtered = filtered.filter((token) => token.marketCap > 50000);
    } else if (filter === "trending") {
      // Filter tokens with high volume (trending)
      filtered = filtered.filter(
        (token) => token.volume > 1000 || token.transactions > 100
      );
    }

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
  }, [tokens, searchQuery, sortBy, sortOrder, filter]);

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

  return (
    <div className="min-h-screen bg-app text-white">
      {/* Header */}
      <header className="border-b border-panel bg-panel/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-xl font-bold"
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
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
                <Link href="/pulse" className="text-sm text-white font-medium">
                  Pulse
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Profile
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refresh()}
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
              <Link
                href="/profile"
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors"
                title="Profile"
              >
                <User className="w-4 h-4" />
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              {/* <h1 className="text-3xl font-bold mb-2">Pulse</h1> */}
              <p className="text-gray-400">
                Real-time token tracking and analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Wallet Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowWalletSettings(!showWalletSettings)}
                  className="p-2 hover:bg-panel-elev rounded-lg transition-colors flex items-center gap-1"
                  title="Wallet Settings"
                >
                  <Menu className="w-4 h-4" />
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
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary-dark text-white"
                    : "bg-panel text-gray-400 hover:bg-panel-elev"
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-primary-dark text-white"
                    : "bg-panel text-gray-400 hover:bg-panel-elev"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chain Filter Tabs */}
          <div className="mb-4 flex gap-2">
            {[
              { id: "all", label: "ALL", icon: null },
              { id: "sol", label: "SOL", icon: "sol" },
              { id: "bsc", label: "BSC", icon: "bsc" },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setChain(id as typeof chain)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  chain === id
                    ? "bg-primary-dark text-white"
                    : "bg-panel text-gray-400 hover:bg-panel-elev border border-gray-800/50"
                }`}
              >
                {icon === "sol" && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                    S
                  </div>
                )}
                {icon === "bsc" && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold">
                    B
                  </div>
                )}
                {label}
              </button>
            ))}
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by token name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-panel border border-gray-800/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary-border)] text-white placeholder-gray-500 transition-colors"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-2">
              {[
                { id: "all", label: "All", icon: Grid3x3 },
                { id: "trending", label: "Trending", icon: Flame },
                { id: "new", label: "New", icon: Sparkles },
                { id: "migrated", label: "Migrated", icon: ArrowUpRight },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id as typeof filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filter === id
                      ? "bg-primary-dark text-white"
                      : "bg-panel text-gray-400 hover:bg-panel-elev"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="text-gray-400">
              Showing{" "}
              <span className="text-white font-medium">
                {filteredAndSortedTokens.length}
              </span>{" "}
              tokens
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Loading...
              </div>
            )}
            {error && <div className="text-red-400">Error: {error}</div>}
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 justify-items-center sm:justify-items-stretch">
            {filteredAndSortedTokens.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                {isLoading ? "Loading tokens..." : "No tokens found"}
              </div>
            ) : (
              filteredAndSortedTokens.map((token) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  formatCurrency={formatCurrency}
                  formatNumber={formatNumber}
                />
              ))
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredAndSortedTokens.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {isLoading ? "Loading tokens..." : "No tokens found"}
              </div>
            ) : (
              filteredAndSortedTokens.map((token) => (
                <TokenListCard
                  key={token.id}
                  token={token}
                  formatCurrency={formatCurrency}
                  formatNumber={formatNumber}
                />
              ))
            )}
          </div>
        )}
      </div>
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
                  <Info className="w-3 h-3 text-[var(--primary-text)]/70 hover:text-[var(--primary-text)] cursor-help transition-colors" />
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
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
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
          className="w-full py-2 bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary-darker)] hover:from-[var(--primary-darker)] hover:to-[var(--primary-darker)] text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-[var(--primary)]/20"
        >
          <Zap className="w-3 h-3" />
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

function TokenListCard({
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

  const percentageChange =
    token.percentages.reduce((sum, p) => sum + p, 0) /
      token.percentages.length || 0;
  const isPositive = percentageChange >= 0;
  const buyCount = Math.floor(token.transactions * 0.55);
  const sellCount = token.transactions - buyCount;

  return (
    <>
      <div className="bg-panel border border-gray-800/50 rounded-lg p-3 hover:border-[var(--primary-border)] transition-all w-full">
        <div className="flex items-center gap-3">
          {/* Token Icon */}
          <div className="flex-shrink-0 relative group/token">
            {token.image && !imageError ? (
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-800/50">
                <Image
                  src={token.image}
                  alt={token.symbol}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/30 via-purple-500/20 to-green-500/30 flex items-center justify-center ring-2 ring-gray-800/50 text-xl shadow-lg shadow-[var(--primary)]/10">
                {token.icon}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover/token:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/token:opacity-100 rounded-full">
              <ExternalLink className="w-3 h-3 text-[var(--primary-text)]" />
            </div>
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{token.name}</h3>
              <span className="text-xs text-gray-400">{token.symbol}</span>
              <span className="text-xs text-[var(--primary-text)]">
                @{token.symbol.toLowerCase()}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {token.time}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                MC: {formatCurrency(token.marketCap)}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                V: {formatCurrency(token.volume)}
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                TX: {formatNumber(token.transactions)}
              </span>
              <span className="text-green-400">{buyCount}</span>
              <span className="text-gray-600">/</span>
              <span className="text-red-400">{sellCount}</span>
            </div>
          </div>

          {/* Percentage Change */}
          <div
            className={`text-right ${isPositive ? "text-green-400" : "text-red-400"}`}
          >
            <div className="flex items-center gap-1 justify-end">
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="font-bold">
                {Math.abs(percentageChange).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Buy Button */}
          <button
            onClick={() => setShowTradingPanel(true)}
            className="px-4 py-2 bg-primary-dark hover:bg-primary-darker text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Buy
          </button>
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
