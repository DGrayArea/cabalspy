import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Auth guard — admin only
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!requestingUser || requestingUser.accessLevel !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Date helpers
    const now = new Date();
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 3. Run all queries in parallel
    const [
      totalUsers,
      activeUsers7d,
      allUsers,
      totalTrades,
      allTrades,
      totalSessions,
      recentTrades,
    ] = await Promise.all([
      // Total users
      db.user.count(),

      // Active users in last 7 days (have a session created recently)
      db.session.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: days7Ago } },
      }),

      // All users for breakdowns (created in last 30 days + auth type)
      db.user.findMany({
        select: {
          id: true,
          accessLevel: true,
          authMethod: true,
          googleId: true,
          discordId: true,
          telegramId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // Total trades
      db.tradeHistory.count(),

      // All trades in last 30 days for charts
      db.tradeHistory.findMany({
        select: {
          id: true,
          direction: true,
          amount: true,
          output: true,
          priceUsd: true,
          feesSOL: true,
          symbol: true,
          tokenMint: true,
          status: true,
          timestamp: true,
        },
        where: { timestamp: { gte: days30Ago } },
        orderBy: { timestamp: "asc" },
      }),

      // Total sessions
      db.session.count(),

      // Most recent trades, for the transactions table
      db.tradeHistory.findMany({
        select: {
          id: true,
          symbol: true,
          tokenMint: true,
          direction: true,
          amount: true,
          output: true,
          priceUsd: true,
          outAmountUsd: true,
          feesSOL: true,
          signature: true,
          status: true,
          timestamp: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { timestamp: "desc" },
        take: 50,
      }),
    ]);

    // 4. User signups by day (last 30 days)
    const signupsByDay = buildDailyBuckets(
      allUsers
        .filter((u) => u.createdAt >= days30Ago)
        .map((u) => u.createdAt),
      days30Ago,
      now
    );

    // 5. Auth provider breakdown
    // Prefer the recorded authMethod; fall back to inferring from the
    // identifiers for rows created before that column existed. Email-OTP
    // users previously matched none of these and vanished from the chart.
    const methodOf = (u: { authMethod?: string | null; googleId?: string | null; discordId?: string | null; telegramId?: string | null }) =>
      u.authMethod ??
      (u.discordId ? "discord" : u.telegramId ? "telegram" : u.googleId ? "google" : "email");

    const authBreakdown = {
      google: allUsers.filter((u) => methodOf(u) === "google").length,
      discord: allUsers.filter((u) => methodOf(u) === "discord").length,
      telegram: allUsers.filter((u) => methodOf(u) === "telegram").length,
      email: allUsers.filter((u) => methodOf(u) === "email").length,
    };

    // 6. Access level breakdown
    const accessBreakdown = {
      user: allUsers.filter((u) => u.accessLevel === "user").length,
      holder: allUsers.filter((u) => u.accessLevel === "holder").length,
      admin: allUsers.filter((u) => u.accessLevel === "admin").length,
    };

    // 7. Trades by day (last 30 days)
    const tradesByDay = buildDailyBuckets(
      allTrades.filter((t) => t.status === "success").map((t) => t.timestamp),
      days30Ago,
      now
    );

    // 8. Buy vs Sell breakdown
    const buySellBreakdown = {
      buys: allTrades.filter((t) => t.direction === "buy" && t.status === "success").length,
      sells: allTrades.filter((t) => t.direction === "sell" && t.status === "success").length,
    };

    // 9. Top traded tokens (by count)
    const tokenCounts: Record<string, { symbol: string; count: number }> = {};
    for (const trade of allTrades) {
      if (trade.status !== "success") continue;
      if (!tokenCounts[trade.tokenMint]) {
        tokenCounts[trade.tokenMint] = { symbol: trade.symbol, count: 0 };
      }
      tokenCounts[trade.tokenMint].count++;
    }
    const topTokens = Object.values(tokenCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 10. Volume in SOL: for BUY, amount is SOL spent; for SELL, output is SOL received.
    let totalVolumeSol = 0;
    for (const trade of allTrades) {
      if (trade.status === "success") {
        const solVal = trade.direction === "buy" ? trade.amount : trade.output;
        const parsed = parseFloat(solVal || "0");
        if (!isNaN(parsed)) totalVolumeSol += parsed;
      }
    }

    // 11. Volume by day
    const volumeByDay = buildDailyVolumeBuckets(allTrades, days30Ago, now);

    // Fees: sum actual net referral fees (feesSOL, 1% net rate) for successful trades.
    // Ignores any legacy corrupted entries where feesSOL exceeded the SOL leg.
    const collectedFeesSol = allTrades.reduce((sum, t) => {
      if (t.status !== "success") return sum;
      const solVal = t.direction === "buy" ? t.amount : t.output;
      const solLeg = parseFloat(solVal || "0");
      if (isNaN(solLeg) || solLeg <= 0) return sum;
      const tradeFee =
        t.feesSOL && t.feesSOL > 0 && t.feesSOL < solLeg
          ? t.feesSOL
          : solLeg * 0.01;
      return sum + tradeFee;
    }, 0);

    const FEE_RATE = 0.01; // 100 bps net platform share (80% of 125 bps)
    const estimatedFeeSol = totalVolumeSol * FEE_RATE;

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers7d: activeUsers7d.length,
        totalTrades,
        totalSessions,
        totalVolumeSol: +totalVolumeSol.toFixed(4),
        collectedFeesSol: +collectedFeesSol.toFixed(6),
        estimatedFeeSol: +estimatedFeeSol.toFixed(4),
      },
      recentTrades: recentTrades.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        tokenMint: t.tokenMint,
        direction: t.direction,
        amount: t.amount,
        output: t.output,
        priceUsd: t.priceUsd,
        outAmountUsd: t.outAmountUsd,
        feesSOL: t.feesSOL,
        signature: t.signature,
        status: t.status,
        timestamp: t.timestamp,
        userName: t.user?.name ?? "—",
        userEmail: t.user?.email ?? null,
      })),
      charts: {
        signupsByDay,
        tradesByDay,
        volumeByDay,
        authBreakdown,
        accessBreakdown,
        buySellBreakdown,
        topTokens,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_METRICS_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDailyBuckets(dates: Date[], from: Date, to: Date): { date: string; count: number }[] {
  const buckets: Record<string, number> = {};
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    buckets[cursor.toISOString().split("T")[0]] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const d of dates) {
    const key = new Date(d).toISOString().split("T")[0];
    if (buckets[key] !== undefined) buckets[key]++;
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

function buildDailyVolumeBuckets(
  trades: { timestamp: Date; amount: string; output: string; status: string; direction: string }[],
  from: Date,
  to: Date
): { date: string; volume: number }[] {
  const buckets: Record<string, number> = {};
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    buckets[cursor.toISOString().split("T")[0]] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const t of trades) {
    if (t.status !== "success") continue;
    const key = new Date(t.timestamp).toISOString().split("T")[0];
    if (buckets[key] !== undefined) {
      const solVal = t.direction === "buy" ? t.amount : t.output;
      const v = parseFloat(solVal || "0");
      if (!isNaN(v)) buckets[key] += v;
    }
  }
  return Object.entries(buckets).map(([date, volume]) => ({ date, volume: +volume.toFixed(4) }));
}
