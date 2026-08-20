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
    const { attemptId, responses, part2Notes } = await req.json();

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

    // Save notes
    if (part2Notes) {
      await pgDb.saveIELTSPart2Notes(attemptId, part2Notes);
      attempt.part2_notes = part2Notes;
    }

    // Save responses
    if (responses && typeof responses === 'object') {
      for (const [qId, res] of Object.entries(responses)) {
        const item = res as {
          part?: 'part1' | 'part2' | 'part3';
          audio_url?: string;
          audioUrl?: string;
          transcript?: string;
          duration_seconds?: number;
          duration?: number;
        };
        const audioUrl = item.audio_url || item.audioUrl;
        const duration = item.duration_seconds || item.duration || 0;

        await pgDb.saveIELTSResponse(
          attemptId,
          qId,
          item.part || 'part1',
          audioUrl,
          item.transcript,
          duration
        );
      }
    }

    // Save status as 'submitted' to PostgreSQL instantly
    await pgDb.updateIELTSAttemptStatus(attemptId, 'submitted', 'part3');

    return NextResponse.json({
      success: true,
      attemptId,
    });
  } catch (error) {
    console.error('[POST /api/ielts/submit] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit IELTS Speaking test' }, { status: 500 });
  }
}
