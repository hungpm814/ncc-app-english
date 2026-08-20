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
IMPORTANT INSTRUCTION: 100% FAITHFUL AUDIO TRANSCRIPT ONLY
--------------------------------------------------
1. "ai_generated_transcript" MUST MATCH THE CANDIDATE'S ACTUAL SPOKEN AUDIO 100%.
2. STRICTLY FORBIDDEN: DO NOT ADD, INVENT, OR EXTEND ANY SENTENCES, CLAUSES, REASONS, OR EXAMPLES THAT THE CANDIDATE DID NOT UTTER IN THEIR AUDIO.
   - If the candidate spoke only 1 sentence, the transcript MUST BE EXACTLY THAT 1 SENTENCE.
   - ABSOLUTELY DO NOT APPEND EXTRA SENTENCES to pad, expand, or lengthen the candidate's response.
3. STRICTLY FORBIDDEN: DO NOT OMIT, CUT OFF, OR SHORTEN ANY WORDS SPOKEN BY THE CANDIDATE.
4. PERMISSIBLE CLEANUP ONLY: You may only correct minor Speech-to-Text (STT) phonetic recognition glitches and add proper punctuation/capitalization to the candidate's exact words (e.g., fixing "make is" to "makes it" or "live in a city is" to "live in a city, which is").
5. "match_percentage": Calculate the similarity percentage between the raw Browser STT text snippet and the candidate's 100% faithful audio transcript (0–100%).
6. BASE BAND SCORE: Score FC, LR, GRA, PR based strictly on what the candidate actually uttered in their audio.

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
  "criterion_key_observations": {
    "fluency": ["...", "..."],
    "vocabulary": ["...", "..."],
    "grammar": ["...", "..."],
    "pronunciation": ["...", "..."]
  },
  "filler_words": [
    { "word": "like", "count": 2, "impact": "moderate" }
  ],
  "vocab_upgrades": [
    { "original": "think", "upgrade": "reckon / maintain", "context_example": "I firmly maintain that..." }
  ],
  "overall_feedback": "...",
  "estimated_band_reason": "Explain why the candidate deserves this overall band using evidence from performance.",
  "per_question_items": [
    {
      "question_id": "EXACT question_id provided in candidate responses input (e.g., p1-env-q1)",
      "live_stt_transcript": "Raw Browser STT snippet (may be truncated)",
      "ai_generated_transcript": "EXACT transcript of what candidate actually spoke in audio. Correct STT mishearings, but DO NOT invent extra sentences or omit words.",
      "match_percentage": 75,
      "feedback": "Concise 1-2 sentence examiner assessment of candidate's fluency, vocabulary, and grammar for this answer.",
      "grammar_corrections": [
        "Incorrect: 'I live in city' → Correct: 'I live in a big city'",
        "Word choice: Replace 'good' with 'vibrant'"
      ],
      "improved_version": "Concise Band 8.5+ model answer (2-3 sentences max for Part 1/3, 4-5 sentences max for Part 2)."
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repairTruncatedJson(jsonStr: string): any {
  const str = jsonStr.trim();
  try {
    return JSON.parse(str);
  } catch {
    console.warn('[AI Evaluator] Truncated JSON detected. Attempting automatic repair...');
  }

  // Iterative repair: progressively backtrack from the truncated tail to find the last clean JSON state
  for (let len = str.length; len > 10; len--) {
    let candidate = str.substring(0, len).trim();

    // Strip trailing incomplete syntax like commas, colons, or unclosed quotes
    candidate = candidate.replace(/[,:\s]+$/, '');

    // Check string quotation balance
    let quoteCount = 0;
    let isEscaped = false;
    for (let i = 0; i < candidate.length; i++) {
      if (candidate[i] === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (candidate[i] === '"' && !isEscaped) {
          quoteCount++;
        }
        isEscaped = false;
      }
    }

    if (quoteCount % 2 !== 0) {
      candidate += '"';
    }

    // Clean any trailing comma before closing structural elements
    candidate = candidate.replace(/,[\s]*$/, '');

    // Track and balance opening brackets & braces
    const stack: string[] = [];
    let inString = false;
    isEscaped = false;

    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === '\\' && !isEscaped) {
        isEscaped = true;
        continue;
      }
      if (ch === '"' && !isEscaped) {
        inString = !inString;
      } else if (!inString) {
        if (ch === '{' || ch === '[') {
          stack.push(ch);
        } else if (ch === '}' || ch === ']') {
          const expected = ch === '}' ? '{' : '[';
          if (stack.length > 0 && stack[stack.length - 1] === expected) {
            stack.pop();
          }
        }
      }
      isEscaped = false;
    }

    // Append closing brackets/braces in reverse order
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') candidate += '}';
      if (open === '[') candidate += ']';
    }

    try {
      const parsed = JSON.parse(candidate);
      console.log(`[AI Evaluator] Successfully repaired truncated JSON (recovered ${candidate.length}/${str.length} chars).`);
      return parsed;
    } catch {
      // Step back further and try again
      continue;
    }
  }

  throw new SyntaxError('Failed to parse truncated JSON after full repair attempts.');
}

export async function evaluateIELTSAttemptWithAI(
  attempt: IELTSSpeakingAttempt,
  topic: IELTSSpeakingTopic
): Promise<IELTSScoreResult> {
  const fallbackResult = calculateIELTSScore(attempt, topic);

  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';

  const endpoint =
    process.env.AI_ENDPOINT ||
    process.env.ANTHROPIC_ENDPOINT ||
    (process.env.GEMINI_API_KEY
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash-high:generateContent?key=${process.env.GEMINI_API_KEY}`
      : '');

  const model = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || 'gemini-3.7-flash-high';

  if (!apiKey || !endpoint) {
    console.warn('[AI Evaluator Warning] No AI API Key or Endpoint found in env. Falling back to rule-based evaluation.');
    return fallbackResult;
  }

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

REMINDER: For "ai_generated_transcript", provide a 100% FAITHFUL transcript of what the candidate ACTUALLY SPOKE in their audio recording. Clean up STT recognition typos and punctuation, BUT STRICTLY DO NOT ADD, INVENT, OR EXTEND ANY EXTRA SENTENCES OR CLAUSES THAT WERE NOT SPOKEN BY THE CANDIDATE. If the candidate spoke only 1 sentence, return ONLY that 1 sentence.

Please evaluate the candidate according to the official IELTS Examiner instructions and return JSON only.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const isOpenAIFormat = endpoint.includes('/chat/completions');
    console.log(`[AI Evaluator] Requesting endpoint: ${endpoint} (Model: ${model}, Format: ${isOpenAIFormat ? 'OpenAI' : 'Anthropic'})`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    const reqBody = isOpenAIFormat
      ? {
        model,
        max_tokens: 8192,
        stream: true,
        messages: [
          { role: 'system', content: OFFICIAL_IELTS_EXAMINER_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }
      : {
        model,
        max_tokens: 8192,
        stream: true,
        system: OFFICIAL_IELTS_EXAMINER_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
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
              const textChunk =
                parsedChunk.choices?.[0]?.delta?.content ||
                parsedChunk.delta?.text ||
                parsedChunk.content?.[0]?.text ||
                '';
              rawContent += textChunk;
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

    console.log(`[AI Evaluator] Received response (${rawContent.length} chars). Parsing JSON...`);

    // Strip any markdown code block wrap (e.g. ```json ... ```)
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawContent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = repairTruncatedJson(jsonString);

    const fcScore = Math.min(9.0, Math.max(1.0, Number(parsed.fluency_coherence) || fallbackResult.criteria_scores[0].score));
    const lrScore = Math.min(9.0, Math.max(1.0, Number(parsed.lexical_resource) || fallbackResult.criteria_scores[1].score));
    const graScore = Math.min(9.0, Math.max(1.0, Number(parsed.grammatical_range_accuracy) || fallbackResult.criteria_scores[2].score));
    const prScore = Math.min(9.0, Math.max(1.0, Number(parsed.pronunciation) || fallbackResult.criteria_scores[3].score));

    const overallBand = Number(parsed.overall_band) || Math.round(((fcScore + lrScore + graScore + prScore) / 4) * 2) / 2;

    const perQuestionRecord: Record<string, IELTSPerQuestionAnalysis> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedItems: any[] = Array.isArray(parsed.per_question_items) ? parsed.per_question_items : [];

    questionItems.forEach((qItem, idx) => {
      // 1. Try exact ID match
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let matchedItem = parsedItems.find((item: any) => item.question_id === qItem.id);

      // 2. Try fuzzy string match on question_id
      if (!matchedItem) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matchedItem = parsedItems.find(
          (item: any) =>
            typeof item.question_id === 'string' &&
            (item.question_id.includes(qItem.id) || qItem.id.includes(item.question_id))
        );
      }

      // 3. Fallback to index-based position matching
      if (!matchedItem && parsedItems[idx]) {
        matchedItem = parsedItems[idx];
      }

      const liveStt = attempt.responses?.[qItem.id]?.transcript || matchedItem?.live_stt_transcript || '';
      const aiTranscript = matchedItem?.ai_generated_transcript || liveStt;
      const matchPct = matchedItem?.match_percentage || computeWordSimilarity(liveStt, aiTranscript);

      perQuestionRecord[qItem.id] = {
        question_id: qItem.id,
        live_stt_transcript: liveStt,
        ai_generated_transcript: aiTranscript,
        match_percentage: matchPct,
        feedback: matchedItem?.feedback || 'Candidate provided response for this question.',
        improved_version: matchedItem?.improved_version || undefined,
        grammar_corrections: Array.isArray(matchedItem?.grammar_corrections) ? matchedItem.grammar_corrections : undefined,
      };
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
          key_observations: Array.isArray(parsed.criterion_key_observations?.fluency) && parsed.criterion_key_observations.fluency.length > 0
            ? parsed.criterion_key_observations.fluency
            : fallbackResult.criteria_scores[0].key_observations,
        },
        {
          code: 'LR',
          name: 'Lexical Resource',
          score: lrScore,
          summary: parsed.criterion_feedback?.vocabulary || fallbackResult.criteria_scores[1].summary,
          key_observations: Array.isArray(parsed.criterion_key_observations?.vocabulary) && parsed.criterion_key_observations.vocabulary.length > 0
            ? parsed.criterion_key_observations.vocabulary
            : fallbackResult.criteria_scores[1].key_observations,
        },
        {
          code: 'GRA',
          name: 'Grammatical Range & Accuracy',
          score: graScore,
          summary: parsed.criterion_feedback?.grammar || fallbackResult.criteria_scores[2].summary,
          key_observations: Array.isArray(parsed.criterion_key_observations?.grammar) && parsed.criterion_key_observations.grammar.length > 0
            ? parsed.criterion_key_observations.grammar
            : fallbackResult.criteria_scores[2].key_observations,
        },
        {
          code: 'PR',
          name: 'Pronunciation',
          score: prScore,
          summary: parsed.criterion_feedback?.pronunciation || fallbackResult.criteria_scores[3].summary,
          key_observations: Array.isArray(parsed.criterion_key_observations?.pronunciation) && parsed.criterion_key_observations.pronunciation.length > 0
            ? parsed.criterion_key_observations.pronunciation
            : fallbackResult.criteria_scores[3].key_observations,
        },
      ],
      filler_words: Array.isArray(parsed.filler_words) && parsed.filler_words.length > 0
        ? parsed.filler_words
        : fallbackResult.filler_words,
      vocab_upgrades: Array.isArray(parsed.vocab_upgrades) && parsed.vocab_upgrades.length > 0
        ? parsed.vocab_upgrades
        : fallbackResult.vocab_upgrades,
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
