
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Target, Loader2, Info, BarChart3 } from 'lucide-react';
import { agentOverviewApi, LeadBreakdownResponse } from '../../services/agentOverviewApi';

interface LeadInfoSectionProps {
  agencyId: string | null;
  startDate: number | null;
  endDate: number | null;
}

const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#64748b', '#0ea5e9', '#f43f5e', '#84cc16'];

export const LeadInfoSection: React.FC<LeadInfoSectionProps> = ({ agencyId, startDate, endDate }) => {
  const [data, setData] = useState<LeadBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredSource, setHoveredSource] = useState<{
    item: any;
    rect: DOMRect;
    idx: number;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    agentOverviewApi.getLeadBreakdown(agencyId, startDate, endDate)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agencyId, startDate, endDate]);

  const sourceData = useMemo(() => {
    if (!data?.source) return [];
    return data.source
      .filter(item => item.total_premium > 0 || item.submissions > 0)
      .map(item => ({
        name: item.label,
        value: item.total_premium,
        submissions: item.submissions,
        issued: item.issued
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const typeData = useMemo(() => {
    if (!data?.type) return [];
    return data.type
      .filter(item => item.total_premium > 0 || item.submissions > 0)
      .map(item => ({
        name: item.label,
        value: item.total_premium,
        submissions: item.submissions,
        issued: item.issued
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const totalSourcePremium = useMemo(() => {
    return sourceData.reduce((acc, curr) => acc + curr.value, 0);
  }, [sourceData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </div>
    );
  }

  if (!data || (sourceData.length === 0 && typeData.length === 0)) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 animate-in fade-in duration-700">
      {/* Container 1: Source Tracker (2/3) */}
      <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all flex flex-col group relative overflow-hidden">
        <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 shadow-sm border border-brand-100">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Source Tracker</h3>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <Info className="w-3 h-3" />
            Distribution By Lead Origin
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-1 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">
                  {formatCurrency(totalSourcePremium).replace('$', '').replace(/[KMB]/, '')}
                  <span className="text-3xl ml-0.5 lowercase text-slate-400">
                    {formatCurrency(totalSourcePremium).match(/[KMB]/)?.[0] || 'k'}
                  </span>
                </span>
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-500 px-2 py-1 rounded-lg text-[10px] font-black h-fit">
                  <TrendingUp size={12} className="inline mr-0.5" /> 12%
                </div>
            </div>
            <p className="text-slate-400 font-bold text-sm tracking-wide">Total premium from marketing sources</p>
          </div>

          {/* Scrollable Source List */}
          <div className="max-h-[220px] overflow-y-auto scrollbar-hide pr-2 space-y-5">
            {sourceData.map((item, idx) => {
              const percentage = totalSourcePremium > 0 ? (item.value / totalSourcePremium) * 100 : 0;
              return (
                <div 
                  key={idx} 
                  className="space-y-2 group/row relative"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSource({ item, rect, idx });
                  }}
                  onMouseLeave={() => setHoveredSource(null)}
                >
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-500">{item.name}</span>
                    <span className="text-slate-900">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

        {/* Portal-based Tooltip */}
        {hoveredSource && createPortal(
          <div 
            className="fixed pointer-events-none z-[9999] animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: hoveredSource.rect.top - 12,
              left: hoveredSource.rect.left + hoveredSource.rect.width / 2,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="w-52 p-4 bg-slate-900 rounded-[1.5rem] shadow-2xl border border-white/10 relative">
               <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                 {hoveredSource.item.name}
               </p>
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                     <span className="text-slate-500 uppercase tracking-tighter">Premium</span>
                     <span className="text-white">${hoveredSource.item.value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                     <span className="text-slate-500 uppercase tracking-tighter">Submissions</span>
                     <span className="text-white">{hoveredSource.item.submissions}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                     <span className="text-slate-500 uppercase tracking-tighter">Issued</span>
                     <span className="text-emerald-400 font-black">{hoveredSource.item.issued}</span>
                  </div>
               </div>
               {/* Arrow */}
               <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Container 2: Type Tracker (1/3) */}
      <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all flex flex-col items-center group">
        <div className="w-full flex items-center gap-3 mb-10">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm border border-indigo-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Type Tracker</h3>
        </div>

        <div className="h-44 w-full relative mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                cornerRadius={8}
                stroke="none"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                 wrapperStyle={{ zIndex: 1000 }}
                 content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-white/10 text-white min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-2 border-b border-white/10 pb-1">{item.name}</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between gap-4">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Premium</span>
                              <span className="text-xs font-black">${item.value.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Submissions</span>
                              <span className="text-xs font-black">{item.submissions}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Issued</span>
                              <span className="text-xs font-black text-emerald-400">{item.issued}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900 leading-none">{typeData.length}</span>
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Products</span>
          </div>
        </div>

        <div className="mt-auto w-full grid grid-cols-2 gap-3">
           {typeData.slice(0, 4).map((item, idx) => (
             <div key={idx} className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
               <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
               <span className="text-[9px] font-black text-slate-500 truncate uppercase tracking-tighter">{item.name}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const TrendingUp = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 16} 
    height={size || 16} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);
