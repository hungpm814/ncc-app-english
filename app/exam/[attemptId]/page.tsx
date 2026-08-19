'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ProgressBar } from '@/components/exam/ProgressBar';
import { Timer } from '@/components/exam/Timer';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { ExamAttempt, Question } from '@/types';
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';

export default function ActiveExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();

  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await fetch(`/api/exam/${attemptId}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        if (data.success) {
          if (data.attempt.status === 'submitted') {
            router.push(`/exam/${attemptId}/result`);
            return;
          }

          setAttempt(data.attempt);
          setQuestions(data.questions || []);
          setAnswers(data.attempt.answers || {});
        } else {
          setErrorMsg(data.error || 'Failed to load attempt.');
        }
      } catch {
        setErrorMsg('Network error loading exam.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAttempt();
  }, [attemptId, router]);

  const handleSelectOption = async (optionId: string) => {
    if (!questions[currentIndex]) return;
    const currentQ = questions[currentIndex];

    // Optimistic UI update
    const updatedAnswers = { ...answers, [currentQ.id]: optionId };
    setAnswers(updatedAnswers);

    // Save background answer
    try {
      await fetch('/api/exam/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId: currentQ.id,
          selectedOptionId: optionId,
        }),
      });
    } catch (err) {
      console.error('Save answer error:', err);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/exam/${attemptId}/result`);
      } else {
        setErrorMsg(data.error || 'Failed to submit exam.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg('Network error while submitting.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-sm font-medium">Loading Exam...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !questions.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Exam Loading Error</h2>
          <p className="text-slate-600 text-sm">{errorMsg || 'No questions found.'}</p>
          <button
            onClick={() => router.push('/exam')}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
          >
            Return to Exam Intro
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 space-y-6 w-full">
        {/* Exam Header bar: Timer & Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="flex-1">
            <ProgressBar current={currentIndex + 1} total={questions.length} section={currentQ.section} />
          </div>
          <Timer initialSeconds={attempt?.time_limit_seconds || 900} onTimeUp={handleSubmit} />
        </div>

        {/* Question Card */}
        <QuestionCard
          question={currentQ}
          selectedOptionId={answers[currentQ.id] || null}
          onSelectOption={handleSelectOption}
          questionNumber={currentIndex + 1}
        />

        {/* Navigation Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {isLastQuestion ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center space-x-2 shadow-md shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Submit Exam</span>
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center space-x-1.5 shadow-md shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Question Grid Navigation Pills */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Answer Progress</span>
            <span>{answeredCount} / {questions.length} Answered</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white'
                      : isAnswered
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Confirm Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-scaleIn">
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-extrabold text-slate-900">Ready to Submit?</h3>
              <p className="text-slate-600 text-sm">
                You have answered <span className="font-bold text-indigo-600">{answeredCount}</span> out of{' '}
                <span className="font-bold">{questions.length}</span> questions.
              </p>
              {answeredCount < questions.length && (
                <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
                  ⚠️ Unanswered questions will be scored as incorrect.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm"
              >
                Continue Test
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-100 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Scoring...</span>
                ) : (
                  <>
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
