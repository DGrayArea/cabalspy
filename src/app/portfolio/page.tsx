"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  RefreshCw,
  Copy,
  CheckCircle2,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  BarChart3,
  Search,
} from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { formatCurrency, formatNumber } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";
import AuthButton from "@/components/AuthButton";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PnLCalendar } from "@/components/PnLCalendar";
import { lazy, Suspense } from "react";

const WalletSettingsModal = lazy(() =>
  import("@/services/WalletSettingsModal").then((mod) => ({
    default: mod.WalletSettingsModal,
  }))
);

export default function PortfolioPage() {
  const { user, turnkeyUser } = useAuth();
  const isAuthenticated = user || turnkeyUser;
  const { address: walletAddress } = useTurnkeySolana();
  const {
    solBalance,
    solBalanceUsd,
    tokenBalances,
    totalValueUsd,
    totalPnL24hUsd,
    totalPnL24hPercent,
    isLoading,
    error,
    refreshPortfolio,
  } = usePortfolio();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"assets" | "history">("assets");
  const [assetSearch, setAssetSearch] = useState("");
  const [hideSmall, setHideSmall] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showWalletSettings, setShowWalletSettings] = useState(false);

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Not authenticated ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-app text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="max-w-sm mx-auto text-center px-4">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-panel border border-gray-800/60 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Portfolio</h1>
            <p className="text-gray-400 text-sm mb-6">
              Sign in to view your holdings and track your performance
            </p>
            <div className="flex justify-center">
              <AuthButton />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Filtered token list ──────────────────────────────────────────────────────
  const filteredTokens = tokenBalances
    .filter((t) => {
      const hasPrice = t.priceUsd !== undefined && t.priceUsd > 0;
      const hasValue = t.valueUsd !== undefined && t.valueUsd > 0;
      if (!hasPrice || !hasValue) return false;
      if (hideSmall && (t.valueUsd ?? 0) < 1) return false;
      if (!assetSearch.trim()) return true;
      const q = assetSearch.toLowerCase();
      return (
        t.symbol?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.mint.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

  return (
    <div className="min-h-screen bg-app text-white pb-16">
      <Navbar
        showWalletSettings={true}
        onWalletSettingsClick={() => setShowWalletSettings(!showWalletSettings)}
      />

      <div className="w-full max-w-5xl mx-auto px-4 pt-20 sm:pt-24 pb-20">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Portfolio</h1>
            {walletAddress && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                </span>
                <button
                  onClick={copyAddress}
                  className="p-0.5 hover:bg-panel-elev rounded transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={refreshPortfolio}
            disabled={isLoading}
            className="p-2 hover:bg-panel-elev rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-sm text-red-400">
            {error.message}
          </div>
        )}

        {/* ── Summary card ────────────────────────────────────────────────── */}
        <div className="glass border border-white/10 rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden bg-linear-to-br from-white/[0.03] to-transparent shadow-2xl">
          {/* Subtle glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
              Total Portfolio Value
            </div>
            {isLoading ? (
              <div className="h-12 w-44 bg-gray-800 rounded-xl animate-pulse mb-4" />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 mb-4">
                <div className="text-4xl sm:text-6xl font-black italic tracking-tighter text-white drop-shadow-neon">
                  {formatCurrency(totalValueUsd)}
                </div>
                {!isLoading && (
                  <div className={`text-lg sm:text-xl font-black italic mt-1 sm:mt-0 ${
                    totalPnL24hUsd >= 0 ? "text-primary shadow-neon-sm" : "text-red-500"
                  }`}>
                    {totalPnL24hUsd >= 0 ? "+" : ""}{formatCurrency(totalPnL24hUsd)} 
                    <span className="ml-2 opacity-80">
                      ({totalPnL24hUsd >= 0 ? "+" : ""}{totalPnL24hPercent.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-6 pt-4 border-t border-gray-800/50">
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">SOL Balance</div>
                {isLoading ? (
                  <div className="h-5 w-24 bg-gray-800 rounded animate-pulse" />
                ) : (
                  <div className="text-sm font-semibold">
                    {formatNumber(solBalance)}{" "}
                    <span className="text-gray-400 font-normal">SOL</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {formatCurrency(solBalanceUsd)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Tokens</div>
                {isLoading ? (
                  <div className="h-5 w-8 bg-gray-800 rounded animate-pulse" />
                ) : (
                  <div className="text-sm font-semibold">{filteredTokens.length}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black italic text-sm sm:text-lg bg-primary/10 border-2 border-primary text-primary hover:bg-primary/20 hover:shadow-neon transition-all cursor-pointer active:scale-95"
          >
            <ArrowDownToLine className="w-5 h-5 sm:w-6 sm:h-6" />
            DEPOSIT
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black italic text-sm sm:text-lg bg-accent/10 border-2 border-accent text-accent hover:bg-accent/20 hover:shadow-accent-neon transition-all cursor-pointer active:scale-95"
          >
            <ArrowUpFromLine className="w-5 h-5 sm:w-6 sm:h-6" />
            WITHDRAW
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-white/10 mb-8 bg-black/20 rounded-t-2xl overflow-hidden">
          {(["assets", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-10 py-4 text-[11px] sm:text-xs font-black tracking-[0.2em] transition-all cursor-pointer uppercase relative ${
                activeTab === tab
                  ? "text-primary bg-white/5"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="relative z-10">{tab}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-neon" />
              )}
            </button>
          ))}
        </div>

        {/* ── Assets tab ──────────────────────────────────────────────────── */}
        {activeTab === "assets" && (
          <>
            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Filter by token or mint..."
                  className="w-full pl-9 pr-3 py-2.5 bg-panel border border-gray-800/60 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-400 cursor-pointer whitespace-nowrap group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={hideSmall}
                    onChange={(e) => setHideSmall(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                      hideSmall
                        ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        : "bg-black/40 border-white/20 group-hover:border-white/40"
                    }`}
                  >
                    {hideSmall && (
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="group-hover:text-white transition-colors tracking-widest font-bold uppercase text-[10px]">Hide &lt; $1</span>
              </label>
            </div>

            {/* SOL row */}
            <div className="bg-panel border border-primary/20 rounded-xl p-4 mb-3">
              {isLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse" />
                    <div>
                      <div className="h-4 w-20 bg-gray-800 rounded animate-pulse mb-1.5" />
                      <div className="h-3 w-14 bg-gray-800 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 flex-shrink-0">
                      <img
                        src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                        alt="SOL"
                        className="w-9 h-9 rounded-full object-cover"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = "none";
                          const fb = t.parentElement?.querySelector(".sol-fb") as HTMLElement;
                          if (fb) fb.style.display = "flex";
                        }}
                      />
                      <div className="sol-fb w-9 h-9 rounded-full bg-linear-to-br from-purple-500 to-blue-500 items-center justify-center font-bold text-xs absolute inset-0 hidden">
                        SOL
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Solana</div>
                      <div className="text-xs text-gray-500">Native token</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{formatNumber(solBalance)} SOL</div>
                    <div className="text-xs text-gray-500">{formatCurrency(solBalanceUsd)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Token list */}
            <div className="bg-panel border border-gray-800/60 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-4 py-2.5 border-b border-gray-800/40">
                <div className="flex-1">Asset</div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-20 sm:w-24 text-right">Price</div>
                  <div className="w-20 sm:w-24 text-right">Balance</div>
                  <div className="w-20 sm:w-28 text-right">Value</div>
                </div>
              </div>

              {isLoading ? (
                <div className="divide-y divide-gray-800/30">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
                        <div>
                          <div className="h-3.5 w-24 bg-gray-800 rounded animate-pulse mb-1.5" />
                          <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-3.5 w-16 bg-gray-800 rounded animate-pulse" />
                        <div className="h-3.5 w-16 bg-gray-800 rounded animate-pulse" />
                        <div className="h-3.5 w-20 bg-gray-800 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                  <BarChart3 className="w-8 h-8 text-gray-700" />
                  <p className="text-sm">No tokens found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/30">
                  {filteredTokens.map((token) => {
                    const tokenParams = new URLSearchParams({
                      name: token.name || token.symbol || "",
                      symbol: token.symbol || "",
                      logo: token.logoUrl || "",
                      decimals: token.decimals?.toString() || "6",
                    });
                    return (
                      <Link
                        key={token.mint}
                        href={`/sol/${token.mint}?${tokenParams.toString()}`}
                        className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-panel-elev/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative w-8 h-8 flex-shrink-0">
                            {token.logoUrl ? (
                              <img
                                src={token.logoUrl}
                                alt={token.symbol || "Token"}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  const t = e.target as HTMLImageElement;
                                  t.style.display = "none";
                                  const fb = t.parentElement?.querySelector(".tok-fb") as HTMLElement;
                                  if (fb) fb.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`tok-fb w-8 h-8 rounded-full bg-linear-to-br from-purple-500/20 to-blue-500/20 items-center justify-center font-bold text-[10px] ${
                                token.logoUrl ? "absolute inset-0 hidden" : "flex"
                              }`}
                            >
                              {token.symbol?.slice(0, 3).toUpperCase() || "TOK"}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {token.name || token.symbol || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {token.symbol || token.mint.slice(0, 8) + "..."}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 text-xs sm:text-sm">
                          <div className="w-20 sm:w-24 text-right text-gray-300">
                            {token.priceUsd !== undefined
                              ? formatCurrency(token.priceUsd)
                              : <span className="text-gray-600">--</span>}
                          </div>
                          <div className="w-20 sm:w-24 text-right text-gray-400">
                            {formatNumber(token.amount)}
                          </div>
                          <div className="w-20 sm:w-28 text-right font-semibold">
                            {token.valueUsd !== undefined
                              ? formatCurrency(token.valueUsd)
                              : "--"}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── History tab ─────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-8 animate-fade-in">
            {/* Real Performance Section */}
            <PnLCalendar />

            {/* History Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-panel border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Total Wins</span>
                <span className="text-xl font-black text-primary italic">19 ORDERS</span>
              </div>
              <div className="bg-panel border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Total Losses</span>
                <span className="text-xl font-black text-accent italic">12 ORDERS</span>
              </div>
              <div className="bg-panel border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Win Rate</span>
                <span className="text-xl font-black text-white italic">61.2%</span>
              </div>
            </div>

            {/* History placeholder */}
            <div className="bg-panel border border-gray-800/60 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Transaction History</h2>
                <span className="text-xs text-gray-500">Solana · swaps & transfers</span>
              </div>
              <div className="space-y-2">
                {[
                  {
                    icon: ArrowDownLeft,
                    color: "emerald",
                    label: "Receive · 1.2 SOL",
                    sub: "Today · From some-wallet...123",
                    value: "+$180.24",
                    positive: true,
                  },
                  {
                    icon: ArrowUpRight,
                    color: "red",
                    label: "Send · 0.5 SOL",
                    sub: "Yesterday · To pump_fun_token...xyz",
                    value: "-$75.10",
                    positive: false,
                  },
                ].map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-panel-elev/40 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center bg-${tx.color}-500/15 text-${tx.color}-400`}
                      >
                        <tx.icon className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-medium text-gray-200">{tx.label}</div>
                        <div className="text-[11px] text-gray-500">{tx.sub}</div>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        tx.positive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {tx.value}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-gray-600 pt-1 text-center">
                  Live Helius transaction history coming soon
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Modals */}
      {showDepositModal && (
        <DepositModal onClose={() => setShowDepositModal(false)} />
      )}
      {showWithdrawModal && (
        <WithdrawModal onClose={() => setShowWithdrawModal(false)} />
      )}
      {showWalletSettings && isAuthenticated && (
        <Suspense fallback={null}>
          <WalletSettingsModal
            slippage="0.5"
            setSlippage={() => {}}
            quickBuyAmount="0.1"
            setQuickBuyAmount={() => {}}
            onClose={() => setShowWalletSettings(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
