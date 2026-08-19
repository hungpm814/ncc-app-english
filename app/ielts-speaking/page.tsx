'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Mic, Clock, Sparkles, Award, ArrowRight, Layers } from 'lucide-react';
import { IELTSSpeakingTopic } from '@/types/ielts';

export default function IELTSSpeakingPortalPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<IELTSSpeakingTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTopics() {
      try {
        setLoading(true);
        const res = await fetch('/api/ielts/start');
        const data = await res.json();
        if (data.success && data.topic) {
          setTopics([data.topic]);
          setSelectedTopicId(data.topic.id);
        }
      } catch (err) {
        console.error('Failed to load IELTS topics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, []);

  const handleStartTest = async () => {
    try {
      setStarting(true);
      setError(null);
      const res = await fetch('/api/ielts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: selectedTopicId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to start IELTS test');
      }

      router.push(`/ielts-speaking/test/${data.attempt.id}`);
    } catch (err) {
      console.error('Start test error:', err);
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 text-white rounded-3xl p-8 md:p-12 mb-10 shadow-xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold rounded-full uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Full 3-Part Exam Simulator</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              IELTS Speaking <span className="text-amber-300">Mock Test</span>
            </h1>

            <p className="text-purple-100 text-lg mb-8 leading-relaxed">
              Experience the complete IELTS Speaking test format with direct browser recording, timed preparation, and automated Band Score analysis.
            </p>

            <button
              onClick={handleStartTest}
              disabled={starting || loading}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-700 hover:bg-slate-100 text-lg font-bold rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Mic className="w-6 h-6 text-purple-600 animate-pulse" />
              <span>{starting ? 'Initializing Exam...' : 'Start IELTS Speaking Test'}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* 3 Parts Structure Cards */}
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          <span>IELTS Speaking 3-Part Structure</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Part 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Part 1: Introduction & Interview</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Answer 4–5 short questions on familiar everyday topics.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Duration: 4–5 Minutes</span>
            </div>
          </div>

          {/* Part 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-lg mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Part 2: Cue Card & Long Turn</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Topic Cue Card with 60s prep countdown & notes, followed by 120s speech auto-record.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              <span>60s Prep + 120s Auto-Record</span>
            </div>
          </div>

          {/* Part 3 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-lg mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Part 3: Two-Way Discussion</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Discuss broader societal and abstract questions connected to Part 2.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Duration: 4–5 Minutes</span>
            </div>
          </div>
        </div>

        {/* Scoring Criteria & Features */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Evaluation Criteria (IELTS Band 1.0 - 9.0)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-sm font-bold text-purple-700 mb-1">Fluency & Coherence</div>
              <div className="text-xs text-slate-600">Continuity, logical flow & filler word detection.</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-sm font-bold text-indigo-700 mb-1">Lexical Resource</div>
              <div className="text-xs text-slate-600">Vocabulary variety & C1/C2 upgrade suggestions.</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-sm font-bold text-emerald-700 mb-1">Grammatical Range</div>
              <div className="text-xs text-slate-600">Grammar diversity & structural precision.</div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-sm font-bold text-amber-700 mb-1">Pronunciation</div>
              <div className="text-xs text-slate-600">Articulation, stress patterns & natural rhythm.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
