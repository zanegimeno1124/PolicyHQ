
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ArrowUpRight, 
  Plus, 
  TrendingUp, 
  Calendar, 
  UserX, 
  Loader2, 
  Lock,
  Unlock,
  XCircle,
  Ban,
  FileWarning,
  BarChart3,
  RefreshCw,
  Search,
  ArrowUpDown,
  Download,
  Check,
  DollarSign,
  Trash2,
  X,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useAgentContext } from '../context/AgentContext';
import { agentPoliciesApi } from '../services/agentPoliciesApi';
import { Policy } from '../../../shared/types/index';

interface DateRange {
    start: number;
    end: number;
    label: string;
}

const SPARKLINE_DATA = [
  { value: 1200 }, { value: 2100 }, { value: 800 }, { value: 1600 }, 
  { value: 900 }, { value: 1700 }, { value: 3800 }, { value: 2400 },
  { value: 5200 }, { value: 4100 }, { value: 6800 }, { value: 7400 }
];

const CARRIER_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

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

const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    
    // Fix: If date is in YYYY-MM-DD format, parse as local time to prevent 1-day delay from UTC shift
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        const d = new Date(year, month - 1, day); // Month is 0-indexed
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getInitials = (name: string) => {
    if (!name) return '??';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
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

// --- FILTER COMPONENTS ---

const FILTER_BUTTON_BASE = "h-11 w-full bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 flex items-center justify-between shadow-sm hover:border-brand-500 hover:ring-4 hover:ring-brand-500/10 transition-all focus:outline-none";
const FILTER_ACTIVE_STYLE = "bg-brand-50 border-brand-200 text-brand-700";

const SimpleDateRangePicker: React.FC<{
    value: DateRange | null;
    onChange: (range: DateRange | null) void;
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

const MultiSelectDropdown: React.FC<{
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    icon?: React.ReactNode;
}> = ({ label, options, selected, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const isAllSelected = selected.length === 0;

    return (
        <div className="relative z-40 w-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${FILTER_BUTTON_BASE} ${selected.length > 0 ? FILTER_ACTIVE_STYLE : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {icon}
                    <span className="truncate">
                        {selected.length > 0 ? `${selected.length} ${label}` : label}
                    </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-300/50 border border-slate-100 p-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2">
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold focus:ring-2 focus:ring-brand-500/20 text-slate-800 placeholder:text-slate-400"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <button
                            onClick={() => onChange([])}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isAllSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'}`}>
                                {isAllSelected && <Check className="w-3 h-3" />}
                            </div>
                            All {label}
                        </button>
                        
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => {
                                const isSelected = selected.includes(option);
                                return (
                                    <button
                                        key={option}
                                        onClick={() => toggleOption(option)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isSelected ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <span className="truncate text-left">{option}</span>
                                    </button>
                                )
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const MainDateRangeSelector: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'presets' | 'calendar'>('presets');
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Calendar State
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
        setView('presets');
    };

    const handleCustomClick = () => {
        setView('calendar');
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

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
            
            setTimeout(() => {
                setIsOpen(false);
                setView('presets');
            }, 300);
            
            onChange({ 
                start: s.getTime(), 
                end: e.getTime(), 
                label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` 
            });
        }
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
       <div className="relative z-50" ref={containerRef}>
          <button 
              onClick={() => { setIsOpen(!isOpen); setView('presets'); }}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
          >
              <Calendar className="w-4 h-4 text-brand-500" />
              <span>{value.label}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
              <div className="absolute top-full right-0 mt-3 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[320px] z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  {view === 'presets' ? (
                      <div className="flex flex-col gap-1 p-2">
                           {['Today', 'Weekly', 'Monthly', 'Yearly'].map((item) => (
                              <button
                                  key={item}
                                  onClick={() => handlePresetClick(item.toLowerCase() as any)}
                                  className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label === item ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                              >
                                  {item}
                                  {value.label === item && <CheckCircle className="w-4 h-4 text-brand-400" />}
                              </button>
                          ))}
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                              onClick={handleCustomClick}
                              className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label.includes('-') ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                          >
                              Custom Range
                              <Calendar className={`w-4 h-4 ${value.label.includes('-') ? 'text-brand-400' : 'text-slate-400'}`} />
                          </button>
                      </div>
                  ) : (
                      <div className="p-4">
                          <div className="flex items-center justify-between mb-4 bg-slate-50 p-2 rounded-xl">
                              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                              <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-colors shadow-sm"><ChevronRight className="w-4 h-4" /></button>
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
                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center flex-col items-center gap-2">
                              <p className="text-[10px] font-bold text-slate-400">Select start and end date</p>
                              <button 
                                  onClick={() => setView('presets')}
                                  className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
                              >
                                  Back to Presets
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}
       </div>
    );
};

// --- ACTION CONSTANTS ---
const ACTION_STATUSES = [
    'Follow up', 
    'Cancelled before draft', 
    'Declined', 
    'Lapsed Pending', 
    'Lapsed', 
    'Not Taken'
];

const STATUS_GROUPS = {
    APPROVED: ['Active', 'Approved', 'Paid'],
    PENDING: ['Pending', 'Underwriting', 'Submitted']
};

type SortConfig = {
    key: keyof Policy;
    direction: 'asc' | 'desc';
};

export const AgentPolicies: React.FC = () => {
  const { currentAgentId, viewingAgentName, hasAgentProfile } = useAgentContext();
  const navigate = useNavigate();

  // --- STATE PERSISTENCE LOGIC ---
  const storageKey = `policy_state_${currentAgentId}`;

  const getSavedState = () => {
      try {
          const saved = sessionStorage.getItem(storageKey);
          return saved ? JSON.parse(saved) : null;
      } catch { return null; }
  };

  const savedState = getSavedState();
  const defaultDateRange = getDateRange('monthly');

  const [activeTab, setActiveTab] = useState<'All' | 'Unlocked' | 'Locked'>(savedState?.activeTab || 'All');
  
  // Policies State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(savedState?.dateRange || defaultDateRange);

  // Deletion State
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtering & View State
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | 'GROUP_APPROVED' | 'GROUP_PENDING' | 'Underwriting' | null>(savedState?.activeStatusFilter || null);
  const [searchTerm, setSearchTerm] = useState(savedState?.searchTerm || '');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(savedState?.selectedCarriers || []);
  const [selectedPaidStatus, setSelectedPaidStatus] = useState<string[]>(savedState?.selectedPaidStatus || []);
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange | null>(savedState?.effectiveDateRange || null);

  // Sorting & Pagination & Selection
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(savedState?.sortConfig || null);
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const [rowsPerPage, setRowsPerPage] = useState(savedState?.rowsPerPage || 10);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<Set<string>>(new Set());

  // Save state on change
  useEffect(() => {
    if (!currentAgentId) return;
    const state = {
        activeTab,
        dateRange,
        activeStatusFilter,
        searchTerm,
        selectedCarriers,
        selectedPaidStatus,
        effectiveDateRange,
        sortConfig,
        currentPage,
        rowsPerPage
    };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    currentAgentId, activeTab, dateRange, activeStatusFilter, searchTerm, 
    selectedCarriers, selectedPaidStatus, effectiveDateRange, sortConfig, 
    currentPage, rowsPerPage
  ]);

  // Restore or Reset on Agent Change
  const prevAgentId = useRef(currentAgentId);
  
  useEffect(() => {
    if (prevAgentId.current !== currentAgentId) {
        const newState = getSavedState();
        if (newState) {
            setActiveTab(newState.activeTab);
            setDateRange(newState.dateRange);
            setActiveStatusFilter(newState.activeStatusFilter);
            setSearchTerm(newState.searchTerm);
            setSelectedCarriers(newState.selectedCarriers);
            setSelectedPaidStatus(newState.selectedPaidStatus);
            setEffectiveDateRange(newState.effectiveDateRange);
            setSortConfig(newState.sortConfig);
            setCurrentPage(newState.currentPage);
            setRowsPerPage(newState.rowsPerPage);
        } else {
            // Reset defaults
            setActiveTab('All');
            setDateRange(defaultDateRange);
            setActiveStatusFilter(null);
            setSearchTerm('');
            setSelectedCarriers([]);
            setSelectedPaidStatus([]);
            setEffectiveDateRange(null);
            setSortConfig(null);
            setCurrentPage(1);
            setRowsPerPage(10);
        }
        prevAgentId.current = currentAgentId;
    }
  }, [currentAgentId]);

  // Load Policies
  const fetchPolicies = () => {
    if (currentAgentId) {
      setLoadingPolicies(true);
      agentPoliciesApi.getPolicies(currentAgentId, dateRange.start, dateRange.end)
        .then(data => {
            setPolicies(data);
            setSelectedPolicyIds(new Set()); // Reset selection on new fetch
        })
        .catch(err => console.error("Failed to load policies", err))
        .finally(() => setLoadingPolicies(false));
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [currentAgentId, dateRange]);

  // Derived Data: Carriers
  const carriers = useMemo(() => {
      const unique = new Set(policies.map(p => p.carrier).filter(Boolean));
      return Array.from(unique).sort();
  }, [policies]);

  // --- PROCESSING DATA ---
  const processTableData = useMemo(() => {
      let data = [...policies];

      // 1. Text Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(p => 
              p.client.toLowerCase().includes(lower) ||
              (p.policy_number && p.policy_number.toLowerCase().includes(lower)) ||
              p.carrier.toLowerCase().includes(lower) ||
              p.agent_name.toLowerCase().includes(lower)
          );
      }

      // 2. Tab Filter (Locked/Unlocked)
      if (activeTab === 'Locked') {
          data = data.filter(p => p.isLocked);
      } else if (activeTab === 'Unlocked') {
          data = data.filter(p => !p.isLocked);
      }

      // 3. Status Filter (Cards)
      if (activeStatusFilter) {
          data = data.filter(p => {
              if (activeStatusFilter === 'GROUP_APPROVED') return STATUS_GROUPS.APPROVED.includes(p.status);
              if (activeStatusFilter === 'GROUP_PENDING') return STATUS_GROUPS.PENDING.includes(p.status);
              return p.status === activeStatusFilter;
          });
      }

      // 4. Carrier Filter
      if (selectedCarriers.length > 0) {
          data = data.filter(p => selectedCarriers.includes(p.carrier));
      }

      // 5. Paid Status Filter
      if (selectedPaidStatus.length > 0) {
          data = data.filter(p => {
              const status = p.paid_status === 'Paid' ? 'Paid' : 'Unpaid';
              return selectedPaidStatus.includes(status);
          });
      }

      // 6. Effective Date Filter
      if (effectiveDateRange) {
          data = data.filter(p => {
              if (!p.initial_draft_date) return false;
              const d = new Date(p.initial_draft_date).getTime();
              return d >= effectiveDateRange.start && d <= effectiveDateRange.end;
          });
      }

      // 7. Sorting
      if (sortConfig) {
          data.sort((a, b) => {
              const aValue = a[sortConfig.key] || '';
              const bValue = b[sortConfig.key] || '';
              
              if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return data;
  }, [policies, searchTerm, activeTab, activeStatusFilter, selectedCarriers, selectedPaidStatus, effectiveDateRange, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processTableData.length / rowsPerPage);
  const paginatedData = processTableData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const handleSort = (key: keyof Policy) => {
      setSortConfig(current => ({
          key,
          direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  // Selection Logic
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(row => selectedPolicyIds.has(row.policy_id));
  const isAllSelected = processTableData.length > 0 && selectedPolicyIds.size === processTableData.length;

  const handleSelectPage = () => {
    if (isPageSelected) {
        const newSelected = new Set(selectedPolicyIds);
        paginatedData.forEach(row => newSelected.delete(row.policy_id));
        setSelectedPolicyIds(newSelected);
    } else {
        const newSelected = new Set(selectedPolicyIds);
        paginatedData.forEach(row => newSelected.add(row.policy_id));
        setSelectedPolicyIds(newSelected);
    }
  };

  const handleSelectAllGlobal = () => {
    const allIds = new Set(processTableData.map(d => d.policy_id));
    setSelectedPolicyIds(allIds);
  };
  
  const handleClearSelection = () => {
      setSelectedPolicyIds(new Set());
  };

  const handleSelectOne = (id: string) => {
      const next = new Set(selectedPolicyIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedPolicyIds(next);
  };

  // Navigation Logic for Details View
  const handleRowClick = (clickedPolicyId: string) => {
      let queue: string[] = [];
      let startIndex = 0;

      if (selectedPolicyIds.size > 0) {
          if (selectedPolicyIds.has(clickedPolicyId)) {
               queue = Array.from(selectedPolicyIds);
               startIndex = queue.indexOf(clickedPolicyId);
          } else {
               queue = processTableData.map(p => p.policy_id);
               startIndex = queue.indexOf(clickedPolicyId);
          }
      } else {
           queue = processTableData.map(p => p.policy_id);
           startIndex = queue.indexOf(clickedPolicyId);
      }

      navigate('/policies/details', { state: { queue, startIndex } });
  };

  const handleExportCSV = () => {
    const selectedData = processTableData.filter(s => selectedPolicyIds.has(s.policy_id));
    if (selectedData.length === 0) return;

    const headers = ['Client', 'Policy Number', 'Carrier', 'Product', 'Premium', 'Status', 'Paid Status', 'Effective Date', 'Agent'];
    const csvContent = [
        headers.join(','),
        ...selectedData.map(row => [
            `"${row.client}"`,
            `"${row.policy_number || ''}"`,
            `"${row.carrier}"`,
            `"${row.carrier_product}"`,
            row.annual_premium,
            row.status,
            row.paid_status || 'Unpaid',
            `"${row.initial_draft_date}"`,
            `"${row.agent_name}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `policies_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeletePolicy = async () => {
    if (!policyToDelete || !deleteReason.trim()) return;
    
    setIsDeleting(true);
    try {
        await agentPoliciesApi.deletePolicy(policyToDelete.policy_id, deleteReason);
        setPolicyToDelete(null);
        setDeleteReason('');
        // Refresh the list
        fetchPolicies();
    } catch (error) {
        console.error("Delete failed", error);
        alert("Failed to delete policy. Please try again.");
    } finally {
        setIsDeleting(false);
    }
  };

  if (!hasAgentProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
           <UserX className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Agent Profile Connected</h2>
        <p className="text-slate-500 max-w-md text-center">
          You are not currently impersonating an agent. Switch to an agent profile from the context menu to view policies.
        </p>
      </div>
    );
  }

  // Metrics Calculation
  const approvedPolicies = policies.filter(p => STATUS_GROUPS.APPROVED.includes(p.status));
  const underwritingPolicies = policies.filter(p => p.status === 'Underwriting');
  
  const totalPremium = policies.reduce((acc, curr) => acc + (curr.annual_premium || 0), 0);
  const approvedPremium = approvedPolicies.reduce((acc, curr) => acc + (curr.annual_premium || 0), 0);
  const underwritingPremium = underwritingPolicies.reduce((acc, curr) => acc + (curr.annual_premium || 0), 0);

  const actionItems = useMemo(() => {
    const items = policies.filter(p => ACTION_STATUSES.some(s => p.status.toLowerCase().includes(s.toLowerCase())));
    const counts = items.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return { items, counts };
  }, [policies]);
  
  const totalActionCount = actionItems.items.length;

  const topCarriers = useMemo(() => {
      const map = new Map<string, number>();
      policies.forEach(p => {
          map.set(p.carrier, (map.get(p.carrier) || 0) + (p.annual_premium || 0));
      });
      return Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
  }, [policies]);

  const toggleFilter = (filter: string | 'GROUP_APPROVED' | 'GROUP_PENDING' | 'Underwriting') => {
      setActiveStatusFilter(current => current === filter ? null : filter);
  };

  const getActionIcon = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('decline') || s.includes('cancel')) return <XCircle className="w-4 h-4" />;
      if (s.includes('taken')) return <Ban className="w-4 h-4" />;
      if (s.includes('lapsed')) return <FileWarning className="w-4 h-4" />;
      return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Delete Modal */}
      {policyToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-500/5">
                    <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Policy?</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                    You are deleting the policy for <span className="font-bold text-slate-900">{policyToDelete.client}</span>. Please provide a reason.
                </p>
                
                <div className="w-full space-y-4 mb-8 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason for deletion</label>
                    <textarea 
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Required..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-200 transition-all placeholder:text-slate-300 resize-none"
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                        onClick={() => { setPolicyToDelete(null); setDeleteReason(''); }}
                        className="py-4 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                    >
                        Keep Policy
                    </button>
                    <button 
                        onClick={handleDeletePolicy}
                        disabled={!deleteReason.trim() || isDeleting}
                        className="py-4 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Portfolio</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Metrics for <span className="font-bold text-slate-800">{viewingAgentName}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <MainDateRangeSelector value={dateRange} onChange={setDateRange} />
            <div className="relative group">
                <button disabled className="flex items-center gap-2 bg-slate-100 text-slate-300 px-5 py-3 rounded-2xl text-sm font-bold border border-slate-200 cursor-not-allowed">
                    <Plus className="w-4 h-4" />
                    <span>New Policy</span>
                </button>
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap border-2 border-white">
                    COMING SOON
                </div>
            </div>
          </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-6">
              <button 
                  onClick={() => toggleFilter('GROUP_APPROVED')}
                  className={`flex-1 p-6 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden transition-all text-left group
                      ${activeStatusFilter === 'GROUP_APPROVED' 
                          ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 scale-[1.02]' 
                          : 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-100'
                      }`}
              >
                  <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeStatusFilter === 'GROUP_APPROVED' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-500'}`}>
                          <CheckCircle className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <ArrowUpRight className={`w-5 h-5 ${activeStatusFilter === 'GROUP_APPROVED' ? 'text-white/70' : 'text-slate-300'}`} />
                  </div>
                  <div>
                        <h3 className={`text-3xl font-extrabold mb-1 ${activeStatusFilter === 'GROUP_APPROVED' ? 'text-white' : 'text-slate-900'}`}>${approvedPremium.toLocaleString('en-US', { notation: 'compact' })}</h3>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold uppercase tracking-wider ${activeStatusFilter === 'GROUP_APPROVED' ? 'text-emerald-100' : 'text-slate-400'}`}>Approved</p>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${activeStatusFilter === 'GROUP_APPROVED' ? 'bg-white text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                              {approvedPolicies.length}
                          </span>
                        </div>
                  </div>
              </button>

              <button 
                  onClick={() => toggleFilter('Underwriting')}
                  className={`flex-1 p-6 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden transition-all text-left group
                      ${activeStatusFilter === 'Underwriting' 
                          ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30 scale-[1.02]' 
                          : 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-100'
                      }`}
              >
                  <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeStatusFilter === 'Underwriting' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'}`}>
                          <Clock className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <ArrowUpRight className={`w-5 h-5 ${activeStatusFilter === 'Underwriting' ? 'text-white/70' : 'text-slate-300'}`} />
                  </div>
                  <div>
                        <h3 className={`text-3xl font-extrabold mb-1 ${activeStatusFilter === 'Underwriting' ? 'text-white' : 'text-slate-900'}`}>${underwritingPremium.toLocaleString('en-US', { notation: 'compact' })}</h3>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold uppercase tracking-wider ${activeStatusFilter === 'Underwriting' ? 'text-blue-100' : 'text-slate-400'}`}>Underwriting</p>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${activeStatusFilter === 'Underwriting' ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                              {underwritingPolicies.length}
                          </span>
                        </div>
                  </div>
              </button>
          </div>

          <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/30 group">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                            Total Production
                          </p>
                          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mt-2">
                            ${totalPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                          </h2>
                      </div>
                  </div>
                  
                  <div className="flex-1 min-h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={SPARKLINE_DATA}>
                            <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#fff' }}
                                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#f59e0b" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorVal)" 
                            />
                        </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.02)] flex flex-col relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
              
              <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                      <PieChartIcon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-900 text-lg">Carrier Mix</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Distribution</p>
                  </div>
              </div>
              
              <div className="flex-1 min-h-[200px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                            data={topCarriers}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            cornerRadius={10}
                            stroke="none"
                          >
                            {topCarriers.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CARRIER_COLORS[index % CARRIER_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                             itemStyle={{ color: '#fff' }}
                             formatter={(value: number) => `$${value.toLocaleString()}`}
                          />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-4">
                      <span className="text-3xl font-black text-slate-900">{topCarriers.length}</span>
                  </div>
              </div>
          </div>
      </div>

      {totalActionCount > 0 && (
          <div className="relative rounded-[2.5rem] bg-gradient-to-r from-red-500 to-pink-600 shadow-xl shadow-red-500/20 overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 p-6 md:p-8 text-white">
                  <div className="flex items-center gap-4 shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 animate-pulse">
                          <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                          <h3 className="text-lg font-extrabold tracking-tight">Attention Required</h3>
                          <p className="text-white/80 text-sm font-medium">{totalActionCount} policies need your immediate action</p>
                      </div>
                  </div>
                  <div className="hidden md:block w-px h-12 bg-white/20 mx-4"></div>
                  <div className="flex flex-wrap gap-3 flex-1">
                      {Object.entries(actionItems.counts).map(([status, count]) => (
                          <button
                              key={status}
                              onClick={() => toggleFilter(status)}
                              className={`
                                  flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all backdrop-blur-sm
                                  ${activeStatusFilter === status 
                                      ? 'bg-white text-red-600 border-white shadow-lg scale-105' 
                                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
                                  }
                              `}
                          >
                              {getActionIcon(status)}
                              <span>{status}</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeStatusFilter === status ? 'bg-red-100 text-red-600' : 'bg-white/20 text-white'} font-black`}>
                                  {count}
                              </span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
          <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-30">
              <div className="flex items-center gap-4 min-w-max">
                  <div className={`p-3 rounded-2xl transition-colors shadow-sm ${activeStatusFilter ? 'bg-brand-500 text-white shadow-brand-500/30' : 'bg-slate-100 text-slate-500'}`}>
                      {activeStatusFilter ? <Filter className="w-5 h-5" /> : <FileWarning className="w-5 h-5" />}
                  </div>
                  <div>
                        <h3 className="text-lg font-bold text-slate-900">Policy List</h3>
                        {activeStatusFilter && (
                          <p className="text-xs font-bold text-brand-500 uppercase tracking-wide animate-in slide-in-from-left-2 mt-0.5">
                              Filtered by: {activeStatusFilter.replace('GROUP_', '')}
                          </p>
                        )}
                  </div>
              </div>
              
              {/* FILTERS ROW */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto overflow-visible">
                  <div className="relative w-full sm:w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                          type="text" 
                          placeholder="Search clients..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-700 placeholder:text-slate-400 shadow-sm"
                      />
                  </div>

                  <div className="w-full sm:w-[160px]">
                      <MultiSelectDropdown 
                          label="Carriers" 
                          options={carriers} 
                          selected={selectedCarriers} 
                          onChange={setSelectedCarriers} 
                      />
                  </div>

                  <div className="w-full sm:w-[160px]">
                      <MultiSelectDropdown 
                          label="Paid Status" 
                          options={['Paid', 'Unpaid']} 
                          selected={selectedPaidStatus} 
                          onChange={setSelectedPaidStatus} 
                          icon={<DollarSign className="w-3.5 h-3.5 text-slate-400" />}
                      />
                  </div>

                  <div className="w-full sm:w-[180px]">
                      <SimpleDateRangePicker 
                          value={effectiveDateRange} 
                          onChange={setEffectiveDateRange}
                          placeholder="Effective Date"
                      />
                  </div>
                  
                  {(activeStatusFilter || selectedCarriers.length > 0 || selectedPaidStatus.length > 0 || effectiveDateRange || searchTerm) && (
                      <button 
                          onClick={() => {
                              setActiveStatusFilter(null);
                              setSelectedCarriers([]);
                              setSelectedPaidStatus([]);
                              setEffectiveDateRange(null);
                              setSearchTerm('');
                          }}
                          className="h-11 w-11 flex-shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 transition-colors flex items-center justify-center shadow-sm"
                          title="Reset Filters"
                      >
                          <RefreshCw className="w-4 h-4" />
                      </button>
                  )}

                  <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 ml-2">
                    {(['All', 'Unlocked', 'Locked'] as const).map((tab) => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
              </div>
          </div>
          
          {selectedPolicyIds.size > 0 && !isAllSelected && (
              <div className="bg-blue-50 border-b border-blue-100 py-3 text-center text-sm font-medium text-blue-800 animate-in fade-in slide-in-from-top-1">
                  <span className="font-bold">{selectedPolicyIds.size}</span> items selected on this page. 
                  <button 
                      onClick={handleSelectAllGlobal}
                      className="font-bold underline hover:text-blue-900 ml-1 decoration-blue-800"
                  >
                      Select all {processTableData.length} items
                  </button>
              </div>
          )}
          
          {isAllSelected && selectedPolicyIds.size > 0 && (
              <div className="bg-blue-50 border-b border-blue-100 py-3 text-center text-sm font-medium text-blue-800 animate-in fade-in slide-in-from-top-1">
                  All <span className="font-bold">{processTableData.length}</span> items selected. 
                  <button 
                      onClick={handleClearSelection}
                      className="font-bold underline hover:text-blue-900 ml-1 decoration-blue-800"
                  >
                      Clear selection
                  </button>
              </div>
          )}
          
          <div className="overflow-hidden rounded-b-[2.5rem]">
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-slate-400 border-b border-slate-100/50">
                    <th className="py-5 pl-8 w-10">
                        <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" 
                            checked={isPageSelected}
                            onChange={handleSelectPage}
                        />
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('client')}>
                        <div className="flex items-center gap-1">Client & Date <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'client' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('agent_name')}>
                        <div className="flex items-center gap-1">Agent <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'agent_name' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('policy_number')}>
                        <div className="flex items-center gap-1">Policy No. <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'policy_number' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('carrier')}>
                        <div className="flex items-center gap-1">Carrier / Product <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'carrier' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('initial_draft_date')}>
                        <div className="flex items-center gap-1">Eff. Date <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'initial_draft_date' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('annual_premium')}>
                        <div className="flex items-center gap-1">Premium <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'annual_premium' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">Status <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'status' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} /></div>
                    </th>
                    <th className="py-5 px-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loadingPolicies ? (
                    <tr>
                        <td colSpan={9} className="py-12 text-center">
                        <div className="flex items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm font-medium">Loading policies...</span>
                        </div>
                        </td>
                    </tr>
                    ) : paginatedData.length > 0 ? (
                    paginatedData.map((policy) => {
                        const isSelected = selectedPolicyIds.has(policy.policy_id);
                        return (
                        <tr 
                            key={policy.policy_id} 
                            className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-brand-50/30' : ''}`}
                            onClick={() => handleRowClick(policy.policy_id)}
                        >
                        <td className="py-5 pl-8">
                            <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" 
                                checked={isSelected}
                                onChange={() => handleSelectOne(policy.policy_id)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </td>
                        <td className="py-5 px-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm">{policy.client}</span>
                                <span className="text-[11px] text-slate-400 font-bold mt-0.5">{formatDate(policy.created_at)}</span>
                            </div>
                        </td>
                        <td className="py-5 px-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] border border-slate-200">
                                    {getInitials(policy.agent_name || 'Unknown Agent')}
                                </div>
                                <span className="text-xs font-bold text-slate-700">{policy.agent_name || 'Unknown'}</span>
                            </div>
                        </td>
                        <td className="py-5 px-4">
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 font-mono">
                                    #{policy.policy_number || 'PENDING'}
                                </span>
                                {policy.isLocked ? (
                                    <Lock className="w-3 h-3 text-slate-400" />
                                ) : (
                                    <Unlock className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusStyles(policy.status)}`}>
                                {policy.status}
                                </span>
                                {policy.paid_status && (
                                <span className="text-[10px] font-bold text-slate-500 px-1 mt-0.5">
                                    {policy.paid_status}
                                </span>
                                )}
                            </div>
                        </td>
                        <td className="py-5 px-4 text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                                {!policy.isLocked && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPolicyToDelete(policy);
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                        title="Delete Policy"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button className="text-slate-300 hover:text-brand-500 transition-colors p-2 rounded-full hover:bg-slate-100 group-hover:bg-white group-hover:shadow-sm">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                        </tr>
                    )})
                    ) : (
                    <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                            No policies found for this selection.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
            
            <div className="p-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900">{paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="text-slate-900">{Math.min(currentPage * rowsPerPage, processTableData.length)}</span> of <span className="text-slate-900">{processTableData.length}</span> entries
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
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">
                            Page {currentPage}
                        </span>
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
          </div>
          
          {selectedPolicyIds.size > 0 && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <div className="flex items-center gap-2">
                      <span className="bg-brand-500 text-slate-900 text-xs font-black px-2 py-0.5 rounded-md">{selectedPolicyIds.size}</span>
                      <span className="text-sm font-bold">Selected</span>
                  </div>
                  <div className="h-4 w-px bg-slate-700"></div>
                  <button 
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
                  >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};
