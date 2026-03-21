import { NextRequest } from "next/server";
import { db } from "./db";

export interface SessionData {
  userId: string;
  token: string;
  expiresAt: Date;
}

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
