import crypto from 'crypto';

export interface MezonUserData {
  id?: string | number;
  user_id?: string | number;
  email?: string;
  username: string;
  display_name: string;
  avatar?: string;
  avatar_url?: string;
  mezon_id?: string;
}

export interface ParsedMezonHashData {
  query_id?: string;
  user: MezonUserData;
  auth_date: number;
  hash: string;
  signature?: string;
}

/**
 * Validates Mezon Channel App Hash Signature.
 *
 * Process:
 * 1. MD5 hash of appSecret.
 * 2. HMAC-SHA256 of string "WebAppData" using step 1 result.
 * 3. HMAC-SHA256 of sorted query params string (before &hash=) using step 2 result.
 */
export function validateMezonHash(appSecret: string, rawHashData: string): boolean {
  if (!appSecret || !rawHashData) return false;

  try {
    const delimiter = '&hash=';
    const index = rawHashData.indexOf(delimiter);
    if (index === -1) return false;

    const queryData = rawHashData.substring(0, index);
    const receivedHash = rawHashData.substring(index + delimiter.length);

    // Step 1: MD5 hash of App Secret
    const hashedSecret = crypto.createHash('md5').update(appSecret).digest('hex');

    // Step 2: HMAC-SHA256 of "WebAppData"
    const secretKey = crypto.createHmac('sha256', hashedSecret).update('WebAppData').digest();

    // Step 3: HMAC-SHA256 of query data
    const computedHash = crypto.createHmac('sha256', secretKey).update(queryData).digest('hex');

    return computedHash === receivedHash;
  } catch (error) {
    console.error('[validateMezonHash] Validation error:', error);
    return false;
  }
}

/**
 * Parses raw decoded Mezon hash string into structured object.
 */
export function parseMezonHashData(rawHashData: string): ParsedMezonHashData | null {
  try {
    const params = new URLSearchParams(rawHashData);
    const userJson = params.get('user');
    const authDateStr = params.get('auth_date');
    const hash = params.get('hash');

    if (!userJson || !hash) return null;

    const user: MezonUserData = JSON.parse(userJson);
    const auth_date = authDateStr ? parseInt(authDateStr, 10) : Math.floor(Date.now() / 1000);

    return {
      query_id: params.get('query_id') || undefined,
      user,
      auth_date,
      hash,
      signature: params.get('signature') || undefined,
    };
  } catch (error) {
    console.error('[parseMezonHashData] Parsing error:', error);
    return null;
  }
}
