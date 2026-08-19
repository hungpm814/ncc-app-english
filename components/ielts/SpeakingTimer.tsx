'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, AlertCircle } from 'lucide-react';

interface SpeakingTimerProps {
  maxSeconds?: number;
  onTimeUp?: () => void;
}

export const SpeakingTimer: React.FC<SpeakingTimerProps> = ({
  maxSeconds = 120,
  onTimeUp,
}) => {
  const [timeLeft, setTimeLeft] = useState(maxSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isWarning = timeLeft <= 30;

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${
        isWarning
          ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
          : 'bg-indigo-50 border-indigo-200 text-indigo-900'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isWarning ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <Volume2 className="w-5 h-5 text-indigo-600" />}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Thời gian phát biểu còn lại (Mục tiêu: 1 - 2 phút)
            </div>
            <div className="text-xl font-mono font-bold text-slate-900">
              {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {isWarning && <div className="text-xs font-bold text-rose-700 px-3 py-1 bg-rose-100 rounded-lg border border-rose-200">Sắp hết giờ! Chuẩn bị kết bài</div>}
      </div>
    </div>
  );
};
