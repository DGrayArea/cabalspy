import { NextRequest, NextResponse } from "next/server";
import { pumpFunService } from "@/services/pumpfun";

// Force dynamic rendering to ensure this runs on the server
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/pumpfun/tokens
 * Fetch pump.fun tokens by type (latest, featured, graduated, marketCap, migrated)
 * This is a server-side proxy to avoid CORS issues in production
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as
      | "latest"
      | "featured"
      | "graduated"
      | "marketCap"
      | "migrated"
      | null;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!type) {
      return NextResponse.json(
        { error: "Type parameter is required (latest, featured, graduated, marketCap, migrated)" },
        { status: 400 }
      );
    }

    let tokens;
    switch (type) {
      case "latest":
        tokens = await pumpFunService.fetchLatest(limit);
        break;
      case "featured":
        tokens = await pumpFunService.fetchFeatured(limit);
        break;
      case "graduated":
        tokens = await pumpFunService.fetchGraduated(limit);
        break;
      case "marketCap":
        tokens = await pumpFunService.fetchByMarketCap(limit);
        break;
      case "migrated":
        tokens = await pumpFunService.fetchMigratedTokens(limit);
        break;
      default:
        return NextResponse.json(
          { error: `Invalid type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { tokens },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch pump.fun tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens", tokens: [] },
      { status: 500 }
    );
  }
}

