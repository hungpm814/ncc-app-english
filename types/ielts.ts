export type IELTSPart = 'part1' | 'part2' | 'part3';

export interface IELTSPart1Question {
  id: string;
  topic_title: string;
  question_text: string;
}

export interface IELTSPart2CueCard {
  id: string;
  topic_title: string;
  cue_card_title: string;
  prompt_lead: string;
  bullet_points: string[];
  follow_up_question?: string;
}

export interface IELTSPart3Question {
  id: string;
  topic_title: string;
  question_text: string;
}

export interface IELTSSpeakingTopic {
  id: string;
  title: string;
  category: string;
  part1_questions: IELTSPart1Question[];
  part2_cue_card: IELTSPart2CueCard;
  part3_questions: IELTSPart3Question[];
}

export type IELTSSpeakingStatus = 'in_progress' | 'part1_completed' | 'part2_completed' | 'part3_completed' | 'submitted' | 'cancelled';

export interface IELTSSpeakingResponse {
  question_id: string;
  part: IELTSPart;
  audio_url?: string;
  transcript?: string;
  duration_seconds?: number;
  answered_at?: string;
}

export interface IELTSSpeakingAttempt {
  id: string;
  user_id: string;
  topic_id: string;
  topic_title: string;
  status: IELTSSpeakingStatus;
  current_part: IELTSPart;
  started_at: string;
  submitted_at?: string;
  responses: Record<string, IELTSSpeakingResponse>; // question_id -> response
  part2_notes?: string;
  band_score?: number;
}

export interface IELTSCriteriaScore {
  code: 'FC' | 'LR' | 'GRA' | 'PR';
  name: string;
  score: number; // Band 1.0 - 9.0
  summary: string;
  key_observations: string[];
}

export interface IELTSFillerWordCount {
  word: string;
  count: number;
  impact: 'low' | 'moderate' | 'high';
}

export interface IELTSVocabUpgrade {
  original: string;
  upgrade: string;
  context_example: string;
}

export interface IELTSScoreResult {
  attempt_id: string;
  topic_title: string;
  overall_band: number; // Band 1.0 - 9.0 (e.g. 7.5)
  status_title: string;
  summary_feedback: string;
  criteria_scores: IELTSCriteriaScore[];
  filler_words: IELTSFillerWordCount[];
  vocab_upgrades: IELTSVocabUpgrade[];
  strengths: string[];
  areas_for_improvement: string[];
  part1_questions: IELTSPart1Question[];
  part2_cue_card: IELTSPart2CueCard;
  part3_questions: IELTSPart3Question[];
  responses: Record<string, IELTSSpeakingResponse>;
  part2_notes?: string;
}
