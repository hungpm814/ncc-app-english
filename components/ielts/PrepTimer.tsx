'use client';

import React, { useState, useEffect } from 'react';
import { Timer, ArrowRight } from 'lucide-react';

interface PrepTimerProps {
  durationSeconds?: number;
  onTimerComplete: () => void;
}

export const PrepTimer: React.FC<PrepTimerProps> = ({
  durationSeconds = 60,
  onTimerComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          onTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimerComplete]);

  const percentage = (timeLeft / durationSeconds) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                className="text-amber-100"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                className="text-amber-500 transition-all duration-1000 ease-linear"
                fill="transparent"
                strokeDasharray={175.9}
                strokeDashoffset={175.9 - (175.9 * percentage) / 100}
              />
            </svg>
            <Timer className="w-6 h-6 text-amber-600 absolute" />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-amber-700">
              Part 2 • Preparation Time (60 Seconds)
            </div>
            <div className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
              {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">Use 60 seconds to jot down bullet points in your notes below.</p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsActive(false);
            onTimerComplete();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-amber-200"
        >
          <span>Start Speaking Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
