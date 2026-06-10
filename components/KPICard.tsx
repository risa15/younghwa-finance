import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  icon?: LucideIcon; // Made optional to support clean layout
  color?: 'blue' | 'emerald' | 'rose' | 'amber';
  description?: string;
}

export function formatKoreanShorthand(amount: number): string {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 100000000) { // 1억 이상
    const eok = amount / 100000000;
    return `${eok.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}억`;
  } else if (absAmount >= 10000) { // 1만 이상
    const man = amount / 10000;
    return `${man.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}만`;
  }
  
  return `${amount.toLocaleString('ko-KR')}원`;
}

export default function KPICard({ 
  title, 
  value, 
  icon: Icon, // Ignored in render to keep it icon-free
  color = 'blue',
  description
}: KPICardProps) {
  
  // Minimal left-border accent for slight differentiation, using clean light border colors
  const borderAccents = {
    blue: 'border-l-4 border-l-blue-500',
    emerald: 'border-l-4 border-l-emerald-600',
    rose: 'border-l-4 border-l-rose-600',
    amber: 'border-l-4 border-l-amber-500'
  };

  const borderClass = borderAccents[color] || borderAccents.blue;

  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md ${borderClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{title}</span>
          <span className="text-2xl font-black text-slate-900 tracking-tight block">
            {formatKoreanShorthand(value)}
          </span>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-500 font-medium">
          {value.toLocaleString('ko-KR')} 원
        </span>
        {description && (
          <span className="text-[10px] text-slate-400 font-semibold">{description}</span>
        )}
      </div>
    </div>
  );
}
