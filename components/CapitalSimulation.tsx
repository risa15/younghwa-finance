import React from 'react';
import { formatKoreanShorthand } from './KPICard';

interface NoteItem {
  client: string;
  type: string;
  amount: number;
}

interface InterestItem {
  bank: string;
  loanType: string;
  amount: number;
}

interface CapitalSimulationProps {
  simulation?: {
    notesMaturing: NoteItem[];
    interestDue: InterestItem[];
    actualDeposits: number;
    actualWithdrawals: number;
    expectedIn: number;
    expectedOut: number;
    startLiquidAssets: number;
    endLiquidAssets: number;
  };
  selectedDate: string;
}

export default function CapitalSimulation({ simulation, selectedDate }: CapitalSimulationProps) {
  if (!simulation) return null;

  const {
    notesMaturing,
    interestDue,
    actualDeposits,
    actualWithdrawals,
    expectedIn,
    expectedOut,
    startLiquidAssets,
    endLiquidAssets
  } = simulation;

  const displayDay = selectedDate ? selectedDate.split('-')[2] : '';
  const hasDetails = notesMaturing.length > 0 || interestDue.length > 0 || actualDeposits > 0 || actualWithdrawals > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">일일 자금 흐름 시뮬레이션</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{selectedDate} 기준 당일 예정 자금 이벤트를 반영한 모의 연산</p>
        </div>
        
        {/* Simple Date Label */}
        <span className="self-start sm:self-auto px-2.5 py-0.5 bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 rounded font-mono">
          {displayDay}일 시뮬레이션
        </span>
      </div>

      {/* 1. Simplified Summary Calculation Board (Step-by-Step Flow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50/50 border border-slate-100 font-sans text-xs">
        {/* Step 1: Start */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold block">기초 유동자산 (A)</span>
          <span className="font-mono font-extrabold text-slate-700 text-sm block">
            {startLiquidAssets.toLocaleString()}원
          </span>
          <span className="text-[9px] text-slate-400 font-semibold block">
            ({formatKoreanShorthand(startLiquidAssets)})
          </span>
        </div>

        {/* Step 2: Expected In */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-emerald-600 font-bold block">(+) 입금 예정 (B)</span>
          <span className="font-mono font-extrabold text-emerald-600 text-sm block">
            +{expectedIn.toLocaleString()}원
          </span>
          <span className="text-[9px] text-emerald-500 font-semibold block">
            ({formatKoreanShorthand(expectedIn)})
          </span>
        </div>

        {/* Step 3: Expected Out */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-rose-600 font-bold block">(-) 지출 예정 (C)</span>
          <span className="font-mono font-extrabold text-rose-600 text-sm block">
            -{expectedOut.toLocaleString()}원
          </span>
          <span className="text-[9px] text-rose-500 font-semibold block">
            ({formatKoreanShorthand(expectedOut)})
          </span>
        </div>

        {/* Step 4: End Result */}
        <div className="space-y-0.5 md:border-l md:border-slate-200 md:pl-4">
          <span className="text-[10px] text-slate-900 font-black tracking-wide block uppercase">기말 예상 유동자산 (A+B-C)</span>
          <span className="font-mono font-black text-slate-950 text-sm sm:text-base block">
            {endLiquidAssets.toLocaleString()}원
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500 block">
            ({formatKoreanShorthand(endLiquidAssets)})
          </span>
        </div>
      </div>

      {/* 2. Detailed breakdown list (Only shown if details exist) */}
      {hasDetails ? (
        <div className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Expected Inflows */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                입금 예정 상세
              </h4>
              <ul className="divide-y divide-slate-100 text-[11px] font-medium">
                {/* Maturing Notes */}
                {notesMaturing.map((note, idx) => (
                  <li key={`in-note-${idx}`} className="py-2 flex justify-between items-center">
                    <span className="text-slate-700">
                      <span className="font-bold text-emerald-600 mr-1.5">[만기]</span>
                      {note.client} <span className="text-[9px] text-slate-400">({note.type})</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-600">+{note.amount.toLocaleString()}원</span>
                  </li>
                ))}
                
                {/* Cash Deposits */}
                {actualDeposits > 0 && (
                  <li className="py-2 flex justify-between items-center">
                    <span className="text-slate-700">
                      <span className="font-bold text-emerald-600 mr-1.5">[입금]</span>
                      당일 일반 수금/입금 거래액
                    </span>
                    <span className="font-mono font-bold text-emerald-600">+{actualDeposits.toLocaleString()}원</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Right: Expected Outflows */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-rose-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                지출 예정 상세
              </h4>
              <ul className="divide-y divide-slate-100 text-[11px] font-medium">
                {/* Interest Payments */}
                {interestDue.map((loan, idx) => (
                  <li key={`out-loan-${idx}`} className="py-2 flex justify-between items-center">
                    <span className="text-slate-700">
                      <span className="font-bold text-rose-600 mr-1.5">[이자]</span>
                      {loan.bank} <span className="text-[9px] text-slate-400">({loan.loanType})</span>
                    </span>
                    <span className="font-mono font-bold text-rose-600">-{loan.amount.toLocaleString()}원</span>
                  </li>
                ))}
                
                {/* Cash Withdrawals */}
                {actualWithdrawals > 0 && (
                  <li className="py-2 flex justify-between items-center">
                    <span className="text-slate-700">
                      <span className="font-bold text-rose-600 mr-1.5">[출금]</span>
                      당일 일반 지출/출금 거래액
                    </span>
                    <span className="font-mono font-bold text-rose-600">-{actualWithdrawals.toLocaleString()}원</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-[10px] text-slate-400 font-semibold py-2">
          예정된 입출금 일정이 없는 깨끗한 하루입니다.
        </p>
      )}
    </div>
  );
}
