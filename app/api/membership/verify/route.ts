import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkMezonClanMembership } from '@/lib/mezon/bot-client';
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

    const isMember = await checkMezonClanMembership(session.user.mezon_id);

    if (!isMember) {
      return NextResponse.json(
        {
          success: false,
          isMember: false,
          message: 'We could not verify your clan membership yet. Please ensure you have joined the clan and try again in a few moments.',
        },
        { status: 200 }
      );
    }

    // Member verified! Update user session & attempt
    session.user.clan_member = true;
    await session.save();

    await pgDb.updateUserClanMembership(session.user.mezon_id, true);

    const updatedAttempt = await pgDb.updateAttempt(attemptId, {
      unlocked: true,
      unlocked_at: new Date().toISOString(),
      result_status: 'full',
    });

    if (!updatedAttempt) {
      return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
    }

    const questions = await pgDb.getQuestionsByIds(updatedAttempt.question_ids);
    const calculated = calculateExamResult(updatedAttempt, questions);
    const levelInfo = getCEFRDescription(calculated.cefr_level);

    const explanations: Record<string, { correct_option_id: string; explanation: string }> = {};
    questions.forEach((q) => {
      if (q.correct_option_id) {
        explanations[q.id] = {
          correct_option_id: q.correct_option_id,
          explanation: q.explanation || 'Refer to grammar guidelines.',
        };
      }
    });

    const resultResponse: ExamResultResponse = {
      attempt_id: attemptId,
      status: updatedAttempt.status,
      result_status: 'full',
      unlocked: true,
      cefr_level: calculated.cefr_level,
      level_title: levelInfo.title,
      level_description: levelInfo.description,
      percentage: calculated.percentage,
      raw_score: calculated.raw_score,
      weighted_score: calculated.weighted_score,
      max_weighted_score: calculated.max_weighted_score,
      skill_scores: calculated.skill_scores,
      weaknesses: calculated.weaknesses,
      recommendations: calculated.recommendations,
      explanations,
    };

    return NextResponse.json({
      success: true,
      isMember: true,
      result: resultResponse,
    });
  } catch (error) {
    console.error('[POST /api/membership/verify] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify clan membership' }, { status: 500 });
  }
}
