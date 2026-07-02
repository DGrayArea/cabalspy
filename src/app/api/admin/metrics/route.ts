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
    const authBreakdown = {
      google: allUsers.filter((u) => u.googleId && !u.discordId && !u.telegramId).length,
      discord: allUsers.filter((u) => u.discordId).length,
      telegram: allUsers.filter((u) => u.telegramId && !u.discordId).length,
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

    // 10. Volume (total amount strings parsed as floats, in SOL)
    let totalVolumeSol = 0;
    for (const trade of allTrades) {
      if (trade.status === "success") {
        const parsed = parseFloat(trade.amount);
        if (!isNaN(parsed)) totalVolumeSol += parsed;
      }
    }

    // 11. Volume by day
    const volumeByDay = buildDailyVolumeBuckets(allTrades, days30Ago, now);

    // Fees: prefer actual recorded referral fees (feesSOL, tracked per trade);
    // fall back to a 1% estimate of volume for older trades without the field.
    const collectedFeesSol = allTrades.reduce(
      (sum, t) => sum + (t.status === "success" && t.feesSOL ? t.feesSOL : 0),
      0
    );
    const FEE_RATE = 0.01; // matches the 125bps referral fee net of Jupiter's cut
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
  } catch (error) {
    console.error("[ADMIN_METRICS]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
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
  trades: { timestamp: Date; amount: string; status: string; direction: string }[],
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
      const v = parseFloat(t.amount);
      if (!isNaN(v)) buckets[key] += v;
    }
  }
  return Object.entries(buckets).map(([date, volume]) => ({ date, volume: +volume.toFixed(4) }));
}
