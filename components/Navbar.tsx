'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserSession } from '@/types';
import { Mic, LogOut, User, Sparkles, History } from 'lucide-react';

interface NavbarProps {
  user?: UserSession | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user: propUser, onLogout }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null | undefined>(propUser);

  useEffect(() => {
    if (propUser !== undefined) {
      setCurrentUser(propUser);
      return;
    }

    let isMounted = true;
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (isMounted) {
          if (data.isLoggedIn && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        }
      } catch {
        if (isMounted) setCurrentUser(null);
      }
    }
    fetchMe();

    return () => {
      isMounted = false;
    };
  }, [propUser]);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const activeUser = propUser !== undefined ? propUser : currentUser;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200 group-hover:scale-105 transition-transform">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-700">
              Mezon IELTS
            </span>
            <span className="block text-[10px] font-bold text-purple-600 uppercase tracking-widest">
              Speaking Platform
            </span>
          </div>
        </Link>

        {/* Center Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Full 3-Part Exam Simulator</span>
        </div>

        {activeUser ? (
          <div className="flex items-center space-x-3">
            <Link
              href="/ielts-speaking/history"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-all border border-slate-200"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My History</span>
            </Link>

            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
              {activeUser.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeUser.avatar_url} alt={activeUser.display_name || activeUser.mezon_username} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  {activeUser.mezon_username ? activeUser.mezon_username[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
              )}
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-900 max-w-[140px] truncate">
                  {activeUser.display_name || activeUser.mezon_username}
                </span>
                {activeUser.mezon_username && (
                  <span className="text-[10px] text-purple-600 font-semibold truncate max-w-[140px]">
                    @{activeUser.mezon_username}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-sm transition-all"
          >
            Login with Mezon
          </Link>
        )}
      </div>
    </header>
  );
};
