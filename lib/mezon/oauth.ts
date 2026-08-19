export interface MezonTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface MezonUserInfo {
  id?: string;
  sub?: string;
  user_id?: string;
  username?: string;
  display_name?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  avatar?: string;
  avatar_url?: string;
  picture?: string;
}

export function getMezonOAuthAuthUrl(state: string): string {
  const clientId = process.env.MEZON_CLIENT_ID || '';
  const redirectUri = process.env.MEZON_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid',
    state,
  });

  return `https://oauth2.mezon.ai/oauth2/auth?${params.toString()}`;
}

export async function exchangeOAuthCodeForToken(code: string): Promise<MezonTokenResponse> {
  const clientId = process.env.MEZON_CLIENT_ID || '';
  const clientSecret = process.env.MEZON_CLIENT_SECRET || '';
  const redirectUri = process.env.MEZON_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

  // RFC 6749 Section 2.3.1: URL-encode credentials before base64 for Basic Auth
  const encodedClientId = encodeURIComponent(clientId);
  const encodedClientSecret = encodeURIComponent(clientSecret);
  const basicAuth = Buffer.from(`${encodedClientId}:${encodedClientSecret}`).toString('base64');

  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  let res = await fetch('https://oauth2.mezon.ai/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn('[exchangeOAuthCodeForToken] Basic auth attempt returned:', res.status, errText);

    // Fallback: client_secret_post (Credentials in Body only, without Basic Auth header)
    const postParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const fallbackRes = await fetch('https://oauth2.mezon.ai/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postParams.toString(),
    });

    if (fallbackRes.ok) {
      return fallbackRes.json();
    }

    const fallbackErr = await fallbackRes.text();
    console.error('[exchangeOAuthCodeForToken] Post auth fallback failed:', fallbackRes.status, fallbackErr);
    throw new Error(`Mezon token exchange failed: ${res.status} ${errText}`);
  }

  return res.json();
}

export async function fetchMezonUserInfo(accessToken: string): Promise<MezonUserInfo> {
  const res = await fetch('https://oauth2.mezon.ai/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Mezon userinfo failed: ${res.status} ${errorText}`);
  }

  return res.json();
}
