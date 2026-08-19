import { Pool } from 'pg';
import { ExamAttempt, Question, UserSession } from '@/types';
import { SEED_QUESTIONS } from '@/lib/exam/questions';
import { SEED_IELTS_TOPICS } from '@/lib/ielts/questions';
import { IELTSSpeakingAttempt, IELTSSpeakingResponse, IELTSSpeakingTopic, IELTSSpeakingStatus, IELTSPart, IELTSScoreResult } from '@/types/ielts';

// Global PostgreSQL connection pool instance for Next.js hot-reload handling
const globalForPg = global as unknown as { pgPool: Pool; dbInitialized?: boolean };

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const pool =
  globalForPg.pgPool ||
  (connectionString
    ? new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
    : new Pool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '8104', 10),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '123qwe',
        database: process.env.DB_NAME || 'ncc_app_english',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }));

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

let isInitializing = false;

// Auto initialize schema & seed questions & IELTS topics
export async function ensureDbInitialized() {
  if (globalForPg.dbInitialized || isInitializing) return;
  isInitializing = true;

  try {
    const client = await pool.connect();
    try {
      // 1. Create tables if not exist
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        DO $$ BEGIN
            CREATE TYPE section_enum AS ENUM ('grammar', 'vocabulary', 'reading');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
            CREATE TYPE difficulty_enum AS ENUM ('easy', 'medium', 'hard');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
            CREATE TYPE attempt_status_enum AS ENUM ('in_progress', 'submitted', 'abandoned');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
            CREATE TYPE result_status_enum AS ENUM ('none', 'partial', 'full');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            mezon_id TEXT UNIQUE NOT NULL,
            mezon_username TEXT,
            display_name TEXT,
            avatar_url TEXT,
            clan_member BOOLEAN DEFAULT FALSE,
            clan_joined_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            section section_enum NOT NULL,
            difficulty difficulty_enum NOT NULL,
            question_text TEXT NOT NULL,
            reading_passage TEXT,
            options JSONB NOT NULL,
            correct_option_id TEXT NOT NULL,
            explanation TEXT,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS attempts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            status attempt_status_enum DEFAULT 'in_progress',
            result_status result_status_enum DEFAULT 'none',
            started_at TIMESTAMPTZ DEFAULT NOW(),
            submitted_at TIMESTAMPTZ,
            time_limit_seconds INT DEFAULT 900,
            raw_score INT,
            weighted_score INT,
            max_weighted_score INT DEFAULT 57,
            cefr_level TEXT,
            skill_scores JSONB,
            unlocked BOOLEAN DEFAULT FALSE,
            unlocked_at TIMESTAMPTZ,
            question_ids TEXT[] NOT NULL
        );

        CREATE TABLE IF NOT EXISTS answers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            attempt_id TEXT REFERENCES attempts(id) ON DELETE CASCADE,
            question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
            selected_option_id TEXT,
            is_correct BOOLEAN,
            answered_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_attempt_question UNIQUE(attempt_id, question_id)
        );

        CREATE TABLE IF NOT EXISTS clan_membership_cache (
            mezon_id TEXT PRIMARY KEY,
            clan_id TEXT NOT NULL,
            is_member BOOLEAN NOT NULL,
            checked_at TIMESTAMPTZ DEFAULT NOW(),
            source TEXT DEFAULT 'verify_api'
        );

        CREATE TABLE IF NOT EXISTS ielts_speaking_topics (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            part1_questions JSONB NOT NULL,
            part2_cue_card JSONB NOT NULL,
            part3_questions JSONB NOT NULL,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ielts_speaking_attempts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            topic_id TEXT REFERENCES ielts_speaking_topics(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'in_progress',
            current_part TEXT DEFAULT 'part1',
            started_at TIMESTAMPTZ DEFAULT NOW(),
            submitted_at TIMESTAMPTZ,
            part2_notes TEXT,
            overall_band NUMERIC(3, 1),
            score_result JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ielts_speaking_responses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            attempt_id TEXT REFERENCES ielts_speaking_attempts(id) ON DELETE CASCADE,
            question_id TEXT NOT NULL,
            part TEXT NOT NULL,
            audio_url TEXT,
            transcript TEXT,
            duration_seconds INT DEFAULT 0,
            answered_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_ielts_attempt_question UNIQUE(attempt_id, question_id)
        );
      `);

      // 2. Check if questions table is populated
      const { rows: qRows } = await client.query('SELECT COUNT(*) as count FROM questions');
      if (parseInt(qRows[0].count, 10) === 0) {
        for (const q of SEED_QUESTIONS) {
          await client.query(
            `INSERT INTO questions (id, section, difficulty, question_text, reading_passage, options, correct_option_id, explanation)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [
              q.id,
              q.section,
              q.difficulty,
              q.question_text,
              q.reading_passage || null,
              JSON.stringify(q.options),
              q.correct_option_id || '',
              q.explanation || null,
            ]
          );
        }
        console.log(`[PostgreSQL] Seeded ${SEED_QUESTIONS.length} exam questions into DB.`);
      }

      // 3. Seed IELTS topics if empty
      const { rows: ieltsRows } = await client.query('SELECT COUNT(*) as count FROM ielts_speaking_topics');
      if (parseInt(ieltsRows[0].count, 10) === 0) {
        for (const t of SEED_IELTS_TOPICS) {
          await client.query(
            `INSERT INTO ielts_speaking_topics (id, title, category, part1_questions, part2_cue_card, part3_questions)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
              t.id,
              t.title,
              t.category,
              JSON.stringify(t.part1_questions),
              JSON.stringify(t.part2_cue_card),
              JSON.stringify(t.part3_questions),
            ]
          );
        }
        console.log(`[PostgreSQL] Seeded ${SEED_IELTS_TOPICS.length} IELTS Speaking topics into DB.`);
      }

      // 4. Clear legacy multiple-choice exam attempt data safely & clean empty spammed IELTS attempts
      try {
        await client.query('DELETE FROM answers; DELETE FROM attempts;');
        await client.query(`
          DELETE FROM ielts_speaking_attempts
          WHERE status = 'in_progress'
            AND id NOT IN (SELECT DISTINCT attempt_id FROM ielts_speaking_responses WHERE attempt_id IS NOT NULL);
        `);
      } catch {
        // Ignore if tables are empty or do not exist
      }

      globalForPg.dbInitialized = true;
      console.log('[PostgreSQL] Database tables & schema initialized successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[PostgreSQL Initialization Error]:', err);
  } finally {
    isInitializing = false;
  }
}

export const pgDb = {
  async findOrCreateUser(mezonData: {
    mezon_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  }): Promise<UserSession> {
    await ensureDbInitialized();
    const query = `
      INSERT INTO users (mezon_id, mezon_username, display_name, avatar_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (mezon_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING id, mezon_id, mezon_username, display_name, avatar_url, clan_member;
    `;
    const values = [
      mezonData.mezon_id,
      mezonData.username,
      mezonData.display_name || mezonData.username,
      mezonData.avatar_url || null,
    ];

    const { rows } = await pool.query(query, values);
    const u = rows[0];

    return {
      user_id: u.id,
      mezon_id: u.mezon_id,
      mezon_username: u.mezon_username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      clan_member: u.clan_member,
      isLoggedIn: true,
    };
  },

  async createAttempt(userId: string, timeLimitSeconds: number = 900): Promise<ExamAttempt> {
    await ensureDbInitialized();

    const { rows: questionRows } = await pool.query('SELECT id FROM questions WHERE active = true ORDER BY RANDOM() LIMIT 20');
    let questionIds = questionRows.map((r) => r.id);

    if (questionIds.length === 0) {
      questionIds = SEED_QUESTIONS.map((q) => q.id);
    }

    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const query = `
      INSERT INTO attempts (id, user_id, status, result_status, time_limit_seconds, max_weighted_score, unlocked, question_ids)
      VALUES ($1, $2, 'in_progress', 'none', $3, $4, false, $5)
      RETURNING *;
    `;
    const values = [attemptId, userId, timeLimitSeconds, questionIds.length, questionIds];

    const { rows } = await pool.query(query, values);
    const att = rows[0];

    return {
      id: att.id,
      user_id: att.user_id,
      status: att.status,
      result_status: att.result_status,
      started_at: att.started_at.toISOString(),
      time_limit_seconds: att.time_limit_seconds,
      max_weighted_score: att.max_weighted_score,
      unlocked: att.unlocked,
      question_ids: att.question_ids,
      answers: {},
    };
  },

  async getAttempt(attemptId: string): Promise<ExamAttempt | null> {
    await ensureDbInitialized();
    const query = `SELECT * FROM attempts WHERE id = $1`;
    const { rows } = await pool.query(query, [attemptId]);
    if (rows.length === 0) return null;

    const att = rows[0];

    const answersQuery = `SELECT question_id, selected_option_id FROM answers WHERE attempt_id = $1`;
    const { rows: ansRows } = await pool.query(answersQuery, [attemptId]);
    const answersRecord: Record<string, string> = {};
    ansRows.forEach((r) => {
      if (r.selected_option_id) {
        answersRecord[r.question_id] = r.selected_option_id;
      }
    });

    return {
      id: att.id,
      user_id: att.user_id,
      status: att.status,
      result_status: att.result_status,
      started_at: new Date(att.started_at).toISOString(),
      submitted_at: att.submitted_at ? new Date(att.submitted_at).toISOString() : undefined,
      time_limit_seconds: att.time_limit_seconds,
      raw_score: att.raw_score,
      weighted_score: att.weighted_score,
      max_weighted_score: att.max_weighted_score,
      cefr_level: att.cefr_level,
      unlocked: att.unlocked,
      question_ids: att.question_ids,
      answers: answersRecord,
    };
  },

  async saveAnswer(attemptId: string, questionId: string, optionId: string): Promise<ExamAttempt | null> {
    await ensureDbInitialized();
    const upsertQuery = `
      INSERT INTO answers (attempt_id, question_id, selected_option_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id, answered_at = NOW();
    `;
    await pool.query(upsertQuery, [attemptId, questionId, optionId]);

    return this.getAttempt(attemptId);
  },

  async updateAttempt(attemptId: string, updates: Partial<ExamAttempt>): Promise<ExamAttempt | null> {
    await ensureDbInitialized();

    const fields: string[] = [];
    const values: unknown[] = [attemptId];
    let paramIndex = 2;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.result_status !== undefined) {
      fields.push(`result_status = $${paramIndex++}`);
      values.push(updates.result_status);
    }
    if (updates.submitted_at !== undefined) {
      fields.push(`submitted_at = $${paramIndex++}`);
      values.push(updates.submitted_at);
    }
    if (updates.raw_score !== undefined) {
      fields.push(`raw_score = $${paramIndex++}`);
      values.push(updates.raw_score);
    }
    if (updates.weighted_score !== undefined) {
      fields.push(`weighted_score = $${paramIndex++}`);
      values.push(updates.weighted_score);
    }
    if (updates.max_weighted_score !== undefined) {
      fields.push(`max_weighted_score = $${paramIndex++}`);
      values.push(updates.max_weighted_score);
    }
    if (updates.cefr_level !== undefined) {
      fields.push(`cefr_level = $${paramIndex++}`);
      values.push(updates.cefr_level);
    }
    if (updates.unlocked !== undefined) {
      fields.push(`unlocked = $${paramIndex++}`);
      values.push(updates.unlocked);
    }

    if (fields.length > 0) {
      const updateQuery = `UPDATE attempts SET ${fields.join(', ')} WHERE id = $1`;
      await pool.query(updateQuery, values);
    }

    return this.getAttempt(attemptId);
  },

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    await ensureDbInitialized();
    if (!ids || ids.length === 0) return [];

    const query = `SELECT * FROM questions WHERE id = ANY($1)`;
    const { rows } = await pool.query(query, [ids]);

    return rows.map((r) => ({
      id: r.id,
      section: r.section,
      difficulty: r.difficulty,
      question_text: r.question_text,
      reading_passage: r.reading_passage || undefined,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
      correct_option_id: r.correct_option_id,
      explanation: r.explanation || undefined,
    }));
  },

  async updateUserClanMembership(mezonId: string, isMember: boolean): Promise<void> {
    await ensureDbInitialized();
    await pool.query(
      `UPDATE users SET clan_member = $1, clan_joined_at = NOW() WHERE mezon_id = $2`,
      [isMember, mezonId]
    );
  },

  // ============================================================
  // IELTS SPEAKING DATABASE HELPERS
  // ============================================================
  async getIELTSTopics(): Promise<IELTSSpeakingTopic[]> {
    await ensureDbInitialized();
    const query = `SELECT * FROM ielts_speaking_topics WHERE active = true ORDER BY created_at DESC`;
    const { rows } = await pool.query(query);
    if (rows.length === 0) return SEED_IELTS_TOPICS;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      part1_questions: typeof r.part1_questions === 'string' ? JSON.parse(r.part1_questions) : r.part1_questions,
      part2_cue_card: typeof r.part2_cue_card === 'string' ? JSON.parse(r.part2_cue_card) : r.part2_cue_card,
      part3_questions: typeof r.part3_questions === 'string' ? JSON.parse(r.part3_questions) : r.part3_questions,
    }));
  },

  async getIELTSTopic(id: string): Promise<IELTSSpeakingTopic | null> {
    await ensureDbInitialized();
    const query = `SELECT * FROM ielts_speaking_topics WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return SEED_IELTS_TOPICS.find((t) => t.id === id) || SEED_IELTS_TOPICS[0];
    }
    const r = rows[0];
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      part1_questions: typeof r.part1_questions === 'string' ? JSON.parse(r.part1_questions) : r.part1_questions,
      part2_cue_card: typeof r.part2_cue_card === 'string' ? JSON.parse(r.part2_cue_card) : r.part2_cue_card,
      part3_questions: typeof r.part3_questions === 'string' ? JSON.parse(r.part3_questions) : r.part3_questions,
    };
  },

  async createIELTSAttempt(userId: string, topicId: string): Promise<IELTSSpeakingAttempt> {
    await ensureDbInitialized();
    const topic = await this.getIELTSTopic(topicId);

    // Cancel any older 'in_progress' attempts for this user
    await pool.query(
      `UPDATE ielts_speaking_attempts SET status = 'cancelled' WHERE user_id = $1 AND status = 'in_progress'`,
      [userId]
    );

    const attemptId = `ielts-att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const query = `
      INSERT INTO ielts_speaking_attempts (id, user_id, topic_id, status, current_part)
      VALUES ($1, $2, $3, 'in_progress', 'part1')
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [attemptId, userId, topicId]);
    const r = rows[0];

    return {
      id: r.id,
      user_id: r.user_id,
      topic_id: r.topic_id,
      topic_title: topic?.title || 'IELTS Speaking Topic',
      status: r.status as IELTSSpeakingStatus,
      current_part: r.current_part as IELTSPart,
      started_at: r.started_at.toISOString(),
      responses: {},
    };
  },

  async getIELTSAttempt(attemptId: string): Promise<IELTSSpeakingAttempt | null> {
    await ensureDbInitialized();
    const query = `SELECT * FROM ielts_speaking_attempts WHERE id = $1`;
    const { rows } = await pool.query(query, [attemptId]);
    if (rows.length === 0) return null;
    const r = rows[0];

    const topic = await this.getIELTSTopic(r.topic_id);

    // Get responses
    const resQuery = `SELECT * FROM ielts_speaking_responses WHERE attempt_id = $1`;
    const { rows: resRows } = await pool.query(resQuery, [attemptId]);
    const responsesRecord: Record<string, IELTSSpeakingResponse> = {};

    resRows.forEach((ans) => {
      responsesRecord[ans.question_id] = {
        question_id: ans.question_id,
        part: ans.part as IELTSPart,
        audio_url: ans.audio_url || undefined,
        transcript: ans.transcript || undefined,
        duration_seconds: ans.duration_seconds || 0,
        answered_at: ans.answered_at ? new Date(ans.answered_at).toISOString() : undefined,
      };
    });

    return {
      id: r.id,
      user_id: r.user_id,
      topic_id: r.topic_id,
      topic_title: topic?.title || 'IELTS Speaking Topic',
      status: r.status as IELTSSpeakingStatus,
      current_part: r.current_part as IELTSPart,
      started_at: new Date(r.started_at).toISOString(),
      submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : undefined,
      part2_notes: r.part2_notes || undefined,
      band_score: r.overall_band ? parseFloat(r.overall_band) : undefined,
      responses: responsesRecord,
    };
  },

  async saveIELTSResponse(
    attemptId: string,
    questionId: string,
    part: IELTSPart,
    audioUrl?: string,
    transcript?: string,
    durationSeconds: number = 0
  ): Promise<IELTSSpeakingAttempt | null> {
    await ensureDbInitialized();
    const query = `
      INSERT INTO ielts_speaking_responses (attempt_id, question_id, part, audio_url, transcript, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET audio_url = EXCLUDED.audio_url, transcript = EXCLUDED.transcript, duration_seconds = EXCLUDED.duration_seconds, answered_at = NOW();
    `;
    await pool.query(query, [attemptId, questionId, part, audioUrl || null, transcript || null, durationSeconds]);
    return this.getIELTSAttempt(attemptId);
  },

  async saveIELTSPart2Notes(attemptId: string, notes: string): Promise<void> {
    await ensureDbInitialized();
    await pool.query(`UPDATE ielts_speaking_attempts SET part2_notes = $1 WHERE id = $2`, [notes, attemptId]);
  },

  async updateIELTSAttemptStatus(
    attemptId: string,
    status: IELTSSpeakingStatus,
    currentPart: IELTSPart,
    overallBand?: number,
    scoreResult?: IELTSScoreResult
  ): Promise<IELTSSpeakingAttempt | null> {
    await ensureDbInitialized();
    const query = `
      UPDATE ielts_speaking_attempts
      SET status = $1, current_part = $2, overall_band = $3, score_result = $4, submitted_at = NOW()
      WHERE id = $5;
    `;
    await pool.query(query, [status, currentPart, overallBand || null, scoreResult ? JSON.stringify(scoreResult) : null, attemptId]);
    return this.getIELTSAttempt(attemptId);
  },

  async cancelIELTSAttempt(attemptId: string): Promise<void> {
    await ensureDbInitialized();
    await pool.query(
      `UPDATE ielts_speaking_attempts SET status = 'cancelled' WHERE id = $1 AND status != 'submitted'`,
      [attemptId]
    );
  },

  async getUserIELTSAttempts(userId: string): Promise<IELTSSpeakingAttempt[]> {
    await ensureDbInitialized();
    const query = `
      SELECT a.*, t.title as topic_title
      FROM ielts_speaking_attempts a
      LEFT JOIN ielts_speaking_topics t ON a.topic_id = t.id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      topic_id: r.topic_id,
      topic_title: r.topic_title || 'IELTS Speaking Topic',
      status: r.status as IELTSSpeakingStatus,
      current_part: r.current_part as IELTSPart,
      started_at: new Date(r.started_at).toISOString(),
      submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : undefined,
      part2_notes: r.part2_notes || undefined,
      band_score: r.overall_band ? parseFloat(r.overall_band) : undefined,
      responses: {},
    }));
  },
};
