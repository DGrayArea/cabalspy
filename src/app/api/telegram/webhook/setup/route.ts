import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getBotToken,
  getWebhookUrl,
  getWebhookSecret,
  getEnvironment,
  canSetWebhook,
} from "@/lib/telegramConfig";

/**
 * Set up Telegram Bot Webhook
 * POST /api/telegram/webhook/setup
 *
 * This endpoint configures your Telegram bot to send updates to your webhook URL.
 *
 * Security: In production, consider adding authentication to this endpoint.
 *
 * Body (optional):
 * {
 *   "url": "https://yourdomain.com/api/telegram/webhook",
 *   "secret_token": "your_webhook_secret"
 * }
 *
 * If no body is provided, it will use environment variables to construct the URL.
 *
 * Production Requirements:
 * - HTTPS is required (except localhost)
 * - Webhook secret is recommended
 * - Ensure NEXTAUTH_URL is set correctly
 */
export async function POST(request: NextRequest) {
  // Production: Optional authentication check
  // Uncomment and implement based on your auth system
  /*
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.WEBHOOK_SETUP_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }
  */
  try {
    const botToken = getBotToken();

    if (!botToken) {
      return NextResponse.json(
        {
          error: "Telegram bot token is not configured",
          details: `Set TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN_${getEnvironment().toUpperCase()}`,
        },
        { status: 400 }
      );
    }

    // Get webhook URL from request body or construct from environment
    let webhookUrl: string | undefined;
    let secretToken: string | undefined;

    try {
      const body = await request.json().catch(() => ({}));
      webhookUrl = body.url;
      secretToken = body.secret_token || getWebhookSecret();
    } catch {
      // If parsing fails, body is empty - use environment-specific URL
      webhookUrl = undefined;
      secretToken = getWebhookSecret();
    }

    // If no URL provided in body, use environment-specific URL
    if (!webhookUrl) {
      webhookUrl = getWebhookUrl();
    }

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "Webhook URL is required",
          details:
            "Could not determine webhook URL. Set NEXTAUTH_URL or provide 'url' in request body.",
        },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL format" },
        { status: 400 }
      );
    }

    // Check if webhook URL is HTTP (Telegram requires HTTPS)
    const isHttp = parsedUrl.protocol === "http:";
    const isLocalhost =
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname.startsWith("192.168.") ||
      parsedUrl.hostname.startsWith("10.");

    if (isHttp && isLocalhost) {
      // For local development, Telegram requires HTTPS
      // User needs to use ngrok or similar tunnel service
      return NextResponse.json(
        {
          error: "HTTPS required for Telegram webhooks",
          details:
            "Telegram requires HTTPS even for local development. Use a tunnel service like ngrok:",
          solution: [
            "1. Install ngrok: https://ngrok.com/",
            "2. Run: ngrok http 3000",
            "3. Use the HTTPS URL from ngrok in the webhook setup",
            "4. Or set webhook manually with:",
            `   curl -X POST http://localhost:3000/api/telegram/webhook/setup \\`,
            `     -H "Content-Type: application/json" \\`,
            `     -d '{"url": "https://your-ngrok-url.ngrok.io/api/telegram/webhook"}'`,
          ],
        },
        { status: 400 }
      );
    }

    // Check if webhook can be set (HTTPS validation for production)
    const webhookCheck = canSetWebhook();
    if (!webhookCheck.allowed && !isLocalhost) {
      return NextResponse.json(
        {
          error: "Cannot set webhook",
          details: webhookCheck.reason,
        },
        { status: 400 }
      );
    }

    // Warn about missing webhook secret in production/preview
    const env = getEnvironment();
    if ((env === "production" || env === "preview") && !secretToken) {
      logger.warn(
        `${env} webhook setup without secret token - this is not recommended`
      );
      // Don't block, but warn
    }

    // Build the Telegram API URL
    const telegramApiUrl = new URL(
      `https://api.telegram.org/bot${botToken}/setWebhook`
    );

    telegramApiUrl.searchParams.set("url", webhookUrl);

    if (secretToken) {
      telegramApiUrl.searchParams.set("secret_token", secretToken);
    }

    // Set allowed updates (optional - specify what updates to receive)
    telegramApiUrl.searchParams.set(
      "allowed_updates",
      JSON.stringify(["message", "callback_query"])
    );

    // Make request to Telegram API
    const response = await fetch(telegramApiUrl.toString(), {
      method: "POST",
    });

    const result = await response.json();

    if (!result.ok) {
      logger.error("Failed to set webhook", result);
      return NextResponse.json(
        {
          error: "Failed to set webhook",
          details: result.description || "Unknown error",
        },
        { status: 400 }
      );
    }

    logger.info("Webhook set successfully", {
      url: webhookUrl,
      hasSecret: !!secretToken,
      environment: getEnvironment(),
    });

    return NextResponse.json({
      success: true,
      message: "Webhook configured successfully",
      webhookUrl,
      environment: getEnvironment(),
      hasSecret: !!secretToken,
      result,
    });
  } catch (error) {
    logger.error("Error setting up webhook", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get current webhook info
 * GET /api/telegram/webhook/setup
 */
export async function GET() {
  try {
    const botToken = getBotToken();

    if (!botToken) {
      return NextResponse.json(
        {
          error: "Telegram bot token is not configured",
          details: `Set TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN_${getEnvironment().toUpperCase()}`,
        },
        { status: 400 }
      );
    }

    // Get webhook info from Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Failed to get webhook info",
          details: result.description || "Unknown error",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      environment: getEnvironment(),
      webhookInfo: result.result,
    });
  } catch (error) {
    logger.error("Error getting webhook info", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Delete webhook
 * DELETE /api/telegram/webhook/setup
 */
export async function DELETE() {
  try {
    const botToken = getBotToken();

    if (!botToken) {
      return NextResponse.json(
        {
          error: "Telegram bot token is not configured",
          details: `Set TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN_${getEnvironment().toUpperCase()}`,
        },
        { status: 400 }
      );
    }

    // Delete webhook
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      {
        method: "POST",
      }
    );

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Failed to delete webhook",
          details: result.description || "Unknown error",
        },
        { status: 400 }
      );
    }

    logger.info("Webhook deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting webhook", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
