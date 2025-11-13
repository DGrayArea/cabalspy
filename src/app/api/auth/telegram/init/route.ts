import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateAuthToken, generateBotLink } from "@/lib/telegramAuth";

/**
 * Initiate Telegram bot authentication
 * GET /api/auth/telegram/init
 *
 * This generates a unique token and returns the bot URL for the user to visit.
 * The user will be redirected to the Telegram bot, which will then send them
 * back to the callback URL with authentication data.
 */
export async function GET(request: NextRequest) {
  try {
    // Generate a unique authentication token
    const token = generateAuthToken();

    // Get the callback URL from the request or use default
    const callbackUrl = new URL(request.url);
    callbackUrl.pathname = "/api/auth/telegram/callback";
    callbackUrl.search = `?token=${token}`;

    // Generate the bot link
    const botLink = generateBotLink(token);

    // Get the base URL for the callback
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const fullCallbackUrl = `${baseUrl}${callbackUrl.pathname}${callbackUrl.search}`;

    logger.info("Telegram auth initiated", {
      token,
      botLink: botLink.substring(0, 50) + "...",
    });

    return NextResponse.json({
      success: true,
      botLink,
      token, // Include token for frontend to track (optional)
      callbackUrl: fullCallbackUrl, // For bot to use
    });
  } catch (error) {
    logger.error("Failed to initiate Telegram auth", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication" },
      { status: 500 }
    );
  }
}
