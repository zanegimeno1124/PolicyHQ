import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Wallet, 
    Calendar, 
    ChevronDown, 
    CheckCircle2, 
    TrendingUp,
    AlertCircle,
    Clock,
    Search,
    ChevronRight,
    ChevronLeft,
    X,
    Loader2,
    Download,
    Split,
    Ban,
    ArrowUpDown,
    Check,
    RefreshCw,
    Shield,
    LayoutGrid,
    Lock,
    Unlock,
    Users,
    Building2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip
} from 'recharts';
import { useAgencyContext } from '../context/AgencyContext';
import { useAuth } from '../../../context/AuthContext';
import { agencyCommissionsApi } from '../services/agencyCommissions';

// --- TYPES ---
interface DateRange {
    start: number;
    end: number;
    label: string;
}

interface CommissionSummary {
    overall: {
        TotalCommissions: number;
        Records: number;
    };
    by_status: {
        id: string;
        status: string;
        totalCommissions: number;
        records: number;
    }[];
}

export interface CommissionRecord {
    id: string;
    created_at: number;
    policy_id: string;
    agent_name: string;
    agentOncommission_name: string;
    agentOnCommission_id?: string;
    client_name: string;
    policy_number: string;
    policy_isLocked: boolean;
    carrier: string;
    effective_date: string;
    amount: number;
    status: string;
    submitted_by: string;
    custom_carrier: string | null;
    carrier_product: string;
    policy_status: string;
    annual_premium: number;
    comments: any[];
    originAgencyName?: string; // Metadata for aggregated view
}

type SortConfig = {
    key: keyof CommissionRecord;
    direction: 'asc' | 'desc';
};

// --- UTILS ---
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getDateRange = (type: 'today' | 'weekly' | 'monthly' | 'yearly'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'today') return { start: start.getTime(), end: end.getTime(), label: 'Today' };
    
    if (type === 'weekly') {
        const day = start.getDay(); 
        const diff = start.getDate() - day; 
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

const getStatusBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'bg-emerald-100 text-emerald-700';
    if (s === 'pending' || s === 'unpaid') return 'bg-amber-100 text-amber-700';
    if (s === 'chargeback' || s === 'clawback') return 'bg-red-100 text-red-700';
    if (s === 'needed to split') return 'bg-purple-100 text-purple-700';
    if (s === 'n/a') return 'bg-slate-100 text-slate-500';
    return 'bg-slate-100 text-slate-600';
};

// --- SUB-COMPONENTS ---

const SimpleDateRangePicker: React.FC<{
    value: DateRange | null;
    onChange: (range: DateRange | null) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Dates" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectionStart, setSelectionStart] = useState<Date | null>(value ? new Date(value.start) : null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(value ? new Date(value.end) : null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateClick = (date: Date) => {
        let newStart = selectionStart;
        let newEnd = selectionEnd;

        if (!newStart || (newStart && newEnd)) {
            newStart = date;
            newEnd = null;
        } else {
            if (date < newStart) {
                newEnd = newStart;
                newStart = date;
            } else {
                newEnd = date;
            }
        }

        setSelectionStart(newStart);
        setSelectionEnd(newEnd);

        if (newStart && newEnd) {
            const s = new Date(newStart);
            const e = new Date(newEnd);
            s.setHours(0,0,0,0);
            e.setHours(23,59,59,999);
            setTimeout(() => setIsOpen(false), 300);
            onChange({ 
                start: s.getTime(), 
                end: e.getTime(), 
                label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` 
            });
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
        <div className="relative z-50 w-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`h-11 w-full bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 flex items-center justify-between shadow-sm hover:border-brand-500 hover:ring-4 hover:ring-brand-500/10 transition-all focus:outline-none ${value ? 'bg-brand-50 border-brand-200 text-brand-700' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Calendar className={`w-4 h-4 shrink-0 ${value ? 'text-brand-500' : 'text-slate-400'}`} />
                    <span className="truncate">{value ? value.label : placeholder}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-4 min-w-[280px] z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                     <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendar().map((date, i) => (
                            <div key={i} className="aspect-square">
                                {date ? (
                                    <button 
                                        onClick={() => handleDateClick(date)} 
                                        className={`
                                            w-full h-full flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                            ${isSelected(date) ? 'bg-brand-500 text-white shadow-md shadow-brand-200' : ''}
                                            ${isInRange(date) ? 'bg-brand-50 text-brand-900' : ''}
                                            ${!isSelected(date) && !isInRange(date) ? 'text-slate-700 hover:bg-slate-50' : ''}
                                        `}
                                    >
                                        {date.getDate()}
                                    </button>
                                ) : <div />}
                            </div>
                        ))}
                    </div>
                    {value && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                            <button 
                                onClick={() => { onChange(null); setIsOpen(false); }}
                                className="text-xs font-bold text-brand-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Clear Dates
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MultiSelectDropdown: React.FC<{
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    icon?: React.ReactNode;
}> = ({ label, options, selected, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const isAllSelected = selected.length === 0;

    return (
        <div className="relative z-20" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between shadow-sm hover:border-brand-500 transition-all gap-2 min-w-[140px] ${selected.length > 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {icon}
                    <span className="truncate">
                        {selected.length > 0 ? `${selected.length} ${label}` : `All ${label}`}
                    </span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-48 overflow-y-auto px-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
                        <button
                            onClick={() => onChange([])}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isAllSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {isAllSelected && <Check className="w-3" />}
                            <span className={!isAllSelected ? 'pl-6' : ''}>All {label}</span>
                        </button>
                        
                        {options.map(option => {
                            const isSelected = selected.includes(option);
                            return (
                                <button
                                    key={option}
                                    onClick={() => toggleOption(option)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isSelected ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                                    <span className={!isSelected ? 'pl-6' : ''}>{option}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const DateDropdown: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
    onCustom: () => void;
}> = ({ value, onChange, onCustom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePreset = (type: 'today' | 'weekly' | 'monthly' | 'yearly') => {
        onChange(getDateRange(type));
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-slate-100 flex items-center gap-2 transition-colors relative z-20"
            >
                <Calendar className="w-3 h-3" />
                <span>{value.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 min-w-[150px] z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                    {['Today', 'Weekly', 'Monthly', 'Yearly'].map((item) => (
                        <button
                            key={item}
                            onClick={(e) => { e.stopPropagation(); handlePreset(item.toLowerCase() as any); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${value.label === item ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                        >
                            {item}
                        </button>
                    ))}
                    <div className="h-px bg-slate-100 my-0.5"></div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCustom(); setIsOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                        Custom Range
                    </button>
                </div>
            )}
        </div>
    );
};

const CalendarModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onChange: (range: DateRange) => void;
}> = ({ isOpen, onClose, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date()); 
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    
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

    const handleDateClick = (date: Date) => {
        if (!selectionStart) {
            setSelectionStart(date);
        } else {
            let start = selectionStart;
            let end = date;
            if (date < start) {
                start = date;
                end = selectionStart;
            }
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            onChange({ start: start.getTime(), end: end.getTime(), label: 'Custom Range' });
            setSelectionStart(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
                <div className="flex items-center justify-between mb-6 px-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="font-black text-slate-900">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {generateCalendar().map((date, i) => (
                        <div key={i} className="aspect-square">
                            {date ? (
                                <button 
                                    onClick={() => handleDateClick(date)}
                                    className={`w-full h-full rounded-xl text-xs font-bold transition-all ${selectionStart?.getTime() === date.getTime() ? 'bg-brand-400 text-slate-900 shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    {date.getDate()}
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Select Start & End Date</div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const AgencyCommissions: React.FC = () => {
  const { selectedAgencyIds, selectedAgencies } = useAgencyContext();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('monthly'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Data States
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<CommissionRecord[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Status Filter State
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);

  // Fix: Added handleFilterClick to toggle filter selection in the UI
  const handleFilterClick = (id: string | null) => {
      if (selectedStatusId === id) {
          if (id !== null) setSelectedStatusId(null);
      } else {
          setSelectedStatusId(id);
      }
  };

  // Table View State
  const [searchTerm, setSearchTerm] = useState('');
  const [agentSidebarSearch, setAgentSidebarSearch] = useState('');
  const [selectedAgentNames, setSelectedAgentNames] = useState<string[]>([]);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [lockFilter, setLockFilter] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // AGGREGATION LOGIC (Path A)
  useEffect(() => {
    if (selectedAgencyIds.length > 0) {
        setLoading(true);
        setSelectedStatusId(null);
        
        // Parallel fetches for summaries
        Promise.all(selectedAgencyIds.map(id => 
            agencyCommissionsApi.getCommissionsSummary(id, dateRange.start, dateRange.end)
        )).then(results => {
            const agg: CommissionSummary = {
                overall: { TotalCommissions: 0, Records: 0 },
                by_status: []
            };

            const statusMap = new Map<string, any>();

            results.forEach(res => {
                agg.overall.TotalCommissions += res.overall.TotalCommissions;
                agg.overall.Records += res.overall.Records;

                res.by_status.forEach(item => {
                    if (!statusMap.has(item.status)) {
                        statusMap.set(item.status, { ...item });
                    } else {
                        const existing = statusMap.get(item.status)!;
                        existing.totalCommissions += item.totalCommissions;
                        existing.records += item.records;
                    }
                });
            });

            agg.by_status = Array.from(statusMap.values());
            setSummary(agg);
        })
        .catch(err => console.error("Aggregation failed", err))
        .finally(() => setLoading(false));
    }
  }, [selectedAgencyIds, dateRange]);

  // Parallel fetches for transactions
  useEffect(() => {
    if (selectedAgencyIds.length > 0) {
        setLoadingTransactions(true);
        
        Promise.all(selectedAgencyIds.map(id => {
            const agencyName = selectedAgencies.find(a => a.agencyId === id)?.agencyName || 'Unknown';
            return agencyCommissionsApi.getCommissions(id, dateRange.start, dateRange.end, selectedStatusId)
                .then(list => (list || []).map((t: any) => ({ ...t, originAgencyName: agencyName })));
        })).then(results => {
            const merged = results.flat();
            setTransactions(merged);
        })
        .catch(err => console.error("Trans aggregation failed", err))
        .finally(() => setLoadingTransactions(false));
    }
  }, [selectedAgencyIds, dateRange, selectedStatusId]);

  const agentRollup = useMemo(() => {
      const map = new Map<string, { id: string, name: string, totalComm: number, count: number }>();
      transactions.forEach(t => {
          const name = t.agentOncommission_name || t.agent_name || 'Unknown Agent';
          if (!map.has(name)) {
              map.set(name, { id: name, name: name, totalComm: 0, count: 0 });
          }
          const entry = map.get(name)!;
          entry.totalComm += (t.amount || 0);
          entry.count += 1;
      });
      return Array.from(map.values()).sort((a, b) => b.totalComm - a.totalComm);
  }, [transactions]);

  const filteredAgentRollup = useMemo(() => {
    if (!agentSidebarSearch) return agentRollup;
    return agentRollup.filter(a => a.name.toLowerCase().includes(agentSidebarSearch.toLowerCase()));
  }, [agentRollup, agentSidebarSearch]);

  const carriers = useMemo(() => Array.from(new Set(transactions.map(t => t.carrier).filter(Boolean))).sort(), [transactions]);

  const processTableData = useMemo(() => {
      let data = [...transactions];

      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(t => 
              t.client_name.toLowerCase().includes(lower) || 
              (t.policy_number && t.policy_number.toLowerCase().includes(lower)) ||
              t.agent_name.toLowerCase().includes(lower)
          );
      }

      if (selectedAgentNames.length > 0) data = data.filter(t => selectedAgentNames.includes(t.agentOncommission_name || t.agent_name));
      if (selectedCarriers.length > 0) data = data.filter(t => selectedCarriers.includes(t.carrier));

      if (lockFilter === 'locked') data = data.filter(t => t.policy_isLocked);
      else if (lockFilter === 'unlocked') data = data.filter(t => !t.policy_isLocked);

      if (effectiveDateRange) {
          data = data.filter(t => {
              if (!t.effective_date) return false;
              const d = new Date(t.effective_date).getTime();
              return d >= effectiveDateRange.start && d <= effectiveDateRange.end;
          });
      }

      if (sortConfig) {
          data.sort((a, b) => {
              const aVal = a[sortConfig.key] || '';
              const bVal = b[sortConfig.key] || '';
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      } else {
          data.sort((a, b) => b.created_at - a.created_at);
      }

      return data;
  }, [transactions, searchTerm, selectedCarriers, effectiveDateRange, sortConfig, lockFilter, selectedAgentNames]);

  const paginatedData = processTableData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (selectedAgencyIds.length === 0) return null;

  // Fix: Added id and status to fallback objects to ensure property access safety and type compatibility
  const paidData = summary?.by_status.find(s => s.status === 'Paid') || { id: 'Paid', status: 'Paid', totalCommissions: 0, records: 0 };
  const chargebackData = summary?.by_status.find(s => s.status === 'Chargeback') || { id: 'Chargeback', status: 'Chargeback', totalCommissions: 0, records: 0 };
  const unpaidData = summary?.by_status.find(s => s.status === 'Unpaid') || { id: 'Unpaid', status: 'Unpaid', totalCommissions: 0, records: 0 };
  const splitData = summary?.by_status.find(s => s.status === 'Needed to Split') || { id: 'Needed to Split', status: 'Needed to Split', totalCommissions: 0, records: 0 };

  return (
    <div className="font-sans flex flex-col gap-8 max-w-[1800px] mx-auto w-full pb-20 relative">
        <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onChange={setDateRange} />
        
        <div className="flex flex-col gap-1 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Ledger</h1>
            <p className="text-slate-400 font-medium">Aggregated revenue across <span className="font-bold text-slate-800">{selectedAgencyIds.length} Organizations</span>.</p>
        </div>

        {loading ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Aggregating Statements...</p>
            </div>
        ) : summary ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch animate-in fade-in duration-300">
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <div onClick={() => handleFilterClick(null)} className={`bg-white rounded-[2.5rem] p-8 border-2 shadow-sm relative cursor-pointer transition-all duration-300 ${selectedStatusId === null ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-slate-100 hover:border-brand-200'}`}>
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Net Network Earnings</h3>
                                <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Gross Enterprise Distribution</p>
                            </div>
                            <DateDropdown value={dateRange} onChange={setDateRange} onCustom={() => setIsCalendarOpen(true)} />
                        </div>
                        <div className="mb-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter">${summary.overall.TotalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                            <p className="text-emerald-500 text-sm font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /><span>Aggregated from {summary.overall.Records} network transactions.</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Chargeback', val: chargebackData, icon: AlertCircle, color: 'red' },
                            { label: 'Unpaid', val: unpaidData, icon: Clock, color: 'amber' },
                            { label: 'Splits', val: splitData, icon: Split, color: 'purple' },
                            { label: 'N/A', val: { totalCommissions: 0, records: 0 }, icon: Ban, color: 'slate' }
                        ].map(stat => (
                            <div key={stat.label} className={`bg-white rounded-[2rem] p-6 border transition-all duration-300 cursor-pointer border-slate-200 hover:-translate-y-1`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest text-${stat.color}-400`}>{stat.label}</span>
                                    <stat.icon className={`w-4 h-4 text-${stat.color}-300`} />
                                </div>
                                <h4 className="text-2xl font-black text-slate-700">${stat.val.totalCommissions.toLocaleString()}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{stat.val.records} consolidated items</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-4">
                    <div onClick={() => handleFilterClick(paidData.id || 'Paid')} className={`bg-white rounded-[2.5rem] p-8 border shadow-sm h-full flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all duration-300 ${selectedStatusId === 'Paid' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl' : 'border-slate-100 hover:border-emerald-200'}`}>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-lg font-black text-slate-900">Total Network Payout</h3>
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg"><CheckCircle2 className="w-5 h-5" /></div>
                            </div>
                            <div className="mb-2">
                                <h2 className="text-4xl font-black text-slate-900">${paidData.totalCommissions.toLocaleString()}</h2>
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold mt-2"><TrendingUp className="w-3 h-3" />{paidData.records} Aggregated Settlements</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : null}

        <div className="flex flex-col xl:flex-row gap-8 items-start">
            <aside className="w-full xl:w-96 flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col xl:sticky xl:top-8 h-[800px] overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-900 text-white z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-brand-500 rounded-2xl text-slate-900 shadow-lg"><Users className="w-5 h-5" /></div>
                        <div><h2 className="text-xl font-black tracking-tight leading-none">Enterprise Roster</h2></div>
                    </div>
                    <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Find producer..." value={agentSidebarSearch} onChange={e => setAgentSidebarSearch(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-white/10 border border-white/10 rounded-[1.25rem] text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-white" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
                    {filteredAgentRollup.map(agent => (
                        <button key={agent.id} onClick={() => setSelectedAgentNames(prev => prev.includes(agent.name) ? prev.filter(n=>n!==agent.name) : [...prev, agent.name])} className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 ${selectedAgentNames.includes(agent.name) ? 'bg-white border-brand-500 ring-1 ring-brand-500' : 'bg-white border border-slate-100'}`}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border-2 ${selectedAgentNames.includes(agent.name) ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-500'}`}>{agent.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                                <div className="text-left min-w-0"><p className="font-black text-sm truncate text-slate-900">{agent.name}</p><p className="text-[10px] font-black uppercase text-brand-600">${agent.totalComm.toLocaleString()} Total</p></div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[800px] flex flex-col">
                <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative">
                    <div className="relative w-full xl:w-80"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search aggregated ledger..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-500/20" /></div>
                    <div className="flex flex-wrap items-center gap-3">
                        <MultiSelectDropdown label="Carriers" options={carriers} selected={selectedCarriers} onChange={setSelectedCarriers} icon={<Shield className="w-3.5 h-3.5 text-slate-400" />} />
                        <SimpleDateRangePicker value={effectiveDateRange} onChange={setEffectiveDateRange} />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                <th className="py-5 pl-8 w-12"></th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase">Date</th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase">Agency</th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase">Producer</th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase">Client</th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase text-right">Premium</th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase text-right">Comm</th>
                                <th className="py-5 px-4 text-[10px] font-bold uppercase text-center">Status</th>
                                <th className="py-5 px-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loadingTransactions ? (
                                <tr><td colSpan={9} className="py-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Aggregating records...</td></tr>
                            ) : paginatedData.map((t) => (
                                <tr key={t.id} className="hover:bg-brand-50/20 group cursor-pointer" onClick={() => navigate('/management/commissions/details', { state: { queue: [t.policy_id], startIndex: 0, from: '/management/commissions' } })}>
                                    <td className="py-5 pl-8"><div className="w-4 h-4 rounded border border-slate-200"></div></td>
                                    <td className="py-5 px-4 text-xs font-bold text-slate-900">{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td className="py-5 px-4">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black uppercase tracking-tighter">
                                            <Building2 className="w-2.5 h-2.5" /> {t.originAgencyName}
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-xs font-bold text-slate-700">{t.agentOncommission_name || t.agent_name}</td>
                                    <td className="py-5 px-4 text-xs font-bold text-slate-900">{t.client_name}</td>
                                    <td className="py-5 px-4 text-right text-xs font-black text-slate-700">${t.annual_premium?.toLocaleString()}</td>
                                    <td className="py-5 px-4 text-right text-sm font-black text-emerald-600">${t.amount.toLocaleString()}</td>
                                    <td className="py-5 px-4 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wide ${getStatusBadgeStyle(t.status)}`}>{t.status}</span></td>
                                    <td className="py-5 px-4 pr-8"><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};