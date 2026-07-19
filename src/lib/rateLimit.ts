import { NextRequest, NextResponse } from "next/server";

export interface RateLimitOptions {
  uniqueTokenPerInterval?: number;
  interval?: number;
}

export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new Map<string, number[]>();
  let lastCleanup = Date.now();

  const limit = options?.uniqueTokenPerInterval || 500;
  const interval = options?.interval || 60000;

  return {
    check: (limitCount: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now();

        // Cleanup every minute
        if (now - lastCleanup > interval) {
          lastCleanup = now;
          for (const [key, timestamps] of tokenCache.entries()) {
            const validTimestamps = timestamps.filter(
              (timestamp) => now - timestamp < interval
            );
            if (validTimestamps.length === 0) {
              tokenCache.delete(key);
            } else {
              tokenCache.set(key, validTimestamps);
            }
          }
        }

        const tokenCount = tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, [1]);
        }
        
        let timestamps = tokenCache.get(token) || [];
        timestamps = timestamps.filter((timestamp) => now - timestamp < interval);
        
        if (timestamps.length >= limitCount) {
          return reject(new Error("Rate limit exceeded"));
        }
        
        timestamps.push(now);
        tokenCache.set(token, timestamps);
        return resolve();
      }),
  };
}

/**
 * Per-IP route limiter with the same semantics the Mobula/PumpFun routes use.
 * Returns a guard: call it at the top of a handler; a non-null return is the
 * 429 response to send back.
 *
 *   const guard = createRouteLimiter(30);
 *   export async function POST(req: NextRequest) {
 *     const limited = await guard(req);
 *     if (limited) return limited;
 *     ...
 */
export function createRouteLimiter(requestsPerMinute: number) {
  const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 60000 });
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
      await limiter.check(requestsPerMinute, ip);
      return null;
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  };
}
