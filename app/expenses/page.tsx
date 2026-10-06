'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  ListFilter,
  Receipt
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

// Parse YYYY-MM-DD to Date object
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Automated expense classification helper (fallback)
function getExpenseCategory(client: string, memo: string = ''): string {
  const target = `${client} ${memo}`.toLowerCase();
  
  if (target.includes('급여') || target.includes('인건비') || target.includes('상여금')) {
    return '인건비·급여';
  }
  if (
    target.includes('전력') || 
    target.includes('전기세') || 
    target.includes('전기료') || 
    target.includes('수도') || 
    target.includes('수도료') || 
    target.includes('임대료') || 
    target.includes('임차료') || 
    target.includes('보험') || 
    target.includes('공과금') || 
    target.includes('세무') || 
    target.includes('국민건강')
  ) {
    return '세금·공과금';
  }
  if (
    target.includes('스틸') || 
    target.includes('대금') || 
    target.includes('매입') || 
    target.includes('원자재') || 
    target.includes('구매') || 
    target.includes('상환') ||
    target.includes('코리아') ||
    target.includes('원가')
  ) {
    return '매입·원재료비';
  }
  if (target.includes('운반') || target.includes('배송') || target.includes('물류') || target.includes('퀵') || target.includes('택배')) {
    return '운반비';
  }
  if (target.includes('설비') || target.includes('기계') || target.includes('수리') || target.includes('장비') || target.includes('벨트')) {
    return '설비';
  }
  if (target.includes('이자') || target.includes('금융') || target.includes('수수료') || target.includes('대출이자')) {
    return '금융·이자비용';
  }
  return '일반관리·기타';
}

// Map Google Sheets Category to Visual Categories
function mapSheetCategory(sheetCat?: string, client: string = '', memo: string = ''): string {
  if (!sheetCat) {
    return getExpenseCategory(client, memo);
  }
  const cat = sheetCat.trim();
  if (cat.includes('급여') || cat.includes('인건비') || cat.includes('상여금')) {
    return '인건비·급여';
  }
  if (cat.includes('원자재') || cat.includes('매입') || cat.includes('스틸') || cat.includes('원가')) {
    return '매입·원재료비';
  }
  if (cat.includes('운반비')) {
    return '운반비';
  }
  if (cat.includes('설비')) {
    return '설비';
  }
  if (
    cat.includes('세금') || 
    cat.includes('공과금') || 
    cat.includes('보험') || 
    cat.includes('전기료') || 
    cat.includes('수도료') || 
    cat.includes('임대료')
  ) {
    return '세금·공과금';
  }
  if (cat.includes('이자') || cat.includes('금융') || cat.includes('수수료') || cat.includes('대출')) {
    return '금융·이자비용';
  }
  return '일반관리·기타';
}

// Beautiful color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  '인건비·급여': '#f43f5e',   // Rose
  '매입·원재료비': '#3b82f6', // Blue
  '운반비': '#10b981',       // Emerald
  '설비': '#f97316',         // Orange
  '세금·공과금': '#eab308',   // Yellow/Gold
  '금융·이자비용': '#a855f7', // Purple
  '일반관리·기타': '#64748b'  // Slate
};

export default function ExpensesPage() {
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
            .filter((t: CashTransaction) => {
              if (t.type !== '출금') return false;
              const isInternalTransfer = 
                t.category?.trim() === '계좌대체' || 
                (t.client && t.client.includes('영화포장') && (t.client.includes('계좌') || t.client.includes('으로') || t.client.includes('로')));
              return !isInternalTransfer;
            })
            .reduce((max: string, t: CashTransaction) => t.date > max ? t.date : max, '2026-06-10');
          setSelectedDate(maxDate);
        }
      } catch (err) {
        console.error(err);
        setError('지출 내역 데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter transactions based on viewType and selectedDate
  const filteredExpenses = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const onlyWithdrawals = transactions.filter(t => {
      if (t.type !== '출금') return false;
      const isInternalTransfer = 
        t.category?.trim() === '계좌대체' || 
        (t.client && t.client.includes('영화포장') && (t.client.includes('계좌') || t.client.includes('으로') || t.client.includes('로')));
      return !isInternalTransfer;
    });
    
    if (viewType === 'daily') {
      return onlyWithdrawals.filter(t => t.date === selectedDate);
    } else {
      // Monthly view: match year and month
      const [year, month] = selectedDate.split('-');
      return onlyWithdrawals.filter(t => {
        const [ty, tm] = t.date.split('-');
        return ty === year && tm === month;
      });
    }
  }, [transactions, viewType, selectedDate]);

  // Classified expenses list
  const classifiedExpenses = useMemo(() => {
    return filteredExpenses.map(item => ({
      ...item,
      category: mapSheetCategory(item.category, item.client, item.memo)
    }));
  }, [filteredExpenses]);

  // Sum of filtered expenses
  const totalAmount = useMemo(() => {
    return classifiedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [classifiedExpenses]);

  // Aggregate category totals for table view
  const categorySummaryData = useMemo(() => {
    if (classifiedExpenses.length === 0) return [];
    
    const categoryMap: Record<string, { amount: number; count: number }> = {};
    classifiedExpenses.forEach(e => {
      if (!categoryMap[e.category]) {
        categoryMap[e.category] = { amount: 0, count: 0 };
      }
      categoryMap[e.category].amount += e.amount;
      categoryMap[e.category].count += 1;
    });

    return Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [classifiedExpenses, totalAmount]);

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
      setSelectedDate(`${yyyy}-${mm}-01`);
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
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">지출 현황</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            회사 자금의 출금 거래 내역을 분석하고 비용 항목별 집계 표와 상세 내역을 검토합니다.
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
                  ? 'bg-brand-rose/10 text-brand-rose border border-brand-rose/20' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              일별
            </button>
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 text-xs font-semibold rounded-md transition-all ${
                viewType === 'monthly' 
                  ? 'bg-brand-rose/10 text-brand-rose border border-brand-rose/20' 
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
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* 1. Category Summary Table (Left Column, takes 1 of 3 columns) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between h-fit lg:col-span-1">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <ListFilter className="w-4 h-4 text-brand-rose" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">분류별 지출 집계 표</h3>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">항목별 합계 금액 및 비중</p>
            </div>
            <span className="text-[10px] font-bold text-brand-rose bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 font-mono">
              {categorySummaryData.length}개 항목
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-2.5">분류</th>
                  <th className="px-3 py-2.5 text-center">비율</th>
                  <th className="px-2 py-2.5 text-center">건수</th>
                  <th className="px-4 py-2.5 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {categorySummaryData.length > 0 ? (
                  categorySummaryData.map((cat) => (
                    <tr key={cat.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs" 
                            style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#64748b' }}
                          />
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[85px]" title={cat.name}>
                            {cat.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-[10px] text-slate-600">{cat.percentage}%</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${cat.percentage}%`,
                                backgroundColor: CATEGORY_COLORS[cat.name] || '#64748b'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center font-mono text-slate-500 text-[11px]">
                        {cat.count}건
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 text-xs">
                        {cat.amount.toLocaleString('ko-KR')} <span className="text-[10px] text-slate-400 font-normal">원</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400 text-xs font-medium" colSpan={4}>
                      지출 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="px-4 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">집계 합계</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-[10px] font-semibold text-slate-400">
                ({formatKoreanShorthand(totalAmount)})
              </span>
              <span className="text-sm font-black text-brand-rose">
                {totalAmount.toLocaleString('ko-KR')}
              </span>
              <span className="text-[10px] font-bold text-slate-500">원</span>
            </div>
          </div>
        </div>

        {/* 2. Expense Details Table (Right Column, takes 2 of 3 columns) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">상세 출금 내역 표</h3>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full font-mono ml-1">
                  총 {classifiedExpenses.length}건
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold font-mono">
                조회 대상 기간: <span className="text-slate-700 font-bold">
                  {viewType === 'daily' ? selectedDate : `${selectedDate.split('-')[0]}-${selectedDate.split('-')[1]}`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    <th className="px-6 py-3">날짜</th>
                    <th className="px-6 py-3">분류</th>
                    <th className="px-6 py-3">거래처</th>
                    <th className="px-6 py-3">적요/메모</th>
                    <th className="px-6 py-3 text-right">금액</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {classifiedExpenses.length > 0 ? (
                    classifiedExpenses.map((exp, idx) => (
                      <tr key={`${exp.client}-${exp.date}-${idx}`} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="px-6 py-3.5 font-mono text-slate-500">{exp.date}</td>
                        <td className="px-6 py-3.5">
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ 
                              backgroundColor: `${CATEGORY_COLORS[exp.category]}15`, 
                              color: CATEGORY_COLORS[exp.category],
                              border: `1px solid ${CATEGORY_COLORS[exp.category]}25`
                            }}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-800 font-bold">{exp.client}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-medium">{exp.memo || '-'}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                          {exp.amount.toLocaleString('ko-KR')} 원
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={5}>
                        지정된 일자에 등록된 지출(출금) 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer Sum */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {viewType === 'daily' ? '일 지출 합계' : '월 누적 지출 합계'}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 font-mono">
                ({formatKoreanShorthand(totalAmount)})
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-black text-brand-rose tracking-tight">
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
