import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    // We need to parse cookies from the request
    const cookieHeader = request.headers.get('cookie');
    let sessionToken = null;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      sessionToken = cookies['session'];
    }

    if (sessionToken) {
      await db.session.delete({
        where: { token: sessionToken },
      }).catch(() => {}); // Ignore if already deleted
    }

    // Redirect to /auth and delete the cookie
    const url = new URL('/auth', request.url);
    const response = NextResponse.redirect(url);
    response.cookies.delete('session');
    
    return response;
  } catch (error) {
    logger.error('Logout redirect error', error);
    const url = new URL('/auth', request.url);
    return NextResponse.redirect(url);
  }
}
