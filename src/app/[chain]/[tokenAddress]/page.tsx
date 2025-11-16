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
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/format";
import { TokenData } from "@/types/token";

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
      price?: number;
      priceUsd?: number;
      marketCap?: number;
      volume?: number;
      isMigrated: boolean;
      raydiumPool?: string;
      socials?: {
        website?: string;
        twitter?: string;
        telegram?: string;
      };
    };
    dexscreener?: {
      logo?: string;
      priceUsd?: number;
      priceChange24h?: number;
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

  useEffect(() => {
    if (!chain || !tokenAddress) return;

    const fetchTokenData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tokens/${chain}/${tokenAddress}`);
        if (!response.ok) {
          throw new Error("Failed to fetch token data");
        }
        const data = await response.json();
        setTokenData(data);
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
          <p className="text-gray-400 mb-6">{error || "Unable to load token data"}</p>
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

  const baseToken = tokenData.data.base;
  const pumpfunData = tokenData.data.pumpfun;
  const dexscreenerData = tokenData.data.dexscreener;

  // Merge data from all sources
  const tokenName = pumpfunData?.name || baseToken?.name || "Unknown Token";
  const tokenSymbol = pumpfunData?.symbol || baseToken?.symbol || "UNKNOWN";
  const tokenImage =
    dexscreenerData?.logo ||
    pumpfunData?.logo ||
    baseToken?.image ||
    baseToken?.icon;
  const price =
    dexscreenerData?.priceUsd ||
    pumpfunData?.priceUsd ||
    pumpfunData?.price ||
    baseToken?.price ||
    0;
  const marketCap =
    pumpfunData?.marketCap ||
    baseToken?.marketCap ||
    dexscreenerData?.fdv ||
    0;
  const volume =
    dexscreenerData?.volume24h ||
    pumpfunData?.volume ||
    baseToken?.volume ||
    0;
  const liquidity = dexscreenerData?.liquidity || 0;
  const priceChange24h = dexscreenerData?.priceChange24h || 0;
  const isMigrated = pumpfunData?.isMigrated || false;
  const bondingCurveProgress = baseToken?.activity?.Q || 0;

  return (
    <div className="min-h-screen bg-app text-white">
      {/* Header */}
      <header className="bg-panel border-b border-gray-800/50 px-4 py-3 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-panel-elev rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="CabalSpy Logo" className="h-7 w-7" />
              <h1 className="text-xl font-bold">CabalSpy</h1>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-panel-elev rounded-lg transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-panel-elev rounded-lg transition-colors">
              <Star className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Token Overview Card */}
        <div className="bg-panel border border-gray-800/50 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Left: Token Info */}
            <div className="flex items-start gap-4 flex-1">
              {tokenImage ? (
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={tokenImage}
                    alt={tokenSymbol}
                    fill
                    className="object-cover"
                    unoptimized
                  />
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
                      ${formatCurrency(price)}
                    </span>
                    {priceChange24h !== 0 && (
                      <span
                        className={`text-sm flex items-center gap-1 ${
                          priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {priceChange24h >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {Math.abs(priceChange24h).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {baseToken?.time || "Unknown"}
                    </span>
                  </div>
                </div>
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
                </div>
              </div>
            </div>

            {/* Right: Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:min-w-[400px]">
              <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                <div className="text-lg font-bold">
                  ${formatCurrency(marketCap)}
                </div>
              </div>
              <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                <div className="text-xs text-gray-400 mb-1">Liquidity</div>
                <div className="text-lg font-bold">
                  ${formatCurrency(liquidity)}
                </div>
              </div>
              <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                <div className="text-xs text-gray-400 mb-1">24h Volume</div>
                <div className="text-lg font-bold">${formatCurrency(volume)}</div>
              </div>
              <div className="bg-panel-elev rounded-lg p-3 border border-gray-800/50">
                <div className="text-xs text-gray-400 mb-1">B.Curve</div>
                <div className="text-lg font-bold">
                  {bondingCurveProgress.toFixed(2)}%
                </div>
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
                  {baseToken?.activity?.holders || 0}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Transactions</div>
                <div className="text-sm font-semibold">
                  {formatNumber(baseToken?.transactions || 0)}
                </div>
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
        </div>

        {/* Chart and Trading Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Area - 2/3 width on desktop */}
          <div className="lg:col-span-2 bg-panel border border-gray-800/50 rounded-xl p-4 md:p-6">
            <div className="h-[400px] md:h-[500px] flex items-center justify-center bg-panel-elev rounded-lg border border-gray-800/50">
              <div className="text-center text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chart integration coming soon</p>
                <p className="text-xs mt-1">
                  Consider using TradingView, Chart.js, or Recharts
                </p>
              </div>
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

        {/* Tabs and Content */}
        <div className="bg-panel border border-gray-800/50 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-800/50">
            {[
              { id: "trades", label: "Trades" },
              { id: "holders", label: `Holders (${baseToken?.activity?.holders || 0})` },
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
              <div className="text-center text-gray-400 py-12">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Transaction history coming soon</p>
              </div>
            )}

            {activeTab === "holders" && (
              <div className="text-center text-gray-400 py-12">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Holders list coming soon</p>
              </div>
            )}

            {activeTab === "info" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Token Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">Top 10 H.</div>
                      <div className="text-lg font-bold">21.85%</div>
                    </div>
                    <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">Dev H.</div>
                      <div className="text-lg font-bold">2%</div>
                    </div>
                    <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">Snipers H.</div>
                      <div className="text-lg font-bold">2.71%</div>
                    </div>
                    <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">Insiders</div>
                      <div className="text-lg font-bold">3.66%</div>
                    </div>
                    <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">Bundlers</div>
                      <div className="text-lg font-bold">37.63%</div>
                    </div>
                    <div className="bg-panel-elev rounded-lg p-4 border border-gray-800/50">
                      <div className="text-xs text-gray-400 mb-1">LP Burned</div>
                      <div className="text-lg font-bold text-green-400">100%</div>
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
                          href={pumpfunData.socials.twitter}
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
                          href={pumpfunData.socials.website}
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
                          href={dexscreenerData.dexUrl}
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

