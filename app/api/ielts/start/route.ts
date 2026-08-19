import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pgDb } from '@/lib/db/postgres';

export async function GET() {
  try {
    const topics = await pgDb.getIELTSTopics();
    const topic = topics.length > 0 ? topics[0] : null;
    return NextResponse.json({ success: true, topic, topics });
  } catch (error) {
    console.error('[GET /api/ielts/start] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch topic' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please login first.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topics = await pgDb.getIELTSTopics();
    const topicId = body.topicId || (topics.length > 0 ? topics[0].id : 'topic-tech-innovation');

    const topic = await pgDb.getIELTSTopic(topicId);
    if (!topic) {
      return NextResponse.json({ success: false, error: 'IELTS Topic not found' }, { status: 404 });
    }

    const attempt = await pgDb.createIELTSAttempt(session.user.user_id, topic.id);

    return NextResponse.json({
      success: true,
      attempt,
      topic,
    });
  } catch (error) {
    console.error('[POST /api/ielts/start] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start IELTS Speaking test' }, { status: 500 });
  }
}
