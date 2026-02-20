import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Shield, 
    User, 
    Calendar, 
    CreditCard, 
    MapPin, 
    FileText, 
    Briefcase, 
    MessageSquare, 
    Send,
    Hash,
    Globe,
    Tag,
    Activity,
    DollarSign,
    Pencil,
    Check,
    X,
    Split,
    Clock,
    Folder,
    Lock,
    Unlock,
    ChevronDown,
    AlertCircle,
    AlertTriangle,
    Wallet,
    Info,
    Phone,
    ArrowRight,
    Search,
    Plus,
    MessageCircle,
    CheckCircle2,
    Trash2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { agencyCommissionsDetailsApi } from '../services/agencyCommissionsDetailsApi';

// --- TYPES ---

interface MetaOption {
    id: string;
    label: string;
}

interface ClientProfile {
    name: string;
    state: string;
    phone?: string;
    source?: { id: string; label: string; custom_source: string | null };
    type?: { id: string; label: string; custom_type: string | null };
}

interface Coverage {
    policy_number: string;
    carrier: { id: string; label: string; custom_carrier: string | null };
    product: string;
    initial_draft_date: string;
    recurring_draft_day: number;
    face_amount: number;
    beneficiary: string | null;
    monthly_premium: number;
    annual_premium: number;
    status: { id: string; label: string };
    paidstatus: { id: string | null; label: string | null };
    appointment_highlights: string | null;
    pending_follow_up: string | null;
    isLocked: boolean;
}

interface SplitRecord {
    id: string;
    created_at: number;
    policy_id: string;
    on_split_agent_id: string;
    agent_on_split_percent: number;
    on_split_agent_name: string;
}

interface PolicyCommission {
    id: string;
    created_at: number;
    status: string;
    submitted_by: string;
    notes: string;
    agentOncommission_name: string;
    agentOncommission_id: string;
    amount: number;
}

interface Comment {
    created_at: number;
    type: string;
    message: string;
    _commentby: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

// --- HELPERS ---

const formatDate = (dateStr: string | number) => {
    if (!dateStr) return '—';
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCommentTime = (ts: number | string) => {
    if (!ts) return 'Just now';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- CUSTOM DROPDOWN COMPONENT ---

const CustomSearchDropdown: React.FC<{
    value: string;
    options: MetaOption[];
    onChange: (value: string) => void;
    placeholder?: string;
}> = ({ value, options, onChange, placeholder = "Select..." }) => {
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

    const selectedOption = options.find(opt => String(opt.id) === String(value));
    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-full flex items-center justify-between text-xs font-bold text-slate-900 outline-none"
            >
                <span className="truncate">{selectedOption?.label || <span className="text-slate-300 font-medium">{placeholder}</span>}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] min-w-[220px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                                placeholder="Quick search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 scrollbar-hide">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${String(opt.id) === String(value) ? 'bg-navy-900 text-brand-400 shadow-lg' : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'}`}
                            >
                                <span className="truncate pr-2">{opt.label}</span>
                                {String(opt.id) === String(value) && <Check className="w-3.5 h-3.5" />}
                            </button>
                        )) : (
                            <div className="text-center py-6">
                                <Search className="w-6 h-6 text-slate-100 mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Matches</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CUSTOM DATE PICKER COMPONENT ---

const CustomDatePicker: React.FC<{
    value: string;
    onChange: (date: string) => void;
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    let initialDate = new Date();
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        initialDate = new Date(y, m - 1, d);
    }
    const [currentMonth, setCurrentMonth] = useState(initialDate);

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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
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
                className="w-full h-full flex items-center justify-between text-xs font-bold text-slate-900"
            >
                <span>{formatDate(value)}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 min-w-[280px] z-[110] animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-black/5">
                    <div className="flex items-center justify-between mb-5 bg-slate-50 p-2 rounded-2xl">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-[11px] font-black text-navy-900 uppercase tracking-widest">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-3 text-center">
                        {['S','M','T','W','T','F','S'].map(d => <span key={d} className="text-[9px] font-black text-slate-300 uppercase">{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                        {generateCalendar().map((date, i) => {
                            if (!date) return <div key={i} />;
                            const isSelected = value === `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateClick(date)}
                                    className={`aspect-square flex items-center justify-center rounded-xl text-[10px] font-bold transition-all ${isSelected ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/30 scale-110 z-10' : 'text-slate-700 hover:bg-slate-50 hover:text-navy-900'}`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Select Launch Date</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- INPUT FIELD SUB-COMPONENT ---

const InputField = ({ 
    label, 
    value, 
    isEditing, 
    name, 
    onChange, 
    icon,
    type = 'text',
    options = [],
    colSpan = "col-span-1",
    readOnly = false,
    customInput
}: { 
    label: string, 
    value: any, 
    isEditing: boolean, 
    name: string, 
    onChange?: (e: any) => void,
    icon?: React.ReactNode,
    type?: string,
    options?: MetaOption[],
    colSpan?: string,
    readOnly?: boolean,
    customInput?: React.ReactNode
}) => (
    <div className={`space-y-1.5 w-full text-left ${colSpan}`}>
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all duration-300 ${(isEditing && !readOnly) ? 'bg-white border-brand-500 ring-4 ring-brand-500/10' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 shadow-sm'} ${readOnly && isEditing ? 'bg-slate-100/50 cursor-not-allowed opacity-80' : ''}`}>
            {icon && <span className={`shrink-0 transition-colors ${(isEditing && !readOnly) ? 'text-brand-500' : 'text-slate-400'}`}>{icon}</span>}
            <div className="flex-1 min-w-0 h-full">
                {isEditing ? (
                    readOnly ? (
                        <div className="flex items-center justify-between w-full h-full">
                            <span className="text-xs font-black text-slate-500 block truncate leading-relaxed">{value || '—'}</span>
                            <Lock className="w-3 h-3 text-slate-300" />
                        </div>
                    ) : customInput ? (
                        customInput
                    ) : type === 'select' ? (
                        <CustomSearchDropdown 
                            value={String(value)} 
                            options={options} 
                            onChange={(val) => onChange && onChange({ target: { name, value: val } })}
                        />
                    ) : (
                        <input 
                            type={type}
                            name={name}
                            value={value || ''}
                            onChange={onChange}
                            className="w-full bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300 h-full"
                        />
                    )
                ) : (
                    <span className="text-sm font-bold text-slate-800 block truncate leading-relaxed">
                        {type === 'select' ? (options.find(o => String(o.id) === String(value))?.label || value) : (value || '—')}
                    </span>
                )}
            </div>
        </div>
    </div>
);

export const AgencyCommissionsDetails: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { queue = [], startIndex = 0, from = '/management/commissions' } = location.state || {};
    
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isLocking, setIsLocking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Data States
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [coverage, setCoverage] = useState<Coverage | null>(null);
    const [splits, setSplits] = useState<SplitRecord[]>([]);
    const [commissions, setCommissions] = useState<PolicyCommission[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);

    // Policy Deletion State
    const [isDeletePolicyModalOpen, setIsDeletePolicyModalOpen] = useState(false);
    const [policyDeleteReason, setPolicyDeleteReason] = useState('');
    const [isDeletingPolicy, setIsDeletingPolicy] = useState(false);

    // Meta States
    const [carrierOptions, setCarrierOptions] = useState<MetaOption[]>([]);
    const [statusOptions, setStatusOptions] = useState<MetaOption[]>([]);
    const [paidStatusOptions, setPaidStatusOptions] = useState<MetaOption[]>([]);
    const [commStatusOptions, setCommStatusOptions] = useState<MetaOption[]>([]);
    const [agentOptions, setAgentOptions] = useState<MetaOption[]>([]);
    
    // Form State (For Editing Coverage)
    const [coverageForm, setCoverageForm] = useState<Partial<Coverage>>({});

    // Add/Edit Commission Modal State (Basic Entry)
    const [isAddingCommission, setIsAddingCommission] = useState(false);
    const [isCreatingCommission, setIsCreatingCommission] = useState(false);
    const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
    const [commissionForm, setCommissionForm] = useState({
        statement_date: '',
        status_id: '',
        agent_id: '',
        amount: ''
    });

    // Commission Drawer State (Comments & Advanced Edit)
    const [selectedCommForDrawer, setSelectedCommForDrawer] = useState<PolicyCommission | null>(null);
    const [commDrawerTab, setCommDrawerTab] = useState<'details' | 'comments'>('comments');
    const [commCommentType, setCommCommentType] = useState<'public' | 'private'>('public');
    const [commComments, setCommComments] = useState<Comment[]>([]);
    const [loadingCommComments, setLoadingCommComments] = useState(false);
    const [newCommComment, setNewCommComment] = useState('');
    const [sendingCommComment, setSendingCommComment] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const commCommentsEndRef = useRef<HTMLDivElement>(null);
    
    // Commission Deletion Modal State
    const [deletingCommissionId, setDeletingCommissionId] = useState<string | null>(null);
    const [commissionToDelete, setCommissionToDelete] = useState<PolicyCommission | null>(null);
    
    // UI State
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const policyId = queue[currentIndex];

    // Initial Data Fetch
    useEffect(() => {
        if (!policyId || !token) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clientData, coverageData, splitsData, commissionData, commentsData, carriers, statuses, paidStatuses, commStatuses, agents] = await Promise.all([
                    agencyCommissionsDetailsApi.getClientProfile(token, policyId),
                    agencyCommissionsDetailsApi.getPolicyCoverage(token, policyId),
                    agencyCommissionsDetailsApi.getSplits(token, policyId),
                    agencyCommissionsDetailsApi.getPolicyCommissions(token, policyId),
                    agencyCommissionsDetailsApi.getPublicComments(token, policyId),
                    agencyCommissionsDetailsApi.getCarriers(token),
                    agencyCommissionsDetailsApi.getPolicyStatuses(token),
                    agencyCommissionsDetailsApi.getPaidStatuses(token),
                    agencyCommissionsDetailsApi.getCommissionStatuses(token),
                    agencyCommissionsDetailsApi.getAgents(token)
                ]);
                
                setClient(clientData);
                setCoverage(coverageData);
                setCoverageForm(coverageData);
                setSplits(splitsData);
                setCommissions(commissionData || []);
                setComments(commentsData);
                setCarrierOptions(carriers || []);
                setStatusOptions(statuses || []);
                setPaidStatusOptions(paidStatuses || []);
                setCommStatusOptions(commStatuses || []);
                setAgentOptions(agents || []);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [policyId, token]);

    // Drawer Comments Fetch
    useEffect(() => {
        if (!selectedCommForDrawer || !token) return;
        
        const fetchCommComments = async () => {
            setLoadingCommComments(true);
            try {
                const data = await agencyCommissionsDetailsApi.getCommissionComments(token, selectedCommForDrawer.id, commCommentType);
                setCommComments(data);
            } catch (err) {
                console.error("Failed to fetch commission comments", err);
            } finally {
                setLoadingCommComments(false);
            }
        };
        fetchCommComments();
    }, [selectedCommForDrawer, commCommentType, token]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    useEffect(() => {
        commCommentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [commComments]);

    const handleNext = () => currentIndex < queue.length - 1 && setCurrentIndex(prev => prev + 1);
    const handlePrev = () => currentIndex > 0 && setCurrentIndex(prev => prev - 1);

    const handleCoverageChange = (e: any) => {
        const { name, value } = e.target;
        
        let updatedForm = { ...coverageForm, [name]: value };

        if (name === 'recurring_draft_day') {
            let day = parseInt(value);
            if (!isNaN(day)) {
                if (day < 1) day = 1;
                if (day > 31) day = 31;
                updatedForm.recurring_draft_day = day;
            }
        }

        if (name === 'monthly_premium') {
            const monthly = parseFloat(value) || 0;
            updatedForm.annual_premium = monthly * 12;
        }

        if (name === 'carrier_id') {
            const selected = carrierOptions.find(o => String(o.id) === String(value));
            updatedForm.carrier = { id: value, label: selected?.label || '', custom_carrier: null };
        }
        if (name === 'status_id') {
            const selected = statusOptions.find(o => String(o.id) === String(value));
            updatedForm.status = { id: value, label: selected?.label || '' };
        }
        if (name === 'paidstatus_id') {
            const selected = paidStatusOptions.find(o => String(o.id) === String(value));
            updatedForm.paidstatus = { id: value, label: selected?.label || '' };
        }

        setCoverageForm(updatedForm);
    };

    const handleToggleLock = async () => {
        if (!token || !policyId || !coverage) return;
        setIsLocking(true);
        try {
            const nextLockState = !coverage.isLocked;
            await agencyCommissionsDetailsApi.togglePolicyLock(token, policyId, nextLockState);
            setCoverage(prev => prev ? { ...prev, isLocked: nextLockState } : null);
        } catch (err) {
            console.error("Failed to toggle lock", err);
        } finally {
            setIsLocking(false);
        }
    };

    const handleSaveCoverage = async () => {
        if (!token || !policyId || !coverage) return;
        
        setSaving(true);
        const payload: Coverage = {
            ...coverage,
            ...coverageForm,
            recurring_draft_day: Number(coverageForm.recurring_draft_day ?? coverage.recurring_draft_day),
            face_amount: Number(coverageForm.face_amount ?? coverage.face_amount),
            monthly_premium: Number(coverageForm.monthly_premium ?? coverage.monthly_premium),
            annual_premium: Number(coverageForm.annual_premium ?? coverage.annual_premium),
            carrier: coverageForm.carrier ?? coverage.carrier,
            status: coverageForm.status ?? coverage.status,
            paidstatus: coverageForm.paidstatus ?? coverage.paidstatus,
            beneficiary: coverageForm.beneficiary ?? coverage.beneficiary,
            appointment_highlights: coverageForm.appointment_highlights ?? coverage.appointment_highlights,
            pending_follow_up: coverageForm.pending_follow_up ?? coverage.pending_follow_up,
        };

        try {
            await agencyCommissionsDetailsApi.updatePolicyCoverage(token, policyId, payload);
            setCoverage(payload);
            setCoverageForm(payload);
            setIsEditing(false);
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setSaving(false);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !token || !policyId) return;
        const textToSend = newComment;
        setSendingComment(true);
        try {
            const added = await agencyCommissionsDetailsApi.createComment(token, policyId, textToSend);
            const safeAdded = {
                ...added,
                message: added.message || textToSend,
                created_at: added.created_at || Date.now(),
                _commentby: added._commentby || {
                    id: user?.id,
                    first_name: user?.name?.split(' ')[0] || 'Me',
                    last_name: user?.name?.split(' ').slice(1).join(' ') || ''
                }
            };
            setComments(prev => [...prev, safeAdded]);
            setNewComment('');
        } catch (err) {
            console.error(err);
        } finally {
            setSendingComment(false);
        }
    };

    const handleOpenAddCommission = () => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setCommissionForm({
            statement_date: todayStr,
            status_id: '',
            agent_id: '',
            amount: ''
        });
        setEditingCommissionId(null);
        setIsAddingCommission(true);
    };

    const handleOpenCommDrawer = (comm: PolicyCommission) => {
        const d = new Date(comm.created_at);
        // Fix: Use 'd' instead of 'today' which was undefined
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const statusOption = commStatusOptions.find(o => o.label === comm.status);

        setCommissionForm({
            statement_date: dateStr,
            status_id: statusOption?.id || '',
            agent_id: comm.agentOncommission_id,
            amount: String(comm.amount)
        });
        setSelectedCommForDrawer(comm);
        setCommDrawerTab('comments');
        setCommCommentType('public');
        setShowSaveSuccess(false);
    };

    const handleSaveCommission = async () => {
        if (!token || !policyId) return;
        const selectedStatus = commStatusOptions.find(o => o.id === commissionForm.status_id);
        const selectedAgent = agentOptions.find(o => o.id === commissionForm.agent_id);

        if (!commissionForm.statement_date || !selectedStatus || !selectedAgent || !commissionForm.amount) {
            alert("All fields are required.");
            return;
        }

        setIsCreatingCommission(true);
        setShowSaveSuccess(false);

        const [y, m, d] = commissionForm.statement_date.split('-').map(Number);
        const now = new Date();
        const localDateWithCurrentTime = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        const utcTimestampMs = localDateWithCurrentTime.getTime();

        const payload = {
            statement_date: utcTimestampMs,
            status: { id: selectedStatus.id, label: selectedStatus.label },
            agentOnCommission: { id: selectedAgent.id, name: selectedAgent.label },
            amount: parseFloat(commissionForm.amount)
        };

        try {
            const commId = editingCommissionId || selectedCommForDrawer?.id;
            if (commId) {
                await agencyCommissionsDetailsApi.updateCommissionRecord(token, commId, payload);
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 3000);
            } else {
                await agencyCommissionsDetailsApi.createCommissionRecord(token, policyId, payload);
            }
            const refreshed = await agencyCommissionsDetailsApi.getPolicyCommissions(token, policyId);
            setCommissions(refreshed || []);
            if (!selectedCommForDrawer) setIsAddingCommission(false);
            setEditingCommissionId(null);
            if (selectedCommForDrawer) {
                const updated = refreshed.find((r: any) => r.id === selectedCommForDrawer.id);
                if (updated) setSelectedCommForDrawer(updated);
            }
        } catch (err) {
            console.error("Operation failed", err);
            alert("Failed to process commission record.");
        } finally {
            setIsCreatingCommission(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, commission: PolicyCommission) => {
        e.stopPropagation(); // Don't open drawer
        setCommissionToDelete(commission);
    };

    const confirmDelete = async () => {
        if (!token || !commissionToDelete) return;

        setDeletingCommissionId(commissionToDelete.id);
        try {
            await agencyCommissionsDetailsApi.deleteCommissionRecord(token, commissionToDelete.id);
            const refreshed = await agencyCommissionsDetailsApi.getPolicyCommissions(token, policyId);
            setCommissions(refreshed || []);
            if (selectedCommForDrawer?.id === commissionToDelete.id) {
                setSelectedCommForDrawer(null);
            }
            setCommissionToDelete(null);
        } catch (err) {
            console.error("[ERROR] DELETE failed:", err);
            alert("Operation failed. Ensure you have administrative rights.");
        } finally {
            setDeletingCommissionId(null);
        }
    };

    const handleDeletePolicy = async () => {
        if (!token || !policyId || !policyDeleteReason.trim()) return;
        
        setIsDeletingPolicy(true);
        try {
            await agencyCommissionsDetailsApi.deletePolicy(token, policyId, policyDeleteReason);
            setIsDeletePolicyModalOpen(false);
            setPolicyDeleteReason('');
            
            // Redirect after successful deletion
            if (queue.length > 1) {
                const nextQueue = queue.filter((id: string) => id !== policyId);
                const nextIndex = currentIndex >= nextQueue.length ? nextQueue.length - 1 : currentIndex;
                navigate('.', { state: { queue: nextQueue, startIndex: nextIndex, from }, replace: true });
            } else {
                navigate(from);
            }
        } catch (error) {
            console.error("Policy delete failed", error);
            alert("Failed to delete policy. Ensure you have administrative rights.");
        } finally {
            setIsDeletingPolicy(false);
        }
    };

    const handleSendCommComment = async () => {
        if (!newCommComment.trim() || !token || !selectedCommForDrawer) return;
        const textToSend = newCommComment;
        setSendingCommComment(true);
        try {
            const added = await agencyCommissionsDetailsApi.createCommissionComment(token, selectedCommForDrawer.id, commCommentType, textToSend);
            const safeAdded = {
                ...added,
                message: added.message || textToSend,
                created_at: added.created_at || Date.now(),
                _commentby: added._commentby || {
                    id: user?.id,
                    first_name: user?.name?.split(' ')[0] || 'Me',
                    last_name: user?.name?.split(' ').slice(1).join(' ') || ''
                }
            };
            setCommComments(prev => [...prev, safeAdded]);
            setNewCommComment('');
        } catch (err) {
            console.error(err);
        } finally {
            setSendingCommComment(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[600px] flex flex-col items-center justify-center text-center px-4">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Portfolio...</p>
            </div>
        );
    }

    if (!coverage || !client) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-xs font-bold text-slate-400">Record not found.</p>
                <button onClick={() => navigate(from)} className="mt-4 text-[10px] font-black text-brand-500 underline uppercase tracking-widest">
                    {from.includes('policies') ? 'Back to Portfolio' : 'Back to Ledger'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(from)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-100 text-slate-500 font-bold text-[11px] hover:text-navy-900 shadow-sm transition-all group w-fit"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {from.includes('policies') ? 'Portfolio' : 'Ledger'}
                    </button>
                    {!coverage.isLocked && (
                        <button 
                            onClick={() => setIsDeletePolicyModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-red-100 text-red-500 font-bold text-[11px] hover:bg-red-50 shadow-sm transition-all group w-fit"
                        >
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            Delete Policy
                        </button>
                    )}
                </div>

                <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-100 shadow-md">
                    <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-6 text-center border-x border-slate-50">
                        <p className="text-[10px] font-black text-navy-900 uppercase tracking-widest">Vault Record</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">{currentIndex + 1} / {queue.length}</p>
                    </div>
                    <button onClick={handleNext} disabled={currentIndex === queue.length - 1} className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Locked Status Header */}
            <div className={`mx-1 rounded-3xl p-4 flex items-center justify-between shadow-lg transition-all duration-700 border ${coverage.isLocked ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-xl transition-colors ${coverage.isLocked ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                        {coverage.isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-black tracking-tight ${coverage.isLocked ? 'text-amber-900' : 'text-emerald-900'}`}>{coverage.isLocked ? 'Locked for Editing' : 'Open for Editing'}</h4>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${coverage.isLocked ? 'text-amber-700/60' : 'text-emerald-700/60'}`}>
                            {coverage.isLocked ? 'Records are verified and sealed' : 'All attributes can be modified'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white/60 px-4 py-2 rounded-2xl border border-white">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Security Lock</span>
                    <button onClick={handleToggleLock} disabled={isLocking} className={`w-11 h-6 rounded-full transition-all relative flex items-center shadow-inner ${coverage.isLocked ? 'bg-amber-500' : 'bg-slate-200'}`}>
                        <span className={`w-4 h-4 bg-white rounded-full shadow-md absolute transition-transform duration-300 ${coverage.isLocked ? 'translate-x-6' : 'translate-x-1'}`}>
                            {isLocking && <Loader2 className="w-2.5 h-2.5 text-slate-400 absolute inset-0 m-auto animate-spin" />}
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* PRIMARY WORKSPACE: 9/12 */}
                <div className="lg:col-span-9 space-y-5">
                    
                    {/* PREMIUM IDENTITY HEADER */}
                    <div className="bg-navy-900 rounded-3xl p-5 border border-navy-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden relative">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                         <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-brand-500 flex items-center justify-center text-lg font-black shadow-inner shrink-0">
                                {client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black text-white tracking-tight truncate leading-none mb-2">{client.name}</h2>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin className="w-3 h-3 text-brand-500" /> {client.state}</span>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Phone className="w-3 h-3 text-brand-500" /> {client.phone || 'N/A'}</span>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 relative z-10">
                             <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-3 h-3" /> {client.source?.label || 'Organic'}
                             </div>
                             <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2">
                                <Tag className="w-3 h-3" /> {client.type?.label || 'General'}
                             </div>
                         </div>
                    </div>

                    {/* UNIFIED DATA & ACTIVITY CONTAINER */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col md:grid md:grid-cols-12 min-h-[700px]">
                        
                        {/* LEFT SUB-COLUMN: DATA (8/12) */}
                        <div className="md:col-span-8 p-8 space-y-8">
                            
                            {/* POLICY COVERAGE SECTION */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100 shadow-sm transition-transform hover:rotate-6">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-navy-900 tracking-tight">Policy Coverage</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Asset Attributes</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleSaveCoverage} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-xl font-black text-[10px] hover:bg-black shadow-lg transition-all disabled:opacity-50">
                                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                                                </button>
                                                <button onClick={() => { setIsEditing(false); setCoverageForm(coverage); }} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] hover:bg-slate-200 transition-all disabled:opacity-50">
                                                    <X className="w-3 h-3" /> Cancel
                                                </button>
                                            </>
                                        ) : (
                                            !coverage.isLocked && (
                                                <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-50 text-slate-400 hover:text-brand-500 rounded-xl transition-all border border-slate-100 hover:border-brand-200 shadow-sm">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="md:col-span-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pb-1 border-b border-slate-50 mb-2">Core Identification</div>
                                    <InputField label="Carrier" icon={<Briefcase className="w-4 h-4"/>} value={isEditing ? (coverageForm.carrier?.id || '') : coverage.carrier?.label} isEditing={isEditing} name="carrier_id" type="select" options={carrierOptions} onChange={handleCoverageChange} />
                                    <InputField label="Product" icon={<Tag className="w-4 h-4"/>} value={isEditing ? coverageForm.product : coverage.product} isEditing={isEditing} onChange={handleCoverageChange} name="product" />
                                    <InputField label="Policy #" icon={<Hash className="w-4 h-4"/>} value={isEditing ? coverageForm.policy_number : coverage.policy_number} isEditing={isEditing} onChange={handleCoverageChange} name="policy_number" />
                                    <InputField label="Beneficiary" icon={<User className="w-4 h-4"/>} value={isEditing ? coverageForm.beneficiary : coverage.beneficiary} isEditing={isEditing} onChange={handleCoverageChange} name="beneficiary" />

                                    <div className="md:col-span-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pb-1 border-b border-slate-50 my-2">Financial Provisions</div>
                                    <InputField label="Face Amount" icon={<Shield className="w-4 h-4"/>} value={isEditing ? coverageForm.face_amount : formatCurrency(coverage.face_amount)} isEditing={isEditing} onChange={handleCoverageChange} name="face_amount" type="number" />
                                    <InputField label="Monthly Prem" icon={<DollarSign className="w-4 h-4"/>} value={isEditing ? coverageForm.monthly_premium : formatCurrency(coverage.monthly_premium)} isEditing={isEditing} onChange={handleCoverageChange} name="monthly_premium" type="number" />
                                    <InputField label="Annual Prem" icon={<DollarSign className="w-4 h-4"/>} value={isEditing ? formatCurrency(coverageForm.annual_premium || 0) : formatCurrency(coverage.annual_premium)} isEditing={isEditing} name="annual_premium" readOnly={true} />
                                    <InputField label="Draft Day" icon={<Calendar className="w-4 h-4"/>} value={isEditing ? coverageForm.recurring_draft_day : coverage.recurring_draft_day} isEditing={isEditing} onChange={handleCoverageChange} name="recurring_draft_day" type="number" />

                                    <div className="md:col-span-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pb-1 border-b border-slate-50 my-2">Execution & Lifecycle</div>
                                    <InputField label="Status" icon={<Activity className="w-4 h-4"/>} value={isEditing ? (coverageForm.status?.id || '') : coverage.status?.label} isEditing={isEditing} name="status_id" type="select" options={statusOptions} onChange={handleCoverageChange} />
                                    <InputField label="Paid Status" icon={<CreditCard className="w-4 h-4"/>} value={isEditing ? (coverageForm.paidstatus?.id || '') : (coverage.paidstatus?.label || '—')} isEditing={isEditing} name="paidstatus_id" type="select" options={paidStatusOptions} onChange={handleCoverageChange} />
                                    <InputField label="Initial Draft Date" icon={<Calendar className="w-4 h-4"/>} value={isEditing ? coverageForm.initial_draft_date : formatDate(coverage.initial_draft_date)} isEditing={isEditing} name="initial_draft_date" colSpan="md:col-span-2" customInput={<CustomDatePicker value={coverageForm.initial_draft_date || ''} onChange={(date) => handleCoverageChange({ target: { name: 'initial_draft_date', value: date } })} />} />
                                    <InputField label="Highlights" icon={<FileText className="w-4 h-4"/>} value={isEditing ? coverageForm.appointment_highlights : coverage.appointment_highlights || '—'} isEditing={isEditing} onChange={handleCoverageChange} name="appointment_highlights" colSpan="md:col-span-2" />
                                    <InputField label="Follow Up" icon={<Clock className="w-4 h-4"/>} value={isEditing ? coverageForm.pending_follow_up : coverage.pending_follow_up || '—'} isEditing={isEditing} onChange={handleCoverageChange} name="pending_follow_up" colSpan="md:col-span-2" />
                                </div>
                            </section>

                            {/* SPLITS SECTION */}
                            <section className="pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                        <Split className="w-4.5 h-4.5" />
                                    </div>
                                    <h3 className="text-xs font-black text-navy-900 uppercase tracking-widest">Revenue Distribution</h3>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {splits.length > 0 ? splits.map(split => (
                                        <div key={split.id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-brand-300 transition-all hover:shadow-md cursor-default group">
                                            <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center text-[10px] font-black group-hover:bg-brand-50 transition-colors">
                                                {split.on_split_agent_name.split(' ').map(n=>n[0]).join('')}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700">{split.on_split_agent_name}</span>
                                            <span className="text-[11px] font-black text-navy-900 border-l border-slate-200 pl-3">{split.agent_on_split_percent}%</span>
                                        </div>
                                    )) : (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                                            <Info className="w-4 h-4" />
                                            <p className="text-[11px] font-bold uppercase tracking-wider italic">No Active Shared Distribution Rules.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* RIGHT SUB-COLUMN: ACTIVITY LOG */}
                        <div className="md:col-span-4 bg-slate-50/80 border-l border-slate-100 flex flex-col h-[600px] md:h-auto min-h-[600px]">
                            <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white/40 backdrop-blur-md sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <Folder className="w-4 h-4 text-blue-500" />
                                    <h3 className="text-[11px] font-black text-navy-900 uppercase tracking-[0.2em]">Policy Comments</h3>
                                </div>
                                <span className="bg-navy-900 text-brand-500 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg">{comments.length}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide bg-slate-50/30">
                                {comments.length > 0 ? comments.map((c, i) => {
                                    const isMe = c._commentby?.id === user?.id;
                                    return (
                                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                            <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[9px] font-black text-navy-900">{c._commentby?.first_name} {c._commentby?.last_name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-1.5 py-0.5 rounded border border-white/80">{formatCommentTime(c.created_at)}</span>
                                            </div>
                                            <div className={`max-w-[95%] px-4 py-3 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm transition-transform hover:scale-[1.02] ${
                                                isMe ? 'bg-navy-900 text-white rounded-tr-none shadow-navy-900/10' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                            }`}>
                                                {c.message}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 grayscale">
                                        <MessageSquare className="w-12 h-12 mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Log Entries</p>
                                    </div>
                                )}
                                <div ref={commentsEndRef}></div>
                            </div>

                            <div className="p-6 bg-white border-t border-slate-200 shrink-0">
                                <div className="relative group flex items-start gap-3">
                                    <textarea 
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendComment())}
                                        placeholder="Add to timeline..."
                                        className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-medium text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white focus:border-brand-300 transition-all shadow-sm resize-none min-h-[56px] h-14"
                                    />
                                    <button onClick={handleSendComment} disabled={!newComment.trim() || sendingComment} className="absolute right-2 top-2 p-2.5 text-slate-300 hover:text-brand-500 transition-all hover:scale-110 active:scale-95">
                                        {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR: COMMISSION RECORDS */}
                <div className="lg:col-span-3 h-full sticky top-4">
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl relative h-full min-h-[850px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-navy-900 rounded-xl text-brand-500 shadow-lg shadow-navy-900/10">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-navy-900 tracking-tight uppercase tracking-widest">Commission Records</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Audit History</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={handleOpenAddCommission}
                                className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all shadow-sm group"
                                title="New Commission Record"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                            {commissions.length > 0 ? commissions.map((comm) => (
                                <div 
                                    key={comm.id} 
                                    onClick={() => handleOpenCommDrawer(comm)}
                                    className="p-4 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col gap-4 group transition-all hover:bg-white hover:border-brand-300 hover:shadow-2xl hover:shadow-navy-900/5 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-navy-900 border border-navy-800 flex items-center justify-center text-[9px] font-black text-brand-500 group-hover:scale-110 transition-transform shadow-md shrink-0">
                                                {comm.agentOncommission_name.split(' ').map(n=>n[0]).join('')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-navy-900 leading-none truncate mb-1.5">{comm.agentOncommission_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-brand-500" /> {formatDate(comm.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[12px] font-black text-navy-900">{formatCurrency(comm.amount)}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{comm.submitted_by}</span>
                                        </div>
                                    </div>
                                    
                                    {comm.notes && (
                                        <div className="bg-white/50 p-2.5 rounded-xl border border-slate-100/50">
                                            <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic line-clamp-2">"{comm.notes}"</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                            comm.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-200/50 text-slate-500 border-slate-200'
                                        }`}>
                                            {comm.status}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDeleteClick(e, comm)}
                                                disabled={deletingCommissionId === comm.id}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 relative z-50"
                                                title="Delete Record"
                                            >
                                                {deletingCommissionId === comm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                            <div className="flex items-center gap-2 text-navy-900 hover:text-brand-500 transition-colors group/link">
                                                <span className="text-[10px] font-black uppercase tracking-tighter">View</span>
                                                <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/40">
                                    <Info className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End of Ledger</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 p-5 bg-navy-900 rounded-3xl text-white relative overflow-hidden shadow-2xl">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl"></div>
                             <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] mb-2">Internal Note</p>
                             <p className="text-[10px] font-bold text-slate-300 leading-relaxed italic">All commissions are reconciled against carrier statements daily.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD COMMISSION MODAL (Simple Entry) */}
            {isAddingCommission && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-navy-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-visible border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-navy-900 tracking-tight">Manual Payout Entry</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ledger reconciliation protocol</p>
                            </div>
                            <button onClick={() => setIsAddingCommission(false)} className="p-2.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-navy-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 flex-1 overflow-visible">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Fix: Remove 'isEditing' prop from CustomDatePicker as it's not supported by the component */}
                                <InputField label="Statement Date" icon={<Calendar className="w-4 h-4" />} isEditing={true} name="statement_date" value={commissionForm.statement_date} customInput={<CustomDatePicker value={commissionForm.statement_date} onChange={(val) => setCommissionForm(prev => ({ ...prev, statement_date: val }))} />} />
                                <InputField label="Status" icon={<Activity className="w-4 h-4" />} isEditing={true} name="status_id" type="select" options={commStatusOptions} value={commissionForm.status_id} onChange={(e) => setCommissionForm(prev => ({ ...prev, status_id: e.target.value }))} />
                                <InputField label="Agent on Commission" icon={<User className="w-4 h-4" />} isEditing={true} name="agent_id" type="select" options={agentOptions} value={commissionForm.agent_id} onChange={(e) => setCommissionForm(prev => ({ ...prev, agent_id: e.target.value }))} />
                                <InputField label="Commission Amount" icon={<DollarSign className="w-4 h-4" />} isEditing={true} name="amount" type="number" value={commissionForm.amount} onChange={(e) => setCommissionForm(prev => ({ ...prev, amount: e.target.value }))} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-50 bg-slate-50/30 shrink-0 flex gap-3">
                            <button onClick={() => setIsAddingCommission(false)} className="flex-1 py-4 px-6 rounded-2xl text-xs font-black text-slate-500 hover:text-navy-900 transition-colors">Discard</button>
                            <button onClick={handleSaveCommission} disabled={isCreatingCommission} className="flex-[2] py-4 px-8 bg-navy-900 text-white rounded-2xl text-xs font-black hover:bg-black shadow-xl shadow-navy-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {isCreatingCommission ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COMMISSION DETAILS & COMMENTS DRAWER */}
            {selectedCommForDrawer && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-500" onClick={() => setSelectedCommForDrawer(null)} />
                    <div className="relative w-full max-w-xl bg-[#F8F9FC] h-full shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-500 flex flex-col">
                        <div className="p-8 bg-white border-b border-slate-100 flex items-start justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 bg-navy-900 rounded-xl text-brand-500 shadow-lg shadow-navy-900/10">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-black text-navy-900 tracking-tight">Commission Management</h3>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Record ID: {selectedCommForDrawer.id}</p>
                            </div>
                            <button onClick={() => setSelectedCommForDrawer(null)} className="p-2.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-navy-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* TABS */}
                        <div className="px-8 pt-4 bg-white border-b border-slate-100 flex gap-8 shrink-0">
                            <button 
                                onClick={() => setCommDrawerTab('comments')}
                                className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${commDrawerTab === 'comments' ? 'border-brand-500 text-navy-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Audit Comments
                            </button>
                            <button 
                                onClick={() => setCommDrawerTab('details')}
                                className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${commDrawerTab === 'details' ? 'border-brand-500 text-navy-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Edit Coverage
                            </button>
                        </div>

                        <div className="flex-1 overflow-visible">
                            {commDrawerTab === 'details' ? (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-visible">
                                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 overflow-visible">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Fix: Remove 'isEditing' prop from CustomDatePicker as it's not supported by the component */}
                                            <InputField label="Statement Date" icon={<Calendar className="w-4 h-4" />} isEditing={true} name="statement_date" value={commissionForm.statement_date} customInput={<CustomDatePicker value={commissionForm.statement_date} onChange={(val) => setCommissionForm(prev => ({ ...prev, statement_date: val }))} />} />
                                            <InputField label="Status" icon={<Activity className="w-4 h-4" />} isEditing={true} name="status_id" type="select" options={commStatusOptions} value={commissionForm.status_id} onChange={(e) => setCommissionForm(prev => ({ ...prev, status_id: e.target.value }))} />
                                            <InputField label="Agent on Commission" icon={<User className="w-4 h-4" />} isEditing={true} name="agent_id" type="select" options={agentOptions} value={commissionForm.agent_id} onChange={(e) => setCommissionForm(prev => ({ ...prev, agent_id: e.target.value }))} />
                                            <InputField label="Commission Amount" icon={<DollarSign className="w-4 h-4" />} isEditing={true} name="amount" type="number" value={commissionForm.amount} onChange={(e) => setCommissionForm(prev => ({ ...prev, amount: e.target.value }))} />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={handleSaveCommission}
                                                disabled={isCreatingCommission}
                                                className="flex-1 py-4 bg-navy-900 text-white rounded-2xl font-black text-xs hover:bg-black shadow-xl shadow-navy-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isCreatingCommission ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Update Commission Record
                                            </button>
                                            {showSaveSuccess && (
                                                <div className="flex items-center gap-2 text-emerald-600 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span className="text-xs font-black uppercase tracking-widest">Saved</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4">
                                        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest mb-1">Authorization Required</p>
                                            <p className="text-xs font-bold text-amber-700/80 leading-relaxed">Updating a payout after creation triggers a ledger reconciliation event. All changes are logged for financial auditing.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col animate-in fade-in slide-in-from-left-4 duration-500 overflow-hidden">
                                    <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
                                        <div className="flex p-1 bg-white rounded-xl border border-slate-200">
                                            <button 
                                                onClick={() => setCommCommentType('public')}
                                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${commCommentType === 'public' ? 'bg-navy-900 text-white shadow-lg' : 'text-slate-400'}`}
                                            >
                                                Public
                                            </button>
                                            <button 
                                                onClick={() => setCommCommentType('private')}
                                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${commCommentType === 'private' ? 'bg-navy-900 text-white shadow-lg' : 'text-slate-400'}`}
                                            >
                                                Private
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{commComments.length} entries</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-slate-50/30">
                                        {loadingCommComments ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Loading history...</p>
                                            </div>
                                        ) : commComments.length > 0 ? (
                                            commComments.map((c, i) => {
                                                const isMe = c._commentby?.id === user?.id;
                                                return (
                                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                                        <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                            <span className="text-[9px] font-black text-navy-900">{c._commentby?.first_name} {c._commentby?.last_name}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-1.5 py-0.5 rounded border border-white/80">{formatCommentTime(c.created_at)}</span>
                                                        </div>
                                                        <div className={`max-w-[95%] px-5 py-4 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm transition-transform hover:scale-[1.02] ${
                                                            isMe ? 'bg-navy-900 text-white rounded-tr-none shadow-navy-900/10' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                                        }`}>
                                                            {c.message}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                                                <MessageCircle className="w-16 h-16 mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No {commCommentType} activity</p>
                                            </div>
                                        )}
                                        <div ref={commCommentsEndRef}></div>
                                    </div>

                                    <div className="p-8 bg-white border-t border-slate-100 shrink-0">
                                        <div className="relative group flex items-start gap-3">
                                            <textarea 
                                                value={newCommComment}
                                                onChange={(e) => setNewCommComment(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendCommComment())}
                                                placeholder={`Add ${commCommentType} note...`}
                                                className="w-full pl-6 pr-14 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-medium text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white focus:border-brand-300 transition-all shadow-sm resize-none min-h-[64px] h-16"
                                            />
                                            <button onClick={handleSendCommComment} disabled={!newCommComment.trim() || sendingCommComment} className="absolute right-2 top-2 p-3 text-slate-300 hover:text-brand-500 transition-all hover:scale-110 active:scale-95">
                                                {sendingCommComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5.5 h-5.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* COMMISSION DELETION CONFIRMATION MODAL */}
            {commissionToDelete && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setCommissionToDelete(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-500/5">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-navy-900 tracking-tight mb-2">Delete Record?</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                            You are about to permanently delete the commission record for <span className="font-black text-slate-900">{commissionToDelete.agentOncommission_name}</span>. This action is <span className="text-red-500 font-black underline">irreversible</span>.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button 
                                onClick={() => setCommissionToDelete(null)}
                                className="py-4 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                            >
                                Keep Record
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={!!deletingCommissionId}
                                className="py-4 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {deletingCommissionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Confirm Deletion
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* POLICY DELETION CONFIRMATION MODAL */}
            {isDeletePolicyModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsDeletePolicyModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-500/5">
                            <Trash2 className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-navy-900 tracking-tight mb-2">Delete Policy?</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                            You are about to permanently delete the policy for <span className="font-black text-slate-900">{client.name}</span>. This action is <span className="text-red-500 font-black underline uppercase">permanent</span>.
                        </p>
                        
                        <div className="w-full space-y-4 mb-8 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason for deletion</label>
                            <textarea 
                                value={policyDeleteReason}
                                onChange={(e) => setPolicyDeleteReason(e.target.value)}
                                placeholder="Required..."
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-200 transition-all placeholder:text-slate-300 resize-none"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button 
                                onClick={() => { setIsDeletePolicyModalOpen(false); setPolicyDeleteReason(''); }}
                                className="py-4 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                            >
                                Keep Policy
                            </button>
                            <button 
                                onClick={handleDeletePolicy}
                                disabled={!policyDeleteReason.trim() || isDeletingPolicy}
                                className="py-4 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeletingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};