import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const session = await db.getSessionByToken(sessionToken);

    if (!session) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    const user = await db.getUserById(session.userId);

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('session');
      return response;
    }

    const wallet = await db.getWalletByUserId(user.id, 'solana');

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        telegramId: user.telegramId,
        googleId: user.googleId,
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
      await db.deleteSession(sessionToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session');
    return response;
  } catch (error) {
    logger.error('Logout error', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
