import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";
import {
  getBotToken,
  getBaseUrl,
  getWebhookSecret,
  getCallbackBaseUrl,
} from "@/lib/telegramConfig";

/**
 * Telegram Bot Webhook Handler
 * POST /api/telegram/webhook
 *
 * This endpoint receives updates from Telegram when users interact with your bot.
 * The bot should be configured to send webhooks to this URL.
 *
 * To set up the webhook, use the setup endpoint:
 * POST /api/telegram/webhook/setup
 *
 * Or use Telegram API directly:
 * curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourdomain.com/api/telegram/webhook"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook secret if configured (optional but recommended)
    const webhookSecret = request.headers.get(
      "x-telegram-bot-api-secret-token"
    );
    const expectedSecret = getWebhookSecret();

    if (expectedSecret && webhookSecret !== expectedSecret) {
      logger.warn("Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle different update types
    if (body.message) {
      await handleMessage(body.message);
    } else if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log error concisely without full stack trace
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Telegram webhook error", new Error(errorMsg));
    // Still return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handle incoming messages from the bot
 */
async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;
  const botToken = getBotToken();

  if (!botToken) {
    logger.error("Telegram bot token not configured");
    return;
  }

  // Handle /start command with token
  if (text && text.startsWith("/start")) {
    const parts = text.split(" ");
    const token = parts.length > 1 ? parts[1] : null;

    if (token) {
      // User came from website with auth token
      // Send them a button to authenticate
      // Use HTTPS URL for callback (required by Telegram for button URLs)
      const baseUrl = await getCallbackBaseUrl();
      const callbackUrl = `${baseUrl}/api/auth/telegram/callback?token=${token}`;

      // Get user info from Telegram
      const userId = message.from.id;
      const firstName = message.from.first_name;
      const lastName = message.from.last_name;
      const username = message.from.username;
      const photoUrl = message.from.photo?.[0]?.file_id; // Note: This is a file_id, not a URL
      const authDate = Math.floor(Date.now() / 1000);

      // Generate hash for verification
      const dataCheckString = [
        `auth_date=${authDate}`,
        `first_name=${firstName}`,
        `id=${userId}`,
        ...(lastName ? [`last_name=${lastName}`] : []),
        ...(username ? [`username=${username}`] : []),
      ]
        .sort()
        .join("\n");

      const secretKey = createHmac("sha256", "WebAppData")
        .update(botToken)
        .digest();

      const hash = createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      // Build callback URL with all auth data
      const authCallbackUrl = new URL(callbackUrl);
      authCallbackUrl.searchParams.set("id", userId.toString());
      authCallbackUrl.searchParams.set("first_name", firstName);
      if (lastName) authCallbackUrl.searchParams.set("last_name", lastName);
      if (username) authCallbackUrl.searchParams.set("username", username);
      authCallbackUrl.searchParams.set("auth_date", authDate.toString());
      authCallbackUrl.searchParams.set("hash", hash);

      // Send message with button
      await sendTelegramMessage(
        botToken,
        chatId,
        "🔐 Click the button below to authenticate with the website:",
        {
          inline_keyboard: [
            [
              {
                text: "✅ Authenticate",
                url: authCallbackUrl.toString(),
              },
            ],
          ],
        }
      );
    } else {
      // Regular /start command without token
      await sendTelegramMessage(
        botToken,
        chatId,
        "👋 Welcome! To authenticate with the website, please use the login button on the website first."
      );
    }
  }
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallbackQuery(callbackQuery: any) {
  // Handle button callbacks if needed
  logger.info("Callback query received", { data: callbackQuery.data });
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: any
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    // Parse error to get just the description
    try {
      const errorJson = JSON.parse(error);
      const errorDesc = errorJson.description || errorJson.error || error;
      logger.error(`Failed to send Telegram message: ${errorDesc}`, undefined, {
        chatId,
      });
    } catch {
      logger.error(
        `Failed to send Telegram message: ${error.substring(0, 200)}`,
        undefined,
        { chatId }
      );
    }
    throw new Error(`Telegram API error: ${error.substring(0, 200)}`);
  }

  return response.json();
}
