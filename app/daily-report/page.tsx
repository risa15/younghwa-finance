'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Printer,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { formatKoreanShorthand } from '@/components/KPICard';

interface TxItem {
  client: string;
  deposit: number;
  withdrawal: number;
  memo: string;
}

interface AccountReportItem {
  accountName: string;
  prevBalance: number;
  todayDeposit: number;
  todayWithdrawal: number;
  balance: number;
  remarks: string;
  transactions?: TxItem[];
}

interface NoteReportItem {
  category: string;
  bankOrDetail: string;
  details: string;
  balance: number;
}

interface DailyReportData {
  selectedDate: string;
  balanceDate: string;
  isDemo: boolean;
  approvalBox: {
    drafter: string;
    approver: string;
  };
  ordinaryDeposits: {
    accounts: AccountReportItem[];
    total: {
      prevBalance: number;
      todayDeposit: number;
      todayWithdrawal: number;
      balance: number;
    };
  };
  specificDeposits: {
    accounts: AccountReportItem[];
    total: {
      prevBalance: number;
      todayDeposit: number;
      todayWithdrawal: number;
      balance: number;
    };
  };
  cash: {
    prevBalance: number;
    todayDeposit: number;
    todayWithdrawal: number;
    balance: number;
    transactions?: TxItem[];
  };
  grandTotal: {
    prevBalance: number;
    todayDeposit: number;
    todayWithdrawal: number;
    balance: number;
  };
  noteBonds: {
    items: NoteReportItem[];
    total: number;
  };
}

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

// Format date to Korean dots format: 2026.06.16
function formatDotDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '.');
}

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [data, setData] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Daily Report Data
  const fetchReportData = useCallback(async (dateParam?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = dateParam ? `/api/daily-report?date=${dateParam}` : '/api/daily-report';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('시재일보 데이터를 불러오는 중 오류가 발생했습니다.');
      }
      const result: DailyReportData = await response.json();
      setData(result);
      setSelectedDate(result.selectedDate);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '서버 통신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Adjust date by offset
  const adjustDate = (daysOffset: number) => {
    if (!selectedDate) return;
    const currentDateObj = parseDateStr(selectedDate);
    currentDateObj.setDate(currentDateObj.getDate() + daysOffset);
    const newDateStr = formatDateStr(currentDateObj);
    setSelectedDate(newDateStr);
    fetchReportData(newDateStr);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    if (!newDateStr) return;
    setSelectedDate(newDateStr);
    fetchReportData(newDateStr);
  };

  const handlePrint = () => {
    window.print();
  };

  // Render a cell with number formatting
  const renderNumberCell = (val: number, isZeroBlank = true) => {
    if (val === 0 && isZeroBlank) return '-';
    return val.toLocaleString('ko-KR');
  };

  if (loading && !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <span className="text-xs text-slate-500 font-semibold">시재일보 작성 중...</span>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header controls (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-wide">시재일보</h2>
          <p className="text-xs text-slate-500 mt-1">
            회사 자금의 일일 예금 잔액 및 현금 시재 현황을 확인하고 양식대로 출력/인쇄합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Date Selector */}
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
              <span>{selectedDate ? selectedDate.replace(/-/g, '. ') : '날짜 선택'}</span>
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
            onClick={() => fetchReportData(selectedDate)}
            className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-xs text-white font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            disabled={loading}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>인쇄 / PDF 저장</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-medium print:hidden">
          ⚠️ {error}
        </div>
      )}

      {/* 2. Excel Style Report Page Container */}
      {data && (
        <div className="w-full flex justify-center py-6 px-1 sm:px-4 bg-slate-50/50 min-h-screen print:bg-white print:py-0 print:px-0">
          {/* Paper sheet */}
          <div className="w-full max-w-[800px] bg-white border border-slate-350 shadow-md p-8 font-serif text-slate-900 print:shadow-none print:border-none print:p-0 print:max-w-full print:w-full">
            
            {/* Header Box (Title and Signoff) */}
            <div className="relative flex justify-between items-start mb-6">
              <div className="w-[150px] flex-shrink-0"></div>
              
              {/* Title */}
              <div className="flex-1 flex flex-col items-center justify-center pt-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.8em] text-center border-b-4 border-double border-slate-800 pb-1 pl-[0.8em] whitespace-nowrap">
                  시재일보
                </h1>
              </div>

              {/* Approval Box */}
              <div className="w-[150px] flex-shrink-0 flex justify-end">
                <table className="border-collapse border border-slate-700 text-center text-xs font-sans w-36">
                  <tbody>
                    <tr>
                      <td className="border border-slate-700 w-1/2 py-0.5 bg-slate-100/60 font-semibold">{data.approvalBox.drafter}</td>
                      <td className="border border-slate-700 w-1/2 py-0.5 bg-slate-100/60 font-semibold">{data.approvalBox.approver}</td>
                    </tr>
                    <tr className="h-14">
                      <td className="border border-slate-700"></td>
                      <td className="border border-slate-700"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Date line */}
            <div className="text-right text-xs font-sans font-bold text-slate-800 mb-2">
              기준일자: {formatDotDate(data.selectedDate)}
            </div>

            {/* Main Excel Sheet Grid Table */}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse border-2 border-slate-800 text-[11px] leading-tight font-sans">
                <thead>
                  <tr className="bg-slate-100/80 border-b-2 border-slate-800 font-bold text-center">
                    <th className="border border-slate-400 px-2 py-2 w-[12%]">과 목</th>
                    <th className="border border-slate-400 px-2 py-2 w-[18%]">세부 구분</th>
                    <th className="border border-slate-400 px-2 py-2 w-[28%]">내 역</th>
                    <th className="border border-slate-400 px-2 py-2 text-right w-[14%]">전일잔액</th>
                    <th className="border border-slate-400 px-2 py-2 text-right w-[14%]">금일입금액</th>
                    <th className="border border-slate-400 px-2 py-2 text-right w-[14%]">금일지출액</th>
                    <th className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right w-[14%]">금일잔액</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* --- SECTION 1: 보통예금 --- */}
                  {data.ordinaryDeposits.accounts.map((acc, accIdx) => {
                    const hasTx = acc.transactions && acc.transactions.length > 0;
                    
                    if (!hasTx) {
                      return (
                        <tr key={`ord-empty-${acc.accountName}`} className="hover:bg-slate-50/20 font-medium">
                          {accIdx === 0 && (
                            <td 
                              className="border border-slate-400 text-center font-bold bg-slate-50/50 align-middle" 
                              rowSpan={
                                data.ordinaryDeposits.accounts.reduce(
                                  (sum, a) => sum + (a.transactions && a.transactions.length > 0 ? a.transactions.length + 1 : 1), 
                                  0
                                ) + 1 // accounts row counts + 1 for subtotal row
                              }
                            >
                              보 통 예 금
                            </td>
                          )}
                          <td className="border border-slate-400 px-2 py-2 font-semibold bg-slate-50/10">{acc.accountName}</td>
                          <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(acc.prevBalance)}</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(acc.todayDeposit)}</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(acc.todayWithdrawal)}</td>
                          <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono font-bold">{renderNumberCell(acc.balance, false)}</td>
                        </tr>
                      );
                    }

                    // Account has transactions
                    return (
                      <React.Fragment key={`ord-group-${acc.accountName}`}>
                        {acc.transactions!.map((tx, txIdx) => (
                          <tr key={`tx-${acc.accountName}-${txIdx}`} className="hover:bg-slate-50/20">
                            {/* Column A (보통예금) - only on the very first row of the entire section */}
                            {accIdx === 0 && txIdx === 0 && (
                              <td 
                                className="border border-slate-400 text-center font-bold bg-slate-50/50 align-middle" 
                                rowSpan={
                                  data.ordinaryDeposits.accounts.reduce(
                                    (sum, a) => sum + (a.transactions && a.transactions.length > 0 ? a.transactions.length + 1 : 1), 
                                    0
                                  ) + 1 // accounts row counts + 1 for subtotal row
                                }
                              >
                                보 통 예 금
                              </td>
                            )}
                            {/* Column B (세부구분/계좌명) - only on the first row of this specific account's transaction list */}
                            {txIdx === 0 && (
                              <td 
                                className="border border-slate-400 px-2 py-2 font-bold bg-slate-50/10 align-middle" 
                                rowSpan={acc.transactions!.length + 1} // span for transaction count + subtotal row
                              >
                                {acc.accountName}
                              </td>
                            )}
                            <td className="border border-slate-400 px-2 py-2 text-slate-700 truncate max-w-[150px]">{tx.client}</td>
                            <td className="border border-slate-400 px-2 py-2 text-right text-slate-400 font-mono">-</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">
                              {tx.deposit > 0 ? tx.deposit.toLocaleString() : '-'}
                            </td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">
                              {tx.withdrawal > 0 ? tx.withdrawal.toLocaleString() : '-'}
                            </td>
                            <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right text-slate-400 font-mono">-</td>
                          </tr>
                        ))}
                        {/* Subtotal row for this specific active account */}
                        <tr className="bg-slate-50/50 font-bold border-b border-slate-400">
                          <td className="border border-slate-400 px-2 py-2 text-center text-slate-600">소 계</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(acc.prevBalance)}</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(acc.todayDeposit)}</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(acc.todayWithdrawal)}</td>
                          <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(acc.balance, false)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* Subtotal for the ENTIRE 보통예금 section */}
                  <tr className="bg-slate-100/50 font-bold border-b-2 border-slate-800">
                    <td className="border border-slate-400 px-2 py-2 text-center text-slate-800">계</td>
                    <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(data.ordinaryDeposits.total.prevBalance)}</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(data.ordinaryDeposits.total.todayDeposit)}</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(data.ordinaryDeposits.total.todayWithdrawal)}</td>
                    <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(data.ordinaryDeposits.total.balance, false)}</td>
                  </tr>

                  {/* --- SECTION 2: 특정예금 --- */}
                  {data.specificDeposits.accounts.map((acc, accIdx) => (
                    <tr key={`spec-${acc.accountName}`} className="hover:bg-slate-50/20 font-medium">
                      {accIdx === 0 && (
                        <td 
                          className="border border-slate-400 text-center font-bold bg-slate-50/50 align-middle" 
                          rowSpan={data.specificDeposits.accounts.length + 1} // accounts + 1 for subtotal row
                        >
                          특 정 예 금
                        </td>
                      )}
                      <td className="border border-slate-400 px-2 py-2 font-semibold bg-slate-50/10">{acc.accountName}</td>
                      <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                      <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(acc.prevBalance)}</td>
                      <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(acc.todayDeposit)}</td>
                      <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(acc.todayWithdrawal)}</td>
                      <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(acc.balance, false)}</td>
                    </tr>
                  ))}

                  {/* Subtotal for the ENTIRE 특정예금 section */}
                  <tr className="bg-slate-100/50 font-bold border-b-2 border-slate-800">
                    <td className="border border-slate-400 px-2 py-2 text-center text-slate-800">계</td>
                    <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(data.specificDeposits.total.prevBalance)}</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(data.specificDeposits.total.todayDeposit)}</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(data.specificDeposits.total.todayWithdrawal)}</td>
                    <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(data.specificDeposits.total.balance, false)}</td>
                  </tr>

                  {/* --- SECTION 3: 현금 --- */}
                  {(() => {
                    const hasCashTx = data.cash.transactions && data.cash.transactions.length > 0;
                    const cashRowSpan = hasCashTx ? data.cash.transactions!.length + 1 : 2;
                    
                    if (!hasCashTx) {
                      return (
                        <React.Fragment>
                          <tr className="hover:bg-slate-50/20 font-medium">
                            <td 
                              className="border border-slate-400 text-center font-bold bg-slate-50/50 align-middle" 
                              rowSpan={2}
                            >
                              현 금
                            </td>
                            <td className="border border-slate-400 px-2 py-2 font-semibold bg-slate-50/10">전일시재</td>
                            <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(data.cash.prevBalance)}</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(data.cash.todayDeposit)}</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(data.cash.todayWithdrawal)}</td>
                            <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(data.cash.balance, false)}</td>
                          </tr>
                          <tr className="bg-slate-100/50 font-bold border-b-2 border-slate-800">
                            <td className="border border-slate-400 px-2 py-2 text-center text-slate-800">계</td>
                            <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(data.cash.prevBalance)}</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(data.cash.todayDeposit)}</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(data.cash.todayWithdrawal)}</td>
                            <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(data.cash.balance, false)}</td>
                          </tr>
                        </React.Fragment>
                      );
                    }
                    
                    return (
                      <React.Fragment>
                        {data.cash.transactions!.map((tx, txIdx) => (
                          <tr key={`cash-tx-${txIdx}`} className="hover:bg-slate-50/20">
                            {txIdx === 0 && (
                              <td 
                                className="border border-slate-400 text-center font-bold bg-slate-50/50 align-middle" 
                                rowSpan={cashRowSpan}
                              >
                                현 금
                              </td>
                            )}
                            {txIdx === 0 && (
                              <td 
                                className="border border-slate-400 px-2 py-2 font-bold bg-slate-50/10 align-middle" 
                                rowSpan={data.cash.transactions!.length + 1}
                              >
                                전일시재
                              </td>
                            )}
                            <td className="border border-slate-400 px-2 py-2 text-slate-700 truncate max-w-[150px]">{tx.client}</td>
                            <td className="border border-slate-400 px-2 py-2 text-right text-slate-400 font-mono">-</td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">
                              {tx.deposit > 0 ? tx.deposit.toLocaleString() : '-'}
                            </td>
                            <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">
                              {tx.withdrawal > 0 ? tx.withdrawal.toLocaleString() : '-'}
                            </td>
                            <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right text-slate-400 font-mono">-</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100/50 font-bold border-b-2 border-slate-800">
                          <td className="border border-slate-400 px-2 py-2 text-center text-slate-800">계</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(data.cash.prevBalance)}</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono text-emerald-600">{renderNumberCell(data.cash.todayDeposit)}</td>
                          <td className="border border-slate-400 px-2 py-2 text-right font-mono text-rose-600">{renderNumberCell(data.cash.todayWithdrawal)}</td>
                          <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(data.cash.balance, false)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })()}

                  {/* --- SECTION 5: 총 계 --- */}
                  <tr className="bg-slate-200/60 font-black text-center text-slate-900 border-b-4 border-double border-slate-800">
                    <td className="border border-slate-400 px-2 py-2.5">총 계</td>
                    <td className="border border-slate-400 px-2 py-2.5"></td>
                    <td className="border border-slate-400 px-2 py-2.5 text-slate-700 font-bold text-xs">유동(보통예금+현금)</td>
                    <td className="border border-slate-400 px-2 py-2.5 text-right font-mono text-xs">{renderNumberCell(data.grandTotal.prevBalance)}</td>
                    <td className="border border-slate-400 px-2 py-2.5 text-right font-mono text-xs text-emerald-700">{renderNumberCell(data.grandTotal.todayDeposit)}</td>
                    <td className="border border-slate-400 px-2 py-2.5 text-right font-mono text-xs text-rose-700">{renderNumberCell(data.grandTotal.todayWithdrawal)}</td>
                    <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2.5 text-right font-mono text-xs font-black">{renderNumberCell(data.grandTotal.balance, false)}</td>
                  </tr>

                  {/* --- SECTION 6: 어음채권 --- */}
                  {data.noteBonds.items.map((note, noteIdx) => (
                    <tr key={`note-${note.bankOrDetail}`} className="hover:bg-slate-50/20 font-medium">
                      {noteIdx === 0 && (
                        <td 
                          className="border border-slate-400 text-center font-bold bg-slate-50/50 align-middle" 
                          rowSpan={data.noteBonds.items.length + 1}
                        >
                          어음 채권
                        </td>
                      )}
                      <td className="border border-slate-400 px-2 py-2 font-semibold bg-slate-50/10">{note.bankOrDetail}</td>
                      <td className="border border-slate-400 px-2 py-2 font-mono text-slate-600 text-[10px] whitespace-pre-line leading-relaxed align-middle">
                        {note.details || '-'}
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(note.balance)}</td>
                      <td className="border border-slate-400 px-2 py-2 text-right text-slate-400 font-mono">-</td>
                      <td className="border border-slate-400 px-2 py-2 text-right text-slate-400 font-mono">-</td>
                      <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono font-bold">{renderNumberCell(note.balance, false)}</td>
                    </tr>
                  ))}

                  {/* Subtotal for the ENTIRE 어음채권 section */}
                  <tr className="bg-slate-100/50 font-bold border-b-2 border-slate-800">
                    <td className="border border-slate-400 px-2 py-2 text-center text-slate-800 font-bold">합 계</td>
                    <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                    <td className="border border-slate-400 px-2 py-2 text-right font-mono">{renderNumberCell(data.noteBonds.total)}</td>
                    <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                    <td className="border border-slate-400 px-2 py-2 text-slate-400 text-center">-</td>
                    <td className="border-y border-l border-r-2 border-slate-400 border-r-slate-800 px-2 py-2 text-right font-mono">{renderNumberCell(data.noteBonds.total, false)}</td>
                  </tr>

                  {/* Company Signature Row */}
                  <tr className="font-bold border-none text-slate-900 bg-white">
                    <td className="px-2 py-4 border-none text-left text-xs tracking-wider" colSpan={7}>
                      ㈜ 영 화 포 장
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}

      {/* CSS stylesheet rule */}
      <style jsx global>{`
        .bg-slate-50\\/10 {
          white-space: nowrap !important;
        }
        @media print {
          /* Hide non-print elements */
          body {
            background-color: white !important;
            color: black !important;
          }
          header, 
          footer,
          .print\\:hidden,
          button,
          input {
            display: none !important;
          }
          
          /* Un-restrict max widths and remove margin wrappers */
          main, 
          .max-w-7xl, 
          div {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Setup Page Size */
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }

          /* Ensure table is black/white print friendly */
          table {
            border-color: #000000 !important;
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 10px !important;
          }
          th, td {
            border-color: #333333 !important;
            color: #000000 !important;
            padding: 6px 8px !important;
          }
          thead th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-slate-50\\/50, .bg-slate-50\\/50 td {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-slate-100\\/50, .bg-slate-100\\/50 td, .bg-slate-100\\/80, .bg-slate-100\\/80 td {
            background-color: #e2e8f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-slate-200\\/60, .bg-slate-200\\/60 td {
            background-color: #cbd5e1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
