import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';
import { calculateExamResult, getCEFRDescription } from '@/lib/exam/score-calculator';
import { ExamResultResponse } from '@/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession();
  const { attemptId } = await params;

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const attempt = await pgDb.getAttempt(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
    }

    const questions = await pgDb.getQuestionsByIds(attempt.question_ids);

    // If attempt is still in progress, return sanitized questions and attempt state
    if (attempt.status === 'in_progress') {
      const sanitizedQuestions = questions.map((q) => ({
        id: q.id,
        section: q.section,
        difficulty: q.difficulty,
        question_text: q.question_text,
        reading_passage: q.reading_passage,
        options: q.options,
      }));

      return NextResponse.json({
        success: true,
        attempt,
        questions: sanitizedQuestions,
      });
    }

    // Attempt is submitted
    const calculated = calculateExamResult(attempt, questions);
    const levelInfo = getCEFRDescription(calculated.cefr_level);
    const isUnlocked = attempt.unlocked;

    const resultResponse: ExamResultResponse = {
      attempt_id: attemptId,
      status: attempt.status,
      result_status: isUnlocked ? 'full' : 'partial',
      unlocked: isUnlocked,
      cefr_level: calculated.cefr_level,
      level_title: levelInfo.title,
      level_description: levelInfo.description,
      percentage: calculated.percentage,
      percentile_teaser: `Better than ${Math.min(95, Math.max(10, calculated.percentage + 5))}% of recent test takers`,
    };

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
    console.error('[GET /api/exam/[attemptId]] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
