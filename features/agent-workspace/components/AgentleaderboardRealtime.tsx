import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Zap, 
  Trophy, 
  Crown, 
  Star, 
  Loader2, 
  Building2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Activity,
  BarChart3,
  History,
  RefreshCw,
  X,
  Target,
  User,
  PieChart,
  ArrowRight,
  LayoutDashboard,
  Moon,
  Sun
} from 'lucide-react';
import { agentleaderboardRealtimeApi, ArenaEntry, SaleRecord } from '../services/agentleaderboardRealtimeApi';
import { useRealtime } from '../../../context/RealtimeContext';

const formatShort = (val: number) => {
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)}K`;
  }
  return val.toLocaleString();
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val || 0);
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const LeaderboardItem: React.FC<{
  entry: ArenaEntry;
  index: number;
  maxPremium: number;
  isNightMode: boolean;
  onSelectAgent: (agentId: string) => void;
}> = ({ entry, index, maxPremium, isNightMode, onSelectAgent }) => {
  const avgPrem = entry.total_annualPremium / (entry.records || 1);
  const progressWidth = maxPremium > 0 ? (entry.total_annualPremium / maxPremium) * 100 : 0;
  
  return (
    <div 
      onClick={() => onSelectAgent(entry.agent_id)}
      className={`flex items-center gap-3 p-4 transition-all group relative cursor-pointer active:scale-[0.98] min-w-0 ${
        isNightMode ? 'hover:bg-white/[0.04] border-b border-white/[0.03]' : 'hover:bg-slate-50 border-b border-slate-50'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all shrink-0 ${
        index === 0 ? (isNightMode ? 'bg-brand-500 text-slate-900 border-brand-400 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-900 text-brand-500 border-navy-900 scale-105 shadow-md') : 
        index === 1 ? 'bg-slate-400 text-white border-slate-500' :
        index === 2 ? 'bg-orange-500 text-white border-orange-600' :
        isNightMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-white text-slate-400 border-slate-100'
      }`}>
        {index === 0 ? <Crown className="w-3.5 h-3.5" /> : index + 1}
      </div>

      <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform border ${
        isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}>
          {entry.agent_profile?.url ? (
            <img src={entry.agent_profile.url} className="w-full h-full object-cover" alt={entry.agent_name} />
          ) : (
            <span className={`text-[10px] font-black ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{getInitials(entry.agent_name)}</span>
          )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between items-baseline mb-1 gap-2">
          <p className={`text-sm font-black truncate ${isNightMode ? 'text-slate-100' : 'text-slate-900'}`}>{entry.agent_name}</p>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-sm font-black tracking-tighter ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
              ${formatShort(entry.total_annualPremium)}
            </span>
            <span className={`text-[9px] font-medium ml-0.5 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              ({formatShort(avgPrem)})
            </span>
          </div>
        </div>

        <div className={`w-full h-1 rounded-full overflow-hidden mb-1 ${isNightMode ? 'bg-white/5' : 'bg-slate-100'}`}>
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full ${
              index === 0 ? 'bg-brand-500' : (isNightMode ? 'bg-slate-500' : 'bg-slate-900')
            }`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="flex items-center opacity-40 min-w-0">
           <p className={`text-[7px] font-medium uppercase tracking-[0.2em] truncate ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {entry.agency || 'Organization'}
           </p>
        </div>
      </div>
    </div>
  );
};

const LeaderboardList: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  data: ArenaEntry[]; 
  loading: boolean;
  accentColor: string;
  isNightMode: boolean;
  isMultiColumn?: boolean;
  onSelectAgent: (agentId: string) => void;
}> = ({ title, icon, data, loading, accentColor, isNightMode, isMultiColumn, onSelectAgent }) => {
  const maxPremium = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => d.total_annualPremium));
  }, [data]);

  const halves = useMemo(() => {
    if (!isMultiColumn) return { left: data, right: [] };
    const mid = Math.ceil(data.length / 2);
    return {
      left: data.slice(0, mid),
      right: data.slice(mid)
    };
  }, [data, isMultiColumn]);

  return (
    <div className={`rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col h-full transition-all border ${
      isNightMode ? 'bg-slate-900/60 border-white/5 backdrop-blur-3xl' : 'bg-white border-slate-100'
    }`}>
      <div className={`p-6 flex items-center justify-between shrink-0 border-b ${
        isNightMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/30 border-slate-50'
      }`}>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${accentColor}`}>
              {icon}
            </div>
            <h3 className={`text-base font-black tracking-tight ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-300'}`}>Live Updates</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {loading ? (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Tallying production...</p>
           </div>
        ) : data.length > 0 ? (
          isMultiColumn ? (
            <div className="flex flex-col md:flex-row h-full min-w-0">
              <div className={`flex-1 min-w-0 md:w-1/2 md:border-r ${isNightMode ? 'border-white/5' : 'border-slate-50'}`}>
                {halves.left.map((entry, i) => (
                  <LeaderboardItem 
                    key={entry.agent_id} 
                    entry={entry} 
                    index={i} 
                    maxPremium={maxPremium} 
                    isNightMode={isNightMode}
                    onSelectAgent={onSelectAgent} 
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0 md:w-1/2">
                {halves.right.map((entry, i) => (
                  <LeaderboardItem 
                    key={entry.agent_id} 
                    entry={entry} 
                    index={i + halves.left.length} 
                    maxPremium={maxPremium} 
                    isNightMode={isNightMode}
                    onSelectAgent={onSelectAgent} 
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="">
              {data.map((entry, i) => (
                <LeaderboardItem 
                  key={entry.agent_id} 
                  entry={entry} 
                  index={i} 
                  maxPremium={maxPremium} 
                  isNightMode={isNightMode}
                  onSelectAgent={onSelectAgent} 
                />
              ))}
            </div>
          )
        ) : (
          <div className="p-20 text-center text-slate-300">
            <Clock className="w-10 h-10 mx-auto mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting production...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AgentSummaryPopup: React.FC<{
  stats: {
    agent_id: string;
    agent_name: string;
    agent_profile_url?: string | null;
    agency: string;
    today: { premium: number; apps: number };
    mtd: { premium: number; apps: number };
    recentSales: SaleRecord[];
  };
  isNightMode: boolean;
  onClose: () => void;
}> = ({ stats, isNightMode, onClose }) => {
  const MT_SHIFT = 2 * 60 * 60 * 1000;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div className={`relative w-full max-w-xl rounded-[3rem] shadow-2xl border animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh] ${
        isNightMode ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-white/20'
      }`}>
        <div className="p-10 pb-6 bg-slate-950 relative overflow-hidden text-center shrink-0">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-[2.25rem] bg-white border-4 border-slate-800 shadow-2xl mb-5 overflow-hidden flex items-center justify-center ring-4 ring-brand-500/20">
                    {stats.agent_profile_url ? (
                      <img src={stats.agent_profile_url} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <span className="text-4xl font-black text-slate-900">{getInitials(stats.agent_name)}</span>
                    )}
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1.5">{stats.agent_name}</h3>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{stats.agency}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Zap className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Today's Production</h4>
                    </div>
                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl border flex justify-between items-center group transition-all ${
                        isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'
                      }`}>
                          <p className={`text-[8px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Premium</p>
                          <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(stats.today.premium)}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border flex justify-between items-center group transition-all ${
                        isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'
                      }`}>
                          <p className={`text-[8px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Apps</p>
                          <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{stats.today.apps}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Month To Date</h4>
                    </div>
                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl border flex justify-between items-center group transition-all ${
                        isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'
                      }`}>
                          <p className={`text-[8px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Volume</p>
                          <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(stats.mtd.premium)}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border flex justify-between items-center group transition-all ${
                        isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'
                      }`}>
                          <p className={`text-[8px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Apps</p>
                          <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{stats.mtd.apps}</p>
                      </div>
                    </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Recent Activity</h4>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}>{stats.recentSales.length} Entries</span>
                  </div>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide pr-1">
                    {stats.recentSales.length > 0 ? (
                        stats.recentSales.map((sale) => (
                            <div key={sale.id} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group ${
                              isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-100 hover:shadow-md'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-950 text-brand-500 flex items-center justify-center shrink-0 shadow-sm border border-white/5">
                                        <Zap className="w-4 h-4 fill-brand-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[11px] font-black uppercase tracking-tighter truncate leading-none mb-1 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{sale.policyCarrier}</p>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <p className={`text-[8px] font-bold uppercase ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{sale.teamName}</p>
                                            <span className={`w-0.5 h-0.5 rounded-full ${isNightMode ? 'bg-slate-700' : 'bg-slate-300'}`}></span>
                                            <p className={`text-[8px] font-bold uppercase ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(sale.created_at - MT_SHIFT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' })}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right ml-4 shrink-0">
                                    <p className="text-[12px] font-black text-emerald-500 tracking-tighter">{formatCurrency(sale.annual_premium)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={`py-10 text-center border-2 border-dashed rounded-2xl ${
                          isNightMode ? 'text-slate-700 border-white/5' : 'text-slate-300 border-slate-50'
                        }`}>
                            <History className="w-6 h-6 mx-auto mb-2 opacity-10" />
                            <p className="text-[9px] font-black uppercase tracking-widest">No Recent Sales</p>
                        </div>
                    )}
                  </div>
              </div>
            </div>
        </div>

        <div className={`p-8 pt-4 border-t flex gap-4 shrink-0 ${
          isNightMode ? 'border-white/5 bg-slate-950' : 'border-slate-50 bg-slate-50/30'
        }`}>
            <button 
                onClick={onClose}
                className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  isNightMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
            >
                Dismiss
            </button>
            <button 
                disabled
                className={`flex-[2] py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-3 border ${
                  isNightMode ? 'bg-white/5 text-slate-600 border-white/5' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
            >
                Detailed Profile <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${isNightMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'}`}>COMING SOON</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export const AgentleaderboardRealtime: React.FC = () => {
  const navigate = useNavigate();
  const { latestSale } = useRealtime();
  
  const [isNightMode, setIsNightMode] = useState(() => {
    return localStorage.getItem('arena_theme') === 'night';
  });

  // EFFECT: SET GLOBAL BACKGROUND FOR DIV#ROOT, BODY, MAIN AND HEADER
  useEffect(() => {
    const root = document.getElementById('root');
    const body = document.body;
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const appWrapper = document.querySelector('.bg-\\[\\#F2F3F5\\]'); // Targeting the outer app div
    
    if (isNightMode) {
      body.style.backgroundColor = '#000000';
      if (root) root.style.backgroundColor = '#000000';
      if (main) main.style.backgroundColor = '#000000';
      if (appWrapper instanceof HTMLElement) appWrapper.style.backgroundColor = '#000000';
      if (header) {
          header.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          header.style.transition = 'all 0.5s ease';
          header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
          const h2 = header.querySelector('h2');
          if (h2) h2.style.color = '#ffffff';
      }
    } else {
      body.style.backgroundColor = '';
      if (root) root.style.backgroundColor = '';
      if (main) main.style.backgroundColor = '';
      if (appWrapper instanceof HTMLElement) appWrapper.style.backgroundColor = '';
      if (header) {
          header.style.backgroundColor = '';
          header.style.borderBottom = '';
          const h2 = header.querySelector('h2');
          if (h2) h2.style.color = '';
      }
    }
    
    return () => {
      body.style.backgroundColor = '';
      if (root) root.style.backgroundColor = '';
      if (main) main.style.backgroundColor = '';
      if (appWrapper instanceof HTMLElement) appWrapper.style.backgroundColor = '';
      if (header) {
          header.style.backgroundColor = '';
          header.style.borderBottom = '';
          const h2 = header.querySelector('h2');
          if (h2) h2.style.color = '';
      }
    };
  }, [isNightMode]);

  const [todayData, setTodayData] = useState<ArenaEntry[]>([]);
  const [mtdData, setMtdData] = useState<ArenaEntry[]>([]);
  const [todaySummary, setTodaySummary] = useState({ total_premium: 0, total_records: 0 });
  const [mtdSummary, setMtdSummary] = useState({ total_premium: 0, total_records: 0 });
  const [weekSummary, setWeekSummary] = useState({ total_premium: 0, total_records: 0 });
  const [yearSummary, setYearSummary] = useState({ total_premium: 0, total_records: 0 });
  const [arenaFeed, setArenaFeed] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Initializing');
  const [mtCountdown, setMtCountdown] = useState('00:00:00');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const resolvedSummary = useMemo(() => {
    if (!selectedAgentId) return null;
    const todayMatch = todayData.find(e => e.agent_id === selectedAgentId);
    const mtdMatch = mtdData.find(e => e.agent_id === selectedAgentId);
    const feedMatches = arenaFeed.filter(e => e.agentId === selectedAgentId);
    const feedMatch = feedMatches[0];

    return {
        agent_id: selectedAgentId,
        agent_name: todayMatch?.agent_name || mtdMatch?.agent_name || feedMatch?.agentOwner_name || 'Agent',
        agent_profile_url: todayMatch?.agent_profile?.url || mtdMatch?.agent_profile?.url || null,
        agency: todayMatch?.agency || mtdMatch?.agency || feedMatch?.teamName || 'Organization',
        today: { premium: todayMatch?.total_annualPremium || 0, apps: todayMatch?.records || 0 },
        mtd: { premium: mtdMatch?.total_annualPremium || 0, apps: mtdMatch?.records || 0 },
        recentSales: feedMatches
    };
  }, [selectedAgentId, todayData, mtdData, arenaFeed]);

  const toggleTheme = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    localStorage.setItem('arena_theme', next ? 'night' : 'light');
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const mtString = now.toLocaleString("en-US", { timeZone: "America/Denver" });
      const mtNow = new Date(mtString);
      const mtMidnight = new Date(mtString);
      mtMidnight.setHours(24, 0, 0, 0);
      const diff = mtMidnight.getTime() - mtNow.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setMtCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshArena = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setRefreshing(true);
    try {
      const [todayRes, mtdRes, weekYearRes, feedRes] = await Promise.all([
        agentleaderboardRealtimeApi.getRealtimeLeaderboard(),
        agentleaderboardRealtimeApi.getMTDLeaderboard(),
        agentleaderboardRealtimeApi.getWeekYearStats(),
        agentleaderboardRealtimeApi.getArenaFeed()
      ]);

      setTodayData(todayRes.today_rundown || []);
      setTodaySummary(todayRes.applications || { total_premium: 0, total_records: 0 });
      setMtdData(mtdRes.mtd_rundown || []);
      setMtdSummary(mtdRes.applications || { total_premium: 0, total_records: 0 });
      setWeekSummary(weekYearRes.week_application || { total_premium: 0, total_records: 0 });
      setYearSummary(weekYearRes.year_application || { total_premium: 0, total_records: 0 });
      setArenaFeed(feedRes || []);
      setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error("Realtime Refresh Error:", error);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { refreshArena(true); }, [refreshArena]);
  useEffect(() => { if (latestSale) refreshArena(); }, [latestSale, refreshArena]);

  const featuredVictory = arenaFeed[0] || null;
  const previousVictories = arenaFeed.slice(1);
  const MT_SHIFT = 2 * 60 * 60 * 1000;

  return (
    <div className={`relative min-h-screen transition-colors duration-500 pb-12 ${isNightMode ? 'bg-black text-white' : 'text-slate-900'}`}>
      <div className="space-y-8 animate-in fade-in duration-700 relative z-10 max-w-[1800px] mx-auto">
        {selectedAgentId && resolvedSummary && (
          <AgentSummaryPopup stats={resolvedSummary} isNightMode={isNightMode} onClose={() => setSelectedAgentId(null)} />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="flex items-center gap-6">
            <div>
              <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
                Realtime Leaderboard <Zap className="w-8 h-8 text-brand-500 fill-brand-500 animate-pulse" />
              </h1>
              <p className={`font-bold uppercase text-[9px] tracking-[0.25em] mt-1 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Global Competition Matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className={`p-3 rounded-2xl transition-all border shadow-sm flex items-center justify-center group ${
                isNightMode ? 'bg-slate-900 border-white/10 text-brand-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-400 hover:text-navy-900'
              }`}
            >
              {isNightMode ? <Sun className="w-4 h-4 animate-in spin-in-90" /> : <Moon className="w-4 h-4 animate-in spin-in-90" />}
            </button>

            <div className={`hidden lg:flex items-center gap-3 px-5 py-3 border rounded-2xl shadow-sm transition-colors ${isNightMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
               <RefreshCw className={`w-3 h-3 text-emerald-500 ${refreshing ? 'animate-spin' : ''}`} />
               <div className="flex flex-col">
                  <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isNightMode ? 'text-slate-600' : 'text-slate-400'}`}>Synced</span>
                  <span className={`text-xs font-black tabular-nums leading-none mt-1 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{lastSync}</span>
               </div>
            </div>

            <div className={`hidden lg:flex items-center gap-2.5 border px-5 py-3 rounded-2xl shadow-sm transition-colors ${isNightMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
               <Clock className="w-3.5 h-3.5 text-brand-500" />
               <div className="flex flex-col">
                  <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isNightMode ? 'text-slate-600' : 'text-slate-400'}`}>Cycle Ends</span>
                  <span className={`text-xs font-black font-mono tabular-nums leading-none mt-1 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{mtCountdown}</span>
               </div>
            </div>

            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-xl border ${isNightMode ? 'bg-slate-900 border-brand-500/20 shadow-brand-500/5' : 'bg-slate-900 text-white border-white/5'}`}>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
               <span className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-emerald-400' : 'text-white'}`}>Stream Active</span>
            </div>

            <button 
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-6 py-3 border rounded-2xl font-black text-xs transition-all shadow-sm ${
                isNightMode ? 'bg-slate-900 border-white/10 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest">Dashboard</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-stretch h-[800px]">
          <div className="xl:col-span-1 flex flex-col h-full overflow-hidden">
            <LeaderboardList title="Today's Standings" icon={<Zap className="w-4 h-4 fill-brand-500" />} data={todayData} loading={loading} isNightMode={isNightMode} accentColor="bg-brand-50 text-brand-600" onSelectAgent={setSelectedAgentId} />
          </div>

          <div className="xl:col-span-2 flex flex-col h-full overflow-hidden">
            <LeaderboardList title="Month to Date" icon={<Trophy className="w-4 h-4" />} data={mtdData} loading={loading} isNightMode={isNightMode} accentColor="bg-indigo-50 text-indigo-600" isMultiColumn={true} onSelectAgent={setSelectedAgentId} />
          </div>

          <div className="xl:col-span-1 flex flex-col h-full gap-6">
            <div className={`rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl h-[400px] flex flex-col transition-all duration-500 border ${isNightMode ? 'bg-slate-900 border-white/10 shadow-black/50' : 'bg-slate-900 border-transparent text-white'}`}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-xl border border-white/10 text-brand-400"><Activity className="w-4 h-4" /></div>
                      <h3 className="text-base font-black tracking-tight text-white">Arena Pulse</h3>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 space-y-6">
                     {[
                        { label: 'Daily Pulse', amount: todaySummary.total_premium, count: todaySummary.total_records, color: 'brand', icon: Zap },
                        { label: 'Weekly Growth', amount: weekSummary.total_premium, count: weekSummary.total_records, color: 'emerald', icon: BarChart3 },
                        { label: 'MTD Enterprise', amount: mtdSummary.total_premium, count: mtdSummary.total_records, color: 'indigo', icon: TrendingUp },
                        { label: 'Annual Momentum', amount: yearSummary.total_premium, count: yearSummary.total_records, color: 'violet', icon: Crown }
                     ].map((item, idx) => (
                        <div key={idx} className="animate-in fade-in slide-in-from-top-2" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex items-center gap-2 mb-2">
                               <div className={`w-1 h-3 rounded-full bg-${item.color}-500`}></div>
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                            </div>
                            <div className={`bg-${item.color}-500/10 p-4 rounded-2xl border border-${item.color}-500/20`}>
                                <div className="text-xl font-black text-white tracking-tighter">{formatCurrency(item.amount)}</div>
                                <div className="mt-1 flex items-center justify-between opacity-50">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Records</span>
                                    <span className="text-[10px] font-black text-white">{item.count.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
            
            <div className={`rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative flex-1 flex flex-col min-h-0 border transition-all ${
              isNightMode ? 'bg-slate-900/60 border-white/5 backdrop-blur-2xl' : 'bg-white border-slate-100'
            }`}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="flex items-center justify-between mb-6 relative z-10 shrink-0">
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-950 rounded-lg text-brand-500 border border-white/5 shadow-lg"><Star className="w-3.5 h-3.5 fill-brand-500" /></div>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-slate-900'}`}>Victory Feed</h3>
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live</span>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 relative z-10 space-y-6">
                  {featuredVictory ? (
                     <>
                        <div className="animate-in slide-in-from-bottom-2 duration-500">
                          <div className={`flex items-center gap-4 p-4 bg-slate-950 rounded-3xl border border-white/5 shadow-2xl group hover:scale-[1.02] transition-transform cursor-pointer ${isNightMode ? 'ring-1 ring-emerald-500/10' : ''}`} onClick={() => setSelectedAgentId(featuredVictory.agentId)}>
                              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-500 shadow-lg shrink-0 overflow-hidden relative">
                                  <Zap className="w-6 h-6 fill-brand-500 relative z-10" />
                                  <div className="absolute inset-0 bg-brand-500/20 animate-pulse"></div>
                              </div>
                              <div className="min-w-0">
                                  <p className="text-[12px] font-black text-white truncate">{featuredVictory.agentOwner_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                      <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{featuredVictory.policyCarrier}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{featuredVictory.teamName}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="text-center mt-6">
                              <p className="text-4xl font-black text-emerald-500 tracking-tighter drop-shadow-[0_2px_15px_rgba(16,185,129,0.3)]">{formatCurrency(featuredVictory.annual_premium)}</p>
                              <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-2 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {new Date(featuredVictory.created_at - MT_SHIFT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' })} MT
                              </p>
                          </div>
                        </div>

                        {previousVictories.length > 0 && (
                            <div className={`pt-6 border-t space-y-3 ${isNightMode ? 'border-white/5' : 'border-slate-50'}`}>
                               <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}><History className="w-3 h-3" /> Recent (MT)</p>
                               {previousVictories.map((sale) => (
                                  <div key={sale.id} onClick={() => setSelectedAgentId(sale.agentId)} className={`flex items-center justify-between p-3 rounded-2xl border transition-all group cursor-pointer active:scale-[0.98] ${
                                    isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50/30 border-slate-50 hover:bg-white hover:shadow-md'
                                  }`}>
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                                            isNightMode ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                          } group-hover:bg-slate-900 group-hover:text-brand-500`}>{getInitials(sale.agentOwner_name)}</div>
                                          <div className="min-w-0">
                                              <p className={`text-[10px] font-black truncate leading-none mb-1 ${isNightMode ? 'text-slate-100' : 'text-slate-900'}`}>{sale.agentOwner_name}</p>
                                              <p className={`text-[8px] font-bold uppercase tracking-tight truncate ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{sale.policyCarrier}</p>
                                          </div>
                                      </div>
                                      <div className="text-right ml-4 shrink-0">
                                          <p className="text-[11px] font-black text-emerald-500 tracking-tighter">${sale.annual_premium.toLocaleString()}</p>
                                          <p className={`text-[7px] font-bold uppercase ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}>{new Date(sale.created_at - MT_SHIFT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                      </div>
                                  </div>
                               ))}
                            </div>
                        )}
                     </>
                  ) : (
                     <div className="text-center py-20 text-slate-300 flex flex-col items-center">
                        <Clock className="w-8 h-8 mb-4 opacity-10" />
                        <p className="text-[9px] font-black uppercase tracking-widest px-4 leading-relaxed">Waiting for data...</p>
                     </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};