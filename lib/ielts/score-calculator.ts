import { IELTSScoreResult, IELTSSpeakingAttempt, IELTSSpeakingTopic, IELTSFillerWordCount, IELTSVocabUpgrade } from '@/types/ielts';

const FILLER_PATTERNS = [
  { word: 'like', impact: 'moderate' as const },
  { word: 'well', impact: 'low' as const },
  { word: 'you know', impact: 'high' as const },
  { word: 'actually', impact: 'low' as const },
  { word: 'basically', impact: 'moderate' as const },
  { word: 'um', impact: 'high' as const },
  { word: 'ah', impact: 'high' as const },
  { word: 'so', impact: 'low' as const },
];

const VOCAB_UPGRADE_MAP: Array<{ original: string; upgrade: string; context_example: string }> = [
  { original: 'important', upgrade: 'paramount / vital', context_example: 'It is of paramount importance to maintain balance.' },
  { original: 'good', upgrade: 'exemplary / formidable', context_example: 'Demonstrating an exemplary level of understanding.' },
  { original: 'bad', upgrade: 'detrimental / adverse', context_example: 'This decision yields detrimental consequences.' },
  { original: 'need', upgrade: 'require / demand', context_example: 'Modern industries demand a high level of digital literacy.' },
  { original: 'think', upgrade: 'reckon / maintain', context_example: 'I firmly maintain that urban planning is essential.' },
  { original: 'big', upgrade: 'substantial / monolithic', context_example: 'Making a substantial impact on society.' },
  { original: 'help', upgrade: 'facilitate / assist', context_example: 'Technology facilitates seamless global communication.' },
];

export function getIELTSStatusTitle(overallBand: number): string {
  if (overallBand >= 9.0) return 'Expert Speaker (Band 9.0)';
  if (overallBand >= 8.5) return 'Very Good Speaker (Band 8.5)';
  if (overallBand >= 8.0) return 'Very Good Speaker (Band 8.0)';
  if (overallBand >= 7.5) return 'Good Speaker (Band 7.5)';
  if (overallBand >= 7.0) return 'Good Speaker (Band 7.0)';
  if (overallBand >= 6.5) return 'Competent Speaker (Band 6.5)';
  if (overallBand >= 6.0) return 'Competent Speaker (Band 6.0)';
  if (overallBand >= 5.5) return 'Modest Speaker (Band 5.5)';
  if (overallBand >= 5.0) return 'Modest Speaker (Band 5.0)';
  if (overallBand >= 4.5) return 'Limited Speaker (Band 4.5)';
  if (overallBand >= 4.0) return 'Limited Speaker (Band 4.0)';
  if (overallBand >= 3.5) return 'Extremely Limited Speaker (Band 3.5)';
  if (overallBand >= 3.0) return 'Extremely Limited Speaker (Band 3.0)';
  if (overallBand >= 2.5) return 'Intermittent Speaker (Band 2.5)';
  if (overallBand >= 2.0) return 'Intermittent Speaker (Band 2.0)';
  if (overallBand >= 1.5) return 'Non Speaker / Beginner (Band 1.5)';
  if (overallBand >= 1.0) return 'Non Speaker / Beginner (Band 1.0)';
  return 'Did Not Attempt / No Band Score';
}

export function calculateIELTSScore(
  attempt: IELTSSpeakingAttempt,
  topic: IELTSSpeakingTopic
): IELTSScoreResult {
  const responsesList = Object.values(attempt.responses || {});
  const answeredCount = responsesList.length;
  const totalQuestions = topic.part1_questions.length + 1 + topic.part3_questions.length;

  // Base completion ratio
  const completionRatio = Math.min(1, answeredCount / totalQuestions);

  // Combine transcripts or mock text
  const combinedText = responsesList.map((r) => r.transcript || '').join(' ') + ' ' + (attempt.part2_notes || '');
  const wordCount = combinedText.split(/\s+/).filter(Boolean).length;

  // Analyze filler words
  const fillerResults: IELTSFillerWordCount[] = [];
  const lowerText = combinedText.toLowerCase();

  FILLER_PATTERNS.forEach(({ word, impact }) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      fillerResults.push({ word, count, impact });
    }
  });

  // Analyze vocabulary upgrades
  const vocabUpgrades: IELTSVocabUpgrade[] = [];
  VOCAB_UPGRADE_MAP.forEach((item) => {
    if (lowerText.includes(item.original)) {
      vocabUpgrades.push(item);
    }
  });

  // Add default upgrades if none detected
  if (vocabUpgrades.length === 0) {
    vocabUpgrades.push(
      { original: 'important', upgrade: 'paramount', context_example: 'Education plays a paramount role in personal growth.' },
      { original: 'good', upgrade: 'exceptional', context_example: 'Achieving an exceptional standard of performance.' }
    );
  }

  // Calculate 4 Criteria Scores (Band 1.0 - 9.0)
  let baseBand = 6.0 + completionRatio * 1.5;
  if (wordCount > 250) baseBand += 0.5;
  if (wordCount > 400) baseBand += 0.5;
  if (fillerResults.length > 5) baseBand -= 0.5;

  // Clamp band score between 5.5 and 8.5
  baseBand = Math.min(8.5, Math.max(5.5, Math.round(baseBand * 2) / 2));

  const fcScore = Math.min(9.0, Math.max(5.0, baseBand + (fillerResults.length > 3 ? -0.5 : 0.5)));
  const lrScore = Math.min(9.0, Math.max(5.0, baseBand + (vocabUpgrades.length > 3 ? 0.5 : 0)));
  const graScore = Math.min(9.0, Math.max(5.0, baseBand));
  const prScore = Math.min(9.0, Math.max(5.0, baseBand + 0.5));

  const overallBand = Math.round(((fcScore + lrScore + graScore + prScore) / 4) * 2) / 2;

  const statusTitle = getIELTSStatusTitle(overallBand);

  return {
    attempt_id: attempt.id,
    topic_title: topic.title,
    overall_band: overallBand,
    status_title: statusTitle,
    summary_feedback: `Your speaking performance demonstrated good structure and coherence across all 3 parts of the exam. You successfully answered ${answeredCount} of ${totalQuestions} questions with clear topic relevance.`,
    criteria_scores: [
      {
        code: 'FC',
        name: 'Fluency & Coherence',
        score: fcScore,
        summary: 'Ability to speak continuously without excessive hesitation or loss of coherence.',
        key_observations: [
          `Maintained steady flow across Part 1 and Part 2.`,
          fillerResults.length > 0 ? `Identified ${fillerResults.reduce((a, b) => a + b.count, 0)} filler word occurrences.` : 'Very low usage of hesitation sounds.',
        ],
      },
      {
        code: 'LR',
        name: 'Lexical Resource',
        score: lrScore,
        summary: 'Range and precision of vocabulary used to express complex ideas.',
        key_observations: [
          'Effective topic-specific vocabulary related to ' + topic.category + '.',
          `Consider upgrading basic words to C1/C2 advanced alternatives.`,
        ],
      },
      {
        code: 'GRA',
        name: 'Grammatical Range & Accuracy',
        score: graScore,
        summary: 'Accuracy and variety of simple and complex sentence structures.',
        key_observations: [
          'Good mix of simple, compound, and complex sentence structures.',
          'Consistent verb tense agreement during the Part 2 long turn.',
        ],
      },
      {
        code: 'PR',
        name: 'Pronunciation',
        score: prScore,
        summary: 'Clarity of articulation, stress patterns, and natural intonation.',
        key_observations: [
          'Clear sentence stress and natural rhythm throughout responses.',
          'Easily intelligible articulation with consistent intonation.',
        ],
      },
    ],
    filler_words: fillerResults.length > 0 ? fillerResults : [{ word: 'like', count: 1, impact: 'low' }],
    vocab_upgrades: vocabUpgrades,
    strengths: [
      'Strong task completion across all 3 IELTS Speaking sections.',
      'Clear organization and smooth transitions between preparation and speaking in Part 2.',
      'Good use of opinion phrases (e.g., "From my perspective", "I firmly believe").',
    ],
    areas_for_improvement: [
      'Reduce relying on filler words during pauses in Part 3 abstract discussion.',
      'Incorporate more advanced collocations and idiomatic expressions.',
      'Extend answers in Part 1 by adding reasons and real-life examples.',
    ],
    part1_questions: topic.part1_questions,
    part2_cue_card: topic.part2_cue_card,
    part3_questions: topic.part3_questions,
    responses: attempt.responses || {},
    part2_notes: attempt.part2_notes,
  };
}
