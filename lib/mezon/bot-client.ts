/**
 * Verifies if a given user is a member of the target Mezon Clan.
 *
 * In production:
 * - Uses MEZON_BOT_TOKEN to query Mezon Bot API or socket cache
 * - Returns boolean indicating membership status
 */
export async function checkMezonClanMembership(
  mezonUserId: string,
  clanId: string = process.env.MEZON_TARGET_CLAN_ID || 'demo-clan'
): Promise<boolean> {
  const botToken = process.env.MEZON_BOT_TOKEN;

  // Fallback / Mock behavior for dev/testing when no bot token is provided
  if (!botToken || botToken === 'your_bot_token') {
    console.log(`[checkMezonClanMembership] Development mock check for user ${mezonUserId} in clan ${clanId}`);
    // For local testing, allow unlocking if mezonUserId contains 'member' or in mock environment
    return true;
  }

  try {
    // Call Mezon API using bot authorization to check member list/status
    const res = await fetch(`https://api.mezon.ai/v2/clans/${clanId}/users/${mezonUserId}`, {
      headers: {
        Authorization: `Bearer ${botToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return !!data && (data.is_member || data.user_id === mezonUserId);
    }

    // Try fallback search endpoint
    const searchRes = await fetch(`https://api.mezon.ai/v2/clans/${clanId}/members?user_id=${mezonUserId}`, {
      headers: {
        Authorization: `Bearer ${botToken}`,
      },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      return Array.isArray(searchData?.users) && searchData.users.some((u: { id?: string; user_id?: string }) => (u.id || u.user_id) === mezonUserId);
    }

    return false;
  } catch (error) {
    console.error('[checkMezonClanMembership] Error checking membership:', error);
    // Safety fallback for dev if API endpoint is unreachable
    return false;
  }
}
