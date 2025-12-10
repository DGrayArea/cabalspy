"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  RefreshCw,
  Copy,
  CheckCircle2,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { formatCurrency, formatNumber } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";
import AuthButton from "@/components/AuthButton";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-app text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="max-w-md mx-auto text-center px-4">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
            <p className="text-gray-400 mb-6">Sign in to view your portfolio</p>
            <div className="flex justify-center">
              <AuthButton />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-white relative">
      <Navbar
        showWalletSettings={true}
        onWalletSettingsClick={() => setShowWalletSettings(!showWalletSettings)}
      />

      {/* Centered Loading Spinner Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-app/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="w-12 h-12 text-primary" />
            <p className="text-gray-400 text-sm">Refreshing portfolio...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-panel-elev rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Portfolio</h1>
              {walletAddress && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-400 font-mono">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:bg-panel-elev rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={refreshPortfolio}
            disabled={isLoading}
            className="p-2 hover:bg-panel-elev rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh portfolio"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">Error: {error.message}</p>
          </div>
        )}

        {/* Top summary card (portfolio header) */}
        <div className="bg-gradient-to-br from-panel via-panel to-panel-elev border border-gray-800/60 rounded-2xl p-6 md:p-8 mb-6 shadow-lg">
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-400 mb-1">
              Total Portfolio Value
            </div>
            {isLoading ? (
              <Skeleton className="h-12 md:h-16 w-48 bg-gray-700/50" />
            ) : (
              <div className="text-4xl md:text-5xl font-bold">
                {formatCurrency(totalValueUsd)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6 pt-4 border-t border-gray-800/50">
            <div>
              <div className="text-xs text-gray-400 mb-1">SOL Balance</div>
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-24 mb-1 bg-gray-700/50" />
                  <Skeleton className="h-4 w-20 bg-gray-700/50" />
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold">
                    {formatNumber(solBalance)} SOL
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(solBalanceUsd)}
                  </div>
                </>
              )}
            </div>
            {walletAddress && (
              <div className="hidden md:block">
                <div className="text-xs text-gray-400 mb-1">Wallet</div>
                <div className="text-sm font-mono text-gray-300">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deposit and Withdraw Buttons */}
        <div className="flex gap-3 mb-6 justify-center">
          <button
            onClick={() => setShowDepositModal(true)}
            className="max-w-xs flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <ArrowDownToLine className="w-5 h-5" />
            Deposit
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="max-w-xs flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <ArrowUpFromLine className="w-5 h-5" />
            Withdraw
          </button>
        </div>

        {/* Tabs: Assets / History */}
        <div className="mb-4 border-b border-gray-800/60">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("assets")}
              className={`pb-2 text-sm font-medium border-b-2 ${
                activeTab === "assets"
                  ? "border-primary text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Assets
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-2 text-sm font-medium border-b-2 ${
                activeTab === "history"
                  ? "border-primary text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              History
            </button>
          </div>
        </div>

        {activeTab === "assets" && (
          <>
            {/* Filters for assets */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Filter by token or mint..."
                  className="w-full md:max-w-sm px-3 py-2 bg-panel-elev border border-gray-800/60 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSmall}
                  onChange={(e) => setHideSmall(e.target.checked)}
                  className="rounded border-gray-700 bg-panel-elev text-primary focus:ring-primary"
                />
                Hide small balances (&lt; $1)
              </label>
            </div>

            {/* SOL Balance Card */}
            <div className="bg-panel border border-primary/20 rounded-xl p-4 mb-4">
              {isLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full bg-gray-700/50" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-2 bg-gray-700/50" />
                      <Skeleton className="h-3 w-16 bg-gray-700/50" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-24 mb-2 bg-gray-700/50" />
                    <Skeleton className="h-3 w-20 bg-gray-700/50" />
                  </div>
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
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback = target.parentElement?.querySelector(
                            ".sol-fallback"
                          ) as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div className="sol-fallback w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm absolute inset-0 hidden">
                        SOL
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Solana</div>
                      <div className="text-xs text-gray-400">Native token</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">
                      {formatNumber(solBalance)} SOL
                    </div>
                    <div className="text-gray-400">
                      {formatCurrency(solBalanceUsd)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Token Balances Table-style list */}
            <div className="bg-panel border border-gray-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">
                  Tokens (
                  {
                    tokenBalances.filter((t) => {
                      const hasPrice =
                        t.priceUsd !== undefined && t.priceUsd > 0;
                      const hasValue =
                        t.valueUsd !== undefined && t.valueUsd > 0;
                      return hasPrice && hasValue;
                    }).length
                  }
                  )
                </h2>
              </div>

              {/* Table header */}
              <div className="flex items-center justify-between text-[11px] md:text-xs text-gray-500 pb-2 border-b border-gray-800/30">
                <div className="flex-1 min-w-0 text-left">Asset</div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-20 md:w-28 text-left">Price</div>
                  <div className="w-24 md:w-28 text-left">Balance</div>
                  <div className="w-24 md:w-32 pr-6 text-left">Value</div>
                  <div className="w-4 hidden md:block"></div>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3 py-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="w-8 h-8 rounded-full bg-gray-700/50" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2 bg-gray-700/50" />
                          <Skeleton className="h-3 w-24 bg-gray-700/50" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-20 bg-gray-700/50" />
                        <Skeleton className="h-4 w-24 bg-gray-700/50" />
                        <Skeleton className="h-4 w-28 bg-gray-700/50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tokenBalances.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No SPL tokens found
                </div>
              ) : (
                <div className="space-y-1">
                  {tokenBalances
                    .filter((token) => {
                      // Only show tokens with a valid price and value
                      const hasPrice =
                        token.priceUsd !== undefined && token.priceUsd > 0;
                      const hasValue =
                        token.valueUsd !== undefined && token.valueUsd > 0;
                      if (!hasPrice || !hasValue) return false;

                      // Apply search filter
                      if (!assetSearch.trim()) return true;
                      const q = assetSearch.toLowerCase();
                      return (
                        token.symbol?.toLowerCase().includes(q) ||
                        token.name?.toLowerCase().includes(q) ||
                        token.mint.toLowerCase().includes(q)
                      );
                    })
                    .filter((token) =>
                      hideSmall ? (token.valueUsd ?? 0) >= 1 : true
                    )
                    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
                    .map((token) => (
                      <Link
                        key={token.mint}
                        href={`/sol/${token.mint}`}
                        className="block rounded-lg hover:bg-panel-elev/70 py-2 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative w-8 h-8 flex-shrink-0">
                              {token.logoUrl ? (
                                <img
                                  src={token.logoUrl}
                                  alt={token.symbol || token.name || "Token"}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback =
                                      target.parentElement?.querySelector(
                                        ".token-fallback"
                                      ) as HTMLElement;
                                    if (fallback)
                                      fallback.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`token-fallback w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center font-bold text-[10px] ${
                                  token.logoUrl ? "absolute inset-0 hidden" : ""
                                }`}
                              >
                                {token.symbol?.slice(0, 3).toUpperCase() ||
                                  "TOK"}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">
                                {token.name || token.symbol || "Unknown Token"}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {token.symbol || token.mint.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0 text-xs md:text-sm">
                            {/* Price column */}
                            <div className="w-20 md:w-28 text-left">
                              {token.priceUsd !== undefined &&
                              token.priceUsd > 0
                                ? formatCurrency(token.priceUsd)
                                : "--"}
                            </div>
                            {/* Balance column */}
                            <div className="w-24 md:w-28 text-left">
                              {formatNumber(token.amount)}
                            </div>
                            {/* Value column */}
                            <div className="w-24 md:w-32 font-semibold pr-6 text-left">
                              {token.valueUsd !== undefined
                                ? formatCurrency(token.valueUsd)
                                : "-"}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 hidden md:inline-block" />
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Performance placeholder (for future chart) */}
            <div className="bg-panel border border-gray-800/60 rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">
                  Performance
                </h2>
                <span className="text-xs text-gray-500">Coming soon</span>
              </div>
              <div className="h-32 md:h-40 rounded-lg border border-dashed border-gray-700/70 flex items-center justify-center text-xs text-gray-500">
                PnL chart for your Solana wallet will be displayed here.
              </div>
            </div>

            {/* Right: History list placeholder */}
            <div className="bg-panel border border-gray-800/60 rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">History</h2>
                <span className="text-xs text-gray-500">
                  Solana only · transfers & swaps
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Example:</span>
                  <span>Real data coming from Helius soon</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-panel-elev/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <ArrowDownLeft className="w-3 h-3" />
                      </span>
                      <div>
                        <div className="text-xs font-medium text-gray-200">
                          Receive · 1.2 SOL
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Today · From some-wallet...123
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-emerald-400">
                      +$180.24
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-panel-elev/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                      <div>
                        <div className="text-xs font-medium text-gray-200">
                          Send · 0.5 SOL
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Yesterday · To pump_fun_token...xyz
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-red-400">
                      -$75.10
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500">
                    Once wired up, this section will list live Solana
                    transactions from your Helius-powered history, with filters
                    for date, type, and token.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showDepositModal && (
          <DepositModal onClose={() => setShowDepositModal(false)} />
        )}
        {showWithdrawModal && (
          <WithdrawModal onClose={() => setShowWithdrawModal(false)} />
        )}
      </div>
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
