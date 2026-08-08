/**
 * Mobula API Proxy Route
 * 
 * Proxies requests to Mobula API to avoid CORS issues.
 * This route runs server-side, so CORS doesn't apply.
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { rateLimit } from "@/lib/rateLimit";

const limiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 60000,
});

const MOBULA_GET_API = "https://api.mobula.io/api/2/pulse";
const MOBULA_POST_API = "https://pulse-v2-api.mobula.io/api/2/pulse"; // Use v2 API for POST
const API_KEY =
  process.env.NEXT_PUBLIC_MOBULA_API_KEY ||
  process.env.MOBULA_API_KEY ||
  "7b7ba456-f454-4a42-a80e-897319cb0ac1";
const FALLBACK_API_KEY =
  process.env.MOBULA_FALLBACK_API_KEY ||
  process.env.NEXT_PUBLIC_MOBULA_FALLBACK_API_KEY ||
  "";

/**
 * Run the request with the primary key; if Mobula rejects it with 401/403
 * and a fallback key is configured, retry once with the fallback key.
 */
async function withKeyFallback<T extends { status: number }>(
  doRequest: (apiKey: string) => Promise<T>
): Promise<T> {
  const response = await doRequest(API_KEY);
  if (
    (response.status === 401 || response.status === 403) &&
    FALLBACK_API_KEY &&
    FALLBACK_API_KEY !== API_KEY
  ) {
    console.log("[Mobula Proxy] Primary key rejected — retrying with fallback key");
    return doRequest(FALLBACK_API_KEY);
  }
  return response;
}

/**
 * Timeout budget.
 *
 * The browser client (src/services/mobula.ts) aborts at 15s. Everything this
 * route does — both API-key attempts and every retry — has to finish inside
 * that window, otherwise the client gives up first: the work is wasted and it
 * surfaces as net::ERR_ABORTED or an intermittent 502 even though the upstream
 * would have answered. So we hold a single deadline for the whole handler and
 * shrink each attempt to fit whatever time is left.
 */
const CLIENT_TIMEOUT_MS = 15000; // keep in sync with src/services/mobula.ts
const SERVER_BUDGET_MS = CLIENT_TIMEOUT_MS - 3000; // headroom to send our response
const PER_ATTEMPT_TIMEOUT_MS = 5000; // worst case: 5s + 0.5s backoff + 5s = 10.5s

/**
 * Retry with exponential backoff, bounded by a shared deadline. `requestFn`
 * receives the timeout it must respect for that attempt.
 */
async function retryRequest<T>(
  requestFn: (timeoutMs: number) => Promise<T>,
  deadline: number,
  maxRetries = 2,
  baseDelay = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const remaining = deadline - Date.now();
    // Out of budget — don't start an attempt that can't finish in time.
    if (remaining <= 0 && attempt > 0) break;
    const timeoutMs = Math.max(1000, Math.min(PER_ATTEMPT_TIMEOUT_MS, remaining));

    try {
      return await requestFn(timeoutMs);
    } catch (error: any) {
      lastError = error;
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        throw error;
      }
      // Retry on 5xx errors (server errors) or network errors, but only if
      // the backoff plus another attempt still fits inside the budget.
      const delay = baseDelay * Math.pow(2, attempt);
      if (attempt < maxRetries - 1 && Date.now() + delay < deadline) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }
  throw lastError ?? new Error("Mobula request exceeded its time budget");
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    try {
      await limiter.check(60, ip); // 60 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    const assetMode = searchParams.get("assetMode") || "true";
    const chainId = searchParams.get("chainId") || "solana:solana";
    const poolTypes = searchParams.get("poolTypes") || "pumpfun,meteora,moonshot,jupiter,raydium,moonit,letsbonk";
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";

    const params = new URLSearchParams({
      assetMode,
      chainId,
      poolTypes,
      limit,
      offset,
    });

    const url = `${MOBULA_GET_API}?${params.toString()}`;
    console.log(`[Mobula API] GET ${url}`);

    // One budget shared by the key fallback and every retry beneath it.
    const deadline = Date.now() + SERVER_BUDGET_MS;
    const response = await withKeyFallback((apiKey) =>
      retryRequest(
        (timeoutMs) => axios.get(url, {
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          timeout: timeoutMs,
          validateStatus: (status) => status < 500,
        }),
        deadline
      )
    );

    if (response.status >= 400) {
      throw new Error(`Mobula API returned ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        // Vercel Edge Caching: Cache for 15s at the edge, allow 30s of stale data
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error: any) {
    const statusCode = error?.response?.status || 500;
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    
    console.error("[Mobula Proxy GET Error]", {
      message: errorMessage,
      status: statusCode,
      url: error?.config?.url,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
    
    return NextResponse.json(
      {
        error: errorMessage,
        status: statusCode,
        data: null,
      },
      {
        status: statusCode >= 500 ? 502 : statusCode,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    try {
      await limiter.check(30, ip); // 30 POST requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // One budget shared by the key fallback and every retry beneath it.
    const deadline = Date.now() + SERVER_BUDGET_MS;
    const response = await withKeyFallback((apiKey) =>
      retryRequest(
        (timeoutMs) => axios.post(MOBULA_POST_API, body, {
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          timeout: timeoutMs,
          validateStatus: (status) => status < 500,
        }),
        deadline
      )
    );

    if (response.status >= 400) {
      throw new Error(`Mobula API returned ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        // POST requests are usually not cached by default, but we can force it for these static views
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error: any) {
    const statusCode = error?.response?.status || 500;
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    
    console.error("[Mobula Proxy POST Error]", {
      message: errorMessage,
      status: statusCode,
      url: error?.config?.url,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
    
    return NextResponse.json(
      {
        error: errorMessage,
        status: statusCode,
        data: null,
      },
      {
        status: statusCode >= 500 ? 502 : statusCode,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
