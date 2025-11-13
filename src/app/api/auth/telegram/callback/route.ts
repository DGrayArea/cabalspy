import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";
import { verifyAndConsumeToken } from "@/lib/telegramAuth";

/**
 * Telegram bot authentication callback
 * GET /api/auth/telegram/callback?token=TOKEN&id=USER_ID&first_name=NAME&username=USERNAME&hash=HASH
 *
 * This endpoint is called by the Telegram bot after the user clicks the authentication button.
 * The bot should send the user here with their Telegram user data and a verification hash.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const telegramId = searchParams.get("id");
    const firstName = searchParams.get("first_name");
    const lastName = searchParams.get("last_name");
    const username = searchParams.get("username");
    const photoUrl = searchParams.get("photo_url");
    const authDate = searchParams.get("auth_date");
    const hash = searchParams.get("hash");

    // Validate required parameters
    if (!token || !telegramId || !firstName || !hash || !authDate) {
      logger.warn("Missing required Telegram callback parameters");
      return NextResponse.redirect(
        new URL("/?error=missing_params", request.url)
      );
    }

    // Verify the token is valid and not used
    if (!verifyAndConsumeToken(token)) {
      logger.warn("Invalid or expired Telegram auth token", {
        token: token?.substring(0, 20) + "...",
        // In dev, this might be due to hot reload clearing the token store
        hint:
          process.env.NODE_ENV === "development"
            ? "Token store may have been cleared by hot reload. Try again."
            : undefined,
      });
      return NextResponse.redirect(
        new URL("/?error=invalid_token", request.url)
      );
    }

    // Verify the hash from Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error("Telegram bot token not configured");
      return NextResponse.redirect(
        new URL("/?error=server_error", request.url)
      );
    }

    // Build data check string (same as in the main telegram route)
    const dataCheckString = [
      `auth_date=${authDate}`,
      `first_name=${firstName}`,
      `id=${telegramId}`,
      ...(lastName ? [`last_name=${lastName}`] : []),
      ...(username ? [`username=${username}`] : []),
      ...(photoUrl ? [`photo_url=${photoUrl}`] : []),
    ]
      .sort()
      .join("\n");

    // Create secret key from bot token
    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Verify hash
    if (calculatedHash !== hash) {
      logger.warn("Invalid Telegram callback hash", {
        received: hash,
        calculated: calculatedHash,
      });
      return NextResponse.redirect(
        new URL("/?error=invalid_hash", request.url)
      );
    }

    // Check if auth_date is recent (within 24 hours)
    const authDateNum = parseInt(authDate);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDateNum;

    if (timeDiff > 86400) {
      // 24 hours
      logger.warn("Telegram auth expired", {
        authDateNum,
        currentTime,
        timeDiff,
      });
      return NextResponse.redirect(new URL("/?error=expired", request.url));
    }

    // Prepare user data
    const userData = {
      id: telegramId,
      first_name: firstName,
      last_name: lastName || undefined,
      username: username || undefined,
      photo_url: photoUrl || undefined,
      auth_date: authDateNum,
    };

    // Encode user data for URL (to pass to frontend)
    const encodedData = encodeURIComponent(JSON.stringify(userData));

    // Redirect to frontend with auth data
    // The frontend will handle the actual login via AuthContext
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const frontendUrl = new URL("/", baseUrl);
    frontendUrl.searchParams.set("telegram_auth", "success");
    frontendUrl.searchParams.set("data", encodedData);

    logger.info("Telegram auth successful", { telegramId, username });

    return NextResponse.redirect(frontendUrl);
  } catch (error) {
    logger.error("Telegram callback error", error);
    return NextResponse.redirect(new URL("/?error=server_error", request.url));
  }
}
