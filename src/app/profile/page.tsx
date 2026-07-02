"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import WalletManager from "@/components/WalletManager";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Calendar,
  Wallet,
  TrendingUp,
  Activity,
  Star,
  Settings,
  ArrowLeft,
  BarChart3,
  DollarSign,
  Clock,
  Shield,
  ExternalLink,
  Zap,
  Lock,
  MessageSquare,
  Send,
  Link as LinkIcon,
} from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { TradeHistoryList } from "@/components/TradeHistoryList";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { TelegramLoginWidget } from "@/components/TelegramLoginWidget";

interface PerformanceMetrics {
  totalPnLUsd: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  bestTrade: { symbol: string; roi: number };
  worstTrade: { symbol: string; roi: number };
}

export default function ProfilePage() {
  const { user, turnkeyUser, turnkeySession, isLoading, refreshSession } = useAuth();
  const { wallets: turnkeyWallets } = useTurnkey();
  const router = useRouter();
  const { totalValueUsd } = usePortfolio();
  const { address: walletAddress } = useTurnkeySolana();
  const { allTrades, stats: tradeStats } = useTradeHistory({ walletAddress: walletAddress ?? undefined });
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [linkTelegramError, setLinkTelegramError] = useState<string | null>(null);
  const [isUnlinkingTelegram, setIsUnlinkingTelegram] = useState(false);
  const [isConnectingDiscord, setIsConnectingDiscord] = useState(false);
  const isAuthenticated = user || turnkeyUser || turnkeySession;

  const handleConnectDiscord = async () => {
    try {
      setIsConnectingDiscord(true);
      const res = await fetch("/api/auth/discord/init");
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
        return; // navigating away — keep the button disabled
      }
      setIsConnectingDiscord(false);
    } catch {
      setIsConnectingDiscord(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      setIsUnlinkingTelegram(true);
      setLinkTelegramError(null);
      const res = await fetch("/api/auth/link/telegram", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setLinkTelegramError(data.error || "Failed to unlink Telegram");
        return;
      }
      await refreshSession();
    } catch {
      setLinkTelegramError("Network error while unlinking Telegram");
    } finally {
      setIsUnlinkingTelegram(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/analytics/performance")
        .then(res => res.json())
        .then(data => {
          if (!data.error) setMetrics(data);
        })
        .catch(err => console.error("Failed to fetch performance metrics", err))
        .finally(() => setMetricsLoading(false));
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
          <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-lg border border-white/10 shadow-neon">
          <div className="relative mb-8 inline-block">
             <div className="absolute inset-[-10px] bg-accent/20 blur-2xl rounded-full" />
             <Lock className="relative w-20 h-20 text-accent animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold mb-6 tracking-tighter">ACCESS DENIED</h1>
          <p className="text-muted font-medium mb-10 leading-relaxed uppercase tracking-widest text-xs">
            Connect your terminal to access your private trading portfolio and secure vault.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-black font-bold rounded-2xl shadow-neon transition-all hover:scale-105 active:scale-95"
          >
            <Zap className="w-5 h-5" />
            INITIALIZE TERMINAL
          </Link>
        </div>
      </div>
    );
  }

  const displayUser = turnkeyUser
    ? {
        id: turnkeyUser.userId,
        name: turnkeyUser.userName,
        email: turnkeyUser.userEmail,
        avatar: undefined,
        createdAt: turnkeyUser.createdAt
          ? new Date(parseInt(turnkeyUser.createdAt.seconds) * 1000)
          : new Date(),
      }
    : user!;

  const hasWallets =
    (turnkeyWallets && turnkeyWallets.length > 0) ||
    (user?.wallets && Object.keys(user.wallets).length > 0);

  const sessionExpiry = turnkeySession?.expiry
    ? new Date(turnkeySession.expiry * 1000).toLocaleString()
    : null;

  return (
    <div className="min-h-screen bg-app text-white pb-24 selection:bg-primary/30">
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
      
      <Navbar
        showBackButton={true}
        onBackClick={() => router.back()}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col gap-12">
          {/* Profile Hero Section */}
          <section className="glass rounded-2xl p-6 md:p-10 relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-secondary/10 blur-[100px] rounded-full" />

            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="relative group/avatar">
                <div className="absolute inset-[-4px] bg-linear-to-tr from-primary via-secondary to-accent rounded-[3.5rem] opacity-40 blur-lg group-hover/avatar:opacity-100 transition-opacity" />
                <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-[3.5rem] overflow-hidden border-4 border-black ring-1 ring-white/20 bg-panel-elev">
                  {displayUser.avatar ? (
                    <img src={displayUser.avatar} alt={displayUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-primary/30 to-accent/30 flex items-center justify-center text-6xl font-bold text-gradient">
                      {displayUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.8]">{displayUser.name}</h1>
                  {turnkeySession && (
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-green-500/10 border border-green-500/20 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                      <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">SECURE LINK ACTIVE</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                  {displayUser.email && (
                    <div className="flex items-center gap-3 text-muted">
                      <Mail className="w-5 h-5 text-primary" />
                      <span className="text-sm font-bold">{displayUser.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted">
                    <Calendar className="w-5 h-5 text-secondary" />
                    <span className="text-sm font-bold uppercase tracking-widest">
                       EST. {displayUser.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {sessionExpiry && (
                    <div className="flex items-center gap-3 text-muted">
                      <Clock className="w-5 h-5 text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">EXP: {sessionExpiry}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                label: "CONNECTED WALLETS", 
                value: hasWallets ? (turnkeyWallets?.length || Object.keys(user?.wallets || {}).length) : 0, 
                icon: Wallet, 
                color: "text-primary", 
                shadow: "shadow-neon" 
              },
              { 
                label: "LIFETIME TRADES", 
                value: allTrades.length, 
                icon: Activity, 
                color: "text-secondary", 
                shadow: "shadow-secondary-neon" 
              },
              { 
                label: "PORTFOLIO VALUE", 
                value: `$${totalValueUsd.toFixed(2)}`, 
                icon: DollarSign, 
                color: "text-accent", 
                shadow: "shadow-accent-neon" 
              },
              { 
                label: "WIN RATE", 
                value: tradeStats.winRate !== null ? `${tradeStats.winRate.toFixed(1)}%` : metricsLoading ? "..." : `${(metrics?.winRate || 0).toFixed(1)}%`, 
                icon: TrendingUp, 
                color: (tradeStats.winRate ?? metrics?.winRate ?? 0) > 50 ? "text-green-400" : "text-white", 
                shadow: "shadow-white-neon" 
              }
            ].map((stat, i) => (
              <div key={i} className="glass rounded-[2rem] p-8 border border-white/10 group hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">{stat.label}</span>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`text-4xl font-bold tracking-tighter ${stat.color} ${stat.shadow}-sm`}>{stat.value}</div>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Main Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Wallet Manager */}
              <section className="glass rounded-2xl p-6 border border-white/10 shadow-neon-strong/5">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-2xl font-bold tracking-tighter flex items-center gap-4">
                     <Wallet className="w-8 h-8 text-primary" />
                     SECURE VAULTS
                   </h3>
                   <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-muted">
                     {turnkeyWallets?.length || 0} TOTAL
                   </div>
                </div>
                <div className="bg-black/40 rounded-[2rem] border border-white/5 p-4">
                  <WalletManager />
                </div>
              </section>

              {/* Transactions/Activity */}
              <section className="glass rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-bold tracking-tighter flex items-center gap-4">
                    <Activity className="w-8 h-8 text-secondary" />
                    LIVE ACTIVITY
                  </h3>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    {allTrades.length} TRADE{allTrades.length !== 1 ? "S" : ""}
                  </span>
                </div>
                {allTrades.length > 0 ? (
                  <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                    <TradeHistoryList />
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-6">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-secondary/10 blur-3xl" />
                      <BarChart3 className="relative w-24 h-24 mx-auto text-secondary/30" />
                    </div>
                    <div>
                      <p className="text-xl font-bold tracking-tighter text-muted">TERMINAL IS COLD</p>
                      <p className="text-[10px] font-bold text-muted/50 uppercase tracking-[0.3em] mt-2">NO RECENT EXECUTIONS DETECTED</p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Sidebar Column */}
            <div className="space-y-8">
              {/* Account Security */}
              <section className="glass rounded-2xl p-6 border border-white/10 shadow-accent-neon-strong/5">
                <h3 className="text-xl font-bold mb-8 tracking-tighter flex items-center gap-3">
                  <Shield className="w-6 h-6 text-accent" />
                  SECURITY
                </h3>
                
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">IDENTIFIER</span>
                      <div className="flex items-center gap-3">
                        <code className="text-xs font-bold tracking-tighter text-white">
                          {displayUser.id.slice(0, 12)}...
                        </code>
                        <button 
                          onClick={() => navigator.clipboard.writeText(displayUser.id)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all"
                        >
                          <ExternalLink className="w-4 h-4 text-muted" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {turnkeyUser && (
                      <div className="flex items-center gap-4 p-5 bg-primary/5 border border-primary/20 rounded-xl">
                        <Zap className="w-6 h-6 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase tracking-widest">TURNKEY CORE</p>
                          <p className="text-[10px] font-bold text-primary/70 uppercase">NON-CUSTODIAL ACTIVE</p>
                        </div>
                      </div>
                    )}
                    {/* Verified Social Links */}
                    <div className="space-y-4">
                      {/* Discord — connect or re-verify (overrides the previously linked Discord) */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-xl group hover:border-primary/30 transition-all space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                              <MessageSquare className="w-5 h-5 text-[#7289DA]" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">DISCORD</p>
                              <p className="text-xs font-bold text-white uppercase">{user?.discordId ? "CONNECTED" : "NOT CONNECTED"}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-bold ${
                            user?.discordId ? "bg-primary/20 text-primary border border-primary/50" : "bg-white/10 text-muted border border-white/10"
                          }`}>
                            {user?.discordId ? "VERIFIED" : "UNLINKED"}
                          </div>
                        </div>
                        <button
                          onClick={handleConnectDiscord}
                          disabled={isConnectingDiscord}
                          className="w-full text-[10px] font-bold uppercase tracking-widest text-white bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 rounded-xl py-2.5 transition-all disabled:opacity-50"
                        >
                          {isConnectingDiscord
                            ? "REDIRECTING..."
                            : user?.discordId
                              ? "RE-VERIFY / SWITCH DISCORD"
                              : "CONNECT DISCORD"}
                        </button>
                      </div>

                      {/* Telegram — link/unlink so either method signs into this account */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-xl group hover:border-primary/30 transition-all space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                              <Send className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">TELEGRAM</p>
                              <p className="text-xs font-bold text-white uppercase">{user?.telegramId ? "CONNECTED" : "NOT CONNECTED"}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-bold ${
                            user?.telegramId ? "bg-primary/20 text-primary border border-primary/50" : "bg-white/10 text-muted border border-white/10"
                          }`}>
                            {user?.telegramId ? "VERIFIED" : "UNLINKED"}
                          </div>
                        </div>
                        {user?.telegramId ? (
                          <button
                            onClick={handleUnlinkTelegram}
                            disabled={isUnlinkingTelegram}
                            className="w-full text-[10px] font-bold uppercase tracking-widest text-muted hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl py-2.5 transition-all disabled:opacity-50"
                          >
                            {isUnlinkingTelegram ? "UNLINKING..." : "UNLINK TELEGRAM"}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <TelegramLoginWidget
                              authEndpoint="/api/auth/link/telegram"
                              redirectOnSuccess={false}
                              buttonSize="medium"
                              onSuccess={() => {
                                setLinkTelegramError(null);
                                refreshSession();
                              }}
                              onError={(err) => setLinkTelegramError(err)}
                            />
                            {linkTelegramError && (
                              <p className="text-[10px] font-bold text-red-400 text-center">{linkTelegramError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Preferences */}
              <section className="glass rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold mb-8 tracking-tighter flex items-center gap-3">
                  <Settings className="w-6 h-6 text-muted" />
                  PROTOCOL
                </h3>

                <div className="space-y-8">
                  {[
                    { label: "NOTIFICATIONS", sub: "Priority trade alerts", checked: true },
                    { label: "AUTO-TRADING", sub: "Algorithmic execution", checked: false },
                    { label: "ANALYTICS", sub: "Weekly field reports", checked: true }
                  ].map((pref, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-white uppercase tracking-widest">{pref.label}</div>
                        <div className="text-[8px] font-bold text-muted uppercase tracking-wider mt-1">{pref.sub}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={pref.checked} />
                        <div className="w-12 h-6 bg-black/60 rounded-full border border-white/10 peer peer-checked:bg-primary/20 peer-checked:border-primary/50 transition-all after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white/10 after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6 peer-checked:after:bg-primary peer-checked:after:border-primary peer-checked:after:shadow-neon-sm"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              {/* Live Watchlist */}
              <section>
                <WatchlistPanel compact limit={8} />
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
