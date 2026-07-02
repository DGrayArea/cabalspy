import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncUserWallets } from "@/lib/walletSync";
import { logger } from "@/lib/logger";
import { isSuperAdmin } from "@/lib/adminAuth";
import { randomBytes } from "crypto";

/**
 * Synchronize Turnkey authentication with backend session
 * POST /api/auth/sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tkUserId, email, name, avatar } = body;

    if (!tkUserId) {
      return NextResponse.json(
        { error: "Missing Turnkey user ID" },
        { status: 400 }
      );
    }

    logger.info("Syncing Turnkey user", { tkUserId, email });

    // 1. Find or create user — look up by googleId FIRST (exact match),
    //    then by email as a secondary fallback. Using an OR across both
    //    fields can silently return the wrong user if two accounts share
    //    an email address or if Turnkey reuses cached credentials.
    let user = await db.user.findFirst({
      where: { googleId: tkUserId }
    });

    if (!user && email) {
      // Only fall back to email lookup if there is no googleId-linked user
      user = await db.user.findFirst({
        where: { email, googleId: null } // only match unlinked email users
      });
    }

    if (!user) {
      user = await db.user.create({
        data: {
          name: name || email || "Anonymous",
          email: email || null,
          googleId: tkUserId,
          avatar: avatar || null,
        }
      });
      logger.info("Created new user via Turnkey sync", { userId: user.id });
    } else if (!user.googleId) {
      // Link Google ID if it wasn't linked yet
      user = await db.user.update({
        where: { id: user.id },
        data: { googleId: tkUserId }
      });
      logger.info("Linked Google ID to existing user", { userId: user.id });
    }

    // The super admin is always an admin — enforce on every sign-in.
    // Set SUPER_ADMIN_AUTO_PROMOTE=false to pause this (e.g. to test the
    // Discord role-gating flow with the super admin account).
    if (
      process.env.SUPER_ADMIN_AUTO_PROMOTE !== "false" &&
      isSuperAdmin(user) &&
      user.accessLevel !== "admin"
    ) {
      user = await db.user.update({
        where: { id: user.id },
        data: { accessLevel: "admin" },
      });
      logger.info("Auto-promoted super admin", { userId: user.id });
    }

    // 2. Sync wallets (Non-blocking for the session)
    try {
      await syncUserWallets(user.id, user.name);
    } catch (walletError) {
      logger.error("Non-critical error: Wallet sync failed during auth sync", walletError);
      // We continue since the user is authenticated, we can fix wallets later
    }

    // 3. Delete any stale sessions for this user before creating a new one.
    //    This prevents a previous account's session token from remaining
    //    valid in the browser after the user switches Google accounts.
    await db.session.deleteMany({ where: { userId: user.id } }).catch(() => {});

    // 4. Create session
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 86400 * 3 * 1000); // 3 days

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // 4. Set cookie and return
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        accessLevel: user.accessLevel,
      }
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 3,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error("Error in auth sync:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown synchronization error";
    return NextResponse.json(
      { error: "Failed to synchronize session", message: errorMessage },
      { status: 500 }
    );
  }
}
