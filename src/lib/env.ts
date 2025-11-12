/**
 * Environment variable validation for production
 */

const requiredEnvVars = {
  // Turnkey - required for wallet operations
  // Note: PumpAPI does NOT require an API key - it's free and public
  TURNKEY_API_PRIVATE_KEY: process.env.TURNKEY_API_PRIVATE_KEY,
  NEXT_PUBLIC_TURNKEY_ORG_ID: process.env.NEXT_PUBLIC_TURNKEY_ORG_ID,
} as const;

const optionalEnvVars = {
  // Turnkey (optional - defaults provided)
  NEXT_PUBLIC_TURNKEY_BASE_URL:
    process.env.NEXT_PUBLIC_TURNKEY_BASE_URL || "https://api.turnkey.com",
  NEXT_PUBLIC_TURNKEY_API_KEY: process.env.NEXT_PUBLIC_TURNKEY_API_KEY || "",

  // PumpAPI (no API key needed - public service)
  NEXT_PUBLIC_PUMPAPI_URL:
    process.env.NEXT_PUBLIC_PUMPAPI_URL || "wss://pumpportal.fun/api/data",
  NEXT_PUBLIC_PUMPAPI_BASE_URL:
    process.env.NEXT_PUBLIC_PUMPAPI_BASE_URL || "https://pumpapi.io",

  // Blockchain RPC (optional - defaults provided)
  NEXT_PUBLIC_SOLANA_RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com",

  // OAuth (optional - only needed if implementing auth)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
} as const;

export function validateEnv() {
  if (typeof window !== "undefined") {
    // Client-side: only validate public vars
    return;
  }

  // Server-side: validate all required vars
  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMessage =
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env.local file.\n" +
      "These variables are required for Turnkey wallet operations but can be set later.";

    // Never throw during build - only warn
    // During build, Next.js may not have access to .env.local
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-development-build" ||
      process.env.NEXT_PHASE?.includes("build") ||
      !process.env.NEXT_RUNTIME;

    if (isBuildTime) {
      // During build, just log a warning and continue
      console.warn("⚠️  Environment validation (build time):", errorMessage);
      return;
    }

    // At runtime, warn in development, throw in production
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMessage);
    } else {
      console.warn("⚠️  Environment validation warning:", errorMessage);
      return;
    }
  }
}

// Validate on module load (server-side only) - but never throw during build
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    // During build, never throw - just warn
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-development-build" ||
      process.env.NEXT_PHASE?.includes("build") ||
      !process.env.NEXT_RUNTIME;

    if (isBuildTime) {
      console.warn("⚠️  Environment validation skipped during build:", error);
    } else if (process.env.NODE_ENV === "production") {
      // Only throw in production runtime (not build)
      throw error;
    } else {
      console.warn("⚠️  Environment validation warning:", error);
    }
  }
}

export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,
  NODE_ENV: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
} as const;
