'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Mic, Clock, Sparkles, Award, ArrowRight, Layers, ShieldCheck } from 'lucide-react';
import { UserSession } from '@/types';
import { IELTSSpeakingTopic } from '@/types/ielts';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [topic, setTopic] = useState<IELTSSpeakingTopic | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const hashData = urlParams.get('data');

      if (hashData) {
        try {
          const res = await fetch('/api/auth/mezon-hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hashData }),
          });
          const data = await res.json();

          if (data.success && data.user) {
            setUser(data.user);
          }
        } catch (err) {
          console.error('Hash auth error:', err);
        }
      }

      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.isLoggedIn && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Session check error:', err);
      }

      try {
        const res = await fetch('/api/ielts/start');
        const data = await res.json();
        if (data.success && data.topic) {
          setTopic(data.topic);
        }
      } catch (err) {
        console.error('Fetch IELTS topic error:', err);
      }
    }

    checkAuth();
  }, []);

  const handleStartIELTSTest = async () => {
    try {
      setStarting(true);
      setError(null);

      const res = await fetch('/api/ielts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic?.id || 'topic-tech-innovation' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to start IELTS Speaking test');
      }

      router.push(`/ielts-speaking/test/${data.attempt.id}`);
    } catch (err) {
      console.error('Start test error:', err);
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full space-y-12">
        {/* Header Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 text-white rounded-3xl p-8 md:p-14 shadow-xl">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Official IELTS Speaking 3-Part Simulator</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              IELTS Speaking <br />
              <span className="text-amber-300">Full 3-Part Mock Test</span>
            </h1>

            <p className="text-purple-100 text-base sm:text-lg leading-relaxed">
              Practice authentic IELTS Speaking exam flows across Part 1, Part 2 (60s prep & 120s speech auto-recorder), and Part 3 with instant Band Score breakdown.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleStartIELTSTest}
                disabled={starting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-purple-700 hover:bg-slate-100 font-bold text-lg rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Mic className="w-6 h-6 text-purple-600 animate-pulse" />
                <span>{starting ? 'Initializing Test...' : 'Start IELTS Speaking Test'}</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-purple-100">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Live Browser Microphone • 100% Free</span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* 3 Parts Structure Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            <span>IELTS Speaking 3-Part Format</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Part 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg mb-4">
                  01
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Part 1: Introduction & Interview</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Answer 4–5 short questions on familiar everyday topics (Work, Study, Hometown, Hobbies).
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration: 4–5 Minutes</span>
              </div>
            </div>

            {/* Part 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-lg mb-4">
                  02
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Part 2: Cue Card & Long Turn</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Topic Cue Card with 60s prep countdown & scratchpad notes, followed by 120s speech auto-record.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>60s Prep + 120s Auto-Record</span>
              </div>
            </div>

            {/* Part 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-lg mb-4">
                  03
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Part 3: Two-Way Discussion</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Engage in in-depth discussion on broader societal issues and abstract concepts connected to Part 2.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration: 4–5 Minutes</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Scoring Criteria Cards */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Standardized IELTS Band Scoring (1.0 - 9.0)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-sm font-bold text-purple-700 mb-1">Fluency & Coherence</div>
              <div className="text-xs text-slate-600">Speech continuity, logical flow & filler word detection.</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-sm font-bold text-indigo-700 mb-1">Lexical Resource</div>
              <div className="text-xs text-slate-600">Vocabulary range, collocations & C1/C2 upgrade suggestions.</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-sm font-bold text-emerald-700 mb-1">Grammatical Range</div>
              <div className="text-xs text-slate-600">Sentence structure diversity & grammatical accuracy.</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-sm font-bold text-amber-700 mb-1">Pronunciation</div>
              <div className="text-xs text-slate-600">Clarity, natural stress patterns & articulation.</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>© {new Date().getFullYear()} Mezon IELTS Speaking App. Powered by Next.js & PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
