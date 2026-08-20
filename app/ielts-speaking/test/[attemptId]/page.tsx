'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AudioRecorder } from '@/components/ielts/AudioRecorder';
import { PrepTimer } from '@/components/ielts/PrepTimer';
import { IELTSSpeakingAttempt, IELTSSpeakingTopic, IELTSPart, IELTSSpeakingResponse } from '@/types/ielts';
import { Mic, ArrowRight, CheckCircle2, Send, Sparkles, Clock, BookOpen, Flag } from 'lucide-react';

const pendingCancels = new Map<string, NodeJS.Timeout>();

export default function IELTSSpeakingTestPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();

  const isSubmittedRef = useRef(false);
  const [part1Index, setPart1Index] = useState(0);
  const [part3Index, setPart3Index] = useState(0);
  const [attempt, setAttempt] = useState<IELTSSpeakingAttempt | null>(null);
  const [topic, setTopic] = useState<IELTSSpeakingTopic | null>(null);
  const [currentPart, setCurrentPart] = useState<IELTSPart>('part1');
  const [part2Step, setPart2Step] = useState<'prep' | 'speaking'>('prep');
  const [part2Notes, setPart2Notes] = useState('');
  const [responses, setResponses] = useState<Record<string, IELTSSpeakingResponse>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAttempt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/ielts/${attemptId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load test attempt');
        }

        if (data.attempt.status === 'cancelled') {
          setError('This test attempt was cancelled because it was interrupted before completion.');
          return;
        }

        setAttempt(data.attempt);
        setTopic(data.topic);
        if (data.attempt.responses) {
          setResponses(data.attempt.responses);
        }
        if (data.attempt.part2_notes) {
          setPart2Notes(data.attempt.part2_notes);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchAttempt();
  }, [attemptId]);

  // Handle auto-cancellation if candidate leaves page (back/home navigation or browser close) without submitting
  useEffect(() => {
    // If component remounted within threshold (e.g. React StrictMode), cancel pending cancel
    if (pendingCancels.has(attemptId)) {
      clearTimeout(pendingCancels.get(attemptId));
      pendingCancels.delete(attemptId);
    }

    const triggerCancel = () => {
      if (!isSubmittedRef.current) {
        fetch('/api/ielts/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
          keepalive: true,
        });
      }
    };

    const handleBeforeUnload = () => {
      triggerCancel();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // When unmounting due to SPA navigation (Back / Home button), schedule cancellation after 500ms
      if (!isSubmittedRef.current) {
        const timer = setTimeout(() => {
          triggerCancel();
          pendingCancels.delete(attemptId);
        }, 500);

        pendingCancels.set(attemptId, timer);
      }
    };
  }, [attemptId]);

  const handleAudioRecorded = (questionId: string, part: IELTSPart, audioUrl: string, transcript: string, duration: number) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        part,
        audio_url: audioUrl,
        transcript,
        duration_seconds: duration,
        answered_at: new Date().toISOString(),
      },
    }));
  };

  const handleFinishExam = async () => {
    try {
      isSubmittedRef.current = true;
      setSubmitting(true);
      setError(null);

      // Sanitize responses to ensure base64 audio payload doesn't exceed Vercel function size limit (4.5MB)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitizedResponses: Record<string, any> = {};
      Object.entries(responses).forEach(([qId, resItem]) => {
        sanitizedResponses[qId] = {
          question_id: resItem.question_id,
          part: resItem.part,
          audio_url: resItem.audio_url && resItem.audio_url.startsWith('data:') && resItem.audio_url.length > 50000
            ? undefined
            : resItem.audio_url,
          transcript: resItem.transcript,
          duration_seconds: resItem.duration_seconds,
          answered_at: resItem.answered_at,
        };
      });

      const res = await fetch('/api/ielts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          responses: sanitizedResponses,
          part2Notes,
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned non-JSON response (${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit exam');
      }

      router.push(`/ielts-speaking/result/${attemptId}`);
    } catch (err) {
      console.error('Submit error:', err);
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Preparing your IELTS Speaking environment...</p>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium">
            {error || 'Unable to load IELTS topic or test session.'}
          </div>
          <button
            onClick={() => router.push('/ielts-speaking')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-200"
          >
            Return to IELTS Speaking Portal
          </button>
        </main>
      </div>
    );
  }

  const currentP1Question = topic.part1_questions[part1Index] || topic.part1_questions[0];
  const p1Recorded = responses[currentP1Question.id];

  const currentP3Question = topic.part3_questions[part3Index] || topic.part3_questions[0];
  const p3Recorded = responses[currentP3Question.id];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Navigation Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-purple-600">
              IELTS Speaking Mock Test
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">{topic.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sequential Step Indicator */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-default select-none ${
                  currentPart === 'part1'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 bg-slate-200/60'
                }`}
              >
                Part 1
              </div>
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-default select-none ${
                  currentPart === 'part2'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 bg-slate-200/60'
                }`}
              >
                Part 2
              </div>
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-default select-none ${
                  currentPart === 'part3'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 bg-slate-200/60'
                }`}
              >
                Part 3
              </div>
            </div>

            {/* End Exam & Score Now Button */}
            <button
              onClick={handleFinishExam}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              title="Finish test immediately and calculate band score"
            >
              <Flag className="w-4 h-4 text-rose-600" />
              <span>{submitting ? 'Scoring...' : 'End Test & Score Now'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* PART 1 VIEW (1 Question at a time, Next Only) */}
        {currentPart === 'part1' && (
          <div className="space-y-6">
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                  Part 1 • Introduction & Interview
                </div>
                <h2 className="text-xl font-bold text-slate-900">General Questions</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Answer each question concisely in 2–3 sentences. Press the microphone button to record.
                </p>
              </div>

              <div className="px-4 py-2 bg-purple-600 text-white font-mono font-bold text-sm rounded-xl shrink-0 shadow-sm">
                Question {part1Index + 1} of {topic.part1_questions.length}
              </div>
            </div>

            {/* Single Question Display Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                    Question {part1Index + 1} / {topic.part1_questions.length}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                    {currentP1Question.question_text}
                  </h3>
                </div>
                {p1Recorded?.audio_url && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Recorded</span>
                  </div>
                )}
              </div>

              <AudioRecorder
                key={currentP1Question.id}
                questionId={currentP1Question.id}
                onAudioRecorded={(url, transcript, duration) =>
                  handleAudioRecorded(currentP1Question.id, 'part1', url, transcript, duration)
                }
                maxDurationSeconds={60}
              />
            </div>

            {/* Forward-Only Step Navigation Controls */}
            <div className="flex justify-end pt-4">
              {part1Index < topic.part1_questions.length - 1 ? (
                <button
                  onClick={() => setPart1Index((prev) => prev + 1)}
                  className="flex items-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-200"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentPart('part2')}
                  className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-200"
                >
                  <span>Proceed to Part 2 (Cue Card)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* PART 2 VIEW */}
        {currentPart === 'part2' && (
          <div className="space-y-6">
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Part 2 • Individual Long Turn (Cue Card)
              </div>
              <h2 className="text-xl font-bold text-slate-900">{topic.part2_cue_card.cue_card_title}</h2>
            </div>

            {/* Cue Card Card */}
            <div className="bg-white border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Topic Cue Card</h3>
              <p className="text-slate-900 font-bold text-base mb-4">{topic.part2_cue_card.prompt_lead}</p>

              <ul className="space-y-2.5 mb-6">
                {topic.part2_cue_card.bullet_points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Preparation Step */}
            {part2Step === 'prep' && (
              <div className="space-y-6">
                <PrepTimer durationSeconds={60} onTimerComplete={() => setPart2Step('speaking')} />

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Scratchpad Preparation Notes:
                  </label>
                  <textarea
                    value={part2Notes}
                    onChange={(e) => setPart2Notes(e.target.value)}
                    rows={4}
                    placeholder="Type key bullet points for your talk here (e.g., introduction, key features, reasons why useful)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 text-sm focus:outline-none focus:border-amber-500 transition-all resize-none font-medium"
                  />
                </div>
              </div>
            )}

            {/* Speaking Step */}
            {part2Step === 'speaking' && (
              <div className="space-y-6">
                {/* Candidate Reference Notes */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    <span>Your Preparation Notes (Reference while speaking)</span>
                  </div>
                  <div className="bg-white border border-amber-200/80 rounded-xl p-4 text-slate-800 text-sm font-medium whitespace-pre-wrap min-h-[80px]">
                    {part2Notes.trim() ? part2Notes : <span className="text-slate-400 italic">No notes written during preparation.</span>}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">Record Speech (Up to 2 Minutes)</h3>
                  <AudioRecorder
                    questionId={topic.part2_cue_card.id}
                    onAudioRecorded={(url, transcript, duration) =>
                      handleAudioRecorded(topic.part2_cue_card.id, 'part2', url, transcript, duration)
                    }
                    maxDurationSeconds={120}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentPart('part3')}
                    className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-amber-200"
                  >
                    <span>Proceed to Part 3 (Discussion)</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PART 3 VIEW (1 Question at a time, Next Only) */}
        {currentPart === 'part3' && (
          <div className="space-y-6">
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                  Part 3 • Two-Way Discussion
                </div>
                <h2 className="text-xl font-bold text-slate-900">Abstract & Social Discussion</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Elaborate on your personal viewpoint with supporting reasons and examples.
                </p>
              </div>

              <div className="px-4 py-2 bg-indigo-600 text-white font-mono font-bold text-sm rounded-xl shrink-0 shadow-sm">
                Topic {part3Index + 1} of {topic.part3_questions.length}
              </div>
            </div>

            {/* Single Discussion Display Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    Topic {part3Index + 1}: {currentP3Question.topic_title}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                    {currentP3Question.question_text}
                  </h3>
                </div>
                {p3Recorded?.audio_url && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Recorded</span>
                  </div>
                )}
              </div>

              <AudioRecorder
                key={currentP3Question.id}
                questionId={currentP3Question.id}
                onAudioRecorded={(url, transcript, duration) =>
                  handleAudioRecorded(currentP3Question.id, 'part3', url, transcript, duration)
                }
                maxDurationSeconds={90}
              />
            </div>

            {/* Forward-Only Step Navigation Controls */}
            <div className="flex justify-end pt-4">
              {part3Index < topic.part3_questions.length - 1 ? (
                <button
                  onClick={() => setPart3Index((prev) => prev + 1)}
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleFinishExam}
                  disabled={submitting}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 hover:scale-[1.02] disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>{submitting ? 'Evaluating Test...' : 'Complete & Submit IELTS Speaking Test'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
