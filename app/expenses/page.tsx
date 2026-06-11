'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  TrendingDown, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ListTodo,
  PieChartIcon
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
    target.includes('수도') || 
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
    target.includes('코리아')
  ) {
    return '매입·원재료비';
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
  if (cat.includes('원자재') || cat.includes('매입') || cat.includes('스틸')) {
    return '매입·원재료비';
  }
  if (cat.includes('세금') || cat.includes('공과금') || cat.includes('보험')) {
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
  const [mounted, setMounted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'category'>('detail');

  // Mount state for Recharts hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

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
            .filter((t: CashTransaction) => t.type === '출금')
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
    
    const onlyWithdrawals = transactions.filter(t => t.type === '출금');
    
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

  // Aggregate category distributions for Recharts PieChart
  const pieChartData = useMemo(() => {
    if (classifiedExpenses.length === 0) return [];
    
    const categoryMap: Record<string, number> = {};
    classifiedExpenses.forEach(e => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : '0'
      }))
      // Sort largest first
      .sort((a, b) => b.value - a.value);
  }, [classifiedExpenses, totalAmount]);

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

  // Custom tool tip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-900/95 border border-navy-800 p-3.5 rounded-lg shadow-xl font-sans text-xs">
          <p className="font-semibold mb-1" style={{ color: CATEGORY_COLORS[payload[0].name] }}>
            {payload[0].name}
          </p>
          <p className="text-slate-200 font-bold">
            지출액: <span className="font-mono text-sm">{payload[0].value.toLocaleString()}</span> 원
          </p>
          <p className="text-slate-400 font-semibold text-[10px] mt-0.5">
            비율: {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
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
            회사 자금의 출금 거래 내역을 분석하고 비용 항목별 비중을 검토합니다.
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
        
        {/* 1. Donut Chart (Left Column, takes 1 of 3 columns) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit lg:col-span-1">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">지출 항목 비중</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">분류별 지출 점유율 시각화</p>
          </div>
          
          <div className="h-56 sm:h-64 w-full flex items-center justify-center font-sans text-xs">
            {mounted && pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {mounted ? '지출 데이터가 없습니다.' : '차트를 불러오는 중...'}
              </div>
            )}
          </div>

          {/* Legend Items */}
          {pieChartData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
              {pieChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span 
                    className="h-2 w-2 rounded-sm shrink-0" 
                    style={{ backgroundColor: CATEGORY_COLORS[entry.name] }}
                  ></span>
                  <span className="text-slate-500 font-bold truncate max-w-[80px]" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="text-slate-800 font-mono font-bold ml-auto">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Expense Details Table (Right Column, takes 2 of 3 columns) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              {/* Tab Selector */}
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[11px] font-bold text-slate-500 shadow-inner">
                <button
                  onClick={() => setActiveTab('detail')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'detail'
                      ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  상세 내역
                </button>
                <button
                  onClick={() => setActiveTab('category')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'category'
                      ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  분류별 집계
                </button>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold font-mono">
              조회 대상 기간: <span className="text-slate-600">
                {viewType === 'daily' ? selectedDate : `${selectedDate.split('-')[0]}-${selectedDate.split('-')[1]}`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'detail' ? (
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
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    <th className="px-6 py-3">분류</th>
                    <th className="px-6 py-3">비율</th>
                    <th className="px-6 py-3 text-center">건수</th>
                    <th className="px-6 py-3 text-right">합계 금액</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {categorySummaryData.length > 0 ? (
                    categorySummaryData.map((cat, idx) => (
                      <tr key={`${cat.name}-${idx}`} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className="h-2.5 w-2.5 rounded-sm shrink-0" 
                              style={{ backgroundColor: CATEGORY_COLORS[cat.name] }}
                            ></span>
                            <span className="font-bold text-slate-800">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${cat.percentage}%`,
                                  backgroundColor: CATEGORY_COLORS[cat.name]
                                }}
                              ></div>
                            </div>
                            <span className="font-semibold text-slate-500 font-mono text-[10px]">{cat.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium font-mono">{cat.count}건</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          {cat.amount.toLocaleString('ko-KR')} 원
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={4}>
                        지정된 일자에 등록된 지출(출금) 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer Sum */}
          <div className="px-6 py-4.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
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
