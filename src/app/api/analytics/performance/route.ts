import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { portfolioAnalytics } from "@/services/portfolio-analytics";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await portfolioAnalytics.getPerformanceMetrics(
      session.userId
    );

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("[PERFORMANCE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
