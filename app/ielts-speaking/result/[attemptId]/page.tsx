'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { QuestionAudioReviewer } from '@/components/ielts/QuestionAudioReviewer';
import { IELTSScoreResult } from '@/types/ielts';
import { Award, Sparkles, AlertCircle, ArrowUpRight, RefreshCw, ChevronRight } from 'lucide-react';

export default function IELTSSpeakingResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();

  const [result, setResult] = useState<IELTSScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        const res = await fetch(`/api/ielts/${attemptId}`);
        const data = await res.json();

        if (!res.ok || !data.success || !data.result) {
          throw new Error(data.error || 'Failed to load result report');
        }

        setResult(data.result);
      } catch (err) {
        console.error('Fetch result error:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [attemptId]);

  const [rescoring, setRescoring] = useState(false);
  const [rescoreSuccess, setRescoreSuccess] = useState(false);

  async function handleRescoreWithAI() {
    try {
      setRescoring(true);
      setError(null);
      setRescoreSuccess(false);

      const res = await fetch('/api/ielts/rescore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.result) {
        throw new Error(data.error || 'Failed to re-score attempt with AI');
      }

      setResult(data.result);
      setRescoreSuccess(true);
      setTimeout(() => setRescoreSuccess(false), 5000);
    } catch (err) {
      console.error('Rescore error:', err);
      setError((err as Error).message);
    } finally {
      setRescoring(false);
    }
  }

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Analyzing speech transcripts & generating Band Score report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full space-y-8">
        {/* Overall Band Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-purple-700 text-white rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  <Award className="w-4 h-4" />
                  <span>IELTS Speaking Evaluation Report</span>
                </div>

                <button
                  onClick={handleRescoreWithAI}
                  disabled={rescoring}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-amber-50 text-purple-900 text-xs font-extrabold rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50"
                  title="Gửi bài làm qua API AI để chấm điểm lại"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rescoring ? 'animate-spin' : ''}`} />
                  <span>{rescoring ? 'AI Đang Chấm Điểm Lại...' : '🤖 Chấm Điểm Lại Với AI'}</span>
                </button>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold">{result.topic_title}</h1>
              <p className="text-amber-50 max-w-xl text-sm leading-relaxed">{result.summary_feedback}</p>

              {rescoreSuccess && (
                <div className="inline-block px-3 py-1 bg-emerald-500/90 text-white text-xs font-bold rounded-lg animate-fade-in">
                  ✓ Đã cập nhật kết quả chấm điểm AI mới nhất thành công!
                </div>
              )}
            </div>

            {/* Band Score Badge */}
            <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl min-w-[200px] shadow-2xl shrink-0">
              <div className="text-xs uppercase tracking-widest font-bold text-amber-200">Overall Band</div>
              <div className="text-6xl font-extrabold text-white font-mono my-2">{result.overall_band.toFixed(1)}</div>
              <div className="text-xs font-bold text-slate-900 text-center px-3 py-1 bg-white rounded-full">
                {result.status_title}
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Band Reason Card */}
        {result.estimated_band_reason && (
          <div className="bg-purple-50/80 border border-purple-200 rounded-3xl p-6 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Official IELTS Examiner Band Rationale</span>
            </div>
            <p className="text-sm text-purple-900 font-medium leading-relaxed">
              {result.estimated_band_reason}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* 4 Criteria Scores Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>4 IELTS Assessment Criteria Breakdown</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.criteria_scores.map((crit) => (
              <div key={crit.code} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{crit.code}</span>
                      <h3 className="text-lg font-bold text-slate-900">{crit.name}</h3>
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-600 bg-amber-50 px-3.5 py-1 rounded-xl border border-amber-200">
                      {crit.score.toFixed(1)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{crit.summary}</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-900">Key Observations:</div>
                  {crit.key_observations.map((obs, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <ChevronRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Response Review (Audio & Transcript Player) */}
        <QuestionAudioReviewer result={result} />

        {/* Filler Words & Vocabulary Upgrades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filler Words */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Filler Word Frequency Analysis</span>
            </h3>

            <div className="space-y-3">
              {result.filler_words.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg text-sm">
                      "{f.word}"
                    </span>
                    <span className="text-xs text-slate-600">Count: {f.count}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                      f.impact === 'high'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : f.impact === 'moderate'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {f.impact} impact
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vocabulary Upgrades */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <span>Lexical Upgrade Recommendations (C1/C2)</span>
            </h3>

            <div className="space-y-3">
              {result.vocab_upgrades.map((v, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-slate-400">{v.original}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-emerald-700">{v.upgrade}</span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{v.context_example}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          <button
            onClick={() => router.push('/ielts-speaking')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl border border-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Practice Another Topic</span>
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-purple-200"
          >
            <span>Return to Home</span>
          </button>
        </div>
      </main>
    </div>
  );
}
