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

    // Turnkey only hands us an email for Google sign-in; email-OTP users
    // arrive with just an auto-generated username, so treat the presence of
    // an email as the signal for which method was used.
    const method = email ? "google" : "email";

    // 1. Find or create user — match on the Turnkey user id first (exact),
    //    then email as a secondary fallback. Using an OR across both fields
    //    can silently return the wrong user if two accounts share an email.
    let user = await db.user.findFirst({
      where: { turnkeyUserId: tkUserId }
    });

    if (!user && email) {
      // Same person signing in the other way (Google <-> email OTP) — link to
      // the existing account rather than creating a duplicate with its own
      // wallets. This is what the whitelisted Google client id enables.
      user = await db.user.findFirst({ where: { email } });
    }

    if (!user) {
      user = await db.user.create({
        data: {
          name: name || email || "Anonymous",
          email: email || null,
          turnkeyUserId: tkUserId,
          authMethod: method,
          // googleId means "a real Google identity", not "any Turnkey user".
          googleId: email ? tkUserId : null,
          avatar: avatar || null,
        }
      });
      logger.info("Created new user via Turnkey sync", { userId: user.id, method });
    } else {
      // Backfill identifiers on an existing account without clobbering
      // anything already set (e.g. a Discord link).
      const patch: Record<string, unknown> = {};
      if (!user.turnkeyUserId) patch.turnkeyUserId = tkUserId;
      if (!user.authMethod) patch.authMethod = method;
      if (!user.googleId && email) patch.googleId = tkUserId;
      if (!user.email && email) patch.email = email;
      if (Object.keys(patch).length > 0) {
        user = await db.user.update({ where: { id: user.id }, data: patch });
        logger.info("Updated identifiers on existing user", { userId: user.id, fields: Object.keys(patch) });
      }
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
