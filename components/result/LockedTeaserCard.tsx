'use client';

import React from 'react';
import { Lock, Sparkles, ShieldCheck } from 'lucide-react';

export const LockedTeaserCard: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Full Skill Analysis & Action Plan</h3>
            <p className="text-xs text-slate-500">Locked until you join the Mezon Clan</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
          Gated Report
        </span>
      </div>

      {/* Blurred Simulated Content */}
      <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-4 filter blur-[6px] select-none pointer-events-none opacity-60">
        <div className="space-y-2">
          <div className="h-4 bg-slate-300 rounded w-1/3" />
          <div className="h-3 bg-slate-200 rounded w-full" />
          <div className="h-3 bg-slate-200 rounded w-4/5" />
        </div>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="h-16 bg-indigo-100 rounded-xl" />
          <div className="h-16 bg-violet-100 rounded-xl" />
          <div className="h-16 bg-amber-100 rounded-xl" />
        </div>

        <div className="space-y-2 pt-2">
          <div className="h-4 bg-slate-300 rounded w-1/4" />
          <div className="h-3 bg-slate-200 rounded w-full" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
        </div>
      </div>

      {/* Overlay Lock Message */}
      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-lg max-w-md w-full space-y-3">
          <div className="flex items-center justify-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Sparkles className="w-4 h-4" />
            <span>Unlock 100% Free</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Join our Mezon Clan community to reveal your exact section breakdown, skill weaknesses, and downloadable certificate!
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Unlock</span>
            </span>
            <span>•</span>
            <span>Zero Spam</span>
          </div>
        </div>
      </div>
    </div>
  );
};
