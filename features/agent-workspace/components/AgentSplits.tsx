import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Split, 
    UserX, 
    Calendar, 
    ChevronDown, 
    CheckCircle, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Users,
    TrendingUp,
    DollarSign,
    Lock,
    Search,
    Filter,
    Clock,
    MoreHorizontal,
    ArrowUpRight,
    AlertTriangle,
    XCircle,
    Ban,
    FileWarning,
    RefreshCw,
    BarChart3,
    ArrowUpDown,
    ListFilter,
    Check,
    X,
    Send,
    MessageSquare,
    Folder,
    Download
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
import { agentSplitsApi } from '../services/agentSplitsApi';
import { agentPolicyDetailsApi } from '../services/agentPolicyDetailsApi';
import { SplitPolicy } from '../../../shared/types/index';

interface DateRange {
    start: number;
    end: number;
    label: string;
}

interface PolicyComment {
    created_at: number;
    type: string;
    message: string;
    _commentby: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

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

// --- UNIFIED FILTER COMPONENTS ---

// Shared styles for filter buttons to ensure consistency
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

    // Sync internal state if prop changes externally (e.g. clear filter)
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
            
            // Auto close after selection
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
                <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
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

// --- DATA ACCESSORS ---

const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getStatusStyles = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approve')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('underwrit')) return 'bg-blue-100 text-blue-700';
    if (s.includes('cancel') || s.includes('decline')) return 'bg-red-100 text-red-700';
    if (s.includes('pending') || s.includes('follow')) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
};

// --- CONSTANTS ---
const STATUS_GROUPS = {
    APPROVED: ['Active', 'Approved', 'Paid'],
    PENDING: ['Pending', 'Underwriting', 'Submitted']
};

const ACTION_STATUSES = [
    'Follow up', 
    'Cancelled before draft', 
    'Declined', 
    'Lapsed Pending', 
    'Lapsed', 
    'Not Taken'
];

type SortConfig = {
    key: keyof SplitPolicy;
    direction: 'asc' | 'desc';
};

// --- SPLIT DETAILS DRAWER ---
const SplitDetailsDrawer: React.FC<{ 
    split: SplitPolicy; 
    onClose: () => void; 
}> = ({ split, onClose }) => {
    const [comments, setComments] = useState<PolicyComment[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (split.policy_id) {
            setLoadingComments(true);
            agentPolicyDetailsApi.getPublicComments(split.policy_id)
                .then(data => setComments(data))
                .catch(console.error)
                .finally(() => setLoadingComments(false));
        }
    }, [split.policy_id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const newComment = await agentPolicyDetailsApi.createComment(split.policy_id, newMessage);
            setComments(prev => [...prev, newComment]);
            setNewMessage('');
        } catch (e) {
            console.error("Failed to send comment", e);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#F8F9FC] shadow-2xl z-[110] transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Policy Details</h2>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusStyles(split.status)}`}>
                                {split.status}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
                            <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-500">#{split.policy_number || 'PENDING'}</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="p-8 pb-4 grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Client</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.client}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Premium</p>
                            <p className="font-black text-slate-900 text-xl">${split.annual_premium.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.carrier}</p>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{split.carrier_product}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Split Share</p>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-xl">{split.split_percentage}%</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 truncate max-w-[100px]">{split.agent_name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 mt-2 mb-6">
                         <div className="flex items-center gap-4">
                             <div className="h-px bg-slate-200 flex-1"></div>
                             <div className="flex items-center gap-2 text-slate-400">
                                 <Folder className="w-4 h-4" />
                                 <span className="text-xs font-bold uppercase tracking-widest">Public Notes</span>
                             </div>
                             <div className="h-px bg-slate-200 flex-1"></div>
                         </div>
                    </div>

                    <div className="px-8 pb-6 min-h-[300px]" ref={scrollRef}>
                        {loadingComments ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Syncing Notes...</span>
                            </div>
                        ) : comments.length > 0 ? (
                            <div className="space-y-6">
                                {comments.map((comment, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0 mt-1 shadow-sm">
                                            {comment._commentby.first_name[0]}{comment._commentby.last_name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-bold text-slate-900">{comment._commentby.first_name} {comment._commentby.last_name}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                                            </div>
                                            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl rounded-tl-none text-sm text-slate-600 shadow-sm leading-relaxed">
                                                {comment.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                   <MessageSquare className="w-7 h-7 text-slate-300" />
                                </div>
                                <span className="text-sm font-bold text-slate-500">No public notes yet.</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                    <div className="relative group">
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a public note..."
                            className="w-full bg-slate-50 border-0 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all shadow-sm hover:bg-slate-50/80"
                            disabled={sending}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <button 
                                onClick={handleSend}
                                disabled={!newMessage.trim() || sending}
                                className="p-2.5 rounded-xl text-white bg-slate-900 hover:bg-brand-50 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:shadow-brand-500/20 flex items-center justify-center transform active:scale-95 duration-200"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- MAIN DATE RANGE SELECTOR ---
const MainDateRangeSelector: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Range" }) => {
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
                onChange({ start: s.getTime(), end: e.getTime(), label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` });
                setIsOpen(false);
            } else {
                setSelectionEnd(date);
                const s = selectionStart;
                const e = date;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` });
                setIsOpen(false);
            }
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
              <span>{value.label || placeholder}</span>
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
                                  className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label === item ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
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

export const AgentSplits: React.FC = () => {
  const { currentAgentId, hasAgentProfile, viewingAgentName } = useAgentContext();
  const [splits, setSplits] = useState<SplitPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection State
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(new Set());
  const [selectedSplit, setSelectedSplit] = useState<SplitPolicy | null>(null);

  // Primary Time Filter
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('monthly'));
  
  // Filtering State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState('');
  
  // Chart View State
  const [chartView, setChartView] = useState<'trend' | 'partners'>('trend');

  // Table Filter State
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | 'GROUP_APPROVED' | 'GROUP_PENDING' | null>(null);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [selectedPaidStatus, setSelectedPaidStatus] = useState<string[]>([]);
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange | null>(null);
  
  // Sorting & Pagination
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (currentAgentId) {
        setLoading(true);
        agentSplitsApi.getSplits(currentAgentId, dateRange.start, dateRange.end)
            .then(data => {
                setSplits(data);
                // Clear selection on new data fetch to avoid stale IDs
                setSelectedSplitIds(new Set());
            })
            .catch(err => console.error("Failed to load splits", err))
            .finally(() => setLoading(false));
    }
  }, [currentAgentId, dateRange]);

  const partners = useMemo(() => {
    const map = new Map<string, { id: string; name: string; totalPremium: number; count: number }>();
    splits.forEach(s => {
        if (!s.agent_id) return; 
        if (!map.has(s.agent_id)) {
            map.set(s.agent_id, { id: s.agent_id, name: s.agent_name || 'Unknown Agent', totalPremium: 0, count: 0 });
        }
        const p = map.get(s.agent_id)!;
        p.totalPremium += s.annual_premium || 0;
        p.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.totalPremium - a.totalPremium);
  }, [splits]);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const baseFilteredSplits = splits.filter(s => {
    if (selectedPartnerId && s.agent_id !== selectedPartnerId) return false;
    return true;
  });

  const carriers = useMemo(() => {
      const unique = new Set(splits.map(s => s.carrier).filter(Boolean));
      return Array.from(unique).sort();
  }, [splits]);

  const processTableData = useMemo(() => {
      let data = [...baseFilteredSplits];

      if (activeStatusFilter) {
          data = data.filter(s => {
              if (activeStatusFilter === 'GROUP_APPROVED') return STATUS_GROUPS.APPROVED.includes(s.status);
              if (activeStatusFilter === 'GROUP_PENDING') return STATUS_GROUPS.PENDING.includes(s.status);
              return s.status === activeStatusFilter;
          });
      }

      if (selectedCarriers.length > 0) {
          data = data.filter(s => selectedCarriers.includes(s.carrier));
      }

      if (selectedPaidStatus.length > 0) {
          data = data.filter(s => {
              const status = s.paid_status === 'Paid' ? 'Paid' : 'Unpaid';
              return selectedPaidStatus.includes(status);
          });
      }

      if (effectiveDateRange) {
          data = data.filter(s => {
              if (!s.initial_draft_date) return false;
              const d = new Date(s.initial_draft_date).getTime();
              return d >= effectiveDateRange.start && d <= effectiveDateRange.end;
          });
      }

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
  }, [baseFilteredSplits, activeStatusFilter, selectedCarriers, selectedPaidStatus, effectiveDateRange, sortConfig]);

  const totalPages = Math.ceil(processTableData.length / rowsPerPage);
  const paginatedData = processTableData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSort = (key: keyof SplitPolicy) => {
      setSortConfig(current => ({
          key,
          direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  // --- SELECTION LOGIC ---
  
  // Are all items on the current page selected?
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(row => selectedSplitIds.has(row.id));
  
  // Are all items in the filtered set selected?
  const isAllSelected = processTableData.length > 0 && selectedSplitIds.size === processTableData.length;

  const handleSelectPage = () => {
    if (isPageSelected) {
        // Deselect current page
        const newSelected = new Set(selectedSplitIds);
        paginatedData.forEach(row => newSelected.delete(row.id));
        setSelectedSplitIds(newSelected);
    } else {
        // Select current page
        const newSelected = new Set(selectedSplitIds);
        paginatedData.forEach(row => newSelected.add(row.id));
        setSelectedSplitIds(newSelected);
    }
  };

  const handleSelectAllGlobal = () => {
    const allIds = new Set(processTableData.map(d => d.id));
    setSelectedSplitIds(allIds);
  };
  
  const handleClearSelection = () => {
      setSelectedSplitIds(new Set());
  };

  const handleSelectOne = (id: string) => {
      const next = new Set(selectedSplitIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedSplitIds(next);
  };

  const handleExportCSV = () => {
    const selectedData = processTableData.filter(s => selectedSplitIds.has(s.id));
    if (selectedData.length === 0) return;

    const headers = ['Client', 'Sale Date', 'Partner Agent', 'Policy Number', 'Split %', 'Carrier', 'Product', 'Premium', 'Status', 'Paid Status'];
    const csvContent = [
        headers.join(','),
        ...selectedData.map(row => [
            `"${row.client}"`,
            `"${new Date(row.created_at).toLocaleDateString()}"`,
            `"${row.agent_name}"`,
            `"${row.policy_number || ''}"`,
            `${row.split_percentage}%`,
            `"${row.carrier}"`,
            `"${row.carrier_product}"`,
            row.annual_premium,
            row.status,
            row.paid_status || 'Unpaid'
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `splits_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- STATS ---
  const approvedPolicies = baseFilteredSplits.filter(s => STATUS_GROUPS.APPROVED.includes(s.status));
  const pendingPolicies = baseFilteredSplits.filter(s => STATUS_GROUPS.PENDING.includes(s.status));
  
  const approvedPremium = approvedPolicies.reduce((acc, curr) => acc + (curr.annual_premium || 0), 0);
  const pendingPremium = pendingPolicies.reduce((acc, curr) => acc + (curr.annual_premium || 0), 0);
  const totalVolume = baseFilteredSplits.reduce((acc, curr) => acc + (curr.annual_premium || 0), 0);

  const actionItems = useMemo(() => {
    const counts = new Map<string, number>();
    baseFilteredSplits.forEach(s => {
        if (ACTION_STATUSES.some(status => s.status.toLowerCase() === status.toLowerCase())) {
            const key = s.status; 
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    });
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [baseFilteredSplits]);

  const totalActionCount = actionItems.reduce((acc, curr) => acc + curr.count, 0);

  const chartConfig = useMemo(() => {
    const duration = dateRange.end - dateRange.start;
    const hours = duration / (1000 * 60 * 60);
    const days = hours / 24;
    const isToday = days <= 1.1; 
    const isWeekly = days > 1.1 && days <= 8; 
    let data: any[] = [];
    let type: 'area' | 'bar' | 'partners' = 'area';

    if (chartView === 'partners') {
        type = 'partners';
        data = filteredPartners.slice(0, 5).map(p => ({
            name: p.name.split(' ')[0], 
            fullName: p.name,
            value: p.totalPremium
        }));
    } else if (isToday) {
        type = 'area';
        const hourly = new Array(24).fill(0);
        baseFilteredSplits.forEach(s => {
             const h = new Date(s.created_at).getHours();
             hourly[h] += s.annual_premium || 0;
        });
        data = hourly.map((v, i) => {
             const hour = i === 0 ? '12am' : i === 12 ? '12pm' : i > 12 ? `${i-12}pm` : `${i}am`;
             return { label: hour, value: v };
        });
    } else if (isWeekly) {
        type = 'bar';
        const dayMap = new Map<string, number>();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        baseFilteredSplits.forEach(s => {
            const d = new Date(s.created_at);
            const dayName = dayNames[d.getDay()];
            dayMap.set(dayName, (dayMap.get(dayName) || 0) + (s.annual_premium || 0));
        });
        data = dayNames.map(d => ({ label: d, value: dayMap.get(d) || 0 }));
    } else {
        type = 'area';
        const dailyMap = new Map<string, number>();
        const sorted = [...baseFilteredSplits].sort((a,b) => a.created_at - b.created_at);
        sorted.forEach(s => {
            const d = new Date(s.created_at);
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            dailyMap.set(key, (dailyMap.get(key) || 0) + (s.annual_premium || 0));
        });
        if (dailyMap.size === 0) { data = [{ label: 'N/A', value: 0 }]; } 
        else { data = Array.from(dailyMap.entries()).map(([label, value]) => ({ label, value })); }
    }
    return { data, type };
  }, [baseFilteredSplits, dateRange, chartView, filteredPartners]);

  const paidStatusData = useMemo(() => {
    const paid = baseFilteredSplits.filter(s => s.paid_status === 'Paid').length;
    const unpaid = baseFilteredSplits.length - paid;
    return [
        { name: 'Paid', value: paid, color: '#10b981' }, 
        { name: 'Pending', value: unpaid, color: '#f59e0b' } 
    ];
  }, [baseFilteredSplits]);

  const toggleFilter = (filter: string | 'GROUP_APPROVED' | 'GROUP_PENDING') => {
      setActiveStatusFilter(current => current === filter ? null : filter);
  };

  const getActionIcon = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('decline') || s.includes('cancel')) return <XCircle className="w-4 h-4" />;
      if (s.includes('taken')) return <Ban className="w-4 h-4" />;
      if (s.includes('lapsed')) return <FileWarning className="w-4 h-4" />;
      return <AlertTriangle className="w-4 h-4" />;
  };

  if (!hasAgentProfile) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
           <UserX className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Agent Profile Connected</h2>
        <p className="text-slate-500 max-w-md">
           You don't have an Agent Profile connected. Please switch to an agent workspace to view split business.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start font-sans relative">
        {/* LEFT SIDEBAR: PARTNERS LIST */}
        <div className="w-full xl:w-80 flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.02)] flex flex-col xl:sticky xl:top-24 h-[800px] overflow-hidden">
            <div className="p-6 pb-2">
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest mb-6">Partners</h2>
                <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={partnerSearch}
                        onChange={e => setPartnerSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-400 text-slate-700"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-hide">
                 <button
                    onClick={() => setSelectedPartnerId(null)}
                    className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden ${!selectedPartnerId ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]' : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'}`}
                 >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${!selectedPartnerId ? 'bg-white/10 border-white/10 text-brand-400' : 'bg-brand-50 border-brand-100 text-brand-600'}`}>
                            <Split size={18} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-sm">All Splits</span>
                    </div>
                    <span className={`relative z-10 text-xs font-bold px-2.5 py-1 rounded-lg ${!selectedPartnerId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{splits.length}</span>
                 </button>

                 {filteredPartners.length > 0 ? (
                    filteredPartners.map(partner => (
                        <button
                            key={partner.id}
                            onClick={() => setSelectedPartnerId(partner.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 group ${selectedPartnerId === partner.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]' : 'bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100'}`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${selectedPartnerId === partner.id ? 'bg-white/10 border-white/10 text-brand-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    {partner.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className={`font-bold text-sm truncate ${selectedPartnerId === partner.id ? 'text-white' : 'text-slate-900'}`}>{partner.name}</p>
                                    <p className={`text-xs font-medium ${selectedPartnerId === partner.id ? 'text-slate-400' : 'text-slate-500'}`}>${partner.totalPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-all ${selectedPartnerId === partner.id ? 'text-brand-500 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                        </button>
                    ))
                 ) : (
                    <div className="text-center py-8 text-xs text-slate-400 font-bold">
                        No partners found
                    </div>
                 )}
            </div>
        </div>

        {/* RIGHT: MAIN CONTENT */}
        <div className="flex-1 w-full space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Split Business</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Shared production for <span className="font-bold text-slate-800">{viewingAgentName}</span></p>
                </div>
                <MainDateRangeSelector value={dateRange} onChange={setDateRange} placeholder="Fetch Period" />
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
                        onClick={() => toggleFilter('GROUP_PENDING')}
                        className={`flex-1 p-6 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden transition-all text-left group
                            ${activeStatusFilter === 'GROUP_PENDING' 
                                ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30 scale-[1.02]' 
                                : 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-100'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeStatusFilter === 'GROUP_PENDING' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'}`}>
                                <Clock className="w-6 h-6" strokeWidth={2.5} />
                            </div>
                            <ArrowUpRight className={`w-5 h-5 ${activeStatusFilter === 'GROUP_PENDING' ? 'text-white/70' : 'text-slate-300'}`} />
                        </div>
                        <div>
                             <h3 className={`text-3xl font-extrabold mb-1 ${activeStatusFilter === 'GROUP_PENDING' ? 'text-white' : 'text-slate-900'}`}>${pendingPremium.toLocaleString('en-US', { notation: 'compact' })}</h3>
                             <div className="flex items-center justify-between">
                                <p className={`text-xs font-bold uppercase tracking-wider ${activeStatusFilter === 'GROUP_PENDING' ? 'text-blue-100' : 'text-slate-400'}`}>In Progress</p>
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${activeStatusFilter === 'GROUP_PENDING' ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {pendingPolicies.length}
                                </span>
                             </div>
                        </div>
                    </button>
                </div>

                <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/30 group">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                                    {chartView === 'partners' ? 'Performance' : 'Volume'}
                                </p>
                                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                    {chartView === 'partners' ? 'Top 5 Partners' : `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
                                </h2>
                            </div>
                            <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 gap-1 border border-white/5">
                                <button 
                                    onClick={() => setChartView('trend')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${chartView === 'trend' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <TrendingUp className="w-3.5 h-3.5" /> Trend
                                </button>
                                <button 
                                    onClick={() => setChartView('partners')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${chartView === 'partners' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Users className="w-3.5 h-3.5" /> Partners
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartConfig.type === 'partners' ? (
                                    <BarChart data={chartConfig.data} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#334155" opacity={0.3} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} width={60} />
                                        <RechartsTooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#fff' }} />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={24}>
                                            {chartConfig.data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : '#f59e0b'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : chartConfig.type === 'bar' ? (
                                    <BarChart data={chartConfig.data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#fff' }} cursor={{ fill: '#ffffff10' }} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                ) : (
                                    <AreaChart data={chartConfig.data}>
                                        <defs>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#fff' }} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorVolume)" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center relative group hover:shadow-lg transition-shadow">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-t-[2.5rem]"></div>
                     <div className="absolute top-6 left-6">
                        <h4 className="font-extrabold text-slate-900 text-lg">Status</h4>
                     </div>
                     <div className="absolute top-6 right-6">
                        <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal className="w-6 h-6" /></button>
                     </div>
                    <div className="relative w-48 h-48 mt-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={paidStatusData} cx="50%" cy="50%" innerRadius={65} outerRadius={80} paddingAngle={6} dataKey="value" stroke="none" cornerRadius={12}>
                                    {paidStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-extrabold text-slate-900">{baseFilteredSplits.length}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Apps</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full mt-6 px-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-xs font-bold text-slate-600">Paid</span>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{paidStatusData[0].value}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-xs font-bold text-slate-600">Pending</span>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{paidStatusData[1].value}</span>
                        </div>
                    </div>
                </div>
            </div>

            {totalActionCount > 0 && (
                <div className="relative rounded-[2.5rem] bg-gradient-to-r from-red-500 to-pink-500 shadow-xl shadow-red-500/20 overflow-hidden group">
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
                            {actionItems.map(item => (
                                <button
                                    key={item.status}
                                    onClick={() => toggleFilter(item.status)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${activeStatusFilter === item.status ? 'bg-white text-red-600 border-white shadow-lg scale-105' : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'}`}
                                >
                                    {getActionIcon(item.status)}
                                    <span>{item.status}</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeStatusFilter === item.status ? 'bg-red-100 text-red-600' : 'bg-black/20 text-white'}`}>{item.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative">
                <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-30">
                    <div className="flex items-center gap-4 min-w-max">
                        <div className={`p-3 rounded-2xl transition-colors shadow-sm ${activeStatusFilter ? 'bg-brand-500 text-white shadow-brand-500/30' : 'bg-slate-100 text-slate-500'}`}>
                            {activeStatusFilter ? <Filter className="w-5 h-5" /> : <Split className="w-5 h-5" />}
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-slate-900">
                                {selectedPartnerId ? 'Partner Agreements' : 'All Split Agreements'}
                            </h3>
                            {activeStatusFilter && (
                                <p className="text-xs font-bold text-brand-500 uppercase tracking-wide animate-in slide-in-from-left-2 mt-0.5">
                                    Filtered by: {activeStatusFilter.replace('GROUP_', '')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto overflow-visible pb-1 sm:pb-0">
                        <div className="w-full sm:w-[180px]">
                            <MultiSelectDropdown 
                                label="Carriers" 
                                options={carriers} 
                                selected={selectedCarriers} 
                                onChange={setSelectedCarriers} 
                            />
                        </div>

                        <div className="w-full sm:w-[180px]">
                            <MultiSelectDropdown 
                                label="Payment Status" 
                                options={['Paid', 'Unpaid']} 
                                selected={selectedPaidStatus} 
                                onChange={setSelectedPaidStatus} 
                                icon={<DollarSign className="w-3.5 h-3.5 text-slate-400" />}
                            />
                        </div>

                        <div className="w-full sm:w-[200px]">
                            <SimpleDateRangePicker 
                                value={effectiveDateRange} 
                                onChange={setEffectiveDateRange}
                                placeholder="Effective Date"
                            />
                        </div>

                        {(activeStatusFilter || selectedCarriers.length > 0 || selectedPaidStatus.length > 0 || effectiveDateRange) && (
                            <button 
                                onClick={() => {
                                    setActiveStatusFilter(null);
                                    setSelectedCarriers([]);
                                    setSelectedPaidStatus([]);
                                    setEffectiveDateRange(null);
                                }}
                                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reset</span>
                            </button>
                        )}
                    </div>
                </div>
                
                {selectedSplitIds.size > 0 && !isAllSelected && (
                    <div className="bg-blue-50 border-b border-blue-100 py-3 text-center text-sm font-medium text-blue-800 animate-in fade-in slide-in-from-top-1">
                        <span className="font-bold">{selectedSplitIds.size}</span> items selected on this page. 
                        <button 
                            onClick={handleSelectAllGlobal}
                            className="font-bold underline hover:text-blue-900 ml-1 decoration-blue-800"
                        >
                            Select all {processTableData.length} items
                        </button>
                    </div>
                )}
                
                {isAllSelected && selectedSplitIds.size > 0 && (
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
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('client')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Client & Date
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'client' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('agent_name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Partner Agent
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'agent_name' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('policy_number')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Policy Number
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'policy_number' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('split_percentage')}
                                    >
                                        <div className="flex items-center gap-1">
                                            My Split %
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'split_percentage' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('carrier')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Carrier
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'carrier' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('annual_premium')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Premium
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'annual_premium' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'status' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <div className="flex items-center justify-center gap-3 text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span className="text-sm font-medium">Loading splits...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => {
                                        const isSelected = selectedSplitIds.has(item.id);
                                        return (
                                            <tr 
                                                key={item.id} 
                                                onClick={() => setSelectedSplit(item)}
                                                className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-brand-50/30' : ''}`}
                                            >
                                                <td className="py-5 pl-8">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" 
                                                        checked={isSelected}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() => handleSelectOne(item.id)}
                                                    />
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">{item.client}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{formatDate(item.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                            {item.agent_name ? item.agent_name.split(' ').map(n=>n[0]).join('').substring(0,2) : '?'}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{item.agent_name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                        #{item.policy_number || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                                                        {item.split_percentage}%
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-xs">{item.carrier}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{item.carrier_product}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">${item.annual_premium.toLocaleString()}</span>
                                                        {item.initial_draft_date && (
                                                            <span className="text-[9px] text-slate-400 font-bold">Eff: {formatDate(item.initial_draft_date)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusStyles(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                    <div className="text-[9px] text-slate-400 mt-1 ml-1 font-bold">{item.paid_status === 'Paid' ? 'Paid' : 'Unpaid'}</div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                                            No split business found for this selection.
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
                
                {selectedSplitIds.size > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="flex items-center gap-2">
                            <span className="bg-brand-500 text-slate-900 text-xs font-black px-2 py-0.5 rounded-md">{selectedSplitIds.size}</span>
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

        {selectedSplit && (
            <SplitDetailsDrawer 
                split={selectedSplit} 
                onClose={() => setSelectedSplit(null)} 
            />
        )}
    </div>
  );
};