import React, { useMemo } from 'react';
import { Trophy, ChevronDown, Star, Crown, Loader2, Users, FileCheck, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { TeamRankingEntry } from '../../services/agentOverviewApi';
import { formatCurrencyCompact } from './utils';

interface TeamSalesSectionProps {
  teamRankingData: TeamRankingEntry[];
  loading: boolean;
  dateRangeLabel: string;
  selectedAgencyLabel: string;
  onViewAll: () => void;
}

const RankRibbon = ({ rank, size = 24 }: { rank: number; size?: number }) => {
  const colors = {
    1: 'fill-slate-900',
    2: 'fill-slate-500',
    3: 'fill-orange-700',
  };
  const colorClass = colors[rank as keyof typeof colors] || 'fill-slate-400';

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <svg width={size} height={size + 12} viewBox="0 0 24 32" className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]">
        <path d="M0 0H24V32L12 26L0 32V0Z" className={colorClass} />
        <circle cx="12" cy="12" r="8" className="fill-white/20" />
        <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="900" fill="white">{rank}</text>
      </svg>
    </div>
  );
};

const AchievementBadge = ({ type }: { type: 'gold' | 'blue' | 'purple' | 'red' }) => {
  const configs = {
    gold: 'bg-amber-100 text-amber-600 border-amber-200',
    blue: 'bg-sky-100 text-sky-600 border-sky-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    red: 'bg-rose-100 text-rose-600 border-rose-200',
  };
  return (
    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${configs[type]}`}>
      <Star className="w-2.5 h-2.5 fill-current" />
    </div>
  );
};

export const TeamSalesSection: React.FC<TeamSalesSectionProps> = ({ 
  teamRankingData, 
  loading,
  dateRangeLabel,
  selectedAgencyLabel,
  onViewAll
}) => {
  const sortedData = useMemo(() => {
    return [...teamRankingData].sort((a, b) => b.total_premium - a.total_premium);
  }, [teamRankingData]);

  const { featuredEntry, featuredRank } = useMemo(() => {
    if (sortedData.length === 0) return { featuredEntry: null, featuredRank: '—' };
    const index = sortedData.findIndex(e => e.name === selectedAgencyLabel);
    const actualIndex = index !== -1 ? index : 0;
    return {
      featuredEntry: sortedData[actualIndex],
      featuredRank: actualIndex + 1
    };
  }, [sortedData, selectedAgencyLabel]);

  // Filter the topList to exclude the featured agency to avoid duplicates
  const topList = useMemo(() => {
    if (!featuredEntry) return sortedData.slice(0, 8);
    return sortedData.filter(e => e.id !== featuredEntry.id).slice(0, 8);
  }, [sortedData, featuredEntry]);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden relative group transition-all hover:shadow-xl hover:shadow-slate-200/50">
      <style>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-150%) skewX(-15deg); }
          50% { transform: translateX(150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }
        .animate-shimmer-sweep {
          animation: shimmer-sweep 5s infinite ease-in-out;
        }
        .text-glow-gold {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
        }
      `}</style>

      {/* HEADER SECTION - LUXURY INDIGO/NAVY */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-8 pb-32 relative overflow-hidden shrink-0">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 border-[25px] border-white/5 rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-56 h-56 bg-brand-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col items-center">
          <h3 className="text-white font-black text-xl tracking-tight mb-2">Organizational Standings</h3>
          <p className="text-indigo-300/40 text-[10px] font-black uppercase tracking-[0.25em]">{dateRangeLabel} By Agency</p>
        </div>

        {/* Floating Trophy Icon */}
        <div className="absolute top-8 right-8 opacity-30 group-hover:opacity-60 transition-opacity duration-500 scale-125 translate-y-2">
          <Trophy className="w-12 h-12 text-brand-400" />
        </div>
      </div>

      {/* VIBRANT GOLD FEATURED CARD - REMOVED overflow-hidden here to fix clipping */}
      <div className="px-6 relative -mt-24 z-20">
        <div className="rounded-[2.5rem] p-8 shadow-[0_30px_70px_-15px_rgba(245,158,11,0.4)] border-4 border-white flex flex-col items-center relative group/card transform transition-all hover:scale-[1.02] duration-500 min-h-[380px]">
          
          {/* DEDICATED BACKGROUND LAYER WITH CLIPPING */}
          <div className="absolute inset-0 rounded-[2.3rem] overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-brand-600 -z-10">
            {/* Internal Shimmer for luxury feel */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-sweep opacity-30"></div>
            </div>
            
            {/* Subtle White Sparkles */}
            <div className="absolute top-4 left-4 opacity-20 pointer-events-none">
               <Sparkles className="w-20 h-20 text-white" />
            </div>
            
            {/* Inner Shadow for depth */}
            <div className="absolute inset-0 shadow-inner opacity-40 pointer-events-none"></div>
          </div>

          {/* AVATAR CONTAINER */}
          <div className="relative mb-6 mt-6">
            {/* Rank Ribbon - Outside bounds ok now */}
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 scale-110 drop-shadow-xl">
                <RankRibbon rank={featuredRank as number} size={36} />
            </div>
            
            {/* Avatar with Deep Navy Halo */}
            <div className={`w-28 h-28 rounded-full p-1 bg-white shadow-2xl ring-4 ring-black/5 relative z-10`}>
              <div className="w-full h-full rounded-full bg-white overflow-hidden relative border-2 border-slate-50">
                {featuredEntry?.logo?.url ? (
                    <img 
                        src={featuredEntry.logo.url} 
                        className="w-full h-full object-contain p-3"
                        alt="Team Logo"
                        onError={(e) => {
                           (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${featuredEntry?.name || 'Team'}&backgroundColor=f59e0b&fontFamily=Arial&fontWeight=900&fontSize=40`;
                        }}
                    />
                ) : (
                    <img 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${featuredEntry?.name || 'Team'}&backgroundColor=f59e0b&fontFamily=Arial&fontWeight=900&fontSize=40`} 
                        className="w-full h-full object-cover"
                        alt="Initial Avatar"
                    />
                )}
              </div>
              
              {/* Crown for Top Spot - Jumps outside bounds freely */}
              {featuredRank === 1 && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 drop-shadow-[0_15px_25px_rgba(0,0,0,0.4)] z-20">
                      <Crown className="w-14 h-14 text-white fill-white animate-bounce" />
                  </div>
              )}
            </div>
            
            {/* White Aura Glow */}
            <div className="absolute inset-0 bg-white/40 rounded-full blur-3xl group-hover/card:scale-150 transition-transform duration-1000 -z-10"></div>
          </div>

          <div className="text-center relative z-10 w-full px-2">
            <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-4 drop-shadow-sm">
              {featuredEntry?.name || 'Syncing Standings...'}
            </h4>
            
            <div className="inline-flex flex-col items-center w-full max-w-[240px] px-6 py-4 bg-white/95 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] group/val transition-transform hover:scale-105">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.25em] mb-1">Production Value</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-900 text-3xl font-black tracking-tighter">
                  {featuredEntry ? formatCurrencyCompact(featuredEntry.total_premium) : '$0'}
                </span>
                <div className="bg-amber-100 p-1 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-amber-600" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>

          {featuredEntry && (
            <div className="grid grid-cols-3 gap-2 w-full mt-8 pt-6 border-t border-black/10 relative z-10">
              <div className="p-2 text-center">
                 <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Agents</p>
                 <p className="text-sm font-black text-slate-900">{featuredEntry.agents}</p>
              </div>
              <div className="p-2 text-center border-x border-black/10">
                 <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Subs</p>
                 <p className="text-sm font-black text-slate-900">{featuredEntry.submissions}</p>
              </div>
              <div className="p-2 text-center">
                 <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Issued</p>
                 <p className="text-sm font-black text-slate-900">{featuredEntry.issued}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIST SECTION */}
      <div className="flex-1 px-8 py-10 space-y-8 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Rankings...</p>
          </div>
        ) : topList.length > 0 ? (
          <>
            {topList.map((entry) => {
              // Calculate absolute rank based on original sorted data
              const rank = sortedData.findIndex(e => e.id === entry.id) + 1;
              return (
                <div key={entry.id} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className="w-8 shrink-0 flex justify-center">
                      {rank <= 3 ? (
                        <RankRibbon rank={rank} size={22} />
                      ) : (
                        <span className="text-sm font-black text-slate-300">#{rank}</span>
                      )}
                    </div>
                    
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full bg-slate-50 p-0.5 border-2 border-white overflow-hidden shadow-md group-hover/item:scale-110 transition-transform duration-300">
                        {entry.logo?.url ? (
                             <img 
                               src={entry.logo.url} 
                               className="w-full h-full object-contain p-2" 
                               alt={entry.name} 
                               onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${entry.name}`;
                               }}
                             />
                        ) : (
                             <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${entry.name}`} className="w-full h-full object-cover" alt={entry.name} />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                        <AchievementBadge type={rank === 1 ? 'gold' : 'blue'} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black text-slate-800 truncate leading-tight mb-1 group-hover/item:text-brand-500 transition-colors">{entry.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1 opacity-60">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{entry.agents} <span className="font-bold">Agents</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Subs: <span className="text-indigo-500 font-black">{entry.submissions}</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Issued: <span className="text-emerald-500 font-black">{entry.issued}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <p className="text-base font-black text-slate-900 tracking-tighter group-hover/item:text-amber-500 transition-colors">
                      {formatCurrencyCompact(entry.total_premium)}
                    </p>
                    <p className="text-[9px] font-extrabold text-slate-300 uppercase tracking-widest">Premium</p>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
             <Trophy className="w-12 h-12 mb-4 opacity-20" />
             <p className="text-xs font-black uppercase tracking-widest">No rankings available</p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-6 border-t border-slate-50 bg-slate-50/20 text-center">
        <button 
          onClick={onViewAll}
          className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 mx-auto hover:gap-3"
        >
          Explore Organization hierarchy
        </button>
      </div>
    </div>
  );
};