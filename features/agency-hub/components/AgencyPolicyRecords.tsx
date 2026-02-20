import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Search, 
    Filter, 
    ArrowUpDown, 
    ChevronLeft, 
    ChevronRight, 
    Check, 
    X, 
    Loader2, 
    Users, 
    Shield, 
    Lock, 
    Unlock, 
    Calendar,
    ChevronDown,
    RefreshCw,
    Download,
    DollarSign,
    CheckCircle,
    FileText,
    FileWarning,
    Globe,
    Zap,
    Target,
    MousePointer2,
    Trash2
} from 'lucide-react';
import { useAgencyContext } from '../context/AgencyContext';
import { useAuth } from '../../../context/AuthContext';
import { agencyPolicyRecordsApi } from '../services/agencyPolicyRecordsApi';

// --- TYPES ---
interface PolicyRecord {
    id: string;
    created_at: number;
    client: string;
    policy_number: string | null;
    carrier_product: string;
    initial_draft_date: string;
    annual_premium: number;
    isLocked: boolean;
    agent_name: string;
    carrier: string;
    status: string;
    paid_status: string | null;
    agent_id: string;
    commission_count: number;
    contactSource: string | null; 
}

interface DateRange {
    start: number;
    end: number;
    label: string;
}

// --- UTILS ---
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatDate = (dateString: string | number) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getSourceStyle = (source: string | null) => {
    const s = (source || 'Organic').toLowerCase();
    if (s.includes('facebook') || s.includes('insta') || s.includes('social')) {
        return { 
            bg: 'bg-blue-50', 
            text: 'text-blue-600', 
            border: 'border-blue-100', 
            icon: <Globe className="w-3 h-3" /> 
        };
    }
    if (s.includes('lead') || s.includes('direct') || s.includes('buy')) {
        return { 
            bg: 'bg-brand-50', 
            text: 'text-brand-700', 
            border: 'border-brand-200', 
            icon: <Target className="w-3 h-3" /> 
        };
    }
    if (s.includes('referral') || s.includes('word')) {
        return { 
            bg: 'bg-emerald-50', 
            text: 'text-emerald-600', 
            border: 'border-emerald-100', 
            icon: <Zap className="w-3 h-3" /> 
        };
    }
    return { 
        bg: 'bg-slate-50', 
        text: 'text-slate-500', 
        border: 'border-slate-200', 
        icon: <MousePointer2 className="w-3 h-3" /> 
    };
};

// --- REUSABLE COMPONENTS ---

const CustomDateRangePicker: React.FC<{
    value: DateRange | null;
    onChange: (range: DateRange | null) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Effective Date" }) => {
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
                className={`flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}`}
            >
                <Calendar className={`w-4 h-4 ${value ? 'text-brand-500' : 'text-slate-400'}`} />
                <span className="max-w-[120px] truncate">{value ? value.label : placeholder}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-4 min-w-[280px] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
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
                    {value && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                            <button onClick={() => { onChange(null); setSelectionStart(null); setSelectionEnd(null); setIsOpen(false); }} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest">Clear Range</button>
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
                className={`flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''} ${selected.length > 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : ''}`}
            >
                {icon}
                <span className="max-w-[100px] truncate">{selected.length > 0 ? `${selected.length} ${label}` : `All ${label}`}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[200px] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
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

// --- MAIN PAGE COMPONENT ---

export const AgencyPolicyRecords: React.FC = () => {
    const { token } = useAuth();
    const { activeAgency } = useAgencyContext();
    const location = useLocation();
    const navigate = useNavigate();

    // --- SESSION PERSISTENCE LOGIC ---
    const storageKey = `agency_records_state_${activeAgency?.agencyId}`;

    const getSavedState = () => {
        try {
            const saved = sessionStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    };

    const savedState = getSavedState();
    
    // Fallback logic for refresh or initial load
    const defaultDates = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        return { start, end };
    }, []);

    // Analytics navigation state (Takes precedence over saved session)
    const { 
        start_date = savedState?.start_date || defaultDates.start, 
        end_date = savedState?.end_date || defaultDates.end, 
        status_id = savedState?.status_id || null
    } = location.state || {};

    const [policies, setPolicies] = useState<PolicyRecord[]>([]);
    const [loading, setLoading] = useState(false);

    // Deletion State
    const [policyToDelete, setPolicyToDelete] = useState<PolicyRecord | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter States - Initialized from saved state if available
    const [searchTerm, setSearchTerm] = useState(savedState?.searchTerm || '');
    const [selectedAgents, setSelectedAgents] = useState<string[]>(savedState?.selectedAgents || []);
    const [selectedCarriers, setSelectedCarriers] = useState<string[]>(savedState?.selectedCarriers || []);
    const [selectedPaidStatus, setSelectedPaidStatus] = useState<string[]>(savedState?.selectedPaidStatus || []);
    const [selectedSources, setSelectedSources] = useState<string[]>(savedState?.selectedSources || []);
    const [commissionFilter, setCommissionFilter] = useState<'all' | 'with' | 'without'>(savedState?.commissionFilter || 'all');
    const [lockFilter, setLockFilter] = useState<'all' | 'locked' | 'unlocked'>(savedState?.lockFilter || 'all');
    const [effectiveDate, setEffectiveDate] = useState<DateRange | null>(savedState?.effectiveDate || null);

    // UI States
    const [agentSearch, setAgentSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof PolicyRecord, direction: 'asc' | 'desc' } | null>(savedState?.sortConfig || null);
    const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
    const [rowsPerPage, setRowsPerPage] = useState(savedState?.rowsPerPage || 20);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Effect: Save State to Session Storage
    useEffect(() => {
        if (activeAgency?.agencyId) {
            const stateToSave = {
                start_date,
                end_date,
                status_id,
                searchTerm,
                selectedAgents,
                selectedCarriers,
                selectedPaidStatus,
                selectedSources,
                commissionFilter,
                lockFilter,
                effectiveDate,
                sortConfig,
                currentPage,
                rowsPerPage
            };
            sessionStorage.setItem(storageKey, JSON.stringify(stateToSave));
        }
    }, [
        activeAgency?.agencyId, start_date, end_date, status_id, searchTerm, 
        selectedAgents, selectedCarriers, selectedPaidStatus, selectedSources, 
        commissionFilter, lockFilter, effectiveDate, sortConfig, currentPage, rowsPerPage
    ]);

    // Effect: Fetch Policies
    const fetchPolicies = () => {
        if (activeAgency?.agencyId && token) {
            setLoading(true);
            agencyPolicyRecordsApi.getDetailedAgencyPolicies(token, activeAgency.agencyId, start_date, end_date, status_id)
                .then(setPolicies)
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [activeAgency, token, start_date, end_date, status_id]);

    // Data Processing
    const agentStats = useMemo(() => {
        const statsMap = new Map<string, { id: string, name: string, total: number, count: number }>();
        policies.forEach(p => {
            if (!statsMap.has(p.agent_id)) {
                statsMap.set(p.agent_id, { id: p.agent_id, name: p.agent_name, total: 0, count: 0 });
            }
            const current = statsMap.get(p.agent_id)!;
            current.total += p.annual_premium;
            current.count += 1;
        });
        return Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
    }, [policies]);

    const carriers = useMemo(() => Array.from(new Set(policies.map(p => p.carrier))).sort(), [policies]);
    const paidStatuses = useMemo(() => Array.from(new Set(policies.map(p => p.paid_status || 'Unpaid'))).sort(), [policies]);
    const sources = useMemo(() => Array.from(new Set(policies.map(p => p.contactSource || 'Organic'))).sort(), [policies]);

    const processedData = useMemo(() => {
        let data = [...policies];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            data = data.filter(p => p.client.toLowerCase().includes(lowerSearch) || (p.policy_number && p.policy_number.toLowerCase().includes(lowerSearch)));
        }

        if (selectedAgents.length > 0) data = data.filter(p => selectedAgents.includes(p.agent_id));
        if (selectedCarriers.length > 0) data = data.filter(p => selectedCarriers.includes(p.carrier));
        if (selectedPaidStatus.length > 0) data = data.filter(p => selectedPaidStatus.includes(p.paid_status || 'Unpaid'));
        if (selectedSources.length > 0) data = data.filter(p => selectedSources.includes(p.contactSource || 'Organic'));

        if (commissionFilter === 'with') data = data.filter(p => p.commission_count > 0);
        else if (commissionFilter === 'without') data = data.filter(p => p.commission_count === 0);

        if (lockFilter === 'locked') data = data.filter(p => p.isLocked);
        else if (lockFilter === 'unlocked') data = data.filter(p => !p.isLocked);

        if (effectiveDate) {
            data = data.filter(p => {
                const date = new Date(p.initial_draft_date).getTime();
                return date >= effectiveDate.start && date <= effectiveDate.end;
            });
        }

        if (sortConfig) {
            data.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA! < valB!) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA! > valB!) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [policies, searchTerm, selectedAgents, selectedCarriers, selectedPaidStatus, selectedSources, commissionFilter, lockFilter, effectiveDate, sortConfig]);

    const totalPages = Math.ceil(processedData.length / rowsPerPage);
    const paginatedData = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const handleSort = (key: keyof PolicyRecord) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const isPageSelected = paginatedData.length > 0 && paginatedData.every(p => selectedIds.has(p.id));
    const isAllSelectedGlobal = processedData.length > 0 && selectedIds.size === processedData.length;

    const handleSelectPage = () => {
        const next = new Set(selectedIds);
        if (isPageSelected) {
            paginatedData.forEach(p => next.delete(p.id));
        } else {
            paginatedData.forEach(p => next.add(p.id));
        }
        setSelectedIds(next);
    };

    const handleSelectAllGlobal = () => {
        setSelectedIds(new Set(processedData.map(p => p.id)));
    };

    const handleToggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Navigation Logic
    const handleRowClick = (policyId: string) => {
        const queue = processedData.map(p => p.id);
        const index = queue.indexOf(policyId);
        
        // If user has commissions access, redirect to the Commissions Details view instead
        const hasCommissionsAccess = activeAgency?.features.includes('commissions');
        const targetPath = hasCommissionsAccess 
            ? '/management/commissions/details' 
            : '/management/policies/details';

        navigate(targetPath, { 
            state: { 
                queue, 
                startIndex: index,
                from: '/management/policies/records'
            } 
        });
    };

    const handleAgentSidebarClick = (id: string) => {
        if (selectedAgents.includes(id)) setSelectedAgents(selectedAgents.filter(a => a !== id));
        else setSelectedAgents([...selectedAgents, id]);
    };

    const handleResetAll = () => {
        setSearchTerm('');
        setSelectedAgents([]);
        setSelectedCarriers([]);
        setSelectedPaidStatus([]);
        setSelectedSources([]);
        setCommissionFilter('all');
        setLockFilter('all');
        setEffectiveDate(null);
        setCurrentPage(1);
        setSortConfig(null);
    };

    const handleExportCSV = () => {
        const selectedData = processedData.filter(p => selectedIds.has(p.id));
        if (selectedData.length === 0) return;

        const headers = ["Client", "Created At", "Agent Name", "Policy Number", "Carrier", "Carrier Product", "Premium", "Source", "Paid Status", "Initial Draft Date"];
        const rows = selectedData.map(p => [
            `"${p.client}"`,
            new Date(p.created_at).toLocaleDateString(),
            `"${p.agent_name}"`,
            `"${p.policy_number || 'N/A'}"`,
            `"${p.carrier}"`,
            `"${p.carrier_product}"`,
            p.annual_premium,
            `"${p.contactSource || 'Organic'}"`, 
            `"${p.paid_status || 'Unpaid'}"`,
            p.initial_draft_date
        ].join(","));

        const csvString = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `agency_policies_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeletePolicy = async () => {
        if (!token || !policyToDelete || !deleteReason.trim()) return;
        
        setIsDeleting(true);
        try {
            await agencyPolicyRecordsApi.deletePolicy(token, policyToDelete.id, deleteReason);
            setPolicyToDelete(null);
            setDeleteReason('');
            fetchPolicies(); // Refresh the list
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete policy. Ensure you have administrative rights.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 font-sans pb-32">
            {/* DELETE MODAL */}
            {policyToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-500/5">
                            <Trash2 className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Policy?</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                            You are deleting the policy for <span className="font-bold text-slate-900">{policyToDelete.client}</span>. This action is permanent.
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

            {/* TOP HEADER: BACK BUTTON */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/management/policies')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white border border-slate-100 text-slate-400 font-bold text-xs hover:text-slate-900 shadow-sm transition-all group w-fit"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Analytics
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start">
                {/* LEFT SIDEBAR: AGENT FILTER */}
                <aside className="w-full xl:w-96 flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.02)] flex flex-col xl:sticky xl:top-8 h-[800px] overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-100/50">
                    <div className="p-8 border-b border-slate-50 bg-gradient-to-br from-slate-900 to-slate-800 text-white z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-brand-500 rounded-2xl text-slate-900 shadow-lg shadow-brand-500/20">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight leading-none text-white">Agents</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Team Hierarchy</p>
                            </div>
                        </div>
                        
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-400 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Filter agent list..." 
                                value={agentSearch}
                                onChange={e => setAgentSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-4 bg-white/10 border border-white/10 rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-500 text-white"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
                        {agentStats.filter(a => a.name.toLowerCase().includes(agentSearch.toLowerCase())).map(agent => {
                            const isSelected = selectedAgents.includes(agent.id);
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => handleAgentSidebarClick(agent.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden ${isSelected ? 'bg-white border-brand-500 shadow-xl shadow-brand-500/5 ring-1 ring-brand-500' : 'bg-white hover:bg-slate-100 border border-slate-100'}`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border-2 transition-colors ${isSelected ? 'bg-brand-500 border-brand-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                            {agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className={`font-black text-sm truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{agent.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-brand-600' : 'text-slate-400'}`}>${agent.total.toLocaleString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{agent.count} Apps</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAgents.length} Agents Selected</span>
                        {selectedAgents.length > 0 && <button onClick={() => setSelectedAgents([])} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors">Clear All</button>}
                    </div>
                </aside>

                {/* MAIN CONTENT: FILTER & TABLE */}
                <main className="flex-1 w-full space-y-6">
                    <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600 rounded-t-[2.5rem]"></div>
                        <div className="flex flex-wrap items-center gap-3">
                            <MultiSelectDropdown label="Carriers" options={carriers} selected={selectedCarriers} onChange={setSelectedCarriers} icon={<Shield className="w-4 h-4 text-slate-400" />} />
                            <MultiSelectDropdown label="Source" options={sources} selected={selectedSources} onChange={setSelectedSources} icon={<Globe className="w-4 h-4 text-slate-400" />} />
                            <MultiSelectDropdown label="Paid Status" options={paidStatuses} selected={selectedPaidStatus} onChange={setSelectedPaidStatus} icon={<DollarSign className="w-4 h-4 text-slate-400" />} />
                            <CustomDateRangePicker value={effectiveDate} onChange={setEffectiveDate} />
                            
                            <div className="h-10 w-px bg-slate-100 mx-2 hidden lg:block"></div>
                            
                            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                {(['all', 'with', 'without'] as const).map(f => (
                                    <button key={f} onClick={() => setCommissionFilter(f)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${commissionFilter === f ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {f === 'all' ? 'All' : f === 'with' ? 'Has Comm' : 'No Comm'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                {(['all', 'locked', 'unlocked'] as const).map(f => (
                                    <button key={f} onClick={() => setLockFilter(f)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${lockFilter === f ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleResetAll} className="p-3 bg-slate-50 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-2xl border border-slate-100 transition-all shadow-sm">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative min-h-[600px] flex flex-col">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-6 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100 shadow-sm">
                                    <FileText className="w-5 h-5" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Policy Records</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{processedData.length} records matching current view</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="relative w-80 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by client or policy #..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-400 text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        {isPageSelected && !isAllSelectedGlobal && (
                            <div className="bg-brand-50 border-b border-brand-100 py-3 text-center text-xs font-black text-brand-900 animate-in fade-in slide-in-from-top-1">
                                <span className="mr-1 uppercase tracking-widest">{selectedIds.size} items selected on this page.</span>
                                <button 
                                    onClick={handleSelectAllGlobal}
                                    className="text-brand-700 underline hover:text-slate-900 decoration-brand-500/50"
                                >
                                    Select all {processedData.length} items
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                                        <th className="py-5 pl-8 w-16">
                                            <button onClick={(e) => { e.stopPropagation(); handleSelectPage(); }} className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isPageSelected ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'border-slate-300 bg-white hover:border-brand-300'}`}>
                                                {isPageSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                                            </button>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors w-[200px]" onClick={() => handleSort('client')}>
                                            <div className="flex items-center gap-1.5">Client & Created <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('agent_name')}>
                                            <div className="flex items-center gap-1.5">Agent <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('policy_number')}>
                                            <div className="flex items-center gap-1.5">Policy Number <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors w-[180px]" onClick={() => handleSort('carrier')}>
                                            <div className="flex items-center gap-1.5">Carrier / Product <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('initial_draft_date')}>
                                            <div className="flex items-center gap-1.5">Eff. Date <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('annual_premium')}>
                                            <div className="flex items-center gap-1.5">Premium <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('contactSource')}>
                                            <div className="flex items-center gap-1.5">Source <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                                        </th>
                                        <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center animate-spin">
                                                        <Loader2 className="w-6 h-6 text-brand-500" />
                                                    </div>
                                                    <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse text-slate-400">Synchronizing Ledgers...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedData.length > 0 ? (
                                        paginatedData.map(policy => {
                                            const isSelected = selectedIds.has(policy.id);
                                            const sInfo = getSourceStyle(policy.contactSource);
                                            return (
                                                <tr 
                                                    key={policy.id} 
                                                    className={`hover:bg-brand-50/20 transition-all duration-300 group cursor-pointer border-l-4 ${isSelected ? 'bg-brand-50/40 border-brand-500' : 'border-transparent'}`} 
                                                    onClick={() => handleRowClick(policy.id)}
                                                >
                                                    <td className="py-5 pl-7">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleToggleSelect(policy.id); }} 
                                                            className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'border-slate-300 bg-white group-hover:border-brand-300'}`}
                                                        >
                                                            {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                                                        </button>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-black text-slate-900 text-sm tracking-tight">{policy.client}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(policy.created_at)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm group-hover:bg-white group-hover:border-brand-200 transition-colors">
                                                                {policy.agent_name.split(' ').map(n=>n[0]).join('')}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{policy.agent_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shadow-inner group-hover:bg-white transition-colors">#{policy.policy_number || 'PENDING'}</span>
                                                            {policy.isLocked ? <Lock className="w-3 h-3 text-slate-300" /> : <Unlock className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-900 text-xs tracking-tight">{policy.carrier}</span>
                                                            <span className="text-[10px] font-medium text-slate-400 truncate max-w-full">{policy.carrier_product}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <span className="font-bold text-slate-900 text-xs">{formatDate(policy.initial_draft_date)}</span>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-900 text-sm tracking-tighter">${policy.annual_premium.toLocaleString()}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Annual</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all group-hover:shadow-sm ${sInfo.bg} ${sInfo.text} ${sInfo.border}`}>
                                                            {sInfo.icon}
                                                            <span>{policy.contactSource || 'Organic'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex items-center justify-end gap-2 pr-4">
                                                            {!policy.isLocked && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setPolicyToDelete(policy); }}
                                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Delete Policy"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${policy.commission_count > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                <DollarSign className="w-2.5 h-2.5" /> {policy.commission_count}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-300">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-2">
                                                        <FileWarning className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-sm font-black uppercase tracking-widest">No policy matches found</p>
                                                    <button onClick={() => setSearchTerm('')} className="text-xs font-bold text-brand-500 hover:text-brand-700 underline">Reset all search filters</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 border-t border-slate-50 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500">Showing</span>
                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                                    {[10, 20, 50, 100].map(size => (
                                        <button key={size} onClick={() => { setRowsPerPage(size); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${rowsPerPage === size ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-700'}`}>{size}</button>
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-slate-500">of <span className="text-slate-900 font-black">{processedData.length}</span> records</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all text-slate-500"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="flex gap-1 px-2">
                                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                        let pageNum = i + 1;
                                        if (currentPage > 3 && totalPages > 5) pageNum = currentPage - 3 + i + 1;
                                        if (pageNum > totalPages) return null;
                                        return (
                                            <button 
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-11 h-11 rounded-2xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'hover:bg-slate-50 text-slate-50'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all text-slate-500"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            
            {/* FLOATING ACTION BAR FOR BULK SELECT */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 z-[100] animate-in slide-in-from-bottom-8 duration-500 border border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-slate-900 font-black shadow-lg shadow-brand-500/20">{selectedIds.size}</div>
                        <span className="text-sm font-bold tracking-tight">Records Selected</span>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-900 text-xs font-black transition-all shadow-lg shadow-brand-500/10"
                        >
                            <Download className="w-4 h-4" strokeWidth={3} /> Export CSV
                        </button>
                        <button onClick={() => setSelectedIds(new Set())} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500 text-white transition-all border border-white/10 hover:border-red-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};