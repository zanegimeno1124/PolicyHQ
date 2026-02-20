import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Wallet, 
    Calendar, 
    ChevronDown, 
    CheckCircle2, 
    ArrowUpRight, 
    FileText,
    TrendingUp,
    AlertCircle,
    Clock,
    Search,
    ChevronRight,
    ChevronLeft,
    Filter,
    X,
    Loader2,
    Download,
    Split,
    Ban,
    ArrowUpDown,
    Check,
    RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip
} from 'recharts';
import { useAgentContext } from '../context/AgentContext';
import { agentCommissionsApi } from '../services/agentCommissionsApi';
import { AgentCommissionDetails } from './AgentCommissionDetails';

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
    client_name: string;
    policy_number: string;
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
    if (s === 'pending') return 'bg-amber-100 text-amber-700';
    if (s === 'chargeback' || s === 'clawback') return 'bg-red-100 text-red-700';
    if (s === 'needed to split') return 'bg-purple-100 text-purple-700';
    if (s === 'n/a') return 'bg-slate-100 text-slate-500';
    return 'bg-slate-100 text-slate-600';
};

// --- COMPONENTS ---

// Shared styles for filter buttons
const FILTER_BUTTON_BASE = "h-11 w-full bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 flex items-center justify-between shadow-sm hover:border-brand-500 hover:ring-4 hover:ring-brand-500/10 transition-all focus:outline-none";
const FILTER_ACTIVE_STYLE = "bg-brand-50 border-brand-200 text-brand-700";

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

    useEffect(() => {
        if (!value) {
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    }, [value]);

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
                className={`${FILTER_BUTTON_BASE} ${value ? FILTER_ACTIVE_STYLE : ''}`}
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
                                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
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

// MultiSelect Dropdown (Reused style)
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
                            {isAllSelected && <Check className="w-3 h-3" />}
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
                                    {isSelected && <Check className="w-3 h-3 text-brand-500" />}
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

// Date Dropdown Component (For Summary Card)
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

// Calendar Modal
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
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"><div className="w-4 h-4 flex items-center justify-center">x</div></button>
                <div className="flex items-center justify-between mb-6 px-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                    <span className="font-black text-slate-900">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
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

// Mock Data for Sparkline
const SPARKLINE_DATA = [
  { value: 400 }, { value: 300 }, { value: 550 }, { value: 450 }, { value: 700 }, { value: 600 }, { value: 900 }
];

export const AgentCommissions: React.FC = () => {
  const { currentAgentId, hasAgentProfile, viewingAgentName } = useAgentContext();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('today'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Data States
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<CommissionRecord[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Status Filter State
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);

  // Table View State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // Drawer State - NOW USES OBJECT
  const [selectedCommission, setSelectedCommission] = useState<CommissionRecord | null>(null);

  // Effect 1: Fetch Summary when Agent/Date changes (Reset status filter)
  useEffect(() => {
    if (currentAgentId) {
        setLoading(true);
        // Reset selected status when main filters change to avoid empty states
        setSelectedStatusId(null);
        
        agentCommissionsApi.getCommissionsSummary(currentAgentId, dateRange.start, dateRange.end)
            .then(data => setSummary(data))
            .catch(err => console.error("Failed to load commission summary", err))
            .finally(() => setLoading(false));
    }
  }, [currentAgentId, dateRange]);

  // Effect 2: Fetch Transactions when Agent/Date/Status changes
  useEffect(() => {
    if (currentAgentId) {
        setLoadingTransactions(true);
        
        agentCommissionsApi.getCommissions(currentAgentId, dateRange.start, dateRange.end, selectedStatusId)
            .then(data => setTransactions(data))
            .catch(err => console.error("Failed to load transactions", err))
            .finally(() => setLoadingTransactions(false));
    }
  }, [currentAgentId, dateRange, selectedStatusId]);

  // Derived Data
  const carriers = useMemo(() => {
      const unique = new Set(transactions.map(t => t.carrier).filter(Boolean));
      return Array.from(unique).sort();
  }, [transactions]);

  const processTableData = useMemo(() => {
      let data = [...transactions];

      // Filter
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(t => 
              t.client_name.toLowerCase().includes(lower) || 
              (t.policy_number && t.policy_number.toLowerCase().includes(lower)) ||
              t.agent_name.toLowerCase().includes(lower)
          );
      }

      if (selectedCarriers.length > 0) {
          data = data.filter(t => selectedCarriers.includes(t.carrier));
      }

      // Filter by Effective Date
      if (effectiveDateRange) {
          data = data.filter(t => {
              if (!t.effective_date) return false;
              const d = new Date(t.effective_date).getTime();
              return d >= effectiveDateRange.start && d <= effectiveDateRange.end;
          });
      }

      // Sort
      if (sortConfig) {
          data.sort((a, b) => {
              const aValue = a[sortConfig.key] || '';
              const bValue = b[sortConfig.key] || '';
              if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      } else {
          // Default sort by date desc
          data.sort((a, b) => b.created_at - a.created_at);
      }

      return data;
  }, [transactions, searchTerm, selectedCarriers, effectiveDateRange, sortConfig]);

  const totalPages = Math.ceil(processTableData.length / rowsPerPage);
  const paginatedData = processTableData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSort = (key: keyof CommissionRecord) => {
      setSortConfig(current => ({
          key,
          direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handlePageChange = (p: number) => {
      if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const handleSelectOne = (id: string) => {
      const next = new Set(selectedTxIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedTxIds(next);
  };

  const handleSelectAll = () => {
      if (selectedTxIds.size === paginatedData.length) {
          setSelectedTxIds(new Set());
      } else {
          const next = new Set(selectedTxIds);
          paginatedData.forEach(p => next.add(p.id));
          setSelectedTxIds(next);
      }
  };

  const handleFilterClick = (id: string | null) => {
      // Toggle logic: if clicking the same active filter, reset to null (All)
      // Exception: if clicking 'All' (null) when it's already null, do nothing
      if (selectedStatusId === id) {
          if (id !== null) setSelectedStatusId(null);
      } else {
          setSelectedStatusId(id);
      }
  };

  if (!hasAgentProfile) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
         <FileText className="w-12 h-12 text-slate-200 mb-4" />
         <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Missing</h2>
         <p className="text-slate-500 max-w-md">Please switch to an agent workspace.</p>
      </div>
    );
  }

  // --- STATS EXTRACTION ---
  const paidData = summary?.by_status.find(s => s.status.toLowerCase() === 'paid') || { id: null, totalCommissions: 0, records: 0 };
  const chargebackData = summary?.by_status.find(s => s.status.toLowerCase().includes('chargeback') || s.status.toLowerCase().includes('clawback')) || { id: null, totalCommissions: 0, records: 0 };
  const unpaidData = summary?.by_status.find(s => s.status.toLowerCase().includes('unpaid') || s.status.toLowerCase().includes('pending')) || { id: null, totalCommissions: 0, records: 0 };
  const splitData = summary?.by_status.find(s => s.status.toLowerCase().includes('split')) || { id: null, totalCommissions: 0, records: 0 };
  const naData = summary?.by_status.find(s => s.status === 'N/A' || s.status.toLowerCase() === 'n/a') || { id: null, totalCommissions: 0, records: 0 };

  return (
    <div className="font-sans flex flex-col gap-8 max-w-[1600px] mx-auto w-full pb-20 relative">
        <CalendarModal 
            isOpen={isCalendarOpen} 
            onClose={() => setIsCalendarOpen(false)} 
            onChange={(range) => {
                setDateRange(range);
            }} 
        />
        
        {/* 1. Header Section */}
        <div className="flex flex-col gap-1 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hello, {viewingAgentName.split(' ')[0]}!</h1>
            <p className="text-slate-400 font-medium">Track your production success today.</p>
        </div>

        {/* 2. Main Dashboard Grid */}
        {loading ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 animate-bounce">
                    <Wallet className="w-6 h-6 text-brand-400" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest">Calculating...</p>
            </div>
        ) : summary ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch animate-in fade-in duration-300">
                
                {/* LEFT COLUMN (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    
                    {/* Overall Summary Card (Total Sale style) */}
                    <div 
                        onClick={() => handleFilterClick(null)}
                        className={`bg-white rounded-[2.5rem] p-8 border shadow-sm relative group cursor-pointer transition-all duration-300
                            ${selectedStatusId === null 
                                ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xl shadow-brand-500/10' 
                                : 'border-slate-100 hover:border-brand-200 hover:shadow-md'
                            }
                        `}
                    >
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Net Earnings</h3>
                                <p className="text-slate-400 text-xs font-bold mt-1">Overall Total</p>
                            </div>
                            <DateDropdown 
                                value={dateRange} 
                                onChange={setDateRange}
                                onCustom={() => setIsCalendarOpen(true)}
                            />
                        </div>

                        <div className="mb-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter">
                                ${summary.overall.TotalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                            <p className="text-emerald-500 text-sm font-bold mt-2 flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                <span>Yeah! Net earnings calculated from {summary.overall.Records} records.</span>
                            </p>
                        </div>
                    </div>

                    {/* Mini Containers Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. N/A */}
                        <div 
                            onClick={() => handleFilterClick(naData.id)}
                            className={`bg-slate-50 rounded-[2rem] p-6 border relative group transition-all duration-300 cursor-pointer
                                ${selectedStatusId === naData.id 
                                    ? 'border-slate-400 ring-2 ring-slate-400/20 shadow-xl shadow-slate-900/10 bg-white' 
                                    : 'border-slate-200 hover:-translate-y-1 hover:shadow-md'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">N/A</span>
                                <div className="p-2 bg-white rounded-full shadow-sm text-slate-400">
                                    <Ban className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-2xl font-black text-slate-700">
                                ${naData.totalCommissions.toLocaleString()}
                            </h4>
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-400">
                                <span className="bg-white px-1.5 py-0.5 rounded-md shadow-sm text-slate-600">{naData.records}</span>
                                <span>Records</span>
                            </div>
                        </div>

                        {/* 2. Chargebacks */}
                        <div 
                            onClick={() => handleFilterClick(chargebackData.id)}
                            className={`bg-red-50 rounded-[2rem] p-6 border relative group transition-all duration-300 cursor-pointer
                                ${selectedStatusId === chargebackData.id 
                                    ? 'border-red-500 ring-2 ring-red-500/20 shadow-xl shadow-red-500/10 bg-white' 
                                    : 'border-red-100 hover:-translate-y-1 hover:shadow-md'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Chargeback</span>
                                <div className="p-2 bg-white rounded-full shadow-sm text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-2xl font-black text-red-900">
                                ${chargebackData.totalCommissions.toLocaleString()}
                            </h4>
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-red-400">
                                <span className="bg-white px-1.5 py-0.5 rounded-md shadow-sm text-red-600">{chargebackData.records}</span>
                                <span>Records</span>
                            </div>
                        </div>

                        {/* 3. Unpaid */}
                        <div 
                            onClick={() => handleFilterClick(unpaidData.id)}
                            className={`bg-amber-50 rounded-[2rem] p-6 border relative group transition-all duration-300 cursor-pointer
                                ${selectedStatusId === unpaidData.id 
                                    ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xl shadow-amber-500/10 bg-white' 
                                    : 'border-amber-100 hover:-translate-y-1 hover:shadow-md'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Unpaid</span>
                                <div className="p-2 bg-white rounded-full shadow-sm text-amber-500">
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-2xl font-black text-amber-900">
                                ${unpaidData.totalCommissions.toLocaleString()}
                            </h4>
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-amber-500">
                                <span className="bg-white px-1.5 py-0.5 rounded-md shadow-sm text-amber-600">{unpaidData.records}</span>
                                <span>Pending</span>
                            </div>
                        </div>

                        {/* 4. Needed to Split */}
                        <div 
                            onClick={() => handleFilterClick(splitData.id)}
                            className={`bg-purple-50 rounded-[2rem] p-6 border relative group transition-all duration-300 cursor-pointer
                                ${selectedStatusId === splitData.id 
                                    ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xl shadow-purple-500/10 bg-white' 
                                    : 'border-purple-100 hover:-translate-y-1 hover:shadow-md'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Needed to Split</span>
                                <div className="p-2 bg-white rounded-full shadow-sm text-purple-500">
                                    <Split className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-2xl font-black text-purple-900">
                                ${splitData.totalCommissions.toLocaleString()}
                            </h4>
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-purple-400">
                                <span className="bg-white px-1.5 py-0.5 rounded-md shadow-sm text-purple-600">{splitData.records}</span>
                                <span>Shared</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Span 4) - Realized Income */}
                <div className="xl:col-span-4">
                    <div 
                        onClick={() => handleFilterClick(paidData.id)}
                        className={`bg-white rounded-[2.5rem] p-8 border shadow-sm h-full flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all duration-300
                            ${selectedStatusId === paidData.id 
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10' 
                                : 'border-slate-100 hover:border-emerald-200 hover:shadow-md'
                            }
                        `}
                    >
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-lg font-black text-slate-900">Realized Income</h3>
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
                                    <Wallet className="w-5 h-5" />
                                </div>
                            </div>
                            
                            <div className="mb-2">
                                <h2 className="text-4xl font-black text-slate-900">
                                    ${paidData.totalCommissions.toLocaleString()}
                                </h2>
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold mt-2">
                                    <TrendingUp className="w-3 h-3" />
                                    {paidData.records} Paid Records
                                </span>
                            </div>
                            
                            <p className="text-xs text-slate-400 font-medium mt-4 leading-relaxed">
                                Great job! This represents your realized income that has been successfully paid out.
                            </p>
                        </div>

                        {/* Graph Section */}
                        <div className="h-40 w-full mt-8 -mx-4 -mb-4 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={SPARKLINE_DATA}>
                                    <defs>
                                        <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                                        cursor={{ stroke: '#cbd5e1' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#f59e0b" 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#colorPaid)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 text-slate-400 p-8 text-center">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-bold">No commission data available for this period.</p>
            </div>
        )}

        {/* 3. Commission Transactions Table */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative mt-4">
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search commissions..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                </div>

                {/* Right: Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-400 mr-2 uppercase tracking-wide">
                        <Filter className="w-3 h-3" /> Filters
                    </div>
                    
                    <div className="w-full md:w-auto min-w-[140px]">
                        <MultiSelectDropdown 
                            label="Carriers"
                            options={carriers}
                            selected={selectedCarriers}
                            onChange={setSelectedCarriers}
                        />
                    </div>

                    <div className="w-full md:w-auto min-w-[180px]">
                        <SimpleDateRangePicker 
                            value={effectiveDateRange} 
                            onChange={setEffectiveDateRange}
                            placeholder="Effective Date"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-100/50">
                            <th className="py-5 pl-8 w-12">
                                <div className="w-4 h-4 rounded border border-slate-300"></div>
                            </th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('created_at')}>
                                <div className="flex items-center gap-1">Statement Date <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('agent_name')}>
                                <div className="flex items-center gap-1">Partner Agent <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client / Policy</th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier / Product</th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status / Prem</th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Effective</th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end gap-1">Commission <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Comm. Status</th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Submitted By</th>
                            <th className="py-5 px-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loadingTransactions ? (
                            <tr>
                                <td colSpan={11} className="py-12 text-center">
                                    <div className="flex items-center justify-center gap-3 text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        <span className="text-sm font-medium">Loading transactions...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedData.length > 0 ? (
                            paginatedData.map((t) => (
                                <tr 
                                    key={t.id} 
                                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    onClick={() => setSelectedCommission(t)}
                                >
                                    <td className="py-5 pl-8">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" 
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className="text-xs font-bold text-slate-900">{new Date(t.created_at).toLocaleDateString()}</span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                {(t.agent_name || '?').substring(0,1)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{t.agent_name || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900">{t.client_name}</span>
                                            <span className="text-[10px] font-medium text-slate-400">#{t.policy_number}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900">{t.carrier}</span>
                                            <span className="text-[10px] font-medium text-slate-400">{t.carrier_product}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mb-0.5">
                                                {t.policy_status}
                                            </span>
                                            <span className="text-xs font-bold text-slate-700">
                                                ${t.annual_premium?.toLocaleString() || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className="text-xs font-bold text-slate-900">
                                            {t.effective_date ? new Date(t.effective_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4 text-right">
                                        <span className={`text-sm font-black ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {t.amount >= 0 ? '+' : ''}${t.amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${getStatusBadgeStyle(t.status)}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className="text-xs text-slate-500 font-medium">{t.submitted_by || 'System Auto'}</span>
                                    </td>
                                    <td className="py-5 px-4 text-right pr-8">
                                        <button className="text-slate-300 hover:text-brand-500 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                                    No transactions found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900">{paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> - <span className="text-slate-900">{Math.min(currentPage * rowsPerPage, processTableData.length)}</span> of <span className="text-slate-900">{processTableData.length}</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rows</span>
                        <select 
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                        >
                            Previous
                        </button>
                        <div className="w-8 h-8 flex items-center justify-center bg-brand-500 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-500/30">
                            {currentPage}
                        </div>
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {selectedCommission && (
            <AgentCommissionDetails 
                commission={selectedCommission}
                onClose={() => setSelectedCommission(null)}
            />
        )}
    </div>
  );
};