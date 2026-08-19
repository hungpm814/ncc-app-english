import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getMezonOAuthAuthUrl } from '@/lib/mezon/oauth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isMock = searchParams.get('mock') === 'true';
  const clientId = process.env.MEZON_CLIENT_ID || '';
  const isPlaceholderClient = !clientId || clientId === 'your_mezon_oauth_client_id';

  // Fallback to Mock Dev Login if Client ID is placeholder or ?mock=true is requested
  if (isMock || isPlaceholderClient) {
    console.log('[Auth Login] Using Dev Mock Login mode (Client ID is placeholder or mock=true).');
    return NextResponse.redirect(new URL('/api/auth/callback?code=mock_dev_code', req.url));
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = getMezonOAuthAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
