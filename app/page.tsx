'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  TrendingUp, 
  Coins, 
  Wallet,
  Activity
} from 'lucide-react';
import KPICard from '@/components/KPICard';
import AlertBanner from '@/components/AlertBanner';
import AccountTable from '@/components/AccountTable';
import CapitalSimulation from '@/components/CapitalSimulation';
import { DashboardData } from '@/lib/types';

// Format Date object to YYYY-MM-DD
function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Parse YYYY-MM-DD to Date object
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async (dateParam?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = dateParam ? `/api/dashboard?date=${dateParam}` : '/api/dashboard';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('데이터를 불러오는 중 오류가 발생했습니다.');
      }
      const result: DashboardData = await response.json();
      
      setData(result);
      // Auto-align selected date with resolved date if not set yet
      setSelectedDate(result.selectedDate);
      
      // Update last refreshed time
      const now = new Date();
      setLastRefreshed(now.toLocaleTimeString('ko-KR'));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '서버와의 통신이 원활하지 않습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Adjust Date by offset (+1 or -1 days)
  const adjustDate = (daysOffset: number) => {
    if (!selectedDate) return;
    const currentDateObj = parseDateStr(selectedDate);
    currentDateObj.setDate(currentDateObj.getDate() + daysOffset);
    const newDateStr = formatDateStr(currentDateObj);
    setSelectedDate(newDateStr);
    fetchDashboardData(newDateStr);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    if (!newDateStr) return;
    setSelectedDate(newDateStr);
    fetchDashboardData(newDateStr);
  };

  const handleRefresh = () => {
    fetchDashboardData(selectedDate);
  };

  // Format Korean Date for Display (e.g., "2026년 06월 10일")
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${y}년 ${m}월 ${d}일`;
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">대시보드</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            회사 자산 현황과 주요 입출금 및 어음 만기를 한눈에 확인합니다.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Date Selector Navigation */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9 shadow-sm">
            <button 
              onClick={() => adjustDate(-1)}
              className="p-2 text-slate-400 hover:text-slate-850 hover:bg-slate-50 transition-colors"
              disabled={loading}
              title="하루 전"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="relative px-3 flex items-center justify-center gap-2 border-x border-slate-200 hover:bg-slate-50 cursor-pointer h-full text-xs font-semibold text-slate-700 min-w-[130px]">
              <span>{selectedDate ? formatDisplayDate(selectedDate) : '날짜 선택'}</span>
              <input 
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={loading}
              />
            </div>
            
            <button 
              onClick={() => adjustDate(1)}
              className="p-2 text-slate-400 hover:text-slate-850 hover:bg-slate-50 transition-colors"
              disabled={loading}
              title="하루 후"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-blue' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className={`space-y-6 sm:space-y-8 ${loading && !data ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* 2. KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard 
            title="당일 수금액"
            value={data?.kpis.todayCollection || 0}
            icon={TrendingUp}
            color="emerald"
            description={`${selectedDate ? selectedDate.split('-')[2] : ''}일 당일 기준`}
          />
          <KPICard 
            title="당일 지출액"
            value={data?.kpis.todayExpense || 0}
            icon={Activity}
            color="rose"
            description={`${selectedDate ? selectedDate.split('-')[2] : ''}일 당일 기준`}
          />
          <KPICard 
            title="총 유동자산"
            value={data?.kpis.totalLiquidAssets || 0}
            icon={Wallet}
            color="amber"
            description="보통예금 + 특정예금 + 현금"
          />
          <KPICard 
            title="현금 잔액"
            value={data?.kpis.cashBalance || 0}
            icon={Coins}
            color="blue"
            description="예금 제외 순수 현금"
          />
        </div>

        {/* 3. Upcoming Alerts Banner */}
        <AlertBanner alerts={data?.upcomingAlerts || []} />

        {/* 3.5 Capital Flow Simulation */}
        <CapitalSimulation simulation={data?.simulation} selectedDate={selectedDate} />

        {/* 4. Accounts Table */}
        <AccountTable accounts={data?.accounts || []} />
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-4 border-t border-slate-200">
        <span>조회 기준 날짜: {selectedDate}</span>
        {lastRefreshed && (
          <span>최종 동기화 시간: {lastRefreshed}</span>
        )}
      </div>
    </>
  );
}
