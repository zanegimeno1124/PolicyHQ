
import React, { useMemo } from 'react';
import { Calendar, CheckCircle, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { formatCurrencyCompact } from './utils';

interface PerformanceMetricsProps {
  summary: { submissions: number; premiums: number };
  loading: boolean;
}

const StatCard = ({ label, value, unit, icon, iconColor, bgColor, loading }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between h-48 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
      <div className={`w-10 h-10 ${bgColor} ${iconColor} rounded-full flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
    </div>
    
    <div>
        {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
        ) : (
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
                {unit && <span className="text-sm font-bold text-slate-400 ml-1">{unit}</span>}
            </div>
        )}
    </div>
    
    {/* Subtle Background Glow */}
    <div className={`absolute -bottom-10 -right-10 w-32 h-32 ${bgColor} opacity-20 blur-3xl rounded-full pointer-events-none`}></div>
  </div>
);

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  summary, 
  loading 
}) => {
  const averagePremium = useMemo(() => {
    if (!summary.submissions || summary.submissions === 0) return 0;
    return summary.premiums / summary.submissions;
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 ml-2">
        <Calendar className="w-4 h-4 text-brand-500" />
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Performance Metrics</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            label="Applications" 
            value={summary.submissions} 
            unit="Apps" 
            bgColor="bg-blue-50" 
            iconColor="text-blue-500" 
            icon={<CheckCircle className="w-5 h-5" strokeWidth={3} />} 
            loading={loading}
        />
        <StatCard 
            label="Total Submitted Annual Premium" 
            value={formatCurrencyCompact(summary.premiums)} 
            unit="" 
            bgColor="bg-purple-50" 
            iconColor="text-purple-500" 
            icon={<DollarSign className="w-5 h-5" strokeWidth={3} />} 
            loading={loading}
        />
        <StatCard 
            label="Average Policy Size" 
            value={formatCurrencyCompact(Math.round(averagePremium))} 
            unit="" 
            bgColor="bg-pink-50" 
            iconColor="text-pink-500" 
            icon={<TrendingUp className="w-5 h-5" strokeWidth={3} />} 
            loading={loading}
        />
      </div>
    </div>
  );
};
