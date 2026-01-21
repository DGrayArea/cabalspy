import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createHmac, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { turnkeyService } from '@/services/turnkey';

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

    let user = await db.getUserByTelegramId(id.toString());

    if (!user) {
      user = await db.createUser({
        telegramId: id.toString(),
        name: `${first_name} ${last_name || ''}`.trim() || username || 'User',
        avatar: photo_url,
      });

      try {
        const walletId = await turnkeyService.createWallet(
          user.id,
          `${user.name}'s Wallet`,
          'solana'
        );

        const walletAccounts = await turnkeyService.getWalletAddresses(walletId);
        const solanaAccount = walletAccounts.find(acc => acc.path === "m/44'/501'/0'/0'");

        if (solanaAccount) {
          await db.createWallet({
            userId: user.id,
            turnkeyWalletId: walletId,
            turnkeyAccountId: solanaAccount.accountId,
            address: solanaAccount.address,
            network: 'solana',
          });
        }
      } catch (walletError) {
        logger.error('Failed to create wallet for user', walletError);
      }
    }

    const sessionToken = randomBytes(32).toString('hex');
    await db.createSession(user.id, sessionToken, 86400 * 7);

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

