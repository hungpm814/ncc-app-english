import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';
import { calculateExamResult, getCEFRDescription } from '@/lib/exam/score-calculator';
import { ExamResultResponse } from '@/types';

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

    const attempt = await pgDb.getAttempt(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
    }

    const questions = await pgDb.getQuestionsByIds(attempt.question_ids);
    const calculated = calculateExamResult(attempt, questions);
    const levelInfo = getCEFRDescription(calculated.cefr_level);

    // Update attempt record
    const updatedAttempt = await pgDb.updateAttempt(attemptId, {
      status: 'submitted',
      result_status: attempt.unlocked ? 'full' : 'partial',
      submitted_at: new Date().toISOString(),
      raw_score: calculated.raw_score,
      weighted_score: calculated.weighted_score,
      max_weighted_score: calculated.max_weighted_score,
      cefr_level: calculated.cefr_level,
    });

    const isUnlocked = updatedAttempt?.unlocked || false;

    // Partial response (always visible)
    const resultResponse: ExamResultResponse = {
      attempt_id: attemptId,
      status: 'submitted',
      result_status: isUnlocked ? 'full' : 'partial',
      unlocked: isUnlocked,
      cefr_level: calculated.cefr_level,
      level_title: levelInfo.title,
      level_description: levelInfo.description,
      percentage: calculated.percentage,
      percentile_teaser: `Better than ${Math.min(95, Math.max(10, calculated.percentage + 5))}% of recent test takers`,
    };

    // Include full details ONLY if unlocked
    if (isUnlocked) {
      resultResponse.raw_score = calculated.raw_score;
      resultResponse.weighted_score = calculated.weighted_score;
      resultResponse.max_weighted_score = calculated.max_weighted_score;
      resultResponse.skill_scores = calculated.skill_scores;
      resultResponse.weaknesses = calculated.weaknesses;
      resultResponse.recommendations = calculated.recommendations;

      const explanations: Record<string, { correct_option_id: string; explanation: string }> = {};
      questions.forEach((q) => {
        if (q.correct_option_id) {
          explanations[q.id] = {
            correct_option_id: q.correct_option_id,
            explanation: q.explanation || 'Refer to grammar guidelines.',
          };
        }
      });
      resultResponse.explanations = explanations;
    }

    return NextResponse.json({
      success: true,
      result: resultResponse,
    });
  } catch (error) {
    console.error('[POST /api/exam/submit] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit exam' }, { status: 500 });
  }
}
