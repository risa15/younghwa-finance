import React, { useState } from 'react';

interface CollectionAlertItem {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  daysLeft: number;
  status: '대기' | '연체' | '완료';
}

interface CollectionAlertBannerProps {
  alerts: CollectionAlertItem[];
}

export default function CollectionAlertBanner({ alerts }: CollectionAlertBannerProps) {
  const [filterType, setFilterType] = useState<'10' | '20' | '30' | 'overdue'>('30'); // Default to 30 days

  // Filter logic: Overdue items (daysLeft < 0) are always shown in 10/20/30 filters because they require action
  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === 'overdue') {
      return alert.daysLeft < 0;
    }
    const daysLimit = parseInt(filterType, 10);
    return alert.daysLeft < 0 || alert.daysLeft <= daysLimit;
  });

  const totalFilteredAmount = filteredAlerts.reduce((sum, alert) => sum + alert.amount, 0);

  if (alerts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <p className="text-xs text-slate-600 font-medium">
          향후 30일 이내 예정되었거나 미수 상태인 수금 내역이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header with Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
            <span>수금 예정 및 미수 알림</span>
            <span className="font-mono text-slate-400 text-[10px]">({filteredAlerts.length}건)</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold mt-1">
            선택 범위 합계: <span className="font-mono font-bold text-brand-emerald text-xs">{totalFilteredAmount.toLocaleString('ko-KR')}원</span>
          </p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5 h-7 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setFilterType('10')}
            className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all duration-150 ${
              filterType === '10' 
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            10일 이내
          </button>
          <button
            onClick={() => setFilterType('20')}
            className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all duration-150 ${
              filterType === '20' 
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            20일 이내
          </button>
          <button
            onClick={() => setFilterType('30')}
            className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all duration-150 ${
              filterType === '30' 
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            30일 이내
          </button>
          <button
            onClick={() => setFilterType('overdue')}
            className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all duration-150 ${
              filterType === 'overdue' 
                ? 'bg-rose-100 text-rose-800 shadow-sm border border-rose-200/30' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            연체만
          </button>
        </div>
      </div>

      <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const isOverdue = alert.daysLeft < 0;
            const isUrgent = alert.daysLeft >= 0 && alert.daysLeft <= 7;
            
            let badgeColorClass = 'bg-slate-100 text-slate-700';
            let borderClass = 'bg-white border-slate-200 hover:bg-slate-50';
            let badgeText = `D-${alert.daysLeft}`;

            if (isOverdue) {
              badgeColorClass = 'bg-rose-200 text-rose-800 animate-pulse';
              borderClass = 'bg-rose-50 border-rose-100 hover:bg-rose-100/60';
              badgeText = `미수 D+${Math.abs(alert.daysLeft)}`;
            } else if (isUrgent) {
              badgeColorClass = 'bg-amber-200 text-amber-800';
              borderClass = 'bg-amber-50 border-amber-100 hover:bg-amber-100/60';
            } else {
              badgeColorClass = 'bg-emerald-100 text-emerald-800';
              borderClass = 'bg-emerald-50/30 border-emerald-100/60 hover:bg-emerald-50';
            }

            return (
              <div 
                key={alert.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-lg border text-xs transition-colors duration-150 ${borderClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${badgeColorClass}`}>
                    {alert.daysLeft === 0 ? 'D-Day' : badgeText}
                  </span>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{alert.client}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-medium">수금 예정</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono text-slate-500">결제기한: {alert.dueDate}</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 self-end sm:self-auto">
                  <span className="font-mono font-extrabold text-slate-800 text-sm">
                    {alert.amount.toLocaleString('ko-KR')}
                  </span>
                  <span className="text-slate-500 font-medium">원</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-[10px] text-slate-400 font-semibold py-4">
            해당 조건의 알림 내역이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
