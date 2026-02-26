import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createHmac, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { syncUserWallets } from '@/lib/walletSync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    if (!id || !auth_date || !hash) {
      return NextResponse.json(
        { error: 'Missing required Telegram auth data' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error('Telegram bot token not configured');
      return NextResponse.json(
        { error: 'Telegram authentication not configured' },
        { status: 500 }
      );
    }

    const dataCheckString = Object.keys(body)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${body[key]}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      logger.warn('Invalid Telegram auth hash', { received: hash, calculated: calculatedHash });
      return NextResponse.json(
        { error: 'Invalid authentication hash' },
        { status: 401 }
      );
    }

    const authDate = parseInt(auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    if (timeDiff > 86400) {
      logger.warn('Telegram auth expired', { authDate, currentTime, timeDiff });
      return NextResponse.json(
        { error: 'Authentication expired' },
        { status: 401 }
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
    const expiresAt = new Date(Date.now() + 86400 * 7 * 1000); // 7 days

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
      maxAge: 86400 * 7,
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

