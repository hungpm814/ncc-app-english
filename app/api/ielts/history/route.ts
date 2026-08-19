import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';

export async function GET() {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please login first.' }, { status: 401 });
  }

  try {
    const attempts = await pgDb.getUserIELTSAttempts(session.user.user_id);
    return NextResponse.json({
      success: true,
      attempts,
    });
  } catch (error) {
    console.error('[GET /api/ielts/history] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch attempt history' }, { status: 500 });
  }
}
