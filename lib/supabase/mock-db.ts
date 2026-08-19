import { ExamAttempt, Question, UserSession } from '@/types';
import { SEED_QUESTIONS } from '@/lib/exam/questions';

// Global in-memory storage for local dev without active Supabase credentials
const globalStore = global as unknown as {
  mockUsers: Map<string, UserSession>;
  mockAttempts: Map<string, ExamAttempt>;
};

if (!globalStore.mockUsers) {
  globalStore.mockUsers = new Map();
}
if (!globalStore.mockAttempts) {
  globalStore.mockAttempts = new Map();
}

export const mockDb = {
  questions: SEED_QUESTIONS,

  async findOrCreateUser(mezonData: {
    mezon_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  }): Promise<UserSession> {
    const existing = globalStore.mockUsers.get(mezonData.mezon_id);
    if (existing) {
      existing.display_name = mezonData.display_name || existing.display_name;
      existing.avatar_url = mezonData.avatar_url || existing.avatar_url;
      return existing;
    }

    const newUser: UserSession = {
      user_id: `user-${mezonData.mezon_id}`,
      mezon_id: mezonData.mezon_id,
      mezon_username: mezonData.username,
      display_name: mezonData.display_name || mezonData.username,
      avatar_url: mezonData.avatar_url,
      clan_member: false,
      isLoggedIn: true,
    };

    globalStore.mockUsers.set(mezonData.mezon_id, newUser);
    return newUser;
  },

  async createAttempt(userId: string, timeLimitSeconds: number = 900): Promise<ExamAttempt> {
    const selectedQuestions = SEED_QUESTIONS.slice(0, 2);
    const questionIds = selectedQuestions.map((q) => q.id);
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const attempt: ExamAttempt = {
      id: attemptId,
      user_id: userId,
      status: 'in_progress',
      result_status: 'none',
      started_at: new Date().toISOString(),
      time_limit_seconds: timeLimitSeconds,
      max_weighted_score: selectedQuestions.length,
      unlocked: false,
      question_ids: questionIds,
      answers: {},
    };

    globalStore.mockAttempts.set(attemptId, attempt);
    return attempt;
  },

  async getAttempt(attemptId: string): Promise<ExamAttempt | null> {
    return globalStore.mockAttempts.get(attemptId) || null;
  },

  async saveAnswer(attemptId: string, questionId: string, optionId: string): Promise<ExamAttempt | null> {
    const attempt = globalStore.mockAttempts.get(attemptId);
    if (!attempt) return null;

    attempt.answers[questionId] = optionId;
    globalStore.mockAttempts.set(attemptId, attempt);
    return attempt;
  },

  async updateAttempt(attemptId: string, updates: Partial<ExamAttempt>): Promise<ExamAttempt | null> {
    const attempt = globalStore.mockAttempts.get(attemptId);
    if (!attempt) return null;

    const updated = { ...attempt, ...updates };
    globalStore.mockAttempts.set(attemptId, updated);
    return updated;
  },

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    const idSet = new Set(ids);
    return SEED_QUESTIONS.filter((q) => idSet.has(q.id));
  },
};
