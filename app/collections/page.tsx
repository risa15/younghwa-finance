'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { CashTransaction } from '@/lib/types';
import { formatKoreanShorthand } from '@/components/KPICard';

// Helpers
function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function CollectionsPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-10');
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch transactions
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch('/api/transactions');
        if (!res.ok) throw new Error('API fetch error');
        const response = await res.json();
        setTransactions(response.data);
        
        // Default to maximum date in transactions if available
        if (response.data.length > 0) {
          const maxDate = response.data
            .filter((t: CashTransaction) => t.type === '입금')
            .reduce((max: string, t: CashTransaction) => t.date > max ? t.date : max, '2026-06-10');
          setSelectedDate(maxDate);
        }
      } catch (err) {
        console.error(err);
        setError('수금 내역 데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter transactions based on viewType and selectedDate
  const filteredCollections = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const onlyDeposits = transactions.filter(t => t.type === '입금');
    
    if (viewType === 'daily') {
      return onlyDeposits.filter(t => t.date === selectedDate);
    } else {
      // Monthly view: match year and month
      const [year, month] = selectedDate.split('-');
      return onlyDeposits.filter(t => {
        const [ty, tm] = t.date.split('-');
        return ty === year && tm === month;
      });
    }
  }, [transactions, viewType, selectedDate]);

  // Sum of filtered collections
  const totalAmount = useMemo(() => {
    return filteredCollections.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredCollections]);



  // Date handlers
  const adjustDate = (offset: number) => {
    if (viewType === 'daily') {
      const dateObj = parseDateStr(selectedDate);
      dateObj.setDate(dateObj.getDate() + offset);
      setSelectedDate(formatDateStr(dateObj));
    } else {
      // Adjust month
      const [year, month] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1 + offset, 1);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-01`); // default day 1
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    setSelectedDate(e.target.value);
  };



  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">수금 현황</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            회사로 유입되는 현금 입금 목록과 월별 수금 추이를 분석합니다.
          </p>
        </div>

        {/* View toggler & Date navigation */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Toggle Daily/Monthly */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 h-9 shadow-sm">
            <button
              onClick={() => setViewType('daily')}
              className={`px-3 text-xs font-semibold rounded-md transition-all ${
                viewType === 'daily' 
                  ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              일별
            </button>
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 text-xs font-semibold rounded-md transition-all ${
                viewType === 'monthly' 
                  ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              월별
            </button>
          </div>

          {/* Date controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9 shadow-sm">
            <button 
              onClick={() => adjustDate(-1)}
              className="p-2 text-slate-400 hover:text-slate-850 hover:bg-slate-50 transition-colors"
              disabled={loading}
              title={viewType === 'daily' ? '하루 전' : '한 달 전'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="relative px-3 flex items-center justify-center gap-2 border-x border-slate-200 hover:bg-slate-50 cursor-pointer h-full text-xs font-semibold text-slate-700 min-w-[130px]">
              <span>
                {viewType === 'daily' 
                  ? `${selectedDate.split('-')[0]}년 ${selectedDate.split('-')[1]}월 ${selectedDate.split('-')[2]}일`
                  : `${selectedDate.split('-')[0]}년 ${selectedDate.split('-')[1]}월`
                }
              </span>
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
              title={viewType === 'daily' ? '하루 후' : '한 달 후'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Main content grid */}
      <div className={`space-y-6 sm:space-y-8 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        


        {/* 2. Collection Details Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {viewType === 'daily' ? '일별 수금 상세 내역' : '월별 수금 상세 내역'}
              </h3>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold font-mono">
              조회 대상 기간: <span className="text-slate-600">
                {viewType === 'daily' ? selectedDate : `${selectedDate.split('-')[0]}-${selectedDate.split('-')[1]}`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                  <th className="px-6 py-3">날짜</th>
                  <th className="px-6 py-3">거래내용</th>
                  <th className="px-6 py-3">카테고리</th>
                  <th className="px-6 py-3">메모</th>
                  <th className="px-6 py-3 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredCollections.length > 0 ? (
                  filteredCollections.map((col, idx) => (
                    <tr key={`${col.client}-${col.date}-${idx}`} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="px-6 py-3.5 font-mono text-slate-500">{col.date}</td>
                      <td className="px-6 py-3.5 text-slate-800 font-bold">{col.client}</td>
                      <td className="px-6 py-3.5">
                        {col.category ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse-subtle">
                            {col.category}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-medium">{col.memo || '-'}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                        {col.amount.toLocaleString('ko-KR')} 원
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={5}>
                      지정된 일자에 등록된 수금(입금) 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Sum */}
          <div className="px-6 py-4.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {viewType === 'daily' ? '일 수금 합계' : '월 누적 수금 합계'}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 font-mono">
                ({formatKoreanShorthand(totalAmount)})
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-black text-brand-emerald tracking-tight">
                  {totalAmount.toLocaleString('ko-KR')}
                </span>
                <span className="text-[10px] font-bold text-slate-500">원</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
