import React, { useMemo } from 'react';
import { Briefcase, Loader2, TrendingUp, Trophy, User } from 'lucide-react';
import { CarrierBreakdown } from '../../services/agentOverviewApi';

interface CarrierSectionProps {
  carrierBreakdown: CarrierBreakdown[];
  loading: boolean;
  onViewAll: () => void;
}

export const CarrierSection: React.FC<CarrierSectionProps> = ({ 
  carrierBreakdown, 
  loading, 
  onViewAll 
}) => {
  const sortedCarriers = useMemo(() => {
    return [...carrierBreakdown].sort((a, b) => b.total_premium - a.total_premium);
  }, [carrierBreakdown]);

  const topPerformer = sortedCarriers[0] || null;
  const detailedCarriers = sortedCarriers.slice(1, 4);

  const getCarrierInitials = (label: string) => {
    if (!label) return '??';
    return label.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-900 shadow-sm">
                    <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Carrier Performance</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 uppercase tracking-widest">
                {loading ? '...' : carrierBreakdown.length} Active Partners
            </span>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden flex flex-col items-center justify-center text-center group shadow-xl min-h-[340px]">
            {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            ) : topPerformer ? (
                <>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none group-hover:opacity-20 transition-opacity duration-700"></div>
                    <div className="relative z-10 w-full flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/20 overflow-hidden group-hover:scale-110 transition-transform">
                            {topPerformer.logo?.url ? (
                                <img src={topPerformer.logo.url} className="w-full h-full object-contain p-2" alt={topPerformer.label} />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black text-xl tracking-tighter">
                                    {getCarrierInitials(topPerformer.label)}
                                </div>
                            )}
                        </div>
                        <p className="text-brand-400 font-black text-[9px] uppercase tracking-[0.3em] mb-2">Top Carrier</p>
                        <h3 className="text-3xl font-black mb-1 tracking-tight">{topPerformer.label}</h3>
                        <p className="text-slate-400 text-xs font-medium mb-6">Leading premium production</p>
                        
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl px-8 py-3 border border-white/10 shadow-inner inline-block mb-6">
                            <span className="text-2xl font-black text-white tracking-tighter">${topPerformer.total_premium.toLocaleString()}</span>
                        </div>

                        {/* HERO TOP PRODUCER */}
                        {topPerformer.top_agent && (
                             <div className="flex items-center gap-3 bg-brand-500/10 px-4 py-2 rounded-xl border border-brand-500/20 mb-8 animate-in fade-in zoom-in duration-500">
                                <Trophy className="w-3.5 h-3.5 text-brand-400" />
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-brand-400 uppercase tracking-widest leading-none mb-0.5">Leading Agent</p>
                                    <p className="text-[11px] font-black text-white">{topPerformer.top_agent.name} <span className="text-slate-500 font-bold ml-1">(${topPerformer.top_agent.submitted_premium.toLocaleString()})</span></p>
                                </div>
                             </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md pt-6 border-t border-white/5">
                            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ratio</p>
                                <p className="text-xs font-black text-brand-400">
                                    {topPerformer.submissions > 0 ? ((topPerformer.issued / topPerformer.submissions) * 100).toFixed(2) : '0.00'}%
                                </p>
                            </div>
                            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Apps</p>
                                <p className="text-xs font-black text-white">{topPerformer.submissions}</p>
                            </div>
                            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Issued</p>
                                <p className="text-xs font-black text-white">{topPerformer.issued}</p>
                            </div>
                            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Prem</p>
                                <p className="text-[10px] font-black text-emerald-400">
                                    ${topPerformer.issued > 0 ? Math.round(topPerformer.total_premium / topPerformer.issued).toLocaleString() : '0'}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No Carrier Data</p>
            )}
        </div>

        <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Carrier Breakdown</p>
            <div className="space-y-3">
                {loading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-200" /></div>
                ) : detailedCarriers.length > 0 ? (
                    detailedCarriers.map((carrier) => {
                        const placement = carrier.submissions > 0 ? ((carrier.issued / carrier.submissions) * 100).toFixed(2) : "0.00";
                        const avgPrem = carrier.issued > 0 ? (carrier.total_premium / carrier.issued).toFixed(2) : "0.00";
                        return (
                            <div key={carrier.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden shrink-0 transition-transform group-hover:scale-105">
                                            {carrier.logo?.url ? (
                                                <img src={carrier.logo.url} className="w-full h-full object-contain p-1" alt={carrier.label} />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                                    {getCarrierInitials(carrier.label)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 leading-tight">{carrier.label}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placement Ratio: <span className="text-blue-500 font-black">{placement}%</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-blue-600">${(carrier.total_premium / 1000).toFixed(1)}K</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Premium</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 pb-4">
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-900">{carrier.submissions}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Apps</p>
                                    </div>
                                    <div className="text-center border-x border-slate-100">
                                        <p className="text-sm font-black text-slate-900">{carrier.issued}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Issued</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-900">${Number(avgPrem).toLocaleString()}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Prem</p>
                                    </div>
                                </div>
                                
                                {/* LIST TOP PRODUCER FOOTER */}
                                {carrier.top_agent && (
                                    <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500">
                                                <User className="w-2.5 h-2.5" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Top Agent: {carrier.top_agent.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-brand-600">${carrier.top_agent.submitted_premium.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No carrier breakdown data</div>
                )}
            </div>
        </div>

        <div className="mt-4 pt-6 border-t border-slate-50 text-center">
            <button 
                onClick={onViewAll}
                className="text-[10px] font-black text-slate-400 hover:text-brand-500 transition-colors uppercase tracking-[0.2em]"
            >
                View Full Carrier Portfolio
            </button>
        </div>
    </div>
  );
};