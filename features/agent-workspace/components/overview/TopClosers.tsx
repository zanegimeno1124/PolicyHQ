
import React, { useMemo } from 'react';
import { Crown, Loader2, Star, Trophy, ChevronRight, TrendingUp } from 'lucide-react';
import { AllTimeLeaderboardEntry } from '../../services/agentOverviewApi';
import { getAgencyName } from './utils';

interface TopClosersProps {
  leaderboardData: AllTimeLeaderboardEntry[];
  loading: boolean;
  selectedAgencyLabel: string;
  dateRangeLabel: string;
  onViewAll: () => void;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const PodiumCircle = ({ 
  entry, 
  rank, 
  size, 
  color, 
  glow, 
  className = "" 
}: { 
  entry: AllTimeLeaderboardEntry | null, 
  rank: number, 
  size: string, 
  color: string, 
  glow: string,
  className?: string
}) => {
  if (!entry) return <div className={`${size} rounded-full border border-white/5 bg-white/5 opacity-20 ${className}`} />;

  const avatarUrl = entry.agent_profile?.url;

  return (
    <div className={`flex flex-col items-center group/circle transition-all duration-500 ${className}`}>
      {rank === 1 && (
        <div className="flex gap-1 mb-2 animate-bounce-slow">
            <Star className="w-3 h-3 text-brand-400 fill-brand-400" />
            <Star className="w-4 h-4 text-brand-400 fill-brand-400 -mt-1.5" />
            <Star className="w-3 h-3 text-brand-400 fill-brand-400" />
        </div>
      )}
      
      <div className="relative">
        <div className={`${size} rounded-full p-1.5 ${color} ${glow} transition-transform group-hover/circle:scale-105 duration-500 relative z-10 shadow-2xl`}>
          <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden border-2 border-slate-900 flex items-center justify-center">
            {avatarUrl ? (
                <img 
                src={avatarUrl} 
                className="w-full h-full object-cover" 
                alt={entry.agent_name} 
              />
            ) : (
                <span className="text-white font-black text-2xl tracking-tighter">
                    {getInitials(entry.agent_name)}
                </span>
            )}
          </div>
        </div>
        
        {/* Rank Badge */}
        <div className={`absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs z-20 border-2 border-slate-900 shadow-xl ${
            rank === 1 ? 'bg-brand-500 text-slate-900' : 
            rank === 2 ? 'bg-slate-300 text-slate-900' : 
            'bg-orange-600 text-white'
        }`}>
            {rank}
        </div>

        {rank === 1 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-brand-500 text-slate-900 rounded-full p-1.5 shadow-2xl z-20 ring-4 ring-slate-900">
            <Crown className="w-4 h-4 fill-current" />
          </div>
        )}
      </div>

      <div className="mt-5 text-center w-32">
        <p className="text-xs font-black truncate text-white mb-0.5">@{entry.agent_name.split(' ')[0]}</p>
        <p className={`text-base font-black tracking-tighter ${rank === 1 ? 'text-brand-400' : 'text-indigo-200'}`}>
          ${Math.round(entry.total_annualPremium).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export const TopClosers: React.FC<TopClosersProps> = ({ 
  leaderboardData, 
  loading, 
  selectedAgencyLabel,
  dateRangeLabel,
  onViewAll
}) => {
  const podium = useMemo(() => {
    return [
      leaderboardData[0] || null, // Rank 1
      leaderboardData[1] || null, // Rank 2
      leaderboardData[2] || null  // Rank 3
    ];
  }, [leaderboardData]);

  const challengers = useMemo(() => leaderboardData.slice(3, 10), [leaderboardData]);

  const dynamicTitle = useMemo(() => {
    const presets = ['Today', 'Yesterday', 'This Week', 'This Month', 'This Year', 'All Time'];
    const label = presets.includes(dateRangeLabel) ? dateRangeLabel : 'Top';
    return `${selectedAgencyLabel} ${label} Closers`;
  }, [selectedAgencyLabel, dateRangeLabel]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] shadow-2xl h-full flex flex-col overflow-hidden relative group border border-white/5">
       <style>{`
         @keyframes bounce-slow {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-5px); }
         }
         .animate-bounce-slow {
           animation: bounce-slow 3s ease-in-out infinite;
         }
         .custom-scrollbar-leaderboard::-webkit-scrollbar {
            width: 4px;
         }
         .custom-scrollbar-leaderboard::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
         }
       `}</style>

       {/* Animated Background Orbs */}
       <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>
       <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

       <div className="p-8 pb-4 flex flex-col shrink-0 relative z-10 text-white">
          <div className="mb-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 mb-4 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Live Production Arena</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-1 drop-shadow-lg">{dynamicTitle}</h2>
              <p className="text-[10px] font-bold text-indigo-300/40 uppercase tracking-widest mt-2">Based on approved submitted policies</p>
          </div>

          {loading ? (
              <div className="h-[400px] flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/40">Syncing Arena...</p>
              </div>
          ) : leaderboardData.length > 0 ? (
              <>
                  {/* PODIUM SECTION */}
                  <div className="flex items-end justify-center mb-12 h-[240px] relative px-4 shrink-0">
                      {/* Rank 3 (Left) */}
                      <PodiumCircle 
                        entry={podium[2]} 
                        rank={3} 
                        size="w-24 h-24" 
                        color="bg-gradient-to-tr from-orange-600 to-orange-400" 
                        glow="shadow-[0_0_30px_rgba(234,88,12,0.2)]"
                        className="z-10 translate-x-4 scale-95"
                      />

                      {/* Rank 1 (Center) */}
                      <PodiumCircle 
                        entry={podium[0]} 
                        rank={1} 
                        size="w-32 h-32" 
                        color="bg-gradient-to-tr from-brand-400 via-yellow-200 to-brand-600" 
                        glow="shadow-[0_0_50px_rgba(245,158,11,0.4)]"
                        className="z-30 scale-110 -mb-2"
                      />

                      {/* Rank 2 (Right) */}
                      <PodiumCircle 
                        entry={podium[1]} 
                        rank={2} 
                        size="w-28 h-28" 
                        color="bg-gradient-to-tr from-slate-300 to-slate-100" 
                        glow="shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                        className="z-20 -translate-x-4"
                      />
                  </div>
              </>
          ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-indigo-300/20">
                  <Trophy className="w-20 h-20 mb-4 opacity-10" />
                  <p className="text-xs font-black uppercase tracking-widest italic text-center">Awaiting performance data<br/>for this period...</p>
              </div>
          )}
       </div>

       {/* CHALLENGERS LIST - Scrollable Area */}
       <div className="flex-1 overflow-y-auto px-8 pb-4 custom-scrollbar-leaderboard">
          {!loading && challengers.length > 0 && (
              <div className="space-y-3">
                  <div className="sticky top-0 bg-transparent backdrop-blur-md pt-2 pb-4 z-10 border-b border-white/5 flex justify-between items-center">
                    <p className="text-[10px] font-black text-indigo-300/30 uppercase tracking-[0.3em]">Challengers Arena</p>
                    <span className="text-[9px] font-bold text-indigo-300/20 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">Ranks 4 - {3 + challengers.length}</span>
                  </div>
                  {challengers.map((agent, idx) => (
                      <div key={agent.agent_id} className="flex items-center justify-between p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item hover:scale-[1.02] cursor-default">
                          <div className="flex items-center gap-5 min-w-0">
                              {/* List Rank Indicator */}
                              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-black text-slate-400">#{idx + 4}</span>
                              </div>
                              
                              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 shrink-0 group-hover/item:border-brand-500/50 transition-all flex items-center justify-center bg-slate-900 shadow-xl">
                                  {agent.agent_profile?.url ? (
                                      <img 
                                        src={agent.agent_profile.url} 
                                        className="w-full h-full object-cover" 
                                        alt="avatar" 
                                      />
                                  ) : (
                                      <span className="text-white font-black text-xs">
                                          {getInitials(agent.agent_name)}
                                      </span>
                                  )}
                              </div>
                              <div className="min-w-0">
                                  <p className="text-sm font-black text-white truncate leading-tight group-hover/item:text-brand-400 transition-colors">
                                    {agent.agent_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] font-bold text-indigo-300/40 uppercase tracking-tighter truncate">
                                        {getAgencyName(agent)}
                                    </p>
                                    <div className="w-1 h-1 rounded-full bg-white/10"></div>
                                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-400/60">
                                        <TrendingUp size={10} /> Live
                                    </div>
                                  </div>
                              </div>
                          </div>
                          <div className="text-right ml-4 shrink-0">
                              <p className="text-sm font-black text-white tracking-tighter group-hover/item:text-brand-400 transition-colors">
                                ${Math.round(agent.total_annualPremium).toLocaleString()}
                              </p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Premium</p>
                          </div>
                      </div>
                  ))}
              </div>
          )}
       </div>

       {/* FOOTER BUTTON */}
       <div className="p-8 pt-4 shrink-0 relative z-10">
          <button 
              onClick={onViewAll} 
              className="w-full py-5 rounded-[1.75rem] border border-white/5 bg-white/5 text-[11px] font-black text-indigo-300/40 hover:text-white hover:bg-brand-500 hover:border-brand-500 hover:text-slate-900 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group/btn shadow-xl"
          >
              Arena Statistics Center <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1.5" />
          </button>
       </div>
    </div>
  );
};
