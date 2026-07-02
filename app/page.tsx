'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import CollectionAlertBanner from '@/components/CollectionAlertBanner';
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
  const dateInputRef = useRef<HTMLInputElement>(null);
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
            
            <div 
              onClick={() => dateInputRef.current?.showPicker()}
              className="relative px-3 flex items-center justify-center gap-2 border-x border-slate-200 hover:bg-slate-50 cursor-pointer h-full text-xs font-semibold text-slate-700 min-w-[155px]"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{selectedDate ? formatDisplayDate(selectedDate) : '날짜 선택'}</span>
              <input 
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
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
            title="총 유동자산"
            value={data?.kpis.totalLiquidAssets || 0}
            icon={Wallet}
            color="emerald"
            description="예금 및 현금 합계"
          />
          <KPICard 
            title="어음·채권 만기 예정액"
            value={data?.kpis.upcomingNotes30Days || 0}
            icon={Calendar}
            color="blue"
            description="30일 이내 만기 도래"
          />
          <KPICard 
            title="단기 수금 예정액"
            value={data?.kpis.expectedCollection10Days || 0}
            icon={TrendingUp}
            color="amber"
            description="10일 이내 수금 예정"
          />
          <KPICard 
            title="현금 잔액"
            value={data?.kpis.cashBalance || 0}
            icon={Coins}
            color="rose"
            description="예금 제외 순수 현금"
          />
        </div>

        {/* New: Monthly Collection Progress Panel */}
        {data?.kpis.expectedCollectionThisMonth !== undefined && data.kpis.expectedCollectionThisMonth > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">이번 달 수금 예정 및 진척도</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">구글 시트 '수금예정' 등록 건 기준</p>
              </div>
              <div className="flex items-baseline gap-1 text-xs">
                <span className="text-slate-400 font-semibold">수금 진행률:</span>
                <span className="font-mono font-black text-brand-emerald text-sm">
                  {data.kpis.expectedCollectionThisMonth > 0 
                    ? Math.round((data.kpis.collectedThisMonth || 0) / data.kpis.expectedCollectionThisMonth * 100) 
                    : 0}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">총 수금 예정액</span>
                <span className="font-mono font-bold text-slate-800 text-sm mt-1 block">
                  {data.kpis.expectedCollectionThisMonth.toLocaleString()}원
                </span>
              </div>
              <div className="bg-emerald-50/30 rounded-lg p-3 border border-emerald-100/40">
                <span className="text-[10px] text-emerald-600 font-bold block">수금 완료액</span>
                <span className="font-mono font-bold text-brand-emerald text-sm mt-1 block">
                  {data.kpis.collectedThisMonth?.toLocaleString()}원
                </span>
              </div>
              <div className="bg-rose-50/30 rounded-lg p-3 border border-rose-100/40">
                <span className="text-[10px] text-rose-600 font-bold block">미수 잔액</span>
                <span className="font-mono font-bold text-rose-600 text-sm mt-1 block">
                  {data.kpis.uncollectedThisMonth?.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-brand-emerald h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${data.kpis.expectedCollectionThisMonth > 0 
                    ? Math.min(100, Math.round((data.kpis.collectedThisMonth || 0) / data.kpis.expectedCollectionThisMonth * 100)) 
                    : 0}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* 3. Upcoming Alerts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AlertBanner alerts={data?.upcomingAlerts || []} />
          <CollectionAlertBanner alerts={data?.upcomingCollections || []} />
        </div>

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
