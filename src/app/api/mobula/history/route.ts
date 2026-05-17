/**
 * Mobula Wallet History Proxy
 *
 * GET /api/mobula/history?wallet=<address>&days=30
 *
 * Returns daily PnL data derived from Mobula's balance_history time-series.
 * Aggregates sub-daily data points into one entry per calendar day.
 */

import { NextRequest, NextResponse } from "next/server";

const MOBULA_HISTORY_URL = "https://api.mobula.io/api/1/wallet/history";
const API_KEY =
  process.env.NEXT_PUBLIC_MOBULA_API_KEY ||
  process.env.MOBULA_API_KEY ||
  "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const wallet = searchParams.get("wallet");
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet param" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "Mobula API key not configured" }, { status: 500 });
  }

  const now = Date.now();
  const from = now - days * 24 * 60 * 60 * 1000;

  try {
    const url = new URL(MOBULA_HISTORY_URL);
    url.searchParams.set("wallet", wallet);
    url.searchParams.set("blockchains", "solana");
    url.searchParams.set("from", from.toString());
    url.searchParams.set("to", now.toString());

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // cache for 5 min at the edge
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Mobula History] upstream error", res.status, text);
      return NextResponse.json(
        { error: `Mobula returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const rawHistory: [number, number][] = json?.data?.balance_history ?? [];

    if (rawHistory.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // ── Aggregate into daily buckets ───────────────────────────────────
    // Each entry is [timestamp_ms, balance_usd].
    // For each calendar day we record the FIRST and LAST balance,
    // then pnl = last - first.

    const dayMap: Record<string, { first: number; last: number }> = {};

    for (const [ts, balance] of rawHistory) {
      const dateKey = new Date(ts).toISOString().split("T")[0]; // "YYYY-MM-DD"
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { first: balance, last: balance };
      } else {
        dayMap[dateKey].last = balance; // Keep updating last point of the day
      }
    }

    // Convert to sorted array of { date, pnl, startBalance, endBalance }
    const dailyPnL = Object.entries(dayMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, { first, last }]) => ({
        date,
        pnl: parseFloat((last - first).toFixed(4)),
        startBalance: parseFloat(first.toFixed(2)),
        endBalance: parseFloat(last.toFixed(2)),
      }));

    return NextResponse.json(
      { data: dailyPnL },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    console.error("[Mobula History] fetch error", err?.message);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 502 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
