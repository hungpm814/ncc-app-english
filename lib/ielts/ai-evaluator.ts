import {
  IELTSSpeakingAttempt,
  IELTSSpeakingTopic,
  IELTSScoreResult,
  IELTSPerQuestionAnalysis,
} from '@/types/ielts';
import { calculateIELTSScore, getIELTSStatusTitle } from './score-calculator';


export const OFFICIAL_IELTS_EXAMINER_PROMPT = `# ROLE

You are a certified IELTS Speaking Examiner.

Your task is to score the candidate's IELTS Speaking performance as closely as possible to an official IELTS examiner.

Do NOT be generous or harsh.
Be objective, evidence-based, and consistent.

Evaluate only what the candidate actually says.

--------------------------------------------------
IMPORTANT INSTRUCTION ON BROWSER STT vs FULL TRANSCRIPT
--------------------------------------------------
1. The provided "Browser STT (Raw/Partial)" text is recorded by client-side Web Speech API and FREQUENTLY CUTS OFF OR GETS TRUNCATED mid-response while the candidate is still speaking.
2. For each question, your output field "ai_generated_transcript" MUST represent the candidate's FULL, COMPLETE, AND UNTRUNCATED spoken response for the entire duration of their answer.
3. If the Browser STT snippet ends abruptly or cuts off mid-sentence/mid-thought, reconstruct and extend the complete, natural, and grammatically complete spoken response that matches the candidate's line of thought. Do NOT stop early just because Browser STT was cut off.
4. "match_percentage": Calculate what percentage of the full complete spoken transcript was successfully captured in the raw Browser STT snippet (0–100%).
5. Base your official IELTS band scoring (FC, LR, GRA, PR) on the candidate's complete reconstructed response.

--------------------------------------------------
SCORING CRITERIA
--------------------------------------------------

The IELTS Speaking test consists of four equally weighted criteria.

1. Fluency and Coherence (FC)
2. Lexical Resource (LR)
3. Grammatical Range and Accuracy (GRA)
4. Pronunciation (PR)

Each criterion is scored independently.

Use only half-band increments:
0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9

The overall score is (FC + LR + GRA + PR) / 4
Then round using official IELTS rules:
Average 6.00–6.24 → 6.0
Average 6.25–6.74 → 6.5
Average 6.75–7.00 → 7.0

Examples:
6.125 → 6.0
6.25 → 6.5
6.74 → 6.5
6.75 → 7.0
7.88 → 8.0

--------------------------------------------------
FLUENCY & COHERENCE
--------------------------------------------------
Evaluate: ability to keep speaking, hesitation, pauses, self-correction, repetition, logical organization, coherence, use of linking devices.

--------------------------------------------------
LEXICAL RESOURCE
--------------------------------------------------
Evaluate: vocabulary range, vocabulary precision, paraphrasing, collocations, natural word choice, repetition.

--------------------------------------------------
GRAMMATICAL RANGE & ACCURACY
--------------------------------------------------
Evaluate: sentence variety, complexity, accuracy, error frequency.

--------------------------------------------------
PRONUNCIATION
--------------------------------------------------
Accent does NOT affect score. Evaluate intelligibility, stress, rhythm, connected speech, word/sentence stress.

--------------------------------------------------
PART-SPECIFIC EXPECTATIONS
--------------------------------------------------
Part 1: 2–4 sentences per answer.
Part 2: 1.5–2 minutes (introduce topic, describe details, give examples, express opinions, provide conclusion).
Part 3: 5–8 sentences (explain, justify, compare, analyze, discuss causes/consequences).

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------
Return ONLY valid JSON matching this exact structure:

{
  "fluency_coherence": 7.0,
  "lexical_resource": 7.5,
  "grammatical_range_accuracy": 6.5,
  "pronunciation": 7.5,
  "average": 7.125,
  "overall_band": 7.0,
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "criterion_feedback": {
    "fluency": "...",
    "vocabulary": "...",
    "grammar": "...",
    "pronunciation": "..."
  },
  "overall_feedback": "...",
  "estimated_band_reason": "Explain why the candidate deserves this overall band using evidence from performance.",
  "per_question_items": [
    {
      "question_id": "p1-q1",
      "live_stt_transcript": "Raw Browser STT snippet (may be truncated)",
      "ai_generated_transcript": "FULL complete reconstructed spoken transcript. Completes any cut-off sentences naturally.",
      "match_percentage": 75,
      "feedback": "Concise feedback for this answer"
    }
  ]
}
`;

function computeWordSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 70;
  const words1 = text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const words2 = text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 70;

  const set2 = new Set(words2);
  let matches = 0;
  words1.forEach((w) => {
    if (set2.has(w)) matches++;
  });

  const ratio = (matches * 2) / (words1.length + words2.length);
  return Math.min(100, Math.max(50, Math.round(ratio * 100)));
}

export async function evaluateIELTSAttemptWithAI(
  attempt: IELTSSpeakingAttempt,
  topic: IELTSSpeakingTopic
): Promise<IELTSScoreResult> {
  const fallbackResult = calculateIELTSScore(attempt, topic);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';
  const endpoint = process.env.ANTHROPIC_ENDPOINT || 'https://api.anthropic.com/v1/messages';
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  // Construct structured question & transcript prompt
  const questionItems: Array<{ id: string; part: string; questionText: string; liveTranscript: string; duration: number }> = [];

  // Part 1
  topic.part1_questions.forEach((q) => {
    const resp = attempt.responses?.[q.id];
    questionItems.push({
      id: q.id,
      part: 'Part 1',
      questionText: q.question_text,
      liveTranscript: resp?.transcript || 'No transcript recorded',
      duration: resp?.duration_seconds || 0,
    });
  });

  // Part 2
  if (topic.part2_cue_card) {
    const card = topic.part2_cue_card;
    const resp = attempt.responses?.[card.id];
    questionItems.push({
      id: card.id,
      part: 'Part 2 Cue Card',
      questionText: `${card.prompt_lead} Points: ${card.bullet_points.join(', ')}`,
      liveTranscript: resp?.transcript || 'No transcript recorded',
      duration: resp?.duration_seconds || 0,
    });
  }

  // Part 3
  topic.part3_questions.forEach((q) => {
    const resp = attempt.responses?.[q.id];
    questionItems.push({
      id: q.id,
      part: 'Part 3',
      questionText: q.question_text,
      liveTranscript: resp?.transcript || 'No transcript recorded',
      duration: resp?.duration_seconds || 0,
    });
  });

  const formattedResponses = questionItems
    .map(
      (item) => `[Question ID: ${item.id} | ${item.part}]
Question Prompt: "${item.questionText}"
Recording Duration: ${item.duration > 0 ? `${item.duration} seconds` : 'Recorded'}
Browser STT Transcript (Raw/Partial): "${item.liveTranscript}"`
    )
    .join('\n\n');

  const userPrompt = `Exam Topic: "${topic.title}" (Category: ${topic.category})
Part 2 Preparation Notes by Candidate: "${attempt.part2_notes || 'None'}"

CANDIDATE QUESTION RESPONSES:
${formattedResponses}

REMINDER: The Browser STT transcript may be truncated mid-sentence. For "ai_generated_transcript", provide the FULL complete, un-truncated response representing what the candidate spoke during the entire recording duration, completing any cut-off sentences naturally.

Please evaluate the candidate according to the official IELTS Examiner instructions and return JSON only.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream: true,
        system: OFFICIAL_IELTS_EXAMINER_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok || !res.body) {
      console.warn(`[AI Evaluator Warning] API status ${res.status}. Using rule-based score fallback.`);
      return fallbackResult;
    }

    // Stream SSE aggregation
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let rawContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const parsedChunk = JSON.parse(jsonStr);
              if (parsedChunk.delta?.text) {
                rawContent += parsedChunk.delta.text;
              }
            } catch {
              // ignore invalid JSON chunks in SSE stream
            }
          }
        }
      }
    }

    if (!rawContent) {
      console.warn('[AI Evaluator Warning] Empty response content. Using fallback result.');
      return fallbackResult;
    }

    // Strip any markdown code block wrap (e.g. ```json ... ```)
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawContent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = JSON.parse(jsonString.trim());

    const fcScore = Math.min(9.0, Math.max(1.0, Number(parsed.fluency_coherence) || fallbackResult.criteria_scores[0].score));
    const lrScore = Math.min(9.0, Math.max(1.0, Number(parsed.lexical_resource) || fallbackResult.criteria_scores[1].score));
    const graScore = Math.min(9.0, Math.max(1.0, Number(parsed.grammatical_range_accuracy) || fallbackResult.criteria_scores[2].score));
    const prScore = Math.min(9.0, Math.max(1.0, Number(parsed.pronunciation) || fallbackResult.criteria_scores[3].score));

    const overallBand = Number(parsed.overall_band) || Math.round(((fcScore + lrScore + graScore + prScore) / 4) * 2) / 2;

    const perQuestionRecord: Record<string, IELTSPerQuestionAnalysis> = {};

    if (Array.isArray(parsed.per_question_items)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.per_question_items.forEach((item: any) => {
        const liveStt = item.live_stt_transcript || attempt.responses?.[item.question_id]?.transcript || '';
        const aiTranscript = item.ai_generated_transcript || liveStt;
        const matchPct = item.match_percentage || computeWordSimilarity(liveStt, aiTranscript);

        perQuestionRecord[item.question_id] = {
          question_id: item.question_id,
          live_stt_transcript: liveStt,
          ai_generated_transcript: aiTranscript,
          match_percentage: matchPct,
          feedback: item.feedback || 'Good attempt on this question.',
        };
      });
    }

    // Populate fallback for any missing question items
    questionItems.forEach((qItem) => {
      if (!perQuestionRecord[qItem.id]) {
        const liveStt = attempt.responses?.[qItem.id]?.transcript || '';
        perQuestionRecord[qItem.id] = {
          question_id: qItem.id,
          live_stt_transcript: liveStt,
          ai_generated_transcript: liveStt,
          match_percentage: computeWordSimilarity(liveStt, liveStt),
          feedback: 'Candidate provided response for this question.',
        };
      }
    });

    return {
      ...fallbackResult,
      overall_band: overallBand,
      status_title: getIELTSStatusTitle(overallBand),
      summary_feedback: parsed.overall_feedback || fallbackResult.summary_feedback,
      criteria_scores: [
        {
          code: 'FC',
          name: 'Fluency & Coherence',
          score: fcScore,
          summary: parsed.criterion_feedback?.fluency || fallbackResult.criteria_scores[0].summary,
          key_observations: fallbackResult.criteria_scores[0].key_observations,
        },
        {
          code: 'LR',
          name: 'Lexical Resource',
          score: lrScore,
          summary: parsed.criterion_feedback?.vocabulary || fallbackResult.criteria_scores[1].summary,
          key_observations: fallbackResult.criteria_scores[1].key_observations,
        },
        {
          code: 'GRA',
          name: 'Grammatical Range & Accuracy',
          score: graScore,
          summary: parsed.criterion_feedback?.grammar || fallbackResult.criteria_scores[2].summary,
          key_observations: fallbackResult.criteria_scores[2].key_observations,
        },
        {
          code: 'PR',
          name: 'Pronunciation',
          score: prScore,
          summary: parsed.criterion_feedback?.pronunciation || fallbackResult.criteria_scores[3].summary,
          key_observations: fallbackResult.criteria_scores[3].key_observations,
        },
      ],
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : fallbackResult.strengths,
      areas_for_improvement: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : fallbackResult.areas_for_improvement,
      criterion_feedback: parsed.criterion_feedback,
      estimated_band_reason: parsed.estimated_band_reason,
      per_question_analysis: perQuestionRecord,
    };
  } catch (err) {
    console.error('[AI Evaluator Error]:', err);
    return fallbackResult;
  }
}
