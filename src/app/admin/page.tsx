"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  Activity,
  TrendingUp,
  Coins,
  BarChart3,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Loader2,
  Wallet,
  UserCheck,
  Zap,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AdminMetrics {
  overview: {
    totalUsers: number;
    activeUsers7d: number;
    totalTrades: number;
    totalSessions: number;
    totalVolumeSol: number;
    estimatedFeeSol: number;
  };
  charts: {
    signupsByDay: { date: string; count: number }[];
    tradesByDay: { date: string; count: number }[];
    volumeByDay: { date: string; volume: number }[];
    authBreakdown: { google: number; discord: number; telegram: number };
    accessBreakdown: { user: number; holder: number; admin: number };
    buySellBreakdown: { buys: number; sells: number };
    topTokens: { symbol: string; count: number }[];
  };
}

// ─── Chart colours (matching app palette) ────────────────────────────────────
const C = {
  primary: "#00ff9d",
  secondary: "#bd00ff",
  accent: "#ff007a",
  muted: "#64748b",
  gold: "#f59e0b",
  cyan: "#22d3ee",
};

const AUTH_COLORS = [C.primary, C.secondary, C.accent];
const ACCESS_COLORS = [C.muted, C.primary, C.gold];

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#64748b] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color || p.fill || "#00ff9d" }}>
          {p.name}: <span className="text-white">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#00ff9d",
  change,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  change?: { value: number; label: string };
}) {
  return (
    <div className="relative group glass rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ background: color }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-2.5 rounded-2xl"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {change && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${
                change.value >= 0 ? "bg-[#00ff9d]/10 text-[#00ff9d]" : "bg-[#ff007a]/10 text-[#ff007a]"
              }`}
            >
              {change.value >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {change.label}
            </div>
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b] mb-1">{label}</p>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
        {sub && <p className="text-[11px] font-medium text-[#64748b] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, title, color = "#00ff9d" }: { icon: any; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-xl" style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h2 className="text-base font-black uppercase tracking-widest text-white">{title}</h2>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────
function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-3xl p-6 border border-white/5 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#64748b] mb-5">{title}</p>
      {children}
    </div>
  );
}

// ─── Shorten date labels ──────────────────────────────────────────────────────
function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated, isLoggingIn } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auth guard
  useEffect(() => {
    if (isLoading || isLoggingIn) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (user && user.accessLevel !== "admin") {
      router.replace("/access-denied");
    }
  }, [isAuthenticated, isLoading, isLoggingIn, user, router]);

  const fetchMetrics = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError("Failed to load metrics.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user?.accessLevel === "admin") {
      fetchMetrics();
    }
  }, [user, fetchMetrics]);

  // Loading state
  if (isLoading || isLoggingIn || !user || user.accessLevel !== "admin") {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#00ff9d] animate-spin" />
      </div>
    );
  }

  const o = metrics?.overview;
  const c = metrics?.charts;

  // Pie data
  const authPieData = c
    ? [
        { name: "Google", value: c.authBreakdown.google },
        { name: "Discord", value: c.authBreakdown.discord },
        { name: "Telegram", value: c.authBreakdown.telegram },
      ]
    : [];
  const accessPieData = c
    ? [
        { name: "User", value: c.accessBreakdown.user },
        { name: "Holder", value: c.accessBreakdown.holder },
        { name: "Admin", value: c.accessBreakdown.admin },
      ]
    : [];
  const buySellData = c
    ? [
        { name: "Buys", value: c.buySellBreakdown.buys, fill: C.primary },
        { name: "Sells", value: c.buySellBreakdown.sells, fill: C.accent },
      ]
    : [];

  return (
    <div className="min-h-screen bg-app text-white">
      {/* Grid bg */}
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />

      {/* Ambient glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-[#00ff9d]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-[#bd00ff]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 py-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-[#64748b] hover:text-white transition-colors group"
            >
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/20">
                  <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00ff9d]">
                  Admin Console
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                PLATFORM{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #00ff9d, #bd00ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  METRICS
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={fetchMetrics}
              disabled={fetching}
              className="flex items-center gap-2 px-4 py-2.5 glass rounded-2xl border border-white/10 hover:border-[#00ff9d]/30 hover:text-[#00ff9d] transition-all text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 px-5 py-4 rounded-2xl bg-[#ff007a]/10 border border-[#ff007a]/30 text-[#ff007a] text-sm font-bold">
            {error}
          </div>
        )}

        {fetching && !metrics ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-10 h-10 text-[#00ff9d] animate-spin" />
            <p className="text-[11px] font-black uppercase tracking-widest text-[#64748b] animate-pulse">
              Loading platform data...
            </p>
          </div>
        ) : (
          <>
            {/* ── KPI Overview ──────────────────────────────────────────────── */}
            <div className="mb-12">
              <SectionHeading icon={Activity} title="Overview" color={C.primary} />
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                  icon={Users}
                  label="Total Users"
                  value={(o?.totalUsers ?? 0).toLocaleString()}
                  color={C.primary}
                />
                <StatCard
                  icon={UserCheck}
                  label="Active (7d)"
                  value={(o?.activeUsers7d ?? 0).toLocaleString()}
                  sub="Unique sessions"
                  color={C.cyan}
                />
                <StatCard
                  icon={Activity}
                  label="Total Trades"
                  value={(o?.totalTrades ?? 0).toLocaleString()}
                  color={C.secondary}
                />
                <StatCard
                  icon={Zap}
                  label="Sessions"
                  value={(o?.totalSessions ?? 0).toLocaleString()}
                  color={C.gold}
                />
                <StatCard
                  icon={Wallet}
                  label="Volume (SOL)"
                  value={o ? o.totalVolumeSol.toFixed(2) : "0"}
                  sub="30-day sum"
                  color={C.accent}
                />
                <StatCard
                  icon={DollarSign}
                  label="Est. Fees (SOL)"
                  value={o ? o.estimatedFeeSol.toFixed(4) : "0"}
                  sub="@ 0.3% rate"
                  color={C.gold}
                />
              </div>
            </div>

            {/* ── User Charts ───────────────────────────────────────────────── */}
            <div className="mb-12">
              <SectionHeading icon={Users} title="Users" color={C.primary} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Daily Signups */}
                <ChartCard title="New Signups (30d)" className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={c?.signupsByDay?.map(d => ({ ...d, date: shortDate(d.date) })) ?? []}>
                      <defs>
                        <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.primary} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Signups"
                        stroke={C.primary}
                        strokeWidth={2}
                        fill="url(#signupGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: C.primary }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Auth Breakdown Pie */}
                <ChartCard title="Auth Provider Breakdown">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={authPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {authPieData.map((_, i) => (
                          <Cell key={i} fill={AUTH_COLORS[i % AUTH_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(v) => (
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">{v}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Access Level Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <ChartCard title="Access Level Distribution">
                  <div className="flex items-center gap-8 h-[160px]">
                    <ResponsiveContainer width="45%" height={160}>
                      <PieChart>
                        <Pie
                          data={accessPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {accessPieData.map((_, i) => (
                            <Cell key={i} fill={ACCESS_COLORS[i % ACCESS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-3 flex-1">
                      {accessPieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: ACCESS_COLORS[i] }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-sm font-black text-white">{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>

                {/* Top Traded Tokens */}
                <ChartCard title="Top Traded Tokens (30d)">
                  <div className="space-y-2 h-[160px] overflow-y-auto pr-1">
                    {(c?.topTokens ?? []).length === 0 ? (
                      <p className="text-[11px] text-[#64748b] font-bold text-center pt-10">No trade data yet</p>
                    ) : (
                      (c?.topTokens ?? []).map((t, i) => {
                        const max = c!.topTokens[0]?.count ?? 1;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#64748b] w-4">{i + 1}</span>
                            <span className="text-[11px] font-black text-white w-20 truncate">{t.symbol}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(t.count / max) * 100}%`,
                                  background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-[#64748b] w-8 text-right">{t.count}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ChartCard>
              </div>
            </div>

            {/* ── Trade Charts ──────────────────────────────────────────────── */}
            <div className="mb-12">
              <SectionHeading icon={BarChart3} title="Performance" color={C.secondary} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trades over time */}
                <ChartCard title="Trade Activity (30d)">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={c?.tradesByDay?.map(d => ({ ...d, date: shortDate(d.date) })) ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Trades" fill={C.secondary} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Buy/Sell Breakdown */}
                <ChartCard title="Buy vs Sell Distribution">
                  <div className="flex items-center gap-8 h-[220px]">
                    <ResponsiveContainer width="55%" height={220}>
                      <BarChart data={buySellData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                          {buySellData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-4 flex-1">
                      {buySellData.map((item, i) => {
                        const total = (c?.buySellBreakdown.buys ?? 0) + (c?.buySellBreakdown.sells ?? 0);
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-black" style={{ color: item.fill }}>{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: item.fill }}
                              />
                            </div>
                            <p className="text-xs font-black text-white mt-1">{item.value.toLocaleString()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartCard>
              </div>
            </div>

            {/* ── Fee Charts ─────────────────────────────────────────────────── */}
            <div className="mb-16">
              <SectionHeading icon={Coins} title="Volume & Fees" color={C.gold} />
              <div className="grid grid-cols-1 gap-4">
                <ChartCard title="Daily Volume (SOL, 30d)">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={c?.volumeByDay?.map(d => ({ ...d, date: shortDate(d.date) })) ?? []}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.gold} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        name="Volume (SOL)"
                        stroke={C.gold}
                        strokeWidth={2}
                        fill="url(#volGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: C.gold }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Fee estimate callout */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[140px] px-4 py-3 rounded-2xl bg-[#f59e0b]/5 border border-[#f59e0b]/20">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f59e0b]/70 mb-1">
                        30d Volume
                      </p>
                      <p className="text-xl font-black text-white">
                        {(o?.totalVolumeSol ?? 0).toFixed(4)}{" "}
                        <span className="text-sm text-[#f59e0b]">SOL</span>
                      </p>
                    </div>
                    <div className="flex-1 min-w-[140px] px-4 py-3 rounded-2xl bg-[#00ff9d]/5 border border-[#00ff9d]/20">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff9d]/70 mb-1">
                        Est. Revenue (0.3%)
                      </p>
                      <p className="text-xl font-black text-white">
                        {(o?.estimatedFeeSol ?? 0).toFixed(4)}{" "}
                        <span className="text-sm text-[#00ff9d]">SOL</span>
                      </p>
                    </div>
                    <div className="flex-1 min-w-[140px] px-4 py-3 rounded-2xl bg-[#bd00ff]/5 border border-[#bd00ff]/20">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#bd00ff]/70 mb-1">
                        Total Trades
                      </p>
                      <p className="text-xl font-black text-white">
                        {(o?.totalTrades ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </ChartCard>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pb-8">
              <p className="text-[10px] font-bold text-[#64748b]/50 uppercase tracking-widest">
                CabalSpy Admin Console — Protected by Guardian System
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
