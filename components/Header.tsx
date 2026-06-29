'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  isDemo?: boolean;
}

export default function Header({ isDemo = false }: HeaderProps) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const menuItems = [
    { name: '대시보드', href: '/' },
    { name: '시재일보', href: '/daily-report' },
    { name: '수금 현황', href: '/collections' },
    { name: '지출 현황', href: '/expenses' },
    { name: '어음·채권 관리', href: '/notes' },
    { name: '대출·외담대 현황', href: '/loans' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white h-16 shrink-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              {process.env.NEXT_PUBLIC_COMPANY_NAME || '영화포장'}
            </span>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase border-l border-slate-300 pl-2">
              자금운용 시스템
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex h-full items-center gap-1 sm:gap-4 md:gap-6">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-full items-center px-3 text-xs sm:text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right section: Demo Mode Badge & Logout */}
        <div className="flex items-center gap-4">
          {isDemo && (
            <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-bold text-amber-600">가상 데모 모드</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
          >
            로그아웃
          </button>
        </div>

      </div>
    </header>
  );
}

