'use client';

import React, { useState } from 'react';
import { MatchingSuggestion } from '@/lib/types';

interface MatchingSuggestionsProps {
  suggestions?: MatchingSuggestion[];
  onMatched: () => void;
}

export default function MatchingSuggestions({ suggestions = [], onMatched }: MatchingSuggestionsProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (suggestions.length === 0) return null;

  const handleDismiss = (rowIndex: number, actualDate: string, amount: number) => {
    const isConfirmed = window.confirm('이 매칭 추천을 다시 보지 않도록 제외하시겠습니까?');
    if (!isConfirmed) return;

    try {
      const dismissedKey = `${rowIndex}-${actualDate}-${amount}`;
      const existingDismissed = localStorage.getItem('dismissedSuggestions');
      const dismissedList = existingDismissed ? JSON.parse(existingDismissed) : [];
      
      if (!dismissedList.includes(dismissedKey)) {
        dismissedList.push(dismissedKey);
        localStorage.setItem('dismissedSuggestions', JSON.stringify(dismissedList));
      }
      onMatched(); // Refresh parent data (applying filters)
    } catch (e) {
      console.error('Failed to dismiss matching suggestion:', e);
    }
  };

  const handleConfirm = async (rowIndex: number, actualDate: string, clientName: string, isSplit = false, splitCount = 0) => {
    const confirmMsg = isSplit
      ? `[${clientName}] 건(분할 입금 ${splitCount}건)의 수금일을 ${actualDate}(마지막 입금일)로 확정하고 구글 스프레드시트에 기록하시겠습니까?`
      : `[${clientName}] 건의 수금일을 ${actualDate}로 확정하고 구글 스프레드시트에 기록하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMsg);
    if (!isConfirmed) return;

    setLoadingId(rowIndex);
    try {
      const response = await fetch('/api/expected-collections/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, actualDate })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '매칭 처리 중 오류가 발생했습니다.');
      }

      alert('수금 완료 처리가 완료되었습니다.');
      onMatched();
    } catch (err: any) {
      alert(err.message || '매칭 처리에 실패했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <h3 className="text-sm font-bold text-slate-800 tracking-wider flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          스마트 입금 매칭 추천 ({suggestions.length}건)
        </h3>
        <p className="text-[10px] text-slate-400">통장 입금 정보와 수금 장부(예정일 ±3일, 금액 일치)를 비교한 추천 항목입니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((suggestion) => {
          const expected = suggestion.expected;
          const actual = suggestion.actual;
          const isProcessing = loadingId === expected.rowIndex;
          const isSplit = suggestion.actuals && suggestion.actuals.length > 1;

          return (
            <div
              key={expected.rowIndex}
              className="relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-100 rounded-xl p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-200 flex flex-col justify-between gap-3"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2.5 flex-1">
                  {/* Row 1: Left (Actual Account Deposit) -> Right (Expected) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Actual Deposit Source */}
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-black rounded text-[8px] tracking-widest uppercase">통장</span>
                      <span className="font-bold text-slate-700 text-xs">{actual.client}</span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {isSplit ? `(분할 ${suggestion.actuals!.length}건)` : `(${actual.date})`}
                      </span>
                    </div>
                    
                    <span className="hidden sm:inline text-slate-300 text-xs">➔</span>
                    
                    {/* Expected Book Destination */}
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-600 text-white font-black rounded text-[8px] tracking-widest uppercase">장부</span>
                      <span className="font-bold text-slate-800 text-xs">{expected.client}</span>
                      <span className="text-[9px] text-slate-400 font-mono">({expected.dueDate})</span>
                    </div>
                  </div>

                  {/* Row 2: Large amount matching display */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-emerald-600">
                        +{actual.amount.toLocaleString()}원
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-medium">
                        금액 일치 {isSplit ? '(분할 입금)' : '(100%)'}
                      </span>
                    </div>
                    {isSplit && (
                      <div className="text-[10px] text-slate-500 font-mono space-y-0.5 mt-1 bg-slate-100/50 p-1.5 rounded border border-slate-150">
                        {suggestion.actuals!.map((act, i) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span>• {act.client} ({act.date})</span>
                            <span className="font-bold text-slate-600">+{act.amount.toLocaleString()}원</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 self-center">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleDismiss(expected.rowIndex!, actual.date, actual.amount)}
                    className="px-2.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95"
                  >
                    매칭 아님
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleConfirm(expected.rowIndex!, actual.date, expected.client, isSplit, suggestion.actuals?.length || 0)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 whitespace-nowrap ${
                      isProcessing
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        처리 중
                      </span>
                    ) : (
                      '수금 확정'
                    )}
                  </button>
                </div>
              </div>

              {/* Decorative Accent Line at the very bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
