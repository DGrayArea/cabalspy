/**
 * Telegram Bot Configuration for Different Environments
 *
 * Handles development, staging, and production environments
 */

import { logger } from "@/lib/logger";

export type Environment = "development" | "preview" | "production";

/**
 * Detect current environment
 */
export function getEnvironment(): Environment {
  // Vercel preview deployments
  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  // Production on Vercel
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "production";
  }

  // Default to development
  return "development";
}

/**
 * Get base URL for current environment
 */
export function getBaseUrl(): string {
  const env = getEnvironment();

  // Production/Preview: Use Vercel URL or NEXTAUTH_URL
  if (env === "production" || env === "preview") {
    // Vercel provides VERCEL_URL automatically
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }

    // Fallback to NEXTAUTH_URL
    if (process.env.NEXTAUTH_URL) {
      return process.env.NEXTAUTH_URL;
    }

    // Last resort (shouldn't happen in Vercel)
    return "https://yourdomain.com";
  }

  // Development: Use localhost or NEXTAUTH_URL
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

/**
 * Get Telegram bot token for current environment
 * Supports separate bots for dev/prod
 */
export function getBotToken(): string | undefined {
  const env = getEnvironment();

  // Allow environment-specific bot tokens
  if (env === "development" && process.env.TELEGRAM_BOT_TOKEN_DEV) {
    return process.env.TELEGRAM_BOT_TOKEN_DEV;
  }

  if (env === "preview" && process.env.TELEGRAM_BOT_TOKEN_PREVIEW) {
    return process.env.TELEGRAM_BOT_TOKEN_PREVIEW;
  }

  // Default to main bot token
  return process.env.TELEGRAM_BOT_TOKEN;
}

/**
 * Get webhook URL for current environment
 */
export function getWebhookUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/telegram/webhook`;
}

/**
 * Get webhook secret for current environment
 */
export function getWebhookSecret(): string | undefined {
  const env = getEnvironment();

  // Allow environment-specific secrets
  if (env === "development" && process.env.TELEGRAM_WEBHOOK_SECRET_DEV) {
    return process.env.TELEGRAM_WEBHOOK_SECRET_DEV;
  }

  if (env === "preview" && process.env.TELEGRAM_WEBHOOK_SECRET_PREVIEW) {
    return process.env.TELEGRAM_WEBHOOK_SECRET_PREVIEW;
  }

  // Default to main webhook secret
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}

/**
 * Check if webhook can be set (HTTPS required for production)
 */
export function canSetWebhook(): { allowed: boolean; reason?: string } {
  const env = getEnvironment();
  const baseUrl = getBaseUrl();

  // Development: Allow HTTP
  if (env === "development") {
    return { allowed: true };
  }

  // Production/Preview: Require HTTPS
  if (!baseUrl.startsWith("https://")) {
    return {
      allowed: false,
      reason:
        "HTTPS is required for webhooks in production/preview environments",
    };
  }

  return { allowed: true };
}

/**
 * Get callback URL for Telegram buttons (must be HTTPS)
 * In development, tries to get ngrok URL from webhook info
 */
export async function getCallbackBaseUrl(): Promise<string> {
  const env = getEnvironment();

  // Production/Preview: Use HTTPS URL
  if (env === "production" || env === "preview") {
    return getBaseUrl(); // Already HTTPS
  }

  // Development: Try to get ngrok URL from webhook
  // Check if we can get the webhook URL from Telegram (which should be ngrok)
  const botToken = getBotToken();
  if (botToken) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getWebhookInfo`
      );
      const result = await response.json();

      if (result.ok && result.result?.url) {
        const webhookUrl = result.result.url;
        // Extract base URL from webhook URL (remove /api/telegram/webhook)
        const baseUrl = webhookUrl.replace("/api/telegram/webhook", "");
        if (baseUrl.startsWith("https://")) {
          return baseUrl;
        }
      }
    } catch (error) {
      // Fallback to regular base URL
      if (logger) {
        logger.warn("Could not get webhook URL from Telegram", {
          error: String(error),
        });
      }
    }
  }

  // Fallback: Check NEXTAUTH_URL or use localhost
  // But warn that HTTPS is needed
  const fallback = process.env.NEXTAUTH_URL || "http://localhost:3000";
  if (!fallback.startsWith("https://") && logger) {
    logger.warn(
      "Callback URL is not HTTPS - Telegram buttons require HTTPS. Use ngrok for local development."
    );
  }

  return fallback;
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    environment: getEnvironment(),
    baseUrl: getBaseUrl(),
    webhookUrl: getWebhookUrl(),
    hasBotToken: !!getBotToken(),
    hasWebhookSecret: !!getWebhookSecret(),
    canSetWebhook: canSetWebhook(),
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    nextauthUrl: process.env.NEXTAUTH_URL,
  };
}
