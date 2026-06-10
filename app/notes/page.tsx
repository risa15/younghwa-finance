'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown, 
  Coins, 
  Wallet,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import DueDateBadge from '@/components/DueDateBadge';
import { NoteBond } from '@/lib/types';
import { formatKoreanShorthand } from '@/components/KPICard';

interface NoteBondWithDDay extends NoteBond {
  daysLeft: number;
}

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

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteBondWithDDay[]>([]);
  const [totalUnpaid, setTotalUnpaid] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-10');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Notes
  const fetchNotes = async (dateParam: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notes?date=${dateParam}`);
      if (!response.ok) {
        throw new Error('어음/채권 데이터를 불러오는 데 실패했습니다.');
      }
      const data = await response.json();
      setNotes(data.notes);
      setTotalUnpaid(data.totalUnpaidAmount);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '데이터 통신 에러');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(selectedDate);
  }, [selectedDate]);

  // Filter & Sort Notes
  const processedNotes = useMemo(() => {
    let result = [...notes];
    
    // Filter by status
    if (statusFilter === 'unpaid') {
      result = result.filter(n => n.status === '미결제');
    } else if (statusFilter === 'paid') {
      result = result.filter(n => n.status === '결제완료');
    }

    // Sort by Due Date: Unpaid first, then sorted by daysLeft ascending (most urgent first).
    // Paid items go to the bottom.
    return result.sort((a, b) => {
      // Unpaid vs Paid
      if (a.status === '미결제' && b.status === '결제완료') return -1;
      if (a.status === '결제완료' && b.status === '미결제') return 1;
      
      // If same status, sort by due date ascending
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [notes, statusFilter]);

  // Summary counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: notes.length,
      unpaid: notes.filter(n => n.status === '미결제').length,
      paid: notes.filter(n => n.status === '결제완료').length
    };
  }, [notes]);

  // Format shorthand amount (e.g. 17.3M) for matching the Korean financial standard
  const formatMillionShorthand = (amount: number): string => {
    const million = amount / 1000000;
    return `${million.toFixed(1)}M`;
  };

  // Date handlers
  const adjustDate = (offset: number) => {
    const dateObj = parseDateStr(selectedDate);
    dateObj.setDate(dateObj.getDate() + offset);
    const newDateStr = formatDateStr(dateObj);
    setSelectedDate(newDateStr);
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
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">어음·채권 관리</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            보유 중인 전자어음, 종이어음, 외담대 및 기업채권의 만기 일정과 결제 상태를 추적합니다.
          </p>
        </div>

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
            <span>
              {selectedDate.split('-')[0]}년 {selectedDate.split('-')[1]}월 {selectedDate.split('-')[2]}일
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
            title="하루 후"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Main Content */}
      <div className={`space-y-6 sm:space-y-8 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* KPI & Quick Filters */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-stretch">
          
          {/* Total Unpaid box */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 w-full flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 tracking-wider block mb-1">총 미결제 어음·채권액</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {totalUnpaid.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
              <span>만기 도래 전 미수금 현황</span>
              <span className="font-bold text-brand-blue font-mono">({formatKoreanShorthand(totalUnpaid)})</span>
            </div>
          </div>

          {/* Quick Filters Tab */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 w-full flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wider block mb-3">상태 필터링</span>
            <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 h-10 w-full shadow-inner">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === 'all' 
                    ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>전체</span>
                <span className="text-[10px] px-1.5 py-0.25 bg-slate-100 rounded font-mono text-slate-500">{tabCounts.all}</span>
              </button>
              <button
                onClick={() => setStatusFilter('unpaid')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === 'unpaid' 
                    ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>미결제</span>
                <span className="text-[10px] px-1.5 py-0.25 bg-slate-100 rounded font-mono text-slate-500">{tabCounts.unpaid}</span>
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === 'paid' 
                    ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>결제완료</span>
                <span className="text-[10px] px-1.5 py-0.25 bg-slate-100 rounded font-mono text-slate-500">{tabCounts.paid}</span>
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-2">탭을 선택하여 세부 목록을 분류할 수 있습니다.</div>
          </div>
        </div>

        {/* Notes Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">어음·채권 세부 내역</h3>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">정렬 기준: 만기순 (미결제 우선)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                  <th className="px-6 py-3">구분</th>
                  <th className="px-6 py-3">발행처 (실거래처)</th>
                  <th className="px-6 py-3">만기일</th>
                  <th className="px-6 py-3 text-right">금액</th>
                  <th className="px-6 py-3 text-center">D-day</th>
                  <th className="px-6 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {processedNotes.length > 0 ? (
                  processedNotes.map((note, idx) => {
                    const isUnpaid = note.status === '미결제';
                    
                    return (
                      <tr key={`${note.issuer}-${note.dueDate}-${idx}`} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="px-6 py-3.5 font-bold text-slate-700">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            note.type === '외담대' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            note.type === '전자어음' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            note.type === '기업채권' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {note.type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{note.issuer}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">실거래처: {note.realClient || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-600">{note.dueDate}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                          <div className="flex flex-col items-end">
                            <span>{note.amount.toLocaleString('ko-KR')} 원</span>
                            <span className="text-[10px] text-slate-400 font-normal">({formatMillionShorthand(note.amount)})</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {isUnpaid ? (
                            <DueDateBadge daysLeft={note.daysLeft} />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium font-mono">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[10px] font-bold border ${
                            isUnpaid 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {note.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={6}>
                      해당 분류 of 어음·채권 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
