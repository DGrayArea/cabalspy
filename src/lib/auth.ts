import { NextRequest } from "next/server";
import { db } from "./db";

export interface SessionData {
  userId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Idle timeout, mirroring the 4h timer in AuthContext.
 *
 * That timer was browser-only: it cleared local state, but the session row
 * stayed valid for its full 3-day life, so anything holding the cookie could
 * keep calling the API long after the user appeared to be logged out. This
 * enforces the same window server-side.
 */
const INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000;

/** Only touch the DB when the timestamp is meaningfully stale. */
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export async function getSession(req: NextRequest): Promise<SessionData | null> {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return null;
    }

    const session = await db.session.findUnique({
      where: { token: sessionToken },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const now = Date.now();
    const lastActive = session.lastActiveAt?.getTime() ?? session.createdAt.getTime();
    const idleFor = now - lastActive;

    if (idleFor > INACTIVITY_LIMIT_MS) {
      // Idle too long — drop the session rather than silently extending it.
      await db.session.delete({ where: { token: sessionToken } }).catch(() => {});
      return null;
    }

    // Refresh the activity stamp, but not on every single request.
    if (idleFor > ACTIVITY_WRITE_INTERVAL_MS) {
      await db.session
        .update({
          where: { token: sessionToken },
          data: { lastActiveAt: new Date(now) },
        })
        .catch(() => {});
    }

    return {
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    console.error("[GET_SESSION]", error);
    return null;
  }
}
