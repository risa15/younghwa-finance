import type { Metadata } from 'next';
import { Noto_Sans_KR, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const noto = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto-sans',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '영화포장 자금운용 시스템',
  description: '웹 기반 실시간 자금 현황 대시보드 및 어음 만기 관리',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side check if we are in Demo/Mock Mode
  const isDemo = !process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_ID;

  return (
    <html lang="ko" className={`${noto.variable} ${inter.variable} min-h-screen antialiased`}>
      <body className="min-h-screen flex flex-col bg-white font-sans text-slate-900" style={{ backgroundColor: '#ffffff' }}>
        {/* Main Application Container */}
        <Header isDemo={isDemo} />
        <main className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex-1 flex flex-col p-6 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
