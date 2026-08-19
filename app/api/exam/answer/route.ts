import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { attemptId, questionId, selectedOptionId } = await req.json();

    if (!attemptId || !questionId || !selectedOptionId) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const updated = await pgDb.saveAnswer(attemptId, questionId, selectedOptionId);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      answers: updated.answers,
    });
  } catch (error) {
    console.error('[POST /api/exam/answer] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save answer' }, { status: 500 });
  }
}
