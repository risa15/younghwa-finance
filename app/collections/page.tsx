'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  ArrowUpDown,
  Search,
  X,
  Edit
} from 'lucide-react';
import { CashTransaction, ExpectedCollection, MatchingSuggestion } from '@/lib/types';
import MatchingSuggestions from '@/components/MatchingSuggestions';
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
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-16'); // Default to key demo date
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('monthly'); // Default to monthly for better summary view
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Expected Collections states
  const [activeSubTab, setActiveSubTab] = useState<'actual' | 'crossCheck'>('actual');
  const [expectedCollections, setExpectedCollections] = useState<any[]>([]);
  const [matchingSuggestions, setMatchingSuggestions] = useState<MatchingSuggestion[]>([]);
  const [expectedLoading, setExpectedLoading] = useState<boolean>(false);
  const [expectedError, setExpectedError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');


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

  // Fetch expected collections when sub-tab or date changes
  const fetchExpectedData = React.useCallback(async () => {
    setExpectedLoading(true);
    setExpectedError(null);
    try {
      const res = await fetch(`/api/expected-collections?date=${selectedDate}`);
      if (!res.ok) throw new Error('API fetch error');
      const result = await res.json();
      setExpectedCollections(result.data);
      
      const rawSuggestions = result.matchingSuggestions || [];
      // Filter out matching suggestions that have been dismissed via localStorage
      try {
        const dismissed = localStorage.getItem('dismissedSuggestions');
        if (dismissed) {
          const dismissedList = JSON.parse(dismissed);
          const filtered = rawSuggestions.filter((s: any) => {
            const key = `${s.expected.rowIndex}-${s.actual.date}-${s.actual.amount}`;
            return !dismissedList.includes(key);
          });
          setMatchingSuggestions(filtered);
        } else {
          setMatchingSuggestions(rawSuggestions);
        }
      } catch (e) {
        console.error('Failed to parse dismissedSuggestions:', e);
        setMatchingSuggestions(rawSuggestions);
      }
    } catch (err) {
      console.error(err);
      setExpectedError('수금 예정 및 크로스체크 내역을 불러오는 데 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  }, [selectedDate]);

  // Handle direct confirm by prompting for actual collection date, amount, and remarks
  const handleDirectConfirm = async (rowIndex: number, clientName: string, currentAmount: number, currentRemarks?: string, currentActualDate?: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const defaultDate = currentActualDate || todayStr;
    const actualDateInput = window.prompt(`[${clientName}] 건의 실제 수금일을 입력해주세요 (YYYY-MM-DD) (비워두면 수금 미완료 상태로 돌아갑니다):`, defaultDate);
    
    if (actualDateInput === null) return;
    
    const actualDate = actualDateInput.trim();
    if (actualDate !== '') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(actualDate)) {
        alert('올바른 날짜 형식(YYYY-MM-DD)으로 입력해주세요.');
        return;
      }
    }

    const amountInput = window.prompt(`[${clientName}] 건의 예정금액(수금액)을 수정하시겠습니까? (수정 불필요 시 그냥 엔터):`, currentAmount.toString());
    const remarksInput = window.prompt(`[${clientName}] 건의 비고(메모)를 등록/수정하시겠습니까? (수정 불필요 시 그냥 엔터):`, currentRemarks || '');

    const body: any = { rowIndex, actualDate };
    
    if (amountInput !== null && amountInput.trim() !== '' && amountInput.trim() !== currentAmount.toString()) {
      const parsedAmount = parseInt(amountInput.replace(/,/g, ''), 10);
      if (isNaN(parsedAmount)) {
        alert('올바른 예정금액(숫자)을 입력해주세요.');
        return;
      }
      body.amount = parsedAmount;
    }
    
    if (remarksInput !== null && remarksInput.trim() !== (currentRemarks || '')) {
      body.remarks = remarksInput.trim();
    }

    try {
      setExpectedLoading(true);
      const response = await fetch('/api/expected-collections/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '수금 확정 처리 중 오류가 발생했습니다.');
      }

      alert('수금 확정 처리가 완료되었습니다.');
      fetchExpectedData();
    } catch (err: any) {
      alert(err.message || '수금 확정 처리에 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  };

  // Handle editing remarks only
  const handleEditRemarks = async (rowIndex: number, clientName: string, currentRemarks: string, currentActualDate?: string) => {
    const remarksInput = window.prompt(`[${clientName}] 건의 비고(체크 포인트)를 등록/수정해주세요:`, currentRemarks);
    if (remarksInput === null) return;

    const remarks = remarksInput.trim();
    const actualDate = currentActualDate || '';

    try {
      setExpectedLoading(true);
      const response = await fetch('/api/expected-collections/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, actualDate, remarks })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '비고 수정 중 오류가 발생했습니다.');
      }

      alert('비고가 성공적으로 업데이트되었습니다.');
      fetchExpectedData();
    } catch (err: any) {
      alert(err.message || '비고 수정에 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  };

  // Sorting states
  const [sortBy, setSortBy] = useState<'dueDate' | 'actualDate' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Toggle sort direction or field
  const toggleSort = (field: 'dueDate' | 'actualDate' | 'status') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort helper for status priority
  const getStatusPriority = (status: string): number => {
    switch (status) {
      case '연체': return 1;
      case '불일치_내역없음': return 2;
      case '불일치_금액오차': return 3;
      case '대기': return 4;
      case '완료': return 5;
      default: return 6;
    }
  };

  // Memoized sorted collections
  const sortedExpectedCollections = useMemo(() => {
    let list = [...expectedCollections];
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => c.client.toLowerCase().includes(term));
    }
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'dueDate') {
        comparison = a.dueDate.localeCompare(b.dueDate);
      } else if (sortBy === 'actualDate') {
        const aDate = a.actualDate || (sortOrder === 'asc' ? '9999-99-99' : '0000-00-00');
        const bDate = b.actualDate || (sortOrder === 'asc' ? '9999-99-99' : '0000-00-00');
        comparison = aDate.localeCompare(bDate);
      } else if (sortBy === 'status') {
        comparison = getStatusPriority(a.status) - getStatusPriority(b.status);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [expectedCollections, sortBy, sortOrder, searchTerm]);

  const renderSortIcon = (field: 'dueDate' | 'actualDate' | 'status') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-350 shrink-0" />;
    }
    return sortOrder === 'asc' 
      ? <span className="text-emerald-600 font-black text-[9px] shrink-0">▲</span>
      : <span className="text-emerald-600 font-black text-[9px] shrink-0">▼</span>;
  };

  useEffect(() => {
    if (activeSubTab === 'crossCheck') {
      fetchExpectedData();
    }
  }, [activeSubTab, fetchExpectedData]);

  // Filter transactions based on viewType and selectedDate
  const filteredCollections = useMemo(() => {
    if (transactions.length === 0) return [];
    
    let onlyDeposits = transactions.filter(t => 
      t.type === '입금' && 
      (t.category?.trim() === '매출수금' || t.category?.trim() === '어음입금')
    );

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      onlyDeposits = onlyDeposits.filter(t => t.client.toLowerCase().includes(term));
    }
    
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
  }, [transactions, viewType, selectedDate, searchTerm]);

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

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-250 mt-4 mb-6">
        <button
          onClick={() => setActiveSubTab('actual')}
          className={`pb-3 text-xs sm:text-sm font-semibold px-4 border-b-2 transition-all duration-150 ${
            activeSubTab === 'actual'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          수금 완료 내역 (실제 입금)
        </button>
        <button
          onClick={() => setActiveSubTab('crossCheck')}
          className={`pb-3 text-xs sm:text-sm font-semibold px-4 border-b-2 transition-all duration-150 flex items-center gap-1.5 ${
            activeSubTab === 'crossCheck'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>수금 예정 & 장부 크로스체크</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-mono">신규</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="거래처명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-emerald focus:border-brand-emerald shadow-sm bg-white text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && activeSubTab === 'actual' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs mb-4">
          ⚠️ {error}
        </div>
      )}

      {expectedError && activeSubTab === 'crossCheck' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs mb-4">
          ⚠️ {expectedError}
        </div>
      )}

      {/* Main content area */}
      {activeSubTab === 'actual' ? (
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
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
                        {searchTerm ? '검색 조건에 맞는 수금(입금) 내역이 없습니다.' : '지정된 일자에 등록된 수금(입금) 내역이 없습니다.'}
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
      ) : (
        /* Cross Check Tab Rendering */
        <div className={`space-y-6 sm:space-y-8 ${expectedLoading ? 'opacity-40 pointer-events-none' : ''}`}>
          
          {/* 스마트 입금 매칭 추천 */}
          {matchingSuggestions.length > 0 && (
            <MatchingSuggestions 
              suggestions={matchingSuggestions} 
              onMatched={fetchExpectedData} 
            />
          )}
          
          {/* Summary KPIs for Cross-check */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-slate-400 font-bold block">조회월 총 수금 예정</span>
              <span className="font-mono font-black text-slate-800 text-base mt-1.5 block">
                {expectedCollections.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-emerald-600 font-bold block">대조 완료 금액</span>
              <span className="font-mono font-black text-brand-emerald text-base mt-1.5 block">
                {expectedCollections
                  .filter(c => c.status === '완료')
                  .reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-rose-500 font-bold block">금액 불일치 / 미수 금액</span>
              <span className="font-mono font-black text-rose-600 text-base mt-1.5 block">
                {expectedCollections
                  .filter(c => c.status !== '완료')
                  .reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-slate-500 font-bold block">대조 성공률</span>
              <span className="font-mono font-black text-slate-800 text-base mt-1.5 block">
                {expectedCollections.length > 0
                  ? Math.round(
                      (expectedCollections.filter(c => c.status === '완료').length /
                        expectedCollections.length) *
                        100
                    )
                  : 0}%
              </span>
            </div>
          </div>

          {/* Cross check table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  수금 예정 내역 및 입출금 장부 크로스체크 (대조)
                </h3>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold font-mono flex items-center gap-2">
                <span>조회 대상 월: {selectedDate.split('-')[0]}-{selectedDate.split('-')[1]}</span>
                <button 
                  onClick={fetchExpectedData} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                  title="새로고침"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    <th 
                      className="px-4 py-3 min-w-[110px] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('dueDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>결제기한</span>
                        {renderSortIcon('dueDate')}
                      </div>
                    </th>
                    <th className="px-4 py-3">거래처명</th>
                    <th className="px-4 py-3 text-right">예정금액</th>
                    <th className="px-4 py-3">입금명의</th>
                    <th 
                      className="px-4 py-3 min-w-[110px] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('actualDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>실제수금일</span>
                        {renderSortIcon('actualDate')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>대조 상태</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-4 py-3 min-w-[150px]">비고 (체크 포인트)</th>
                    <th className="px-4 py-3">장부 대조 상세 정보</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {sortedExpectedCollections.length > 0 ? (
                    sortedExpectedCollections.map((col, idx) => {
                      let statusBadge = null;
                      let statusRowClass = '';

                      switch (col.status) {
                        case '완료':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>일치</span>
                            </span>
                          );
                          break;
                        case '불일치_금액오차':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <AlertTriangle className="h-3 w-3" />
                              <span>금액불일치</span>
                            </span>
                          );
                          statusRowClass = 'bg-amber-50/10';
                          break;
                        case '불일치_내역없음':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <AlertTriangle className="h-3 w-3" />
                              <span>내역누락</span>
                            </span>
                          );
                          statusRowClass = 'bg-yellow-50/10';
                          break;
                        case '연체':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center gap-1 w-fit mx-auto animate-pulse">
                              <Clock className="h-3 w-3" />
                              <span>연체</span>
                            </span>
                          );
                          statusRowClass = 'bg-rose-50/10';
                          break;
                        default:
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <span>대기</span>
                            </span>
                          );
                      }

                      return (
                        <tr 
                           key={`${col.client}-${idx}`} 
                          className={`hover:bg-slate-50/50 transition-colors duration-150 ${statusRowClass}`}
                        >
                          <td className="px-4 py-4 font-mono text-slate-500">{col.dueDate}</td>
                          <td className="px-4 py-4 text-slate-800 font-bold">{col.client}</td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-slate-800">
                            {col.amount.toLocaleString()} 원
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {col.depositorName ? (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                {col.depositorName}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-500">
                            {col.actualDate ? (
                              <div className="flex items-center gap-1.5">
                                <span>{col.actualDate}</span>
                                <button
                                  onClick={() => handleDirectConfirm(col.rowIndex, col.client, col.amount, col.remarks, col.actualDate)}
                                  className="text-slate-400 hover:text-emerald-600 hover:underline transition-colors font-bold text-[10px] shrink-0"
                                  title="수금 정보 수정"
                                >
                                  [수정]
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDirectConfirm(col.rowIndex, col.client, col.amount, col.remarks)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 border border-slate-200 text-slate-600 font-bold text-[10px] transition-all duration-200 active:scale-95 whitespace-nowrap shadow-sm"
                                title="실제 수금일 직접 등록"
                              >
                                직접 확정
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">{statusBadge}</td>
                          <td className="px-4 py-4 max-w-[200px] truncate group">
                            <div className="flex items-center justify-between gap-1">
                              <span className={col.remarks ? "text-slate-700 font-semibold" : "text-slate-350 italic"}>
                                {col.remarks || '등록된 비고 없음'}
                              </span>
                              <button
                                onClick={() => handleEditRemarks(col.rowIndex, col.client, col.remarks || '', col.actualDate)}
                                className="text-slate-400 hover:text-brand-emerald opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 shrink-0 ml-1"
                                title="비고 수정"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[11px]">
                            {col.matchDetails ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-700">
                                  {col.matchDetails.message}
                                </div>
                                {col.matchDetails.actualClient && (
                                  <div className="text-[10px] text-slate-450 flex items-center gap-1 font-mono">
                                    <span>장부내용:</span>
                                    <span className="text-slate-600 font-bold">{col.matchDetails.actualClient}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>입금액: {col.matchDetails.actualAmount.toLocaleString()}원</span>
                                    <span className="text-slate-300">|</span>
                                    <span>입금일: {col.matchDetails.actualDate}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">
                                {col.status === '대기' ? '수금 대기 중인 항목입니다.' : '결제 기한이 지난 미수 항목입니다.'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={8}>
                        {searchTerm ? '검색 조건에 맞는 수금 예정 내역이 없습니다.' : '이번 달에 등록된 수금 예정 내역이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
