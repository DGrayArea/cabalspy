import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { portfolioAnalytics } from "@/services/portfolio-analytics";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get user's primary Solana wallet
    const wallet = await db.wallet.findFirst({
      where: { userId: session.userId, network: "solana" },
    });

    if (!wallet || !wallet.address) {
      return NextResponse.json({ error: "No Solana wallet linked" }, { status: 404 });
    }

    // 2. Fetch live metrics from analytics service
    const metrics = await portfolioAnalytics.getPerformanceMetrics(wallet.address);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("[PERFORMANCE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
