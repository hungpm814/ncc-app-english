export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type QuestionSection = 'grammar' | 'vocabulary' | 'reading';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string; // 'a', 'b', 'c', 'd'
  text: string;
}

export interface Question {
  id: string;
  section: QuestionSection;
  difficulty: QuestionDifficulty;
  question_text: string;
  reading_passage?: string;
  options: QuestionOption[];
  correct_option_id?: string; // Hidden on client pre-submit
  explanation?: string; // Unlocked only post-clan-join
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'abandoned';
export type ResultStatus = 'none' | 'partial' | 'full';

export interface SkillScore {
  section: QuestionSection;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface UserSession {
  user_id: string;
  mezon_id: string;
  mezon_username: string;
  display_name: string;
  avatar_url?: string;
  clan_member: boolean;
  isLoggedIn: boolean;
}

export interface AttemptAnswer {
  question_id: string;
  selected_option_id: string | null;
  is_correct?: boolean;
}

export interface ExamAttempt {
  id: string;
  user_id: string;
  status: AttemptStatus;
  result_status: ResultStatus;
  started_at: string;
  submitted_at?: string;
  time_limit_seconds: number;
  raw_score?: number;
  weighted_score?: number;
  max_weighted_score: number;
  cefr_level?: CEFRLevel;
  percentile?: number;
  unlocked: boolean;
  unlocked_at?: string;
  question_ids: string[];
  answers: Record<string, string>; // question_id -> selected_option_id
}

export interface ExamResultResponse {
  attempt_id: string;
  status: AttemptStatus;
  result_status: ResultStatus;
  unlocked: boolean;

  // Partial results (always shown after submit)
  cefr_level?: CEFRLevel;
  level_title?: string;
  level_description?: string;
  percentage?: number;
  percentile_teaser?: string;

  // Full results (only returned when unlocked === true)
  raw_score?: number;
  weighted_score?: number;
  max_weighted_score?: number;
  skill_scores?: SkillScore[];
  weaknesses?: string[];
  recommendations?: string[];
  explanations?: Record<string, { correct_option_id: string; explanation: string }>;
}
