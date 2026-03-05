import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const session = await db.session.findUnique({
      where: { token: sessionToken },
    });

    if (!session) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    const wallet = await db.wallet.findFirst({
      where: { userId: user.id, network: 'solana' },
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
      },
      wallet: wallet ? {
        address: wallet.address,
        network: wallet.network,
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
