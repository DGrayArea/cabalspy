"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Activity, BarChart3, ArrowLeft, RefreshCw, ShieldCheck,
  Loader2, Wallet, UserCheck, Zap, DollarSign, ArrowUpRight,
  ArrowDownRight, Coins, Crown, ShieldOff, Search, ChevronDown,
  CheckCircle2, AlertCircle, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AdminMetrics {
  overview: {
    totalUsers: number; activeUsers7d: number; totalTrades: number;
    totalSessions: number; totalVolumeSol: number; estimatedFeeSol: number;
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

interface ManagedUser {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  accessLevel: string;
  googleId: string | null;
  discordId: string | null;
  telegramId: string | null;
  createdAt: string;
  isSuperAdmin: boolean;
}

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  primary: "#00ff9d", secondary: "#bd00ff", accent: "#ff007a",
  muted: "#64748b", gold: "#f59e0b", cyan: "#22d3ee",
};
const AUTH_COLORS = [C.primary, C.secondary, C.accent];
const ACCESS_COLORS = [C.muted, C.primary, C.gold];

const ACCESS_META: Record<string, { label: string; color: string; bg: string }> = {
  user:   { label: "User",   color: C.muted,     bg: "rgba(100,116,139,0.1)"  },
  holder: { label: "Holder", color: C.primary,   bg: "rgba(0,255,157,0.1)"   },
  admin:  { label: "Admin",  color: C.gold,      bg: "rgba(245,158,11,0.1)"  },
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#64748b] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color || p.fill || C.primary }}>
          {p.name}: <span className="text-white">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = C.primary, change }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
  change?: { value: number; label: string };
}) {
  return (
    <div className="relative group glass rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity" style={{ background: color }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-2xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${change.value >= 0 ? "bg-[#00ff9d]/10 text-[#00ff9d]" : "bg-[#ff007a]/10 text-[#ff007a]"}`}>
              {change.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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
function SectionHeading({ icon: Icon, title, color = C.primary }: { icon: any; title: string; color?: string }) {
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

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-fade-in ${
      type === "success" ? "bg-[#00ff9d]/10 border-[#00ff9d]/30 text-[#00ff9d]" : "bg-[#ff007a]/10 border-[#ff007a]/30 text-[#ff007a]"
    }`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span className="text-sm font-bold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── User Management Panel ────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "user" | "holder" | "admin">("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setToast({ message: "Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeLevel = async (userId: string, accessLevel: string, userName: string) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, accessLevel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || "Update failed", type: "error" });
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, accessLevel } : u));
        setToast({ message: `${userName} → ${accessLevel}`, type: "success" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.accessLevel === filter;
    return matchSearch && matchFilter;
  });

  const authProvider = (u: ManagedUser) => {
    if (u.discordId) return { label: "Discord", color: "#7289DA" };
    if (u.googleId) return { label: "Google", color: C.primary };
    if (u.telegramId) return { label: "Telegram", color: C.cyan };
    return { label: "—", color: C.muted };
  };

  return (
    <div className="glass rounded-3xl border border-white/5 overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-[#64748b]/60 focus:outline-none focus:border-[#00ff9d]/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(["all", "user", "holder", "admin"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30"
                  : "text-[#64748b] hover:text-white border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl glass border border-white/10 hover:border-white/20 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748b] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#00ff9d] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#64748b] text-sm font-bold">No users found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["User", "Auth", "Access Level", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#64748b]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const provider = authProvider(u);
                const meta = ACCESS_META[u.accessLevel] ?? ACCESS_META.user;
                const isUpdating = updating === u.id;
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-white/5 last:border-0 transition-colors ${i % 2 === 0 ? "bg-white/[0.01]" : ""} hover:bg-white/[0.03]`}
                  >
                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <Image src={u.avatar} alt={u.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" unoptimized />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-black text-[#64748b]">
                            {u.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-white truncate max-w-[120px]">{u.name}</span>
                            {u.isSuperAdmin && (
                              <span title="Super Admin — protected">
                                <Crown className="w-3 h-3 text-[#f59e0b] shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#64748b] font-medium truncate max-w-[160px]">{u.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Auth provider */}
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ color: provider.color, background: `${provider.color}15` }}>
                        {provider.label}
                      </span>
                    </td>

                    {/* Access level badge */}
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border" style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}30` }}>
                        {meta.label}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-medium text-[#64748b]">
                        {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {u.isSuperAdmin ? (
                        <div className="flex items-center gap-1.5 text-[#f59e0b]">
                          <Crown className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Super Admin</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 text-[#00ff9d] animate-spin" />
                          ) : (
                            <>
                              {u.accessLevel !== "admin" && (
                                <button
                                  onClick={() => changeLevel(u.id, "admin", u.name)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 hover:bg-[#f59e0b]/20 transition-all"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Make Admin
                                </button>
                              )}
                              {u.accessLevel === "admin" && (
                                <button
                                  onClick={() => changeLevel(u.id, "holder", u.name)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#ff007a]/10 text-[#ff007a] border border-[#ff007a]/20 hover:bg-[#ff007a]/20 transition-all"
                                >
                                  <ShieldOff className="w-3 h-3" />
                                  Remove Admin
                                </button>
                              )}
                              {u.accessLevel === "user" && (
                                <button
                                  onClick={() => changeLevel(u.id, "holder", u.name)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20 hover:bg-[#00ff9d]/20 transition-all"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Grant Holder
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer count */}
      <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-[#64748b]">
          Showing {filtered.length} of {users.length} users
        </p>
        <p className="text-[10px] font-bold text-[#64748b]/50">
          {users.filter(u => u.accessLevel === "admin").length} admins · {users.filter(u => u.accessLevel === "holder").length} holders
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated, isLoggingIn } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"metrics" | "users">("metrics");

  useEffect(() => {
    if (isLoading || isLoggingIn) return;
    if (!isAuthenticated) { router.replace("/auth"); return; }
    if (user && user.accessLevel !== "admin") router.replace("/admin-required");
  }, [isAuthenticated, isLoading, isLoggingIn, user, router]);

  const fetchMetrics = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error(`${res.status}`);
      setMetrics(await res.json());
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load metrics.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user?.accessLevel === "admin") fetchMetrics();
  }, [user, fetchMetrics]);

  if (isLoading || isLoggingIn || !user || user.accessLevel !== "admin") {
    return <div className="min-h-screen bg-app flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#00ff9d] animate-spin" /></div>;
  }

  const o = metrics?.overview;
  const c = metrics?.charts;
  const authPieData = c ? [
    { name: "Google", value: c.authBreakdown.google },
    { name: "Discord", value: c.authBreakdown.discord },
    { name: "Telegram", value: c.authBreakdown.telegram },
  ] : [];
  const accessPieData = c ? [
    { name: "User", value: c.accessBreakdown.user },
    { name: "Holder", value: c.accessBreakdown.holder },
    { name: "Admin", value: c.accessBreakdown.admin },
  ] : [];
  const buySellData = c ? [
    { name: "Buys", value: c.buySellBreakdown.buys, fill: C.primary },
    { name: "Sells", value: c.buySellBreakdown.sells, fill: C.accent },
  ] : [];

  return (
    <div className="min-h-screen bg-app text-white">
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-[#00ff9d]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-[#bd00ff]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 py-8">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-[#64748b] hover:text-white transition-colors group">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/20">
                  <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00ff9d]">Admin Console</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                PLATFORM{" "}
                <span style={{ background: "linear-gradient(135deg, #00ff9d, #bd00ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  COMMAND
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
            {activeTab === "metrics" && (
              <button
                onClick={fetchMetrics}
                disabled={fetching}
                className="flex items-center gap-2 px-4 py-2.5 glass rounded-2xl border border-white/10 hover:border-[#00ff9d]/30 hover:text-[#00ff9d] transition-all text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1.5 glass rounded-2xl border border-white/5 w-fit mb-10">
          {([
            { id: "metrics", icon: BarChart3, label: "Metrics" },
            { id: "users",   icon: Users,    label: "User Management" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Metrics Tab ──────────────────────────────────────────────────── */}
        {activeTab === "metrics" && (
          <>
            {error && (
              <div className="mb-8 px-5 py-4 rounded-2xl bg-[#ff007a]/10 border border-[#ff007a]/30 text-[#ff007a] text-sm font-bold">{error}</div>
            )}

            {fetching && !metrics ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 text-[#00ff9d] animate-spin" />
                <p className="text-[11px] font-black uppercase tracking-widest text-[#64748b] animate-pulse">Loading platform data...</p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="mb-12">
                  <SectionHeading icon={Activity} title="Overview" color={C.primary} />
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard icon={Users}     label="Total Users"    value={(o?.totalUsers ?? 0).toLocaleString()}         color={C.primary} />
                    <StatCard icon={UserCheck} label="Active (7d)"    value={(o?.activeUsers7d ?? 0).toLocaleString()}      color={C.cyan}    sub="Unique sessions" />
                    <StatCard icon={Activity}  label="Total Trades"   value={(o?.totalTrades ?? 0).toLocaleString()}        color={C.secondary} />
                    <StatCard icon={Zap}       label="Sessions"       value={(o?.totalSessions ?? 0).toLocaleString()}      color={C.gold} />
                    <StatCard icon={Wallet}    label="Volume (SOL)"   value={o ? o.totalVolumeSol.toFixed(2) : "0"}         color={C.accent}  sub="30-day sum" />
                    <StatCard icon={DollarSign} label="Est. Fees"     value={o ? o.estimatedFeeSol.toFixed(4) : "0"}        color={C.gold}    sub="@ 0.3% rate" />
                  </div>
                </div>

                {/* User Charts */}
                <div className="mb-12">
                  <SectionHeading icon={Users} title="Users" color={C.primary} />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                          <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" name="Signups" stroke={C.primary} strokeWidth={2} fill="url(#signupGrad)" dot={false} activeDot={{ r: 4, fill: C.primary }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Auth Provider Breakdown">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={authPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                            {authPieData.map((_, i) => <Cell key={i} fill={AUTH_COLORS[i % AUTH_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <ChartCard title="Access Level Distribution">
                      <div className="flex items-center gap-8 h-[160px]">
                        <ResponsiveContainer width="45%" height={160}>
                          <PieChart>
                            <Pie data={accessPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                              {accessPieData.map((_, i) => <Cell key={i} fill={ACCESS_COLORS[i % ACCESS_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-3 flex-1">
                          {accessPieData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: ACCESS_COLORS[i] }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">{item.name}</span>
                              </div>
                              <span className="text-sm font-black text-white">{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>

                    <ChartCard title="Top Traded Tokens (30d)">
                      <div className="space-y-2 h-[160px] overflow-y-auto pr-1">
                        {(c?.topTokens ?? []).length === 0 ? (
                          <p className="text-[11px] text-[#64748b] font-bold text-center pt-10">No trade data yet</p>
                        ) : (c?.topTokens ?? []).map((t, i) => {
                          const max = c!.topTokens[0]?.count ?? 1;
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-[#64748b] w-4">{i + 1}</span>
                              <span className="text-[11px] font-black text-white w-20 truncate">{t.symbol}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(t.count / max) * 100}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})` }} />
                              </div>
                              <span className="text-[10px] font-black text-[#64748b] w-8 text-right">{t.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </ChartCard>
                  </div>
                </div>

                {/* Performance Charts */}
                <div className="mb-12">
                  <SectionHeading icon={BarChart3} title="Performance" color={C.secondary} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Trade Activity (30d)">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={c?.tradesByDay?.map(d => ({ ...d, date: shortDate(d.date) })) ?? []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Trades" fill={C.secondary} radius={[4, 4, 0, 0]} maxBarSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Buy vs Sell Distribution">
                      <div className="flex items-center gap-8 h-[220px]">
                        <ResponsiveContainer width="55%" height={220}>
                          <BarChart data={buySellData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                              {buySellData.map((e, i) => <Cell key={i} fill={e.fill} />)}
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">{item.name}</span>
                                  </div>
                                  <span className="text-[10px] font-black" style={{ color: item.fill }}>{pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.fill }} />
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

                {/* Volume & Fees */}
                <div className="mb-16">
                  <SectionHeading icon={Coins} title="Volume & Fees" color={C.gold} />
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
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="volume" name="Volume (SOL)" stroke={C.gold} strokeWidth={2} fill="url(#volGrad)" dot={false} activeDot={{ r: 4, fill: C.gold }} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {[
                        { label: "30d Volume", value: `${(o?.totalVolumeSol ?? 0).toFixed(4)} SOL`, color: C.gold },
                        { label: "Est. Revenue (0.3%)", value: `${(o?.estimatedFeeSol ?? 0).toFixed(4)} SOL`, color: C.primary },
                        { label: "Total Trades", value: (o?.totalTrades ?? 0).toLocaleString(), color: C.secondary },
                      ].map(item => (
                        <div key={item.label} className="flex-1 min-w-[140px] px-4 py-3 rounded-2xl" style={{ background: `${item.color}08`, border: `1px solid ${item.color}25` }}>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: `${item.color}aa` }}>{item.label}</p>
                          <p className="text-xl font-black text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </div>
              </>
            )}
          </>
        )}

        {/* ── User Management Tab ───────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="mb-16">
            <SectionHeading icon={Users} title="User Management" color={C.gold} />
            <UserManagement />
          </div>
        )}

        <div className="text-center pb-8">
          <p className="text-[10px] font-bold text-[#64748b]/50 uppercase tracking-widest">
            CabalSpy Admin Console — Protected by Guardian System
          </p>
        </div>
      </div>
    </div>
  );
}
