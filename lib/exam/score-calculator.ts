import { CEFRLevel, ExamAttempt, Question, SkillScore } from '@/types';

export interface CalculatedExamResult {
  raw_score: number;
  weighted_score: number;
  max_weighted_score: number;
  cefr_level: CEFRLevel;
  percentage: number;
  skill_scores: SkillScore[];
  weaknesses: string[];
  recommendations: string[];
}

const DIFFICULTY_WEIGHTS = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function calculateExamResult(
  attempt: ExamAttempt,
  questions: Question[]
): CalculatedExamResult {
  let rawScore = 0;
  let weightedScore = 0;
  let maxWeightedScore = 0;

  const sectionTotals: Record<string, { correctWeight: number; maxWeight: number }> = {
    grammar: { correctWeight: 0, maxWeight: 0 },
    vocabulary: { correctWeight: 0, maxWeight: 0 },
    reading: { correctWeight: 0, maxWeight: 0 },
  };

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  for (const qId of attempt.question_ids) {
    const q = questionMap.get(qId);
    if (!q) continue;

    const weight = DIFFICULTY_WEIGHTS[q.difficulty] || 1;
    maxWeightedScore += weight;

    if (!sectionTotals[q.section]) {
      sectionTotals[q.section] = { correctWeight: 0, maxWeight: 0 };
    }
    sectionTotals[q.section].maxWeight += weight;

    const selected = attempt.answers[qId];
    if (selected && selected === q.correct_option_id) {
      rawScore += 1;
      weightedScore += weight;
      sectionTotals[q.section].correctWeight += weight;
    }
  }

  const percentage = Math.round((weightedScore / (maxWeightedScore || 1)) * 100);

  // CEFR Mapping Logic based on Weighted Score Percentage
  let cefrLevel: CEFRLevel = 'A1';
  if (percentage >= 90) cefrLevel = 'C2';
  else if (percentage >= 78) cefrLevel = 'C1';
  else if (percentage >= 62) cefrLevel = 'B2';
  else if (percentage >= 45) cefrLevel = 'B1';
  else if (percentage >= 28) cefrLevel = 'A2';
  else cefrLevel = 'A1';

  // Section skill breakdown
  const sectionLabels: Record<string, string> = {
    grammar: 'Grammar & Structure',
    vocabulary: 'Vocabulary & Diction',
    reading: 'Reading Comprehension',
  };

  const skillScores: SkillScore[] = Object.entries(sectionTotals).map(([section, data]) => {
    const sectionPct = data.maxWeight > 0 ? Math.round((data.correctWeight / data.maxWeight) * 100) : 0;
    return {
      section: section as 'grammar' | 'vocabulary' | 'reading',
      label: sectionLabels[section] || section,
      score: data.correctWeight,
      maxScore: data.maxWeight,
      percentage: sectionPct,
    };
  });

  // Identify weak areas (<60% accuracy)
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const lowestSkill = [...skillScores].sort((a, b) => a.percentage - b.percentage)[0];

  if (lowestSkill && lowestSkill.percentage < 70) {
    if (lowestSkill.section === 'grammar') {
      weaknesses.push('Advanced grammatical structures (subjunctives, inversion, complex conditionals)');
      recommendations.push('Review conditional sentences and subjunctive mood usage in business contexts.');
      recommendations.push('Practice sentence transformation exercises weekly.');
    } else if (lowestSkill.section === 'vocabulary') {
      weaknesses.push('Nuanced business & academic vocabulary');
      recommendations.push('Build a spaced-repetition flashcard deck for C1/C2 academic collocations.');
      recommendations.push('Read editorial publications (e.g. The Economist, HBR) daily.');
    } else if (lowestSkill.section === 'reading') {
      weaknesses.push('Speed reading & inferential comprehension');
      recommendations.push('Practice identifying implicit assumptions and tone in complex passages.');
      recommendations.push('Time your reading to achieve 250+ words per minute with 80%+ comprehension.');
    }
  } else {
    recommendations.push('Maintain high performance by practicing advanced C1/C2 listening and debate topics.');
    recommendations.push('Engage in daily discussions in the English Clan to refine fluency.');
  }

  return {
    raw_score: rawScore,
    weighted_score: weightedScore,
    max_weighted_score: maxWeightedScore,
    cefr_level: cefrLevel,
    percentage,
    skill_scores: skillScores,
    weaknesses,
    recommendations,
  };
}

export function getCEFRDescription(level: CEFRLevel): { title: string; description: string } {
  switch (level) {
    case 'A1':
      return {
        title: 'Beginner',
        description: 'Can understand basic expressions and simple phrases for everyday needs.',
      };
    case 'A2':
      return {
        title: 'Elementary',
        description: 'Can communicate in simple tasks requiring direct exchange of information on familiar matters.',
      };
    case 'B1':
      return {
        title: 'Intermediate',
        description: 'Can understand main points of clear standard input on familiar matters in work and school.',
      };
    case 'B2':
      return {
        title: 'Upper Intermediate',
        description: 'Can interact with a degree of fluency with native speakers without strain for either party.',
      };
    case 'C1':
      return {
        title: 'Advanced',
        description: 'Can express ideas fluently and spontaneously without much searching for expressions.',
      };
    case 'C2':
      return {
        title: 'Proficient / Mastery',
        description: 'Can understand with ease virtually everything heard or read and summarize complex information.',
      };
  }
}
