import React from 'react';

interface AlertItem {
  id: string;
  type: string;
  client: string;
  amount: number;
  dueDate: string;
  daysLeft: number;
}

interface AlertBannerProps {
  alerts: AlertItem[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <p className="text-xs text-slate-600 font-medium">
          향후 7일 이내 만기가 도래하는 어음 또는 외담대가 없습니다. 자금 흐름이 안정적입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          만기 임박 알림 <span className="font-mono text-slate-400">({alerts.length}건)</span>
        </h2>
      </div>

      <div className="grid gap-2">
        {alerts.map((alert) => {
          const isUrgent = alert.daysLeft <= 3;
          
          return (
            <div 
              key={alert.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-lg border text-xs transition-colors duration-150 ${
                isUrgent 
                  ? 'bg-rose-50 border-rose-100 hover:bg-rose-100/60' 
                  : 'bg-amber-50 border-amber-100 hover:bg-amber-100/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                  isUrgent 
                    ? 'bg-rose-200 text-rose-800' 
                    : 'bg-amber-200 text-amber-800'
                }`}>
                  {alert.daysLeft === 0 ? 'D-Day' : `D-${alert.daysLeft}`}
                </span>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800">{alert.client}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-medium">{alert.type}</span>
                  <span className="text-slate-300">|</span>
                  <span className="font-mono text-slate-500">만기일: {alert.dueDate}</span>
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
        })}
      </div>
    </div>
  );
}
