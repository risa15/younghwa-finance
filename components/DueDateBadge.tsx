import React from 'react';

interface DueDateBadgeProps {
  daysLeft: number;
}

export default function DueDateBadge({ daysLeft }: DueDateBadgeProps) {
  let text = '';
  let styleClass = '';

  if (daysLeft < 0) {
    text = `만기 경과 (D+${Math.abs(daysLeft)})`;
    styleClass = 'bg-rose-50 text-rose-700 border border-rose-200';
  } else if (daysLeft === 0) {
    text = '오늘 만기 (D-Day)';
    styleClass = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold animate-pulse';
  } else if (daysLeft <= 3) {
    text = `D-${daysLeft}`;
    styleClass = 'bg-rose-50 text-rose-600 border border-rose-200 font-semibold';
  } else if (daysLeft <= 7) {
    text = `D-${daysLeft}`;
    styleClass = 'bg-amber-50 text-amber-700 border border-amber-200';
  } else if (daysLeft <= 30) {
    text = `D-${daysLeft}`;
    styleClass = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  } else {
    text = `D-${daysLeft}`;
    styleClass = 'bg-slate-50 text-slate-600 border border-slate-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide ${styleClass}`}>
      {text}
    </span>
  );
}
