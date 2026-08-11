/**
 * GeckoTerminal API Proxy
 *
 * Calls previously went browser -> api.geckoterminal.com directly, which put
 * the client IP behind their rate limits with no protection, and would break
 * outright if GeckoTerminal tightened CORS or added auth. Routing through the
 * server matches how Mobula and pump.fun are handled, and lets us cache at
 * the edge so repeated token lookups don't each hit upstream.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteLimiter } from "@/lib/rateLimit";

const GECKO_TERMINAL_API = "https://api.geckoterminal.com/api/v2";
const UPSTREAM_TIMEOUT_MS = 10000;

const guard = createRouteLimiter(60);

export async function GET(request: NextRequest) {
  const limited = await guard(request);
  if (limited) return limited;

  // `path` is the GeckoTerminal path after /api/v2, e.g.
  // "networks/solana/tokens/<address>" or ".../pools"
  const path = request.nextUrl.searchParams.get("path") || "";

  // Only allow the read-only endpoints we actually use, and refuse anything
  // trying to climb out of the API namespace.
  if (!path || path.includes("..") || !/^networks\/[\w-]+\/tokens\/[\w-]+(\/pools)?$/.test(path)) {
    return NextResponse.json(
      { error: "Unsupported GeckoTerminal path" },
      { status: 400 },
    );
  }

  const url = `${GECKO_TERMINAL_API}/${path}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: 30 },
    });

    // 404 simply means the token isn't listed — pass it through so callers
    // can treat it as "no data" rather than an error.
    if (response.status === 404) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    if (!response.ok) {
      console.warn(`[GeckoTerminal] ${path} -> ${response.status}`);
      return NextResponse.json(
        { error: `GeckoTerminal returned ${response.status}` },
        {
          status: response.status === 429 ? 429 : 502,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[GeckoTerminal] ${path} failed: ${message}`);
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}
