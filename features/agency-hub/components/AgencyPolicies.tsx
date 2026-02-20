import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, 
    ChevronDown, 
    CheckCircle, 
    Loader2, 
    TrendingUp, 
    FileText, 
    AlertCircle, 
    Clock, 
    Briefcase,
    LayoutGrid,
    XCircle,
    Ban,
    FileWarning,
    RefreshCw,
    Filter,
    ArrowUpRight,
    Trophy,
    Activity,
    X,
    Search,
    ChevronLeft,
    ChevronRight,
    Building2
} from 'lucide-react';
import { useAgencyContext } from '../context/AgencyContext';
import { agencyPoliciesApi, PolicySummaryResponse, SummaryItem } from '../services/agencyPoliciesApi';

// --- UTILS & TYPES ---

interface DateRange {
    start: number;
    end: number;
    label: string;
}

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
    
    return { start: start.getTime(), end: end.getTime(), label: 'Monthly' };
};

// --- COMPONENTS ---

const DateSelector: React.FC<{
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
                setTimeout(() => setView('presets'), 200);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectPreset = (type: 'today' | 'weekly' | 'monthly' | 'yearly') => {
        onChange(getDateRange(type));
        setIsOpen(false);
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
            
            const range: DateRange = {
                start: start.getTime(),
                end: end.getTime(),
                label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
            };
            onChange(range);
            setSelectionStart(null);
            setSelectionEnd(null);
            setIsOpen(false);
            setTimeout(() => setView('presets'), 200);
        }
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
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-full text-sm font-bold text-slate-700 transition-all shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] group"
            >
                <Calendar className="w-4 h-4 text-brand-500 group-hover:scale-110 transition-transform" />
                <span className="max-w-[140px] truncate">{value.label}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-3 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {view === 'presets' ? (
                        <div className="space-y-1">
                            {['Today', 'Weekly', 'Monthly', 'Yearly'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => handleSelectPreset(item.toLowerCase() as any)}
                                    className={`w-full text-left px-5 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${value.label === item ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {item}
                                    {value.label === item && <CheckCircle className="w-3.5 h-3.5 text-brand-400" />}
                                </button>
                            ))}
                            <div className="h-px bg-slate-50 my-1" />
                            <button
                                onClick={() => setView('calendar')}
                                className="w-full text-left px-5 py-3.5 rounded-xl text-xs font-bold text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-between"
                            >
                                Custom Range
                                <Calendar className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="p-2 w-[280px]">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <button 
                                    onClick={() => changeMonth(-1)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </span>
                                <button 
                                    onClick={() => changeMonth(1)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                    <div key={d} className="text-[10px] font-black text-slate-300 text-center py-1">{d}</div>
                                ))}
                                {generateCalendar().map((date, i) => (
                                    <div key={i} className="aspect-square flex items-center justify-center">
                                        {date ? (
                                            <button
                                                onClick={() => handleDateClick(date)}
                                                className={`
                                                    w-full h-full text-[11px] font-bold rounded-lg transition-all
                                                    ${isSelected(date) ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-110 z-10' : ''}
                                                    ${isInRange(date) ? 'bg-brand-50 text-brand-700' : ''}
                                                    ${!isSelected(date) && !isInRange(date) ? 'text-slate-600 hover:bg-slate-100' : ''}
                                                `}
                                            >
                                                {date.getDate()}
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between px-1">
                                <button 
                                    onClick={() => setView('presets')}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider"
                                >
                                    Back to Presets
                                </button>
                                <div className="text-[9px] font-black text-brand-500 uppercase tracking-widest animate-pulse">
                                    {!selectionStart ? 'Pick Start' : !selectionEnd ? 'Pick End' : 'Processing'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const CarrierDrawer = ({ 
    isOpen, 
    onClose, 
    carriers 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    carriers: SummaryItem[]; 
}) => {
    const [search, setSearch] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = carriers.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
    const maxTotal = Math.max(...carriers.map(c => c.total), 1); 

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div 
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-100">
                <div className="p-8 border-b border-slate-50 flex items-start justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Carrier Performance</h2>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                            {carriers.length} Active Partners Breakdown
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by carrier name..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-400 shadow-sm"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 scroll-smooth">
                    {filtered.map((carrier, idx) => {
                        const percentage = (carrier.total / maxTotal) * 100;
                        return (
                            <div key={carrier.id} className="p-5 rounded-[1.5rem] bg-white border border-slate-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all group relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                                {idx + 1}
                                            </div>
                                            <span className="font-bold text-slate-800 text-sm">{carrier.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900">${carrier.total.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-slate-800 group-hover:bg-brand-500 transition-colors duration-500 rounded-full" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap min-w-[60px] text-right">{carrier.records} Apps</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                            <Briefcase className="w-12 h-12 mb-4" />
                            <p className="text-sm font-bold">No carriers match your search</p>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-slate-50 bg-white z-10 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">End of List</p>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const AgencyPolicies: React.FC = () => {
    const { selectedAgencyIds, selectedAgencies } = useAgencyContext();
    const navigate = useNavigate();

    // --- STATE PERSISTENCE ---
    const storageKey = `agency_policies_aggregated_state`;
    
    const getSavedDateRange = (): DateRange => {
        try {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.dateRange) return parsed.dateRange;
            }
        } catch (e) { console.error(e); }
        return getDateRange('monthly');
    };

    const [dateRange, setDateRange] = useState<DateRange>(getSavedDateRange());

    useEffect(() => {
        sessionStorage.setItem(storageKey, JSON.stringify({ dateRange }));
    }, [dateRange]);

    const [summary, setSummary] = useState<PolicySummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAllCarriers, setShowAllCarriers] = useState(false);

    // AGGREGATION LOGIC (Path A)
    useEffect(() => {
        if (selectedAgencyIds.length > 0) {
            setLoading(true);
            
            // Parallel fetches for all selected agencies
            Promise.all(
                selectedAgencyIds.map(id => 
                    agencyPoliciesApi.getPolicySummary(id, dateRange.start, dateRange.end)
                )
            ).then(results => {
                // Initial aggregate structure
                const aggregate: PolicySummaryResponse = {
                    Status: [],
                    Carrier: []
                };

                const statusMap = new Map<string, SummaryItem>();
                const carrierMap = new Map<string, SummaryItem>();

                results.forEach(res => {
                    res.Status.forEach(item => {
                        const key = item.label;
                        if (!statusMap.has(key)) {
                            statusMap.set(key, { ...item });
                        } else {
                            const existing = statusMap.get(key)!;
                            existing.total += item.total;
                            existing.records += item.records;
                        }
                    });

                    res.Carrier.forEach(item => {
                        const key = item.label;
                        if (!carrierMap.has(key)) {
                            carrierMap.set(key, { ...item });
                        } else {
                            const existing = carrierMap.get(key)!;
                            existing.total += item.total;
                            existing.records += item.records;
                        }
                    });
                });

                aggregate.Status = Array.from(statusMap.values());
                aggregate.Carrier = Array.from(carrierMap.values());
                
                setSummary(aggregate);
            })
            .catch(err => console.error("Failed to aggregate policy summaries", err))
            .finally(() => setLoading(false));
        }
    }, [selectedAgencyIds, dateRange]);

    const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const groupedData = useMemo(() => {
        if (!summary) return { approved: null, pipeline: [], alerts: [], other: [] };

        const statusItems = summary.Status;
        const approved = statusItems.find(i => i.label === 'Approved');
        const pipelineLabels = ['Underwriting', 'Follow Up'];
        const pipeline = statusItems.filter(i => pipelineLabels.includes(i.label));
        const alertLabels = ['Declined', 'Lapsed Pending', 'Lapsed', 'Not Taken', 'Cancelled Before Draft'];
        const alerts = statusItems.filter(i => alertLabels.includes(i.label));
        alerts.sort((a, b) => b.total - a.total);

        return { approved, pipeline, alerts };
    }, [summary]);

    const handleCardClick = (statusId?: string) => {
        navigate('/management/policies/records', {
            state: {
                start_date: dateRange.start,
                end_date: dateRange.end,
                status_id: statusId || null
            }
        });
    };

    const getStatusIcon = (label: string, className: string = "w-6 h-6") => {
        const l = label.toLowerCase();
        if (l.includes('approved')) return <CheckCircle className={className} />;
        if (l.includes('underwrit')) return <Clock className={className} />;
        if (l.includes('follow')) return <RefreshCw className={className} />;
        if (l.includes('decline') || l.includes('cancel')) return <XCircle className={className} />;
        if (l.includes('lapsed')) return <FileWarning className={className} />;
        if (l.includes('not taken')) return <Ban className={className} />;
        return <FileText className={className} />;
    };

    const carrierItems = (summary?.Carrier || []).sort((a, b) => b.total - a.total).filter(c => c.total > 0 || c.records > 0);
    const topCarrier = carrierItems.length > 0 ? carrierItems[0] : null;

    return (
        <div className="space-y-10 font-sans pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Enterprise Analytics</h1>
                    <p className="text-slate-500 font-medium mt-1">Aggregated production for <span className="font-bold text-slate-800 border-b-2 border-brand-200">{selectedAgencies.length} Selected Organizations</span></p>
                </div>
                <DateSelector value={dateRange} onChange={setDateRange} />
            </div>

            {loading ? (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] animate-bounce mb-6">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Summing Enterprise Data...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div 
                            onClick={() => handleCardClick(groupedData.approved?.id)}
                            className="lg:col-span-7 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-[3rem] p-10 text-white relative overflow-hidden shadow-[0_20px_50px_-12px_rgba(15,23,42,0.3)] group hover:scale-[1.01] transition-transform duration-500 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500 to-teal-400 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/3 group-hover:opacity-30 transition-opacity duration-700"></div>
                            
                            <div className="relative z-10 flex flex-col h-full justify-between min-h-[300px]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">Enterprise Live</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                                    </div>
                                </div>

                                <div className="space-y-2 mt-auto">
                                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">Total Approved Volume</p>
                                    <h2 className="text-6xl sm:text-7xl font-black tracking-tighter text-white drop-shadow-2xl">
                                        {formatCurrency(groupedData.approved?.total || 0)}
                                    </h2>
                                    <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-300">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-sm font-bold">{groupedData.approved?.records || 0} Consolidated Applications</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex flex-col gap-4">
                            {groupedData.pipeline.map((item) => {
                                const isUnderwriting = item.label === 'Underwriting';
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleCardClick(item.id)}
                                        className={`flex-1 rounded-[2.5rem] p-8 relative overflow-hidden transition-all duration-300 group cursor-pointer bg-white border border-slate-100 shadow-sm hover:shadow-xl
                                        `}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <div>
                                                <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isUnderwriting ? 'text-blue-400' : 'text-indigo-400'}`}>
                                                    Consolidated {item.label}
                                                </p>
                                                <h3 className={`text-3xl font-black tracking-tight text-slate-900`}>
                                                    {formatCurrency(item.total)}
                                                </h3>
                                            </div>
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isUnderwriting ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                {getStatusIcon(item.label)}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isUnderwriting ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {item.records} Aggregated Apps
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {groupedData.alerts.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <Activity className="w-4 h-4 text-slate-400" />
                                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Network Fallout Monitor</h3>
                            </div>
                            
                            <div className="flex flex-wrap gap-4">
                                {groupedData.alerts.map((item) => {
                                    const l = item.label.toLowerCase();
                                    let theme = 'slate';
                                    if (l.includes('decline')) theme = 'red';
                                    else if (l.includes('lapsed')) theme = 'orange';
                                    
                                    const styles = {
                                        red: 'bg-white border-red-100 text-red-600 shadow-sm hover:border-red-200',
                                        orange: 'bg-white border-orange-100 text-orange-600 shadow-sm hover:border-orange-200',
                                        slate: 'bg-white border-slate-100 text-slate-600 shadow-sm hover:border-slate-200'
                                    };

                                    const currentStyle = theme === 'red' ? styles.red : theme === 'orange' ? styles.orange : styles.slate;

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleCardClick(item.id)}
                                            className={`flex-1 min-w-[200px] p-5 rounded-[2rem] border transition-all duration-300 group cursor-pointer ${currentStyle}`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{item.label}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-current bg-opacity-10`}>{item.records}</span>
                                            </div>
                                            <p className="text-2xl font-black tracking-tight text-slate-900">{formatCurrency(item.total)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-900">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Enterprise Carrier Performance</h3>
                                </div>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                    {carrierItems.length} Consolidated Partners
                                </span>
                            </div>

                            <div className="space-y-3">
                                {carrierItems.slice(0, 5).map((carrier, idx) => {
                                    const totalVolume = carrierItems.reduce((acc, c) => acc + c.total, 0);
                                    const percentage = totalVolume > 0 ? (carrier.total / totalVolume) * 100 : 0;
                                    const isTop = idx === 0;

                                    return (
                                        <div key={carrier.id} className="group relative">
                                            <div className="absolute inset-0 bg-slate-50 rounded-2xl scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out"></div>
                                            
                                            <div className="relative z-10 flex items-center p-4 rounded-2xl gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isTop ? 'bg-yellow-400 text-yellow-900 shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                                                    {isTop ? <Trophy className="w-4 h-4" /> : idx + 1}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="font-bold text-slate-800 text-sm truncate">{carrier.label}</span>
                                                        <span className="font-black text-slate-900">{formatCurrency(carrier.total)}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${isTop ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-slate-800'}`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0 min-w-[60px]">
                                                    <span className="text-xs font-bold text-slate-400 block">{carrier.records} Apps</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {carrierItems.length > 5 && (
                                <div className="mt-6 pt-6 border-t border-slate-50 text-center">
                                    <button 
                                        onClick={() => setShowAllCarriers(true)}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                                    >
                                        View All {carrierItems.length} Enterprise Carriers
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col justify-center min-h-[300px] shadow-2xl group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:opacity-30 transition-opacity duration-700"></div>
                            
                            <div className="relative z-10 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                                    <Trophy className="w-8 h-8 text-white" />
                                </div>
                                <p className="text-brand-400 font-bold text-xs uppercase tracking-widest mb-2">Network Leader</p>
                                {topCarrier ? (
                                    <>
                                        <h3 className="text-3xl font-black mb-1">{topCarrier.label}</h3>
                                        <p className="text-slate-400 text-sm font-medium mb-6">Consolidated network volume</p>
                                        <div className="inline-block bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/10">
                                            <span className="text-2xl font-black text-white">{formatCurrency(topCarrier.total)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-500 font-bold italic">No data yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <CarrierDrawer 
                        isOpen={showAllCarriers} 
                        onClose={() => setShowAllCarriers(false)} 
                        carriers={carrierItems} 
                    />
                </>
            )}
        </div>
    );
};