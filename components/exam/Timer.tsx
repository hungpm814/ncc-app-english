'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp?.();
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, onTimeUp]);

  const isLow = seconds < 120; // less than 2 mins

  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${
        isLow ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' : 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{formatTime(seconds)}</span>
    </div>
  );
};
