'use client';

import React, { useState } from 'react';
import {
  IELTSScoreResult,
  IELTSPart1Question,
  IELTSPart2CueCard,
  IELTSPart3Question,
  IELTSSpeakingResponse,
} from '@/types/ielts';
import { ChevronLeft, ChevronRight, Mic, Volume2, FileText, CheckCircle2, MessageSquare } from 'lucide-react';

interface QuestionItem {
  id: string;
  partName: 'Part 1' | 'Part 2' | 'Part 3';
  questionTitle: string;
  questionText: string;
  bulletPoints?: string[];
  response?: IELTSSpeakingResponse;
}

export function QuestionAudioReviewer({ result }: { result: IELTSScoreResult }) {
  // Build ordered list of all questions in test
  const questionList: QuestionItem[] = [];

  // Part 1 Questions
  if (result.part1_questions) {
    result.part1_questions.forEach((q, idx) => {
      questionList.push({
        id: q.id,
        partName: 'Part 1',
        questionTitle: `Part 1 • Question ${idx + 1}`,
        questionText: q.question_text,
        response: result.responses?.[q.id],
      });
    });
  }

  // Part 2 Cue Card
  if (result.part2_cue_card) {
    const card = result.part2_cue_card;
    questionList.push({
      id: card.id,
      partName: 'Part 2',
      questionTitle: 'Part 2 • Cue Card (Long Turn)',
      questionText: card.prompt_lead || card.cue_card_title,
      bulletPoints: card.bullet_points,
      response: result.responses?.[card.id],
    });
  }

  // Part 3 Questions
  if (result.part3_questions) {
    result.part3_questions.forEach((q, idx) => {
      questionList.push({
        id: q.id,
        partName: 'Part 3',
        questionTitle: `Part 3 • Discussion ${idx + 1}`,
        questionText: q.question_text,
        response: result.responses?.[q.id],
      });
    });
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  if (questionList.length === 0) return null;

  const currentItem = questionList[currentIndex];
  const response = currentItem.response;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-full uppercase tracking-wider mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Interactive Response Review</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Recorded Audio & Script Review</h2>
        </div>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all disabled:opacity-40"
            title="Previous Question"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {currentIndex + 1} / {questionList.length}
          </span>

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questionList.length - 1, prev + 1))}
            disabled={currentIndex === questionList.length - 1}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all disabled:opacity-40"
            title="Next Question"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Select Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {questionList.map((item, idx) => {
          const hasAudio = !!item.response?.audio_url || !!item.response?.transcript;
          const isSelected = idx === currentIndex;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : hasAudio
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
            >
              {item.partName === 'Part 2' ? 'Cue Card' : `Q${idx + 1}`}
            </button>
          );
        })}
      </div>

      {/* Main Question Display Card */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
            {currentItem.questionTitle}
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            {currentItem.questionText}
          </h3>

          {/* Cue Card Bullet Points if Part 2 */}
          {currentItem.bulletPoints && currentItem.bulletPoints.length > 0 && (
            <ul className="mt-3 space-y-1.5 bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
              {currentItem.bulletPoints.map((bp, bIdx) => (
                <li key={bIdx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Audio Player Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-purple-600" />
              <span>Candidate Audio Recording</span>
            </div>
            {response?.duration_seconds ? (
              <span className="text-xs font-mono text-slate-500">
                Duration: {response.duration_seconds}s
              </span>
            ) : null}
          </div>

          {response?.audio_url ? (
            <audio controls src={response.audio_url} className="w-full h-10 rounded-lg accent-purple-600" />
          ) : (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
              No audio recording available for this question.
            </div>
          )}
        </div>

        {/* Speech Transcript Comparison & AI Analysis Section */}
        {(() => {
          const aiAnalysis = result.per_question_analysis?.[currentItem.id];
          const liveStt = response?.transcript || aiAnalysis?.live_stt_transcript;
          const aiTranscript = aiAnalysis?.ai_generated_transcript;
          const matchPct = aiAnalysis?.match_percentage;

          return (
            <div className="space-y-4">
              {/* Dual Transcript Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Live Speech-To-Text */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Mic className="w-4 h-4 text-purple-600" />
                      <span>Live Speech-to-Text</span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Browser STT
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 text-xs leading-relaxed font-medium min-h-[80px]">
                    {liveStt ? (
                      <span className="italic">"{liveStt}"</span>
                    ) : (
                      <span className="text-slate-400 italic">No live STT recorded.</span>
                    )}
                  </div>
                </div>

                {/* 2. AI Generated & Refined Transcript */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>AI Examiner Transcript</span>
                    </div>
                    {matchPct !== undefined ? (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${matchPct >= 80
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : matchPct >= 60
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        STT Capture Match: {matchPct}%
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 text-xs leading-relaxed font-medium min-h-[80px]">
                    {aiTranscript ? (
                      <span className="italic">"{aiTranscript}"</span>
                    ) : (
                      <span className="text-slate-400 italic">AI transcript pending.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Question AI Examiner Feedback */}
              {aiAnalysis?.feedback && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span>AI Examiner Question Feedback</span>
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed font-medium">
                    {aiAnalysis.feedback}
                  </p>
                </div>
              )}

              {/* Grammar Corrections */}
              {aiAnalysis?.grammar_corrections && aiAnalysis.grammar_corrections.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Grammar & Phrasing Corrections</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-800 font-medium">
                    {aiAnalysis.grammar_corrections.map((corr, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{corr}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Model Answer */}
              {aiAnalysis?.improved_version && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Model Response (Ideal Answer)</span>
                  </div>
                  <p className="text-xs text-emerald-850 italic font-medium leading-relaxed">
                    "{aiAnalysis.improved_version}"
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
