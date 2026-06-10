'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { LoanStatus } from '@/lib/types';
import { formatKoreanShorthand } from '@/components/KPICard';

interface LoanSchedulePayment {
  loanId: string;
  bank: string;
  loanType: string;
  paymentDay: number;
  amount: number;
  type: '이자' | '원금상환';
  paymentDate: string;
}

interface LoanScheduleMonth {
  year: number;
  month: number;
  payments: LoanSchedulePayment[];
  totalAmount: number;
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

// Dynamically calculate the next interest payment date relative to selectedDate
function calculateNextInterestDate(
  selectedDateStr: string, 
  paymentDay: number, 
  startDateStr: string, 
  dueDateStr: string
): string {
  try {
    const refDate = parseDateStr(selectedDateStr);
    const start = parseDateStr(startDateStr);
    const due = parseDateStr(dueDateStr);
    
    const sy = refDate.getFullYear();
    const sm = refDate.getMonth(); // 0-11
    
    // Check if the interest day in current month is in the future or past
    let candidate = new Date(sy, sm, paymentDay);
    if (candidate < refDate) {
      candidate = new Date(sy, sm + 1, paymentDay);
    }
    
    // Normalize comparison dates to start of month
    const candidateCompare = new Date(candidate.getFullYear(), candidate.getMonth(), 1);
    const startCompare = new Date(start.getFullYear(), start.getMonth(), 1);
    const dueCompare = new Date(due.getFullYear(), due.getMonth(), 1);
    
    if (candidateCompare < startCompare) {
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
    }
    if (candidateCompare > dueCompare) {
      return '상환 만기완료';
    }
    
    const y = candidate.getFullYear();
    const m = String(candidate.getMonth() + 1).padStart(2, '0');
    const d = String(candidate.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  } catch (err) {
    return '정보 없음';
  }
}

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanStatus[]>([]);
  const [schedule, setSchedule] = useState<LoanScheduleMonth[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-10');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Loans Data
  const fetchLoansData = async (dateParam: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loans?date=${dateParam}`);
      if (!response.ok) {
        throw new Error('대출 현황 데이터를 불러오는 데 실패했습니다.');
      }
      const data = await response.json();
      setLoans(data.loans);
      setSchedule(data.schedule);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '데이터 통신 에러');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoansData(selectedDate);
  }, [selectedDate]);

  // Aggregate totals
  const totalLoanBalance = useMemo(() => {
    return loans.reduce((sum, l) => sum + l.balance, 0);
  }, [loans]);

  const totalMonthlyInterest = useMemo(() => {
    return loans.reduce((sum, l) => sum + l.monthlyInterest, 0);
  }, [loans]);

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
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">대출·외담대 현황</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            금융권 시설/운전자금 대출과 외담대 한도의 상환 잔액 및 이자 납부 스케줄을 종합 관리합니다.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9 shadow-sm">
          <button 
            onClick={() => adjustDate(-1)}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors"
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
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            disabled={loading}
            title="하루 후"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Main Content */}
      <div className={`space-y-6 sm:space-y-8 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* KPI Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass-card p-6 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 tracking-wider block mb-1">총 대출/한도 잔액</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {totalLoanBalance.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 text-brand-rose rounded-lg font-mono text-xs font-bold">
              {formatKoreanShorthand(totalLoanBalance)}
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 tracking-wider block mb-1">월 평균 대출 이자</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {totalMonthlyInterest.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 text-brand-blue rounded-lg font-mono text-xs font-bold">
              {formatKoreanShorthand(totalMonthlyInterest)}
            </div>
          </div>
        </div>

        {/* Loan cards row */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 tracking-wide mb-4">
            대출 계좌 현황
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loans.map((loan) => {
              const nextInterest = calculateNextInterestDate(
                selectedDate,
                loan.paymentDay,
                loan.startDate,
                loan.dueDate
              );

              return (
                <div 
                  key={loan.loanId} 
                  className="glass-card rounded-xl overflow-hidden hover:border-slate-300 hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-brand-amber border border-amber-200 uppercase font-mono">
                        {loan.loanId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">
                        실행: {loan.startDate}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mt-2">
                      {loan.bank} {loan.loanType}
                    </h4>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">현재 잔액</span>
                      <span className="font-mono font-bold text-slate-900">
                        {loan.balance.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">대출한도 원금</span>
                      <span className="font-mono text-slate-400">
                        {loan.loanAmount.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">금리</span>
                      <span className="font-mono font-semibold text-brand-emerald">
                        {loan.interestRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">만기일자</span>
                      <span className="font-mono text-slate-700 font-semibold">{loan.dueDate}</span>
                    </div>
                    
                    {loan.repayStartDate && loan.repayAmount && loan.repayAmount > 0 ? (
                      <div className="border-t border-slate-100 pt-3 mt-3 space-y-2 text-[10px]">
                        <div className="flex justify-between text-slate-500">
                          <span>분할상환 시작일</span>
                          <span className="font-mono">{loan.repayStartDate}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>분할상환금액</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {loan.repayAmount.toLocaleString('ko-KR')}원 (매월 {loan.repayPaymentDay || loan.paymentDay}일)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-slate-100 pt-3 mt-3 text-[10px] text-slate-400 italic">
                        만기일시상환 (분할상환 없음)
                      </div>
                    )}
                  </div>

                  {/* Card Footer Info */}
                  <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/30 text-[11px] flex justify-between items-center">
                    <span className="text-slate-400 font-medium">
                      다음 이자 ({loan.paymentDay}일)
                    </span>
                    <span className={`font-mono font-bold ${
                      nextInterest.includes('만기완료') 
                        ? 'text-slate-500' 
                        : 'text-brand-rose'
                    }`}>
                      {nextInterest}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3-month interest schedule */}
        <div className="glass-card rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-800 tracking-wide">
              향후 3개월 상환 및 이자 납부 계획
            </h3>
            <span className="text-[10px] text-slate-400 font-medium font-mono">선택 기준월로부터 3개월 집계</span>
          </div>

          {/* Timeline and listings */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {schedule.map((monthData, monthIdx) => (
              <div 
                key={`${monthData.year}-${monthData.month}`}
                className="p-4 rounded-lg bg-slate-50/30 border border-slate-200 flex flex-col justify-between"
              >
                {/* Month header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <span className="text-xs font-bold text-slate-700 tracking-wider">
                    {monthData.year}년 {String(monthData.month).padStart(2, '0')}월 상환/이자
                  </span>
                  <span className="font-mono text-xs font-extrabold text-brand-rose">
                    {monthData.totalAmount.toLocaleString('ko-KR')}원
                  </span>
                </div>

                {/* Individual payments */}
                <div className="space-y-3 flex-1">
                  {monthData.payments.length > 0 ? (
                    monthData.payments.map((pmt, pmtIdx) => (
                      <div 
                        key={`${pmt.loanId}-${pmtIdx}`}
                        className="flex justify-between items-center text-xs p-2.5 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">
                            {pmt.bank}
                            <span className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-bold ${
                              pmt.type === '원금상환' 
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {pmt.type}
                            </span>
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono leading-tight">{pmt.loanType}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-slate-700">{pmt.amount.toLocaleString()}원</span>
                          <span className="text-[9px] text-brand-amber font-mono">납부일: {pmt.paymentDay}일</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-20 flex items-center justify-center text-[11px] text-slate-500">
                      예정된 상환 및 이자 납부 건이 없습니다.
                    </div>
                  )}
                </div>

                {/* Monthly total footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-right text-[10px] text-slate-500 font-semibold">
                  소계: {formatKoreanShorthand(monthData.totalAmount)}
                </div>
              </div>
            ))}
          </div>

          {/* Combined Schedule Info Note */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-2.5 items-start">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              본 스케줄러는 각 대출 계좌의 월 이자, 원금 분할상환 금액 및 실행/만기일자에 근거하여 산출된 가상 지급액 타임라인입니다. 
              금리 변동 및 원금 중도 상환 등의 사유로 실제 청구되는 금액과는 차이가 있을 수 있으므로 자금 운용 시 참고용으로 활용하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
