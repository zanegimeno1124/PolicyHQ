import React, { useEffect, useState, useRef } from 'react';
import { 
  Users, 
  UserX, 
  Search, 
  Filter, 
  ChevronRight, 
  Loader2, 
  Award, 
  TrendingUp,
  FileText,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Lock
} from 'lucide-react';
import { useAgentContext } from '../context/AgentContext';
import { agentDownlineApi } from '../services/agentDownlineApi';
import { agentPoliciesApi } from '../services/agentPoliciesApi';
import { Policy } from '../../../shared/types/index';

interface HierarchyItem {
  agent_id: string;
  first_name: string;
  last_name: string;
  directDownline_count: number;
}

interface HierarchyResponse {
  id: string;
  first_name: string;
  last_name: string;
  direct_downlines: {
    itemsTotal: number;
    items: HierarchyItem[];
  }
}

interface DateRange {
    start: number;
    end: number;
    label: string;
}

// --- HELPERS & UTILITIES ---

const getDateRange = (type: 'today' | 'weekly' | 'monthly' | 'yearly'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'today') return { start: start.getTime(), end: end.getTime(), label: 'Today' };
    
    if (type === 'weekly') {
        const day = start.getDay(); // 0 is Sunday
        const diff = start.getDate() - day; // Start of week (Sunday)
        start.setDate(diff);
        end.setDate(diff + 6);
        end.setHours(23,59,59,999);
        return { start: start.getTime(), end: end.getTime(), label: 'Weekly' };
    }

    if (type === 'monthly') {
        start.setDate(1);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endMonth.setHours(23,59,59,999);
        return { start: start.getTime(), end: endMonth.getTime(), label: 'Monthly' };
    }

    if (type === 'yearly') {
        start.setMonth(0, 1);
        const endYear = new Date(now.getFullYear(), 11, 31);
        endYear.setHours(23,59,59,999);
        return { start: start.getTime(), end: endYear.getTime(), label: 'Yearly' };
    }
    
    return { start: start.getTime(), end: end.getTime(), label: 'Custom' };
};

const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getStatusStyles = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approve')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('lapsed pending')) return 'bg-amber-100 text-amber-700';
    if (s.includes('underwrit')) return 'bg-blue-100 text-blue-700';
    if (s.includes('cancel') || s.includes('decline') || s.includes('follow')) return 'bg-red-100 text-red-700';
    if (s.includes('lapsed')) return 'bg-orange-100 text-orange-700';
    if (s.includes('taken')) return 'bg-slate-100 text-slate-600';
    return 'bg-slate-100 text-slate-600';
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- COMPONENTS ---

const DateRangeSelector: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'presets' | 'calendar'>('presets');
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date()); 
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setView('presets');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (type: 'today' | 'weekly' | 'monthly' | 'yearly') => {
        onChange(getDateRange(type));
        setIsOpen(false);
    };

    const handleCustomClick = () => {
        setView('calendar');
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const handleDateClick = (date: Date) => {
        if (!selectionStart || (selectionStart && selectionEnd)) {
            setSelectionStart(date);
            setSelectionEnd(null);
        } else {
            if (date < selectionStart) {
                setSelectionEnd(selectionStart);
                setSelectionStart(date);
                const s = date;
                const e = selectionStart;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: 'Custom Range' });
                setIsOpen(false);
            } else {
                setSelectionEnd(date);
                const s = selectionStart;
                const e = date;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: 'Custom Range' });
                setIsOpen(false);
            }
        }
    };

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

    const generateCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const isSelected = (date: Date) => {
        if (!date) return false;
        if (selectionStart && date.getTime() === selectionStart.getTime()) return true;
        if (selectionEnd && date.getTime() === selectionEnd.getTime()) return true;
        return false;
    };

    const isInRange = (date: Date) => {
        if (!date || !selectionStart || !selectionEnd) return false;
        return date > selectionStart && date < selectionEnd;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
            >
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>{value.label}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[320px] z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {view === 'presets' ? (
                        <div className="flex flex-col gap-1 p-2">
                            {['Today', 'Weekly', 'Monthly', 'Yearly'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => handlePresetClick(item.toLowerCase() as any)}
                                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label === item ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    {item}
                                    {value.label === item && <CheckCircle className="w-4 h-4 text-brand-400" />}
                                </button>
                            ))}
                            <div className="h-px bg-slate-100 my-2"></div>
                            <button onClick={handleCustomClick} className="w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all border border-slate-200 hover:border-slate-300">Custom Range</button>
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl mb-4 shadow-lg shadow-slate-900/20">
                                <span className="font-bold text-sm">Custom Range</span>
                                <Calendar className="w-4 h-4 text-brand-400" />
                            </div>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-7 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}</div>
                            <div className="grid grid-cols-7 gap-1 mb-4">
                                {generateCalendar().map((date, i) => (
                                    <div key={i} className="aspect-square">
                                        {date ? (
                                            <button onClick={() => handleDateClick(date)} className={`w-full h-full flex items-center justify-center rounded-full text-xs font-bold transition-all ${isSelected(date) ? 'bg-brand-500 text-white shadow-md shadow-brand-200 ring-2 ring-white' : isInRange(date) ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50'}`}>{date.getDate()}</button>
                                        ) : <div />}
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 border-t border-slate-100 text-center">
                                <button onClick={() => setView('presets')} className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors">Back to Presets</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Recursive Component for Tree
const AgentHierarchyNode: React.FC<{ 
  agent: HierarchyItem, 
  onSelect: (agent: HierarchyItem) => void,
  selectedId: string,
  depth?: number 
}> = ({ agent, onSelect, selectedId, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<HierarchyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasChildren = agent.directDownline_count > 0;
  const isSelected = agent.agent_id === selectedId;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
    if (children.length === 0 && hasChildren) {
      setIsLoading(true);
      try {
        const data = await agentDownlineApi.getHierarchy(agent.agent_id);
        if (data && data.direct_downlines) {
          setChildren(data.direct_downlines.items);
        }
      } catch (error) {
        console.error("Failed to fetch sub-hierarchy", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={() => onSelect(agent)}
        className={`
          flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group relative my-1
          ${isSelected 
            ? 'bg-slate-900 shadow-lg shadow-slate-900/10' 
            : 'hover:bg-slate-50'
          }
        `}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {depth > 0 && (
           <div className="absolute left-0 top-0 bottom-0 border-l-2 border-slate-100 ml-[-8px]" style={{ height: '100%' }}></div>
        )}

        <div 
          onClick={handleToggle}
          className={`
            w-6 h-6 flex items-center justify-center rounded-lg transition-colors 
            ${hasChildren ? 'hover:bg-white/20 cursor-pointer' : 'opacity-20 pointer-events-none'}
            ${isSelected ? 'text-white' : 'text-slate-400'}
          `}
        >
          {isLoading ? (
            <Loader2 className={`w-3.5 h-3.5 animate-spin ${isSelected ? 'text-brand-400' : 'text-brand-500'}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </div>

        <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0 transition-colors
            ${isSelected ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white' : 'bg-white border border-slate-100 text-slate-500'}
        `}>
            {agent.first_name[0]}{agent.last_name[0]}
        </div>

        <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                {agent.first_name} {agent.last_name}
            </p>
            {agent.directDownline_count > 0 && (
              <p className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                  {agent.directDownline_count} Agents
              </p>
            )}
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200 overflow-hidden">
          {children.length > 0 ? (
            children.map(child => (
              <AgentHierarchyNode 
                key={child.agent_id} 
                agent={child} 
                onSelect={onSelect}
                selectedId={selectedId}
                depth={depth + 1}
              />
            ))
          ) : (
             !isLoading && hasChildren && (
               <div className="py-2 pl-12 text-[10px] text-slate-400 italic" style={{ marginLeft: `${depth * 16}px` }}>No active agents found</div>
             )
          )}
        </div>
      )}
    </div>
  );
};

export const AgentDownlines: React.FC = () => {
  const { currentAgentId, hasAgentProfile } = useAgentContext();
  
  // Sidebar State (Root Tree)
  const [rootHierarchy, setRootHierarchy] = useState<HierarchyResponse | null>(null);
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Main View State
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId);
  const [selectedHierarchyData, setSelectedHierarchyData] = useState<HierarchyResponse | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  
  // Tabs & Views
  const [viewMode, setViewMode] = useState<'team' | 'policies'>('team');

  // Policy Table State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('monthly'));
  
  // Table Filtering
  const [tableSearch, setTableSearch] = useState('');

  // 1. Initial Load (Root & Selection)
  useEffect(() => {
    if (currentAgentId) {
      setLoadingRoot(true);
      agentDownlineApi.getHierarchy(currentAgentId)
        .then(data => {
            setRootHierarchy(data);
            setSelectedAgentId(data.id); // Default to root
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingRoot(false));
    }
  }, [currentAgentId]);

  // 2. Fetch Selected Agent Hierarchy Data
  useEffect(() => {
    if (selectedAgentId) {
        setLoadingSelected(true);
        agentDownlineApi.getHierarchy(selectedAgentId)
            .then(data => setSelectedHierarchyData(data))
            .catch(err => console.error(err))
            .finally(() => setLoadingSelected(false));
    }
  }, [selectedAgentId]);

  // 3. Fetch Policies when viewMode is policies or dates change
  useEffect(() => {
    if (selectedAgentId && viewMode === 'policies') {
        setLoadingPolicies(true);
        agentPoliciesApi.getPolicies(selectedAgentId, dateRange.start, dateRange.end)
            .then(setPolicies)
            .catch(err => console.error(err))
            .finally(() => setLoadingPolicies(false));
    }
  }, [selectedAgentId, dateRange, viewMode]);

  const handleAgentSelect = (agent: HierarchyItem) => {
      setSelectedAgentId(agent.agent_id);
      setTableSearch(''); 
  };

  const handleRootSelect = () => {
      if (rootHierarchy) {
          setSelectedAgentId(rootHierarchy.id);
          setTableSearch('');
      }
  };

  if (!hasAgentProfile) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
           <UserX className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Agent Profile Connected</h2>
        <p className="text-slate-500 max-w-md text-center">
           You don't have an Agent Profile connected. Please switch to an agent workspace to view downlines.
        </p>
      </div>
    );
  }

  // Filter Sidebar Root Agents
  const filteredRootAgents = rootHierarchy?.direct_downlines?.items.filter(agent => {
      const search = sidebarSearch.toLowerCase();
      return agent.first_name.toLowerCase().includes(search) || agent.last_name.toLowerCase().includes(search);
  }) || [];

  // Filter Table Agents (from selectedHierarchyData)
  const tableAgents = selectedHierarchyData?.direct_downlines?.items.filter(a => 
    a.first_name.toLowerCase().includes(tableSearch.toLowerCase()) || 
    a.last_name.toLowerCase().includes(tableSearch.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start font-sans">
       
       {/* LEFT: Organization Sidebar (Wider: 1/3) */}
       <div className="w-full xl:w-96 flex-shrink-0 xl:sticky xl:top-24 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.02)] border border-slate-100 min-h-[600px] flex flex-col">
             <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">Team Structure</h3>
                {rootHierarchy && (
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                        {rootHierarchy.direct_downlines.itemsTotal} Agents
                    </span>
                )}
             </div>

             <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search tree..." 
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-400 text-slate-800"
                  />
              </div>

              {loadingRoot ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-hide">
                    {/* Active Item (Unit Leader / Current View) */}
                    {rootHierarchy && (
                         <div 
                           onClick={handleRootSelect}
                           className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transform transition-all mb-3
                             ${selectedAgentId === rootHierarchy.id 
                               ? 'bg-slate-900 shadow-xl shadow-slate-900/20 scale-[1.02]' 
                               : 'bg-white border border-slate-100 shadow-sm hover:border-slate-200'
                             }
                           `}
                         >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-inner shrink-0
                                ${selectedAgentId === rootHierarchy.id ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white' : 'bg-slate-50 text-slate-500'}
                            `}>
                                {rootHierarchy.first_name[0]}{rootHierarchy.last_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${selectedAgentId === rootHierarchy.id ? 'text-white' : 'text-slate-900'}`}>
                                    {rootHierarchy.first_name} {rootHierarchy.last_name}
                                </p>
                                <p className={`text-[10px] font-bold uppercase tracking-wide ${selectedAgentId === rootHierarchy.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                    Unit Leader
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Recursive Tree List */}
                    {filteredRootAgents.length > 0 ? (
                        filteredRootAgents.map((agent) => (
                          <AgentHierarchyNode 
                            key={agent.agent_id}
                            agent={agent}
                            onSelect={handleAgentSelect}
                            selectedId={selectedAgentId}
                          />
                        ))
                    ) : (
                        <div className="text-center py-8 text-xs text-slate-400 font-medium">
                            {sidebarSearch ? 'No agents found' : 'No direct reports'}
                        </div>
                    )}
                </div>
              )}
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
             {/* Gradient Orb */}
             <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-brand-500/30 transition-colors duration-500"></div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                       <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg leading-tight">Monthly Goal</h4>
                        <p className="text-slate-400 text-xs font-medium">October Target</p>
                    </div>
                </div>
                
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-black">82%</span>
                    <span className="text-sm text-brand-400 font-bold mb-1">On Track</span>
                </div>
                
                <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                   <div className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full w-[82%] shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                </div>
             </div>
          </div>
       </div>

       {/* RIGHT: Main Content */}
       <div className="flex-1 w-full space-y-8">
          {/* Header Stats for Selected Agent */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-900">{selectedHierarchyData?.direct_downlines?.itemsTotal || 0}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Total Team</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Award className="w-7 h-7" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-900">{selectedHierarchyData?.direct_downlines?.items?.length || 0}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Direct Agents</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-7 h-7" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-900">--</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Active Writers</p>
                </div>
              </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                       {selectedHierarchyData?.first_name} {selectedHierarchyData?.last_name}
                    </h2>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                         <button 
                            onClick={() => setViewMode('team')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            Team List
                         </button>
                         <button 
                            onClick={() => setViewMode('policies')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'policies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            Production
                         </button>
                    </div>
                </div>

                {viewMode === 'team' ? (
                     <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filter list..." 
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all w-64 text-slate-800 placeholder:font-medium"
                            />
                        </div>
                        <button className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 text-slate-500 border border-slate-100 hover:border-slate-200 transition-all">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <DateRangeSelector value={dateRange} onChange={setDateRange} />
                )}
            </div>

            <div className="overflow-x-auto">
              {viewMode === 'team' ? (
                  // TEAM TABLE
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100/50">
                        <th className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent Name</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent ID</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recruits</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                        <th className="py-5 px-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loadingSelected ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                              <div className="flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-bold">Loading details...</span>
                              </div>
                          </td>
                        </tr>
                      ) : tableAgents.length > 0 ? (
                        tableAgents.map((agent) => (
                          <tr key={agent.agent_id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-5 pl-8">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                    {agent.first_name[0]}{agent.last_name[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{agent.first_name} {agent.last_name}</p>
                                    <p className="text-xs text-slate-400 font-medium">Licensed Agent</p>
                                  </div>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                {agent.agent_id}
                              </span>
                            </td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <span className="font-bold text-slate-900 text-sm">{agent.directDownline_count}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                  Active
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right pr-8">
                              <button className="p-2 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors">
                                  <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-medium">
                            No downline agents found for this selection.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
              ) : (
                  // POLICIES TABLE
                  <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-100/50">
                        <th className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client & Date</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Policy No.</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier / Product</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Eff. Date</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Premium</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status / Paid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loadingPolicies ? (
                        <tr>
                            <td colSpan={6} className="py-12 text-center">
                            <div className="flex items-center justify-center gap-3 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm font-bold">Loading policies...</span>
                            </div>
                            </td>
                        </tr>
                        ) : policies.length > 0 ? (
                        policies.map((policy) => (
                            <tr key={policy.policy_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-5 pl-8">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-sm">{policy.client}</span>
                                    <span className="text-[11px] text-slate-400 font-bold mt-0.5">{formatDate(policy.created_at)}</span>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 font-mono">
                                        #{policy.policy_number || 'PENDING'}
                                    </span>
                                    {policy.isLocked && (
                                        <Lock className="w-3 h-3 text-slate-400" />
                                    )}
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-xs">{policy.carrier}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{policy.carrier_product}</span>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <span className="font-bold text-slate-900 text-xs">{formatDate(policy.initial_draft_date)}</span>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-sm">${policy.annual_premium.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Annual</span>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex flex-col items-start gap-1">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${getStatusStyles(policy.status)}`}>
                                    {policy.status}
                                    </span>
                                    {policy.paid_status && (
                                    <span className="text-[10px] font-bold text-slate-500 px-1">
                                        {policy.paid_status}
                                    </span>
                                    )}
                                </div>
                            </td>
                            </tr>
                        ))
                        ) : (
                        <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-medium">
                                No policies found for this period.
                            </td>
                        </tr>
                        )}
                    </tbody>
                  </table>
              )}
            </div>
          </div>
       </div>
    </div>
  );
};
