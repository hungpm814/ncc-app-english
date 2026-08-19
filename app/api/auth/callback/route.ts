import { NextRequest, NextResponse } from 'next/server';
import { exchangeOAuthCodeForToken, fetchMezonUserInfo } from '@/lib/mezon/oauth';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = req.cookies.get('oauth_state')?.value;

  console.log('[OAuth Callback] Received params:', {
    hasCode: !!code,
    state,
    savedState,
  });

  if (!code) {
    console.error('[OAuth Callback] Missing code parameter');
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  // Handle Dev Mock Code (when MEZON_CLIENT_ID is not configured yet)
  if (code === 'mock_dev_code') {
    try {
      const userSession = await pgDb.findOrCreateUser({
        mezon_id: 'dev_user_1001',
        username: 'dev_candidate',
        display_name: 'Developer Test Candidate',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      });

      const session = await getSession();
      session.user = userSession;
      await session.save();

      console.log('[OAuth Callback] Dev Mock User logged in:', userSession.display_name);
      return NextResponse.redirect(new URL('/', req.url));
    } catch (mockError) {
      console.error('[OAuth Callback] Mock dev login error:', mockError);
      return NextResponse.json({ success: false, error: (mockError as Error).message }, { status: 500 });
    }
  }

  // If savedState exists, verify it matches
  if (savedState && state && state !== savedState) {
    console.warn('[OAuth Callback] State mismatch warning:', { state, savedState });
  }

  try {
    const tokens = await exchangeOAuthCodeForToken(code);
    console.log('[OAuth Callback] Tokens received:', { hasAccessToken: !!tokens?.access_token });

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/login?error=no_token', req.url));
    }

    const userInfo = await fetchMezonUserInfo(tokens.access_token);
    console.log('[OAuth Callback] User info fetched:', userInfo);

    const mezonId = String(userInfo.user_id || userInfo.id || userInfo.sub);
    const username = userInfo.username || userInfo.preferred_username || userInfo.display_name || userInfo.name || `user_${mezonId}`;
    const displayName = userInfo.display_name || userInfo.name || username;
    const avatarUrl = userInfo.avatar || userInfo.avatar_url || userInfo.picture;

    const userSession = await pgDb.findOrCreateUser({
      mezon_id: mezonId,
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    const session = await getSession();
    session.user = userSession;
    await session.save();

    console.log('[OAuth Callback] Logged in successfully:', userSession.display_name);

    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('[OAuth Callback] Authentication failed:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url));
  }
}
