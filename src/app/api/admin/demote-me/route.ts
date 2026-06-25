import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Demote user and clear Discord ID so they can test linking again from scratch
    await db.user.update({
      where: { id: session.userId },
      data: {
        accessLevel: "user",
        discordId: null, // Clear Discord ID to test link from scratch
      }
    });

    // Delete session from DB
    await db.session.delete({
      where: { token: session.token },
    }).catch(() => {});

    // Create a redirect response to /auth and clear the cookie
    const url = new URL('/auth', request.url);
    const response = NextResponse.redirect(url);
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error("Demote error:", error);
    return NextResponse.json({ error: "Failed to demote" }, { status: 500 });
  }
}
