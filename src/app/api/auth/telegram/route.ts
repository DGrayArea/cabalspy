import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { syncUserWallets } from '@/lib/walletSync';
import { verifyTelegramLogin } from '@/lib/telegramVerify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, first_name, last_name, username, photo_url } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error('Telegram bot token not configured');
      return NextResponse.json(
        { error: 'Telegram authentication not configured' },
        { status: 500 }
      );
    }

    const verification = verifyTelegramLogin(body, botToken);
    if (!verification.ok) {
      logger.warn('Telegram login verification failed', {
        error: verification.error,
      });
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    let user = await db.user.findUnique({
      where: { telegramId: id.toString() }
    });

    if (!user) {
      user = await db.user.create({
        data: {
          telegramId: id.toString(),
          name: `${first_name} ${last_name || ''}`.trim() || username || 'User',
          avatar: photo_url,
        }
      });
    }

    // Sync all Turnkey wallets
    await syncUserWallets(user.id, user.name);

    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 86400 * 3 * 1000); // 3 days

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt
      }
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        telegramId: user.telegramId,
        username,
        avatar: user.avatar,
      },
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
    logger.error('Telegram auth error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

