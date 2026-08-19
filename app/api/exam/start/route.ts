import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';

export async function POST() {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please login with Mezon.' }, { status: 401 });
  }

  try {
    const attempt = await pgDb.createAttempt(session.user.user_id, 900); // 15 minutes time limit

    // Return attempt with questions stripped of correct answers
    const questions = await pgDb.getQuestionsByIds(attempt.question_ids);
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
  } catch (error) {
    console.error('[POST /api/exam/start] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start exam' }, { status: 500 });
  }
}
