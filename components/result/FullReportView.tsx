'use client';

import React from 'react';
import { SkillScore } from '@/types';
import { CheckCircle, AlertTriangle, Lightbulb, Download, Award, Star } from 'lucide-react';

interface FullReportViewProps {
  rawScore?: number;
  weightedScore?: number;
  maxWeightedScore?: number;
  skillScores?: SkillScore[];
  weaknesses?: string[];
  recommendations?: string[];
}

export const FullReportView: React.FC<FullReportViewProps> = ({
  rawScore,
  weightedScore,
  maxWeightedScore = 57,
  skillScores = [],
  weaknesses = [],
  recommendations = [],
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-3 shadow-sm">
        <Award className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <span className="font-bold text-sm">Full Report Unlocked!</span>
          <p className="text-xs text-emerald-700">Thank you for joining the Mezon English Clan community.</p>
        </div>
      </div>

      {/* Score Summary Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>Score Breakdown</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Raw Score</span>
            <span className="text-2xl font-extrabold text-slate-900">{rawScore ?? '--'} / 30</span>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Weighted Score</span>
            <span className="text-2xl font-extrabold text-indigo-700">
              {weightedScore ?? '--'} / {maxWeightedScore}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 text-center col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider block">Proficiency Rank</span>
            <span className="text-2xl font-extrabold text-violet-700">Top 15%</span>
          </div>
        </div>

        {/* Skill Progress Bars */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Section Mastery</h4>
          <div className="space-y-3">
            {skillScores.map((skill) => (
              <div key={skill.section} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{skill.label}</span>
                  <span className="font-bold text-indigo-600">{skill.percentage}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
                    style={{ width: `${skill.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weaknesses & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Areas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-base text-slate-900">Key Focus Areas</h3>
          </div>
          {weaknesses.length > 0 ? (
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              {weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No major weaknesses identified! Excellent overall mastery.</p>
          )}
        </div>

        {/* Actionable Recommendations */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-700">
            <Lightbulb className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-base text-slate-900">7-Day Action Plan</h3>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
            {recommendations.map((r, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Download Certificate Mock Button */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-bold text-base">Verified CEFR Level Certificate</h4>
          <p className="text-xs text-slate-400">Download your official PDF completion badge to share or print.</p>
        </div>
        <button
          onClick={() => alert('Certificate download feature generated for your level!')}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Certificate</span>
        </button>
      </div>
    </div>
  );
};
