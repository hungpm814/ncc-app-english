'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { UserSession } from '@/types';
import { BookOpen, CheckCircle, Clock, Play, ShieldAlert, Sparkles } from 'lucide-react';

export default function ExamIntroPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.isLoggedIn && data.user) {
          setUser(data.user);
        }
      } catch {
        // ignore
      }
    }
    loadUser();
  }, []);

  const handleStartExam = async () => {
    setIsStarting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();

      if (data.success && data.attempt) {
        router.push(`/exam/${data.attempt.id}`);
      } else {
        setErrorMsg(data.error || 'Failed to start exam. Please try again.');
      }
    } catch {
      setErrorMsg('Network error while starting exam.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-8 w-full">
          {/* Header */}
          <div className="space-y-3 text-center">
            {user ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Candidate: @{user.mezon_username || user.display_name}</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assessment Overview</span>
              </div>
            )}
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              English Placement Test
            </h1>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              Answer 2 multiple-choice questions to evaluate your English grammar, vocabulary, and reading skills.
            </p>
          </div>

          {/* Test Specs Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <BookOpen className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-500 block">Questions</span>
              <span className="text-lg font-extrabold text-slate-900">2 MCQ</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <Clock className="w-5 h-5 text-violet-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-500 block">Duration</span>
              <span className="text-lg font-extrabold text-slate-900">15 Mins</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <Sparkles className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-500 block">Scoring</span>
              <span className="text-lg font-extrabold text-slate-900">CEFR A1–C2</span>
            </div>
          </div>

          {/* Rules */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <h3 className="font-bold text-sm text-indigo-950 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <span>Guidelines & Anti-Cheat</span>
            </h3>
            <ul className="text-xs sm:text-sm text-slate-600 space-y-2 pl-6 list-disc">
              <li>Each question has 4 options with exactly 1 correct answer.</li>
              <li>You can navigate back and forth between questions before submitting.</li>
              <li>Your progress is saved automatically. If you refresh, you can resume.</li>
              <li>Calculators or dictionary tools are prohibited.</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Start CTA */}
          <button
            onClick={handleStartExam}
            disabled={isStarting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-base flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isStarting ? (
              <span>Preparing Exam...</span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Begin Placement Test</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
