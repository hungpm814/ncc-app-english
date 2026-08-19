-- ============================================================
-- PostgreSQL Schema for NCC English Exam App (ncc-app-english)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
DO $$ BEGIN
    CREATE TYPE section_enum AS ENUM ('grammar', 'vocabulary', 'reading');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_enum AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attempt_status_enum AS ENUM ('in_progress', 'submitted', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE result_status_enum AS ENUM ('none', 'partial', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
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

-- 2. Questions Table
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

-- 3. Attempts Table
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

-- 4. Answers Table
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id TEXT REFERENCES attempts(id) ON DELETE CASCADE,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id TEXT,
    is_correct BOOLEAN,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_attempt_question UNIQUE(attempt_id, question_id)
);

-- 5. Clan Membership Cache
CREATE TABLE IF NOT EXISTS clan_membership_cache (
    mezon_id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    is_member BOOLEAN NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'verify_api'
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section, active);

-- 6. IELTS Speaking Topics Table
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

-- 7. IELTS Speaking Attempts Table
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

-- 8. IELTS Speaking Responses Table
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

CREATE INDEX IF NOT EXISTS idx_ielts_attempts_user_id ON ielts_speaking_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ielts_responses_attempt_id ON ielts_speaking_responses(attempt_id);

