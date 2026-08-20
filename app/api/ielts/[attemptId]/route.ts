import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';

export async function GET(req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession();
  const { attemptId } = await params;

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const attempt = await pgDb.getIELTSAttempt(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'IELTS attempt not found' }, { status: 404 });
    }

    const topic = await pgDb.getIELTSTopic(attempt.topic_id);
    if (!topic) {
      return NextResponse.json({ success: false, error: 'IELTS topic not found' }, { status: 404 });
    }

    if (attempt.status === 'submitted') {
      return NextResponse.json({
        success: true,
        attempt,
        topic,
        result: attempt.score_result || null,
      });
    }

    return NextResponse.json({
      success: true,
      attempt,
      topic,
    });
  } catch (error) {
    console.error('[GET /api/ielts/[attemptId]] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch IELTS Speaking attempt' }, { status: 500 });
  }
}
