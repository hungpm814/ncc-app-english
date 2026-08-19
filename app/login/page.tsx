'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200">
          <BookOpen className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mezon Authentication</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Mezon IELTS Speaking Platform</h1>
          <p className="text-slate-600 text-sm">
            Please log in with your Mezon account to access full 3-part IELTS Speaking mock tests.
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/api/auth/login"
            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Login with Mezon</span>
          </a>
        </div>

        <div className="flex items-center justify-center space-x-2 text-xs font-medium text-slate-500 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure OAuth2 login • No password required</span>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
