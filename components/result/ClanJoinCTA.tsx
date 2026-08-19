'use client';

import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface ClanJoinCTAProps {
  attemptId: string;
  onVerifySuccess: () => void;
}

export const ClanJoinCTA: React.FC<ClanJoinCTAProps> = ({ attemptId, onVerifySuccess }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clanInviteUrl = process.env.NEXT_PUBLIC_MEZON_CLAN_INVITE_URL || 'https://mezon.ai/invite/demo';

  const handleVerify = async () => {
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/membership/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });

      const data = await res.json();

      if (data.success && data.isMember) {
        onVerifySuccess();
      } else {
        setErrorMsg(data.message || 'We could not confirm your clan membership yet. Please join the clan and try again.');
      }
    } catch {
      setErrorMsg('Network error. Please try verifying again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />

      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Exclusive Unlock</span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Join Mezon English Clan</h2>
        </div>
      </div>

      <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
        Connect with 5,000+ English learners, access weekly quizzes, practice speaking in channels, and immediately unlock your full exam breakdown!
      </p>

      {/* CTA Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Button 1: Join Clan */}
        <a
          href={clanInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 px-6 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>Join Clan on Mezon</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Button 2: Re-check membership */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full py-4 px-6 rounded-2xl bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/30 font-bold text-sm sm:text-base flex items-center justify-center space-x-2 backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Checking Membership...' : "I've Joined — Verify Now"}</span>
        </button>
      </div>

      {/* Error / Status message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-100 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Footer hint */}
      <div className="flex items-center justify-center space-x-2 text-xs text-indigo-200/80 pt-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Free forever • Instant report unlock</span>
      </div>
    </div>
  );
};
