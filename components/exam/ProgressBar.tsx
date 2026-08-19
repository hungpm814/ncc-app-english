'use client';

import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  section?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, section }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span>
          Question {current} of {total}
        </span>
        {section && <span className="text-indigo-600 font-bold">{section}</span>}
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
