import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Check,
  RefreshCw,
  User,
  Users,
  Briefcase,
  X,
  Download,
  LayoutGrid,
  Lock,
  Unlock,
  MessageSquare,
  FileText,
  DollarSign,
  Send,
  Plus,
  Mail,
  Pencil
} from 'lucide-react';
import { useAgencyContext } from '../context/AgencyContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  agencyDebtsApi, 
  AgencyDebtSummary, 
  AgencyDebtRecord, 
  DebtComment,
  AgentWithEmail,
  CarrierMeta
} from '../services/agencyDebtsApi';

// --- TYPES ---
interface DateRange {
  start: number;
  end: number;
  label: string;
}

type SortConfig = {
  key: keyof AgencyDebtRecord;
  direction: 'asc' | 'desc';
};

// --- UTILS ---
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getDateRange = (type: 'today' | 'weekly' | 'monthly' | 'yearly' | 'all'): DateRange => {
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

    if (type === 'all') {
        return { start: 0, end: end.getTime(), label: 'All Time' };
    }
    
    return { start: start.getTime(), end: end.getTime(), label: 'Custom' };
};

const formatDate = (timestamp: number | string) => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        const [y, m, d] = timestamp.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- REUSABLE COMPONENTS ---

const CustomDateRangePicker: React.FC<{
    value: DateRange | null;
    onChange: (range: DateRange | null) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Filter by Date" }) => {
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

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

    const handleDateClick = (date: Date) => {
        if (!selectionStart || (selectionStart && selectionEnd)) {
            setSelectionStart(date);
            setSelectionEnd(null);
        } else {
            let start = selectionStart;
            let end = date;
            if (date < selectionStart) {
                start = date;
                end = selectionStart;
            }
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            
            setSelectionStart(start);
            setSelectionEnd(end);
            onChange({
                start: start.getTime(),
                end: end.getTime(),
                label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
            });
            setTimeout(() => setIsOpen(false), 200);
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
        <div className="relative z-[60]" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''} min-w-[200px]`}
            >
                <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${value ? 'text-brand-500' : 'text-slate-400'}`} />
                    <span className="max-w-[120px] truncate">{value ? value.label : placeholder}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-4 min-w-[280px] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['S','M','T','W','T','F','S'].map(d => (
                            <div key={d} className="text-[10px] font-black text-slate-300 text-center py-1">{d}</div>
                        ))}
                        {generateCalendar().map((date, i) => (
                            <div key={i} className="aspect-square flex items-center justify-center">
                                {date ? (
                                    <button
                                        onClick={() => handleDateClick(date)}
                                        className={`w-full h-full flex items-center justify-center rounded-lg text-[11px] font-bold transition-all
                                            ${isSelected(date) ? 'bg-brand-500 text-white shadow-md' : isInRange(date) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}
                                        `}
                                    >
                                        {date.getDate()}
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => { onChange(getDateRange('today')); setIsOpen(false); }} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">Today</button>
                            <button onClick={() => { onChange(getDateRange('weekly')); setIsOpen(false); }} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">Weekly</button>
                            <button onClick={() => { onChange(getDateRange('monthly')); setIsOpen(false); }} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">Monthly</button>
                            <button onClick={() => { onChange(getDateRange('all')); setIsOpen(false); }} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">All Time</button>
                        </div>
                        <button onClick={() => { onChange(null); setSelectionStart(null); setSelectionEnd(null); setIsOpen(false); }} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest mt-2">Clear Selection</button>
                    </div>
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
    const [search, setSearch] = useState('');
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
            onChange(selected.filter(o => o !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative z-[60]" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''} ${selected.length > 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : ''} min-w-[180px]`}
            >
                {icon}
                <span className="max-w-[120px] truncate">{selected.length > 0 ? `${selected.length} ${label}` : `All ${label}`}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[220px] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    <div className="px-2 py-2 mb-2 border-b border-slate-50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-2 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-1 space-y-0.5">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => {
                            const isSelected = selected.includes(option);
                            return (
                                <button 
                                    key={option}
                                    onClick={() => toggleOption(option)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <span className="truncate pr-2">{option}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                                </button>
                            );
                        }) : (
                            <div className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Results</div>
                        )}
                    </div>
                    {selected.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-50 text-center">
                            <button onClick={() => onChange([])} className="text-[10px] font-black text-brand-600 hover:text-brand-800 uppercase tracking-widest">Clear Selection</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- SINGLE DATE PICKER FOR MODAL ---
const SingleDatePicker: React.FC<{
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Date" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

    const handleDateClick = (date: Date) => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
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

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-full bg-transparent outline-none text-slate-900 flex items-center justify-between cursor-pointer"
            >
                <span className="truncate">{value ? formatDate(value) : <span className="text-slate-400 font-normal">{placeholder}</span>}</span>
                <Calendar className={`w-4 h-4 text-slate-400`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[280px] z-[110] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5 origin-top">
                    <div className="flex items-center justify-between mb-4 bg-slate-50 p-2 rounded-xl">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-[11px] font-black text-navy-900 uppercase tracking-widest">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold text-slate-300">
                        {['S','M','T','W','T','F','S'].map(d => <span key={d}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendar().map((date, i) => {
                            if (!date) return <div key={i} />;
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            const isSelected = value === dateStr;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateClick(date)}
                                    className={`aspect-square flex items-center justify-center rounded-xl text-[10px] font-bold transition-all ${isSelected ? 'bg-brand-500 text-white shadow-xl' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SEARCHABLE DROPDOWN COMPONENT ---
const SearchableDropdown: React.FC<{
    label: string;
    value: string;
    options: { id: string; label: string; email?: string }[];
    onChange: (id: string, fullObj?: any) => void;
    placeholder?: string;
    icon?: React.ReactNode;
}> = ({ label, value, options, onChange, placeholder, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
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

    const selectedOption = options.find(o => o.id === value);
    const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-all ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500 bg-white shadow-sm' : ''}`}
            >
                {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
                <span className="flex-1 text-left truncate">{selectedOption?.label || <span className="text-slate-400 font-medium">{placeholder}</span>}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                placeholder="Search..."
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    onChange(opt.id, opt);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] font-bold transition-all ${value === opt.id ? 'bg-navy-900 text-brand-400' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <span className="truncate pr-4">{opt.label}</span>
                                {value === opt.id && <Check className="w-4 h-4" />}
                            </button>
                        )) : (
                            <div className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase">No Results</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CREATE DEBT MODAL ---
const CreateDebtModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [agents, setAgents] = useState<AgentWithEmail[]>([]);
    const [carriers, setCarriers] = useState<CarrierMeta[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(false);

    const [form, setForm] = useState({
        statement_date: '',
        agent_id: '',
        email: '',
        amount: '',
        carrier_id: ''
    });

    useEffect(() => {
        if (isOpen) {
            setLoadingMeta(true);
            Promise.all([
                agencyDebtsApi.getAgentsWithEmail(),
                agencyDebtsApi.getCarriers()
            ]).then(([agentsData, carriersData]) => {
                setAgents(agentsData);
                setCarriers(carriersData);
            }).catch(console.error).finally(() => setLoadingMeta(false));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.statement_date || !form.agent_id || !form.amount || !form.carrier_id) {
            alert("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        try {
            const [y, m, d] = form.statement_date.split('-').map(Number);
            const now = new Date();
            const ts = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).getTime();

            const payload = {
                statement_date: ts,
                agent_id: form.agent_id,
                email: form.email,
                amount: parseFloat(form.amount),
                carrier_id: form.carrier_id
            };

            await agencyDebtsApi.createDebtRecord(payload);
            onSuccess();
            onClose();
            setForm({ statement_date: '', agent_id: '', email: '', amount: '', carrier_id: '' });
        } catch (error) {
            console.error("Create failed", error);
            alert("Failed to create debt record.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Use explicit value checks to prevent button disabling when valid data exists
    const isFormValid = Boolean(form.statement_date) && 
                        Boolean(form.agent_id) && 
                        Boolean(form.amount) && 
                        Boolean(form.carrier_id);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Create Debt Record</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manual liability entry</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Statement Date</label>
                            <div className="h-11 border border-slate-100 rounded-xl px-4 bg-slate-50">
                                <SingleDatePicker 
                                    value={form.statement_date} 
                                    onChange={(date) => setForm(prev => ({ ...prev, statement_date: date }))} 
                                />
                            </div>
                        </div>

                        <div className="h-20">
                            <SearchableDropdown 
                                label="Target Agent"
                                value={form.agent_id}
                                options={agents}
                                placeholder="Select Agent..."
                                icon={<User className="w-4 h-4" />}
                                onChange={(id, full) => setForm(prev => ({ ...prev, agent_id: id, email: full?.email || '' }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Agent Email (Optional)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-brand-500" />
                                <input 
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="agent@email.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="h-20">
                            <SearchableDropdown 
                                label="Insurance Carrier"
                                value={form.carrier_id}
                                options={carriers}
                                placeholder="Select Carrier..."
                                icon={<Briefcase className="w-4 h-4" />}
                                onChange={(id) => setForm(prev => ({ ...prev, carrier_id: id }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Debt Amount ($)</label>
                            <div className="relative group">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-brand-500" />
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl text-xs font-black text-slate-500 hover:text-navy-900 transition-colors">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={submitting || !isFormValid}
                            className="flex-[2] py-4 px-8 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black shadow-xl shadow-navy-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Initialize Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

export const AgencyDebts: React.FC = () => {
  const { activeAgency } = useAgencyContext();
  const { user } = useAuth();
  const [summary, setSummary] = useState<AgencyDebtSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table & Records States
  const [records, setRecords] = useState<AgencyDebtRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'statement_date', direction: 'desc' });
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer State
  const [selectedDebt, setSelectedDebt] = useState<AgencyDebtRecord | null>(null);
  const [isEditingDrawer, setIsEditingDrawer] = useState(false);
  const [drawerForm, setDrawerForm] = useState({
      statement_date: '',
      agent_id: '',
      amount: '',
      carrier_id: ''
  });
  const [agents, setAgents] = useState<AgentWithEmail[]>([]);
  const [carriers, setCarriers] = useState<CarrierMeta[]>([]);
  const [loadingDrawerMeta, setLoadingDrawerMeta] = useState(false);
  const [updatingDrawer, setUpdatingDrawer] = useState(false);

  const [comments, setComments] = useState<DebtComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // UI Sidebar states
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Initial Summary Fetch
  const fetchSummary = () => {
    if (activeAgency?.agencyId) {
        setLoadingSummary(true);
        agencyDebtsApi.getDebtSummary(activeAgency.agencyId)
          .then(setSummary)
          .catch(err => {
            console.error(err);
            setError("Failed to load debt summary.");
          })
          .finally(() => setLoadingSummary(false));
      }
  };

  // Initial Records Fetch
  const fetchRecords = () => {
    if (activeAgency?.agencyId) {
        setLoadingRecords(true);
        agencyDebtsApi.getDebtRecords(activeAgency.agencyId, statusFilter)
          .then(data => {
              setRecords(data);
              setSelectedIds(new Set()); // Reset selection when data changes
          })
          .catch(err => console.error(err))
          .finally(() => setLoadingRecords(false));
      }
  };

  useEffect(() => {
    fetchSummary();
  }, [activeAgency]);

  useEffect(() => {
    fetchRecords();
  }, [activeAgency, statusFilter]);

  // Fetch comments when a record is selected
  useEffect(() => {
      if (selectedDebt) {
          setLoadingComments(true);
          setComments([]);
          agencyDebtsApi.getDebtComments(selectedDebt.id)
            .then(setComments)
            .catch(err => console.error(err))
            .finally(() => setLoadingComments(false));
      }
  }, [selectedDebt]);

  useEffect(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, selectedCarriers, selectedAgentIds, dateRange, rowsPerPage]);

  // Derive Filters from Data
  const carrierOptions = useMemo(() => Array.from(new Set(records.map(r => r.carrier))).sort(), [records]);

  // Sidebar Agent Rollup
  const agentRollup = useMemo(() => {
    const map = new Map<string, { id: string, name: string, total: number, count: number }>();
    records.forEach(r => {
        const id = r.agentOndebt_id;
        if (!map.has(id)) {
            map.set(id, { id, name: r.agentOndebt_name, total: 0, count: 0 });
        }
        const entry = map.get(id)!;
        entry.total += r.amount;
        entry.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records]);

  const filteredAgentRollup = useMemo(() => {
    if (!sidebarSearch) return agentRollup;
    return agentRollup.filter(a => a.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
  }, [agentRollup, sidebarSearch]);

  // Main Table Processing
  const processedData = useMemo(() => {
    let data = [...records];

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        data = data.filter(r => 
            r.agentOndebt_name.toLowerCase().includes(lower) || 
            r.carrier.toLowerCase().includes(lower) ||
            r.created_by.toLowerCase().includes(lower)
        );
    }

    if (selectedCarriers.length > 0) {
        data = data.filter(r => selectedCarriers.includes(r.carrier));
    }

    if (selectedAgentIds.length > 0) {
        data = data.filter(r => selectedAgentIds.includes(r.agentOndebt_id));
    }

    if (dateRange) {
        data = data.filter(r => r.statement_date >= dateRange.start && r.statement_date <= dateRange.end);
    }

    if (sortConfig) {
        data.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return data;
  }, [records, searchTerm, selectedCarriers, selectedAgentIds, dateRange, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return processedData.slice(start, start + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const handleSort = (key: keyof AgencyDebtRecord) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleAgentSidebarClick = (id: string) => {
    if (selectedAgentIds.includes(id)) {
        setSelectedAgentIds(selectedAgentIds.filter(a => a !== id));
    } else {
        setSelectedAgentIds([...selectedAgentIds, id]);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCarriers([]);
    setSelectedAgentIds([]);
    setDateRange(null);
  };

  const handlePageChange = (p: number) => {
      if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  // --- SELECTION HANDLERS ---
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedIds.has(r.id));
  const isAllSelectedGlobal = processedData.length > 0 && selectedIds.size === processedData.length;

  const togglePageSelection = () => {
      const next = new Set(selectedIds);
      if (isPageSelected) {
          paginatedData.forEach(r => next.delete(r.id));
      } else {
          paginatedData.forEach(r => next.add(r.id));
      }
      setSelectedIds(next);
  };

  const selectAllGlobal = () => {
      setSelectedIds(new Set(processedData.map(r => r.id)));
  };

  const toggleRecordSelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleExportCSV = () => {
      const dataToExport = processedData.filter(r => selectedIds.has(r.id));
      if (dataToExport.length === 0) return;

      const headers = ['Status', 'Carrier', 'Agent', 'Amount', 'Statement Date', 'Created By'];
      const rows = dataToExport.map(r => [
          r.isResolved ? 'Resolved' : 'Active',
          r.carrier,
          r.agentOndebt_name,
          r.amount,
          formatDate(r.statement_date),
          r.created_by
      ].join(','));

      const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `agency_debts_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleToggleResolution = async () => {
      if (!selectedDebt) return;
      setIsResolving(true);
      try {
          const nextState = !selectedDebt.isResolved;
          await agencyDebtsApi.resolveDebt(selectedDebt.id, nextState);
          
          // Update local records state
          setRecords(prev => prev.map(r => r.id === selectedDebt.id ? { ...r, isResolved: nextState } : r));
          
          // Update selected debt state to reflect in drawer immediately
          setSelectedDebt({ ...selectedDebt, isResolved: nextState });
          
          // Refresh summary totals
          fetchSummary();
      } catch (err) {
          console.error("Resolution toggle failed", err);
          alert("Failed to update resolution status.");
      } finally {
          setIsResolving(false);
      }
  };

  const handleSendComment = async () => {
      if (!newComment.trim() || !selectedDebt) return;
      setSendingComment(true);
      try {
          const addedComment = await agencyDebtsApi.createDebtComment(selectedDebt.id, newComment);
          // Constructor optimistic comment if API doesn't return full object with current user
          const optimisticComment: DebtComment = {
              ...addedComment,
              message: addedComment.message || newComment,
              created_at: addedComment.created_at || Date.now(),
              _commentby: addedComment._commentby || {
                  id: user?.id || 'me',
                  first_name: user?.name.split(' ')[0] || 'Me',
                  last_name: user?.name.split(' ')[1] || ''
              }
          };
          setComments(prev => [...prev, optimisticComment]);
          setNewComment('');
      } catch (err) {
          console.error("Failed to send comment", err);
          alert("Failed to add comment.");
      } finally {
          setSendingComment(false);
      }
  };

  // --- DRAWER EDIT HANDLERS ---
  const handleEditDrawer = () => {
      if (!selectedDebt) return;
      const d = new Date(selectedDebt.statement_date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      setDrawerForm({
          statement_date: dateStr,
          agent_id: selectedDebt.agentOndebt_id,
          amount: String(selectedDebt.amount),
          carrier_id: '' // Need to resolve carrier ID
      });

      setLoadingDrawerMeta(true);
      Promise.all([
          agencyDebtsApi.getAgentsWithEmail(),
          agencyDebtsApi.getCarriers()
      ]).then(([agentsData, carriersData]) => {
          setAgents(agentsData);
          setCarriers(carriersData);
          // Try to find the carrier ID based on label if not present
          const carrier = carriersData.find(c => c.label === selectedDebt.carrier);
          if (carrier) {
              setDrawerForm(prev => ({ ...prev, carrier_id: carrier.id }));
          }
      }).catch(console.error).finally(() => setLoadingDrawerMeta(false));
      
      setIsEditingDrawer(true);
  };

  const handleSaveDrawerEdit = async () => {
      if (!selectedDebt) return;
      setUpdatingDrawer(true);
      try {
          const [y, m, d] = drawerForm.statement_date.split('-').map(Number);
          const now = new Date();
          const ts = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).getTime();

          const payload = {
              statement_date: ts,
              amount: parseFloat(drawerForm.amount),
              carrier_id: drawerForm.carrier_id
          };

          const apiResponse = await agencyDebtsApi.updateDebtRecord(selectedDebt.id, payload);
          
          // Crucial: Re-construct record to prevent data loss if API response is partial
          const carrierObj = carriers.find(c => c.id === drawerForm.carrier_id);
          
          const updatedRecord: AgencyDebtRecord = {
              ...selectedDebt, // Existing stable fields (ID, agent name, etc)
              amount: payload.amount,
              statement_date: payload.statement_date,
              carrier: carrierObj?.label || selectedDebt.carrier
          };

          setSelectedDebt(updatedRecord);
          setRecords(prev => prev.map(r => r.id === selectedDebt.id ? updatedRecord : r));
          fetchSummary();
          setIsEditingDrawer(false);
      } catch (err) {
          console.error("Update failed", err);
          alert("Failed to update debt record.");
      } finally {
          setUpdatingDrawer(false);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <CreateDebtModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => { fetchRecords(); fetchSummary(); }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Debt Monitoring</h1>
            <p className="text-slate-500 font-medium">Tracking liability and recovery logs for <span className="font-bold text-slate-800">{activeAgency?.agencyName}</span></p>
        </div>
        <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-black shadow-xl shadow-navy-900/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
            <Plus className="w-4 h-4" strokeWidth={3} />
            New Debt Record
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <p className="font-bold">{error}</p>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Clickable Summary Cards */}
          {[
              { id: 'all', label: 'Total Exposure', amount: summary.overall.overalltotal, count: summary.overall.overallrecords, icon: ShieldAlert, color: 'red', bg: 'slate-900', textColor: 'white' },
              { id: 'unresolved', label: 'Unresolved Balances', amount: summary.unresolved.total_amount, count: summary.unresolved.records, icon: Clock, color: 'amber', bg: 'white', textColor: 'slate-900' },
              { id: 'resolved', label: 'Total Recovered', amount: summary.resolved.total_amount, count: summary.resolved.records, icon: CheckCircle2, color: 'emerald', bg: 'white', textColor: 'slate-900' }
          ].map((card) => (
              <div 
                key={card.id}
                onClick={() => setStatusFilter(card.id as any)}
                className={`rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl transition-all duration-500 group cursor-pointer border-2
                    ${statusFilter === card.id 
                        ? (card.color === 'red' ? 'border-brand-500 ring-4 ring-brand-500/10' : `border-${card.color}-500 ring-4 ring-${card.color}-500/10`) 
                        : 'border-transparent opacity-80 hover:opacity-100'
                    } ${card.bg === 'slate-900' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
              >
                <div className={`absolute top-0 right-0 w-48 h-48 bg-${card.color}-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2`}></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px]">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl border transition-colors ${statusFilter === card.id ? (card.bg === 'white' ? `bg-${card.color}-500 text-white border-${card.color}-600` : 'bg-brand-500 border-brand-600 text-white') : (card.bg === 'white' ? `bg-${card.color}-50 border-${card.color}-100 text-${card.color}-500` : `bg-white/10 border-white/10 text-${card.color}-400`)}`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                    {statusFilter === card.id && <ArrowUpRight className={`w-5 h-5 text-${card.color}-500`} />}
                  </div>

                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${card.bg === 'white' ? 'text-slate-400' : 'text-red-300'}`}>{card.label}</p>
                    <h2 className={`text-5xl font-black tracking-tighter mb-2`}>
                      {formatCurrency(card.amount)}
                    </h2>
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase ${card.bg === 'white' ? `bg-${card.color}-100 text-${card.color}-700` : 'text-slate-400'}`}>
                            {card.count} Records
                        </span>
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT SIDEBAR: AGENT ROLLUP */}
        <aside className="w-full xl:w-96 flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col xl:sticky xl:top-24 h-[750px] overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-900 text-white z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-500 rounded-2xl text-slate-900 shadow-lg shadow-brand-500/20">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight leading-none">Indebted Agents</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rollup by liability</p>
                    </div>
                </div>
                
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-400 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search team member..." 
                        value={sidebarSearch}
                        onChange={e => setSidebarSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-white/10 border border-white/10 rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-500 text-white"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
                {filteredAgentRollup.map(agent => {
                    const isSelected = selectedAgentIds.includes(agent.id);
                    return (
                        <button
                            key={agent.id}
                            onClick={() => handleAgentSidebarClick(agent.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden ${isSelected ? 'bg-white border-red-500 shadow-xl shadow-red-500/5 ring-1 ring-red-500' : 'bg-white hover:bg-slate-100 border border-slate-100'}`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border-2 transition-colors ${isSelected ? 'bg-red-500 border-red-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    {agent.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className={`font-black text-sm truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{agent.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-brand-600' : 'text-slate-400'}`}>{formatCurrency(agent.total)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{agent.count} Records</span>
                                    </div>
                                </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />}
                        </button>
                    );
                })}
                {filteredAgentRollup.length === 0 && (
                    <div className="py-20 text-center text-slate-300">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No matching agents</p>
                    </div>
                )}
            </div>
            <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAgentIds.length} Selected</span>
                {selectedAgentIds.length > 0 && <button onClick={() => setSelectedAgentIds([])} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors">Clear All</button>}
            </div>
        </aside>

        {/* MAIN RECORDS TABLE */}
        <main className="flex-1 w-full space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-t-[2.5rem]"></div>
                <div className="flex flex-wrap items-center gap-3">
                    <MultiSelectDropdown 
                        label="Carriers" 
                        options={carrierOptions} 
                        selected={selectedCarriers} 
                        onChange={setSelectedCarriers} 
                        icon={<Briefcase className="w-4 h-4 text-slate-400" />} 
                    />
                    <CustomDateRangePicker value={dateRange} onChange={setDateRange} />
                    
                    <div className="h-10 w-px bg-slate-100 mx-2 hidden lg:block"></div>

                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        {(['unresolved', 'resolved', 'all'] as const).map(f => (
                            <button 
                                key={f} 
                                onClick={() => setStatusFilter(f)} 
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={handleResetFilters} 
                    className="p-3 bg-slate-50 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-2xl border border-slate-100 transition-all shadow-sm"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative min-h-[600px] flex flex-col">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600 border border-red-100 shadow-sm">
                            <ShieldAlert className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Debt Records</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{processedData.length} entries matching current view</p>
                        </div>
                    </div>

                    <div className="relative w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by agent or carrier..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-400 text-slate-800"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                                <th className="py-5 pl-8 w-16">
                                    <button 
                                        onClick={togglePageSelection}
                                        className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isPageSelected ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'border-slate-300 bg-white hover:border-brand-300'}`}
                                    >
                                        {isPageSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                                    </button>
                                </th>
                                <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[120px]">Status</th>
                                <th 
                                    className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" 
                                    onClick={() => handleSort('carrier')}
                                >
                                    <div className="flex items-center gap-1.5">Carrier <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                </th>
                                <th 
                                    className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" 
                                    onClick={() => handleSort('agentOndebt_name')}
                                >
                                    <div className="flex items-center gap-1.5">Agent on Debt <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                </th>
                                <th 
                                    className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" 
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center gap-1.5">Amount <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                </th>
                                <th 
                                    className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" 
                                    onClick={() => handleSort('statement_date')}
                                >
                                    <div className="flex items-center gap-1.5">Statement Date <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                </th>
                                <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Created By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loadingRecords ? (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-400">
                                            <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                                            <p className="text-xs font-black uppercase tracking-widest">Loading Ledger...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map(record => {
                                    const isSelected = selectedIds.has(record.id);
                                    return (
                                        <tr 
                                            key={record.id} 
                                            onClick={() => { setSelectedDebt(record); setIsEditingDrawer(false); }}
                                            className={`hover:bg-slate-50/50 transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-brand-50/20 border-brand-500' : 'border-transparent'}`}
                                        >
                                            <td className="py-5 pl-8">
                                                <button 
                                                    onClick={(e) => toggleRecordSelection(e, record.id)}
                                                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'border-slate-300 bg-white group-hover:border-brand-300'}`}
                                                >
                                                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                                                </button>
                                            </td>
                                            <td className="py-5 px-4">
                                                {record.isResolved ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase border border-emerald-100">
                                                        <CheckCircle2 className="w-3 h-3" /> Resolved
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase border border-red-100">
                                                        <AlertCircle className="w-3 h-3" /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className="font-bold text-slate-900 text-sm">{record.carrier}</span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                                        {record.agentOndebt_name?.split(' ').map(n=>n[0]).join('') || '??'}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{record.agentOndebt_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className={`text-sm font-black ${record.isResolved ? 'text-slate-400' : 'text-red-600'}`}>
                                                    {formatCurrency(record.amount)}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                                    <span className="text-xs font-bold">{formatDate(record.statement_date)}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-500 italic">{record.created_by}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <ShieldAlert className="w-12 h-12 opacity-20" />
                                            <p className="text-sm font-black uppercase tracking-widest">No entries match your search</p>
                                            <button onClick={handleResetFilters} className="text-xs font-bold text-brand-500 hover:text-brand-700 underline">Clear active filters</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
      </div>

      {/* SIDE DRAWER */}
      {selectedDebt && (
          <div className="fixed inset-0 z-[200] flex justify-end">
              <div 
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                  onClick={() => setSelectedDebt(null)} 
              />
              <div className="relative w-full max-w-xl bg-[#F8F9FC] h-full shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-500 flex flex-col">
                  {/* Drawer Header */}
                  <div className="p-8 bg-white border-b border-slate-100 flex items-start justify-between shrink-0 relative">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-2.5 bg-red-50 rounded-xl text-red-600 shadow-sm border border-red-100">
                                  <ShieldAlert className="w-5 h-5" />
                              </div>
                              <h3 className="text-xl font-black text-slate-900 tracking-tight">Debt Audit Details</h3>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reference: {selectedDebt.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                          {!isEditingDrawer && !selectedDebt.isResolved && (
                            <button 
                                onClick={handleEditDrawer}
                                className="p-2.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-brand-500 transition-colors"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                          )}
                          <button onClick={() => setSelectedDebt(null)} className="p-2.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-navy-900 transition-colors">
                              <X className="w-6 h-6" />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-6 p-8 relative">
                      {isEditingDrawer ? (
                          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Statement Date</label>
                                      <div className="h-11 border border-slate-100 rounded-xl px-4 bg-slate-50">
                                          <SingleDatePicker 
                                              value={drawerForm.statement_date} 
                                              onChange={(date) => setDrawerForm(prev => ({ ...prev, statement_date: date }))} 
                                          />
                                      </div>
                                  </div>

                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Target Agent (Read Only)</label>
                                      <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500">
                                          <User className="w-4 h-4" />
                                          <span>{selectedDebt.agentOndebt_name}</span>
                                          <Lock className="w-3.5 h-3.5 ml-auto text-slate-300" />
                                      </div>
                                  </div>

                                  <div className="h-20">
                                      <SearchableDropdown 
                                          label="Insurance Carrier"
                                          value={drawerForm.carrier_id}
                                          options={carriers}
                                          placeholder="Select Carrier..."
                                          icon={<Briefcase className="w-4 h-4" />}
                                          onChange={(id) => setDrawerForm(prev => ({ ...prev, carrier_id: id }))}
                                      />
                                  </div>

                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Debt Amount ($)</label>
                                      <div className="relative group">
                                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-brand-500" />
                                          <input 
                                              type="number"
                                              step="0.01"
                                              value={drawerForm.amount}
                                              onChange={(e) => setDrawerForm(prev => ({ ...prev, amount: e.target.value }))}
                                              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                          />
                                      </div>
                                  </div>
                                  
                                  <div className="pt-4 flex gap-3">
                                      <button 
                                          onClick={() => setIsEditingDrawer(false)}
                                          className="flex-1 py-4 px-6 rounded-2xl text-xs font-black text-slate-500 hover:text-navy-900 transition-colors"
                                      >
                                          Cancel
                                      </button>
                                      <button 
                                          onClick={handleSaveDrawerEdit}
                                          disabled={updatingDrawer}
                                          className="flex-[2] py-4 px-8 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black shadow-xl shadow-navy-900/20 transition-all flex items-center justify-center gap-2"
                                      >
                                          {updatingDrawer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                          Save Changes
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <>
                              {/* Summary Stats */}
                              <div className="grid grid-cols-2 gap-4 shrink-0">
                                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exposure Amount</p>
                                      <p className={`text-2xl font-black ${selectedDebt.isResolved ? 'text-emerald-500' : 'text-red-600'}`}>{formatCurrency(selectedDebt.amount)}</p>
                                  </div>
                                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Statement Date</p>
                                      <p className="text-xl font-bold text-slate-900">{formatDate(selectedDebt.statement_date)}</p>
                                  </div>
                              </div>

                              {/* Resolution Toggle */}
                              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm shrink-0">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-xl transition-colors ${selectedDebt.isResolved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                              {selectedDebt.isResolved ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                          </div>
                                          <div>
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolution Status</p>
                                              <p className="text-sm font-black text-slate-900">{selectedDebt.isResolved ? 'Resolved' : 'Active / Unresolved'}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedDebt.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}</span>
                                          <button 
                                              onClick={handleToggleResolution}
                                              disabled={isResolving}
                                              className={`w-12 h-7 rounded-full transition-all relative flex items-center shadow-inner ${selectedDebt.isResolved ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                          >
                                              <span className={`w-5 h-5 bg-white rounded-full shadow-md absolute transition-transform duration-300 flex items-center justify-center ${selectedDebt.isResolved ? 'translate-x-6' : 'translate-x-1'}`}>
                                                  {isResolving && <Loader2 className="w-2.5 h-2.5 text-brand-500 animate-spin" />}
                                              </span>
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              {/* Info Panel */}
                              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 shrink-0">
                                  <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                                      <span className="text-xs font-bold text-slate-400 uppercase">Carrier</span>
                                      <span className="text-sm font-black text-slate-900">{selectedDebt.carrier}</span>
                                  </div>
                                  <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                                      <span className="text-xs font-bold text-slate-400 uppercase">Agent on Debt</span>
                                      <span className="text-sm font-black text-slate-900">{selectedDebt.agentOndebt_name}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-400 uppercase">Created By</span>
                                      <span className="text-sm font-black text-slate-900 italic">{selectedDebt.created_by}</span>
                                  </div>
                              </div>

                              {/* Comments Section */}
                              <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[400px] overflow-hidden">
                                  <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 shrink-0">
                                      <MessageSquare className="w-4 h-4 text-slate-400" />
                                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Audit Comments</h3>
                                  </div>

                                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20 scrollbar-hide">
                                      {loadingComments ? (
                                          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                              <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                              <p className="text-[10px] font-bold uppercase tracking-widest">Loading history...</p>
                                          </div>
                                      ) : comments.length > 0 ? (
                                          comments.map((c, i) => {
                                              const isMe = c._commentby?.id === user?.id;
                                              return (
                                                  <div key={i} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm shrink-0 mt-1 ${isMe ? 'bg-brand-500 text-white' : 'bg-slate-900 text-white'}`}>
                                                          {c._commentby?.first_name?.[0] || '?'}{c._commentby?.last_name?.[0] || '?'}
                                                      </div>
                                                      <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                          <div className={`flex items-center gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                              <span className="text-[10px] font-black text-slate-800">{c._commentby?.first_name} {c._commentby?.last_name}</span>
                                                              <span className="text-[9px] font-bold text-slate-400">{formatDate(c.created_at)}</span>
                                                          </div>
                                                          <div className={`px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isMe ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                                                              {c.message}
                                                          </div>
                                                      </div>
                                                  </div>
                                              )
                                          })
                                      ) : (
                                          <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-50">
                                              <MessageSquare className="w-12 h-12 mb-4" />
                                              <p className="text-xs font-bold uppercase">No comments yet</p>
                                          </div>
                                      )}
                                      <div ref={commentsEndRef}></div>
                                  </div>
                                  
                                  <div className="p-4 bg-white border-t border-slate-50 shrink-0">
                                      <div className="relative">
                                          <input 
                                              value={newComment}
                                              onChange={(e) => setNewComment(e.target.value)}
                                              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                              placeholder="Add a public note..."
                                              className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-medium text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white focus:border-brand-300 transition-all shadow-sm"
                                          />
                                          <button 
                                              onClick={handleSendComment}
                                              disabled={!newComment.trim() || sendingComment}
                                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-slate-300 hover:text-brand-500 transition-all hover:scale-110 active:scale-95 disabled:opacity-30"
                                          >
                                              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};