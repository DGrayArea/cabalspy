import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { verifyTelegramLogin } from "@/lib/telegramVerify";

/**
 * Link a Telegram account to the currently signed-in user
 * POST /api/auth/link/telegram — body is the Telegram Login Widget payload
 * DELETE /api/auth/link/telegram — unlink (only if another sign-in method exists)
 *
 * Once linked, signing in with either Google/Turnkey or the Telegram widget
 * resolves to the same user (and the same Turnkey wallets).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error("Telegram bot token not configured");
      return NextResponse.json(
        { error: "Telegram authentication not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const verification = verifyTelegramLogin(body, botToken);
    if (!verification.ok) {
      logger.warn("Telegram link verification failed", {
        error: verification.error,
        userId: session.userId,
      });
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    const telegramId = body.id.toString();

    const currentUser = await db.user.findUnique({
      where: { id: session.userId },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.telegramId === telegramId) {
      return NextResponse.json({ success: true, telegramId }); // already linked
    }

    if (currentUser.telegramId) {
      return NextResponse.json(
        { error: "This account is already linked to a different Telegram" },
        { status: 409 }
      );
    }

    const existing = await db.user.findUnique({ where: { telegramId } });
    if (existing) {
      // The Telegram identity already owns another user (and its wallets) —
      // refuse rather than silently merging or stealing it.
      return NextResponse.json(
        {
          error:
            "This Telegram account is already linked to another user. Sign in with Telegram to access that account.",
        },
        { status: 409 }
      );
    }

    await db.user.update({
      where: { id: currentUser.id },
      data: {
        telegramId,
        avatar: currentUser.avatar || body.photo_url || undefined,
      },
    });

    logger.info("Linked Telegram to user", {
      userId: currentUser.id,
      telegramId,
    });

    return NextResponse.json({ success: true, telegramId });
  } catch (error) {
    logger.error("Telegram link error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.userId },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!currentUser.telegramId) {
      return NextResponse.json({ success: true }); // nothing to unlink
    }

    // Don't let the user remove their only way of signing in
    if (!currentUser.email && !currentUser.googleId && !currentUser.discordId) {
      return NextResponse.json(
        {
          error:
            "Telegram is the only sign-in method on this account. Link another method before unlinking it.",
        },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: currentUser.id },
      data: { telegramId: null },
    });

    logger.info("Unlinked Telegram from user", { userId: currentUser.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Telegram unlink error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
