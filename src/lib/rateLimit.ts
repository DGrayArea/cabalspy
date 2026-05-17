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
