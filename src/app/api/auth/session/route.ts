import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/auth';
import {
  ROLE_RECHECK_INTERVAL_MS,
  fetchGuildRoles,
  resolveAccessLevel,
} from '@/lib/discordRoles';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Run the shared guard first so the idle timeout is enforced here too —
    // otherwise the UI would keep showing a logged-in user whose API calls
    // have already started coming back 401.
    const active = await getSession(request);
    if (!active) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    const session = await db.session.findUnique({
      where: { token: sessionToken },
    });

    if (!session) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    // Check if the DB session has expired
    if (session.expiresAt && session.expiresAt < new Date()) {
      await db.session.delete({ where: { token: sessionToken } }).catch(() => {});
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    let user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    // Re-verify Discord roles periodically so access is revoked when a user
    // loses their role or leaves the server (cached for an hour; never
    // downgrades on a Discord outage — see lib/discordRoles).
    if (
      user.discordId &&
      (!user.rolesCheckedAt ||
        Date.now() - user.rolesCheckedAt.getTime() > ROLE_RECHECK_INTERVAL_MS)
    ) {
      const result = await fetchGuildRoles(user.discordId);
      const nextLevel = resolveAccessLevel(user.accessLevel, result);
      if (result.status !== 'unavailable') {
        if (nextLevel !== user.accessLevel) {
          logger.info('Discord role re-check changed access level', {
            userId: user.id,
            from: user.accessLevel,
            to: nextLevel,
          });
        }
        user = await db.user.update({
          where: { id: user.id },
          data: {
            accessLevel: nextLevel,
            discordRoles: result.status === 'ok' ? result.roles : [],
            rolesCheckedAt: new Date(),
          },
        });
      }
    }

    const wallet = await db.wallet.findFirst({
      where: { userId: user.id, network: 'solana' },
    });

    const bnbWallet = await db.wallet.findFirst({
      where: { userId: user.id, network: 'bnb' },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        telegramId: user.telegramId,
        googleId: user.googleId,
        discordId: user.discordId,
        accessLevel: user.accessLevel,
        roles: user.discordRoles,
      },
      wallet: wallet ? {
        address: wallet.address,
        network: wallet.network,
      } : null,
      bnbWallet: bnbWallet ? {
        address: bnbWallet.address,
        network: bnbWallet.network,
      } : null,
    });
  } catch (error) {
    logger.error('Session check error', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (sessionToken) {
      await db.session.delete({
        where: { token: sessionToken },
      }).catch(() => {}); // Ignore if already deleted
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session');
    return response;
  } catch (error) {
    logger.error('Logout error', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
