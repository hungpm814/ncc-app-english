'use client';

import React from 'react';
import { CEFRLevel } from '@/types';
import { Award, Sparkles, TrendingUp } from 'lucide-react';

interface PartialScoreViewProps {
  cefrLevel: CEFRLevel;
  levelTitle: string;
  levelDescription: string;
  percentage: number;
  percentileTeaser?: string;
}

export const PartialScoreView: React.FC<PartialScoreViewProps> = ({
  cefrLevel,
  levelTitle,
  levelDescription,
  percentage,
  percentileTeaser,
}) => {
  const getBadgeColor = (level: CEFRLevel) => {
    switch (level) {
      case 'A1':
      case 'A2':
        return 'from-blue-500 to-cyan-500 text-white';
      case 'B1':
      case 'B2':
        return 'from-indigo-600 to-violet-600 text-white';
      case 'C1':
      case 'C2':
        return 'from-emerald-500 to-teal-600 text-white';
      default:
        return 'from-slate-600 to-slate-800 text-white';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-6 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />

      {/* Level Badge */}
      <div className="inline-flex flex-col items-center justify-center space-y-2">
        <div
          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr ${getBadgeColor(
            cefrLevel
          )} flex flex-col items-center justify-center shadow-lg shadow-indigo-100 transform hover:scale-105 transition-transform`}
        >
          <Award className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 mb-1" />
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">{cefrLevel}</span>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CEFR Assessed</span>
        </div>
      </div>

      {/* Summary Text */}
      <div className="space-y-2 max-w-md mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Your Level: <span className="text-indigo-600">{levelTitle}</span>
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">{levelDescription}</p>
      </div>

      {/* Quick Stat Pill */}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span className="text-xs text-slate-600 font-medium">Accuracy Score:</span>
          <span className="text-sm font-bold text-slate-900">{percentage}%</span>
        </div>
        {percentileTeaser && (
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl text-xs font-medium text-emerald-800">
            ✨ {percentileTeaser}
          </div>
        )}
      </div>
    </div>
  );
};
