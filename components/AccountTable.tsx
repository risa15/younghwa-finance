import React from 'react';
import { AccountBalance } from '@/lib/types';

interface AccountTableProps {
  accounts: AccountBalance[];
}

export default function AccountTable({ accounts }: AccountTableProps) {
  // Group accounts
  const ordinaryDeposits = accounts.filter(a => a.type === '보통예금');
  const specialDeposits = accounts.filter(a => a.type === '특정예금');
  const cashAccounts = accounts.filter(a => a.type === '현금');

  // Subtotals
  const ordinarySubtotal = ordinaryDeposits.reduce((sum, a) => sum + a.balance, 0);
  const specialSubtotal = specialDeposits.reduce((sum, a) => sum + a.balance, 0);
  const cashSubtotal = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  
  // Grand total
  const grandTotal = ordinarySubtotal + specialSubtotal + cashSubtotal;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">계좌별 잔액 현황</h3>
        <span className="text-[10px] text-slate-400 font-semibold">단위: 원</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
              <th className="px-6 py-3 w-1/4">구분</th>
              <th className="px-6 py-3 w-2/4">계좌명</th>
              <th className="px-6 py-3 text-right w-1/4">잔액</th>
              <th className="px-6 py-3 text-right hidden sm:table-cell w-[10%]">점유율</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {/* 1. 보통예금 */}
            {ordinaryDeposits.map((account, idx) => (
              <tr key={account.accountName} className="hover:bg-slate-50/50 transition-colors duration-150">
                {idx === 0 && (
                  <td className="px-6 py-3.5 font-bold text-slate-900 align-middle" rowSpan={ordinaryDeposits.length}>
                    <span>보통예금</span>
                  </td>
                )}
                <td className="px-6 py-3.5 text-slate-700 font-medium">{account.accountName}</td>
                <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                  {account.balance.toLocaleString('ko-KR')}
                </td>
                <td className="px-6 py-3.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                  {grandTotal > 0 ? `${((account.balance / grandTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            ))}
            {ordinaryDeposits.length > 0 && (
              <tr className="bg-slate-50/30 text-slate-800 font-semibold">
                <td className="px-6 py-3 text-[10px] text-brand-blue" colSpan={2}>보통예금 소계</td>
                <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                  {ordinarySubtotal.toLocaleString('ko-KR')}
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-500 hidden sm:table-cell">
                  {grandTotal > 0 ? `${((ordinarySubtotal / grandTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            )}

            {/* 2. 특정예금 */}
            {specialDeposits.map((account, idx) => (
              <tr key={account.accountName} className="hover:bg-slate-50/50 transition-colors duration-150">
                {idx === 0 && (
                  <td className="px-6 py-3.5 font-bold text-slate-900 align-middle" rowSpan={specialDeposits.length}>
                    <span>특정예금</span>
                  </td>
                )}
                <td className="px-6 py-3.5 text-slate-700 font-medium">{account.accountName}</td>
                <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                  {account.balance.toLocaleString('ko-KR')}
                </td>
                <td className="px-6 py-3.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                  {grandTotal > 0 ? `${((account.balance / grandTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            ))}
            {specialDeposits.length > 0 && (
              <tr className="bg-slate-50/30 text-slate-800 font-semibold">
                <td className="px-6 py-3 text-[10px] text-brand-amber" colSpan={2}>특정예금 소계</td>
                <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                  {specialSubtotal.toLocaleString('ko-KR')}
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-500 hidden sm:table-cell">
                  {grandTotal > 0 ? `${((specialSubtotal / grandTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            )}

            {/* 3. 현금 */}
            {cashAccounts.map((account, idx) => (
              <tr key={account.accountName} className="hover:bg-slate-50/50 transition-colors duration-150">
                {idx === 0 && (
                  <td className="px-6 py-3.5 font-bold text-slate-900 align-middle" rowSpan={cashAccounts.length}>
                    <span>현금</span>
                  </td>
                )}
                <td className="px-6 py-3.5 text-slate-700 font-medium">{account.accountName}</td>
                <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                  {account.balance.toLocaleString('ko-KR')}
                </td>
                <td className="px-6 py-3.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                  {grandTotal > 0 ? `${((account.balance / grandTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="px-6 py-4.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">유동자산 총합계</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-mono font-black text-brand-blue tracking-tight">
            {grandTotal.toLocaleString('ko-KR')}
          </span>
          <span className="text-[10px] font-bold text-slate-500">원</span>
        </div>
      </div>
    </div>
  );
}
