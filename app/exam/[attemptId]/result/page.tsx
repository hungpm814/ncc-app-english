'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { PartialScoreView } from '@/components/result/PartialScoreView';
import { LockedTeaserCard } from '@/components/result/LockedTeaserCard';
import { ClanJoinCTA } from '@/components/result/ClanJoinCTA';
import { FullReportView } from '@/components/result/FullReportView';
import { ExamResultResponse } from '@/types';
import { RotateCcw } from 'lucide-react';

export default function ExamResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();

  const [result, setResult] = useState<ExamResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/exam/${attemptId}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (data.success && data.result) {
        setResult(data.result);
      } else {
        setErrorMsg(data.error || 'Failed to load result.');
      }
    } catch {
      setErrorMsg('Network error loading result.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-sm font-medium">Calculating Your Results...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Result Error</h2>
          <p className="text-slate-600 text-sm">{errorMsg || 'Result not found.'}</p>
          <button
            onClick={() => router.push('/exam')}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
          >
            Back to Exam Intro
          </button>
        </div>
      </div>
    );
  }

  const isUnlocked = result.unlocked;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 space-y-8 w-full">
        {/* Top Partial Score View (Always Visible) */}
        <PartialScoreView
          cefrLevel={result.cefr_level || 'B1'}
          levelTitle={result.level_title || 'Intermediate'}
          levelDescription={result.level_description || 'Can handle everyday conversational topics.'}
          percentage={result.percentage || 0}
          percentileTeaser={result.percentile_teaser}
        />

        {/* Unlocked Full Report vs Gated Lock Section */}
        {isUnlocked ? (
          <FullReportView
            rawScore={result.raw_score}
            weightedScore={result.weighted_score}
            maxWeightedScore={result.max_weighted_score}
            skillScores={result.skill_scores}
            weaknesses={result.weaknesses}
            recommendations={result.recommendations}
          />
        ) : (
          <>
            <LockedTeaserCard />
            <ClanJoinCTA attemptId={attemptId} onVerifySuccess={fetchResult} />
          </>
        )}

        {/* Retake Button */}
        <div className="text-center pt-4">
          <button
            onClick={() => router.push('/exam')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Placement Exam</span>
          </button>
        </div>
      </main>
    </div>
  );
}
