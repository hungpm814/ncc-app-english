import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';
import { evaluateIELTSAttemptWithAI } from '@/lib/ielts/ai-evaluator';

export const maxDuration = 60; // Extend Vercel function timeout for AI scoring

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { attemptId } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ success: false, error: 'Missing attemptId' }, { status: 400 });
    }

    const attempt = await pgDb.getIELTSAttempt(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'IELTS attempt not found' }, { status: 404 });
    }

    const topic = await pgDb.getIELTSTopic(attempt.topic_id);
    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic not found' }, { status: 404 });
    }

    console.log(`[Re-scoring Attempt]: ${attemptId} with AI...`);

    // Execute AI evaluation
    const scoreResult = await evaluateIELTSAttemptWithAI(attempt, topic);

    // Save updated score result to PostgreSQL
    await pgDb.updateIELTSAttemptStatus(
      attemptId,
      'submitted',
      attempt.current_part || 'part3',
      scoreResult?.overall_band,
      scoreResult || undefined
    );

    return NextResponse.json({
      success: true,
      result: scoreResult,
    });
  } catch (error) {
    console.error('[POST /api/ielts/rescore] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to re-score attempt with AI' },
      { status: 500 }
    );
  }
}
