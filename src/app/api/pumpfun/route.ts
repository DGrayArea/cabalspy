/**
 * Pump.fun API Proxy Route
 * 
 * Proxies requests to Pump.fun API to avoid CORS issues.
 * This route runs server-side, so CORS doesn't apply.
 */

import { NextRequest, NextResponse } from "next/server";

const PUMPFUN_APIS = {
  base: "https://frontend-api.pump.fun",
  v3: "https://frontend-api-v3.pump.fun",
  advanced: "https://advanced-api-v2.pump.fun",
  swap: "https://swap-api.pump.fun",
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "";
    const api = searchParams.get("api") || "v3";
    
    // Build the target URL
    let baseUrl = PUMPFUN_APIS.v3;
    if (api === "base") baseUrl = PUMPFUN_APIS.base;
    else if (api === "advanced") baseUrl = PUMPFUN_APIS.advanced;
    else if (api === "swap") baseUrl = PUMPFUN_APIS.swap;
    
    // Remove our proxy params and forward the rest
    const forwardParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "endpoint" && key !== "api") {
        forwardParams.append(key, value);
      }
    });
    
    const queryString = forwardParams.toString();
    const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`Pump.fun API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    console.error("[Pump.fun Proxy Error]", error?.message);
    
    return NextResponse.json(
      { error: error?.message || "Failed to fetch from Pump.fun", data: null },
      {
        status: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
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
