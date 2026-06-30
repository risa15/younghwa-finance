'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      // Login success, redirect to dashboard home
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-md p-8 sm:p-10">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {process.env.NEXT_PUBLIC_COMPANY_NAME || '영화포장'} 자금운용 시스템
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            서비스 접근을 위해 아이디와 비밀번호를 입력해주세요.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="username" 
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              아이디
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold placeholder:text-slate-300 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/10 transition-all"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold placeholder:text-slate-300 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-emerald text-white rounded-xl text-sm font-bold shadow-sm hover:bg-brand-emerald-dark active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
