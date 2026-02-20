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
    Search,
    Info,
    Trash2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { agencyPolicyRecordsDetailsApi } from '../services/agencyPolicyRecordsDetailsApi';

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
    
    // Fix: Explicitly handle YYYY-MM-DD strings to avoid UTC-to-Local conversion shifting days back
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
const CustomDropdown: React.FC<{
    value: string | number;
    options: MetaOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    isEditing: boolean;
}> = ({ value, options, onChange, placeholder = "Select...", isEditing }) => {
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

    const selectedOption = options.find(opt => String(opt.id) === String(value));
    const displayValue = selectedOption ? selectedOption.label : '';

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isEditing) {
        return <span className="text-sm font-bold text-slate-900 block truncate">{displayValue || '—'}</span>;
    }

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-full bg-transparent outline-none text-sm font-bold text-slate-900 flex items-center justify-between cursor-pointer ${!displayValue ? 'text-slate-400' : ''}`}
            >
                <span className="truncate">{displayValue || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-64 flex flex-col min-w-[200px]">
                    <div className="p-2 border-b border-slate-50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 rounded-lg py-1.5 pl-8 pr-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                placeholder="Search..."
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const isSelected = String(opt.id) === String(value);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(String(opt.id));
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-between group ${isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <span>{opt.label}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">No matches found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CUSTOM DATE PICKER COMPONENT ---
const SingleDatePicker: React.FC<{
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    isEditing: boolean;
}> = ({ value, onChange, placeholder = "Select Date", isEditing }) => {
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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
        setIsOpen(false);
    };

    if (!isEditing) {
        return <span className="text-sm font-bold text-slate-900 block truncate">{value ? formatDate(value) : '—'}</span>;
    }

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-full bg-transparent outline-none text-sm font-bold text-slate-900 flex items-center justify-between cursor-pointer"
            >
                <span className="truncate">{value ? formatDate(value) : <span className="text-slate-400 font-medium">{placeholder}</span>}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-4 min-w-[280px] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                     <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendar().map((date, i) => {
                            if (!date) return <div key={i} className="aspect-square" />;
                            let isSelected = false;
                            if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                const [y, m, d] = value.split('-').map(Number);
                                if (date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y) isSelected = true;
                            }
                            return (
                                <div key={i} className="aspect-square">
                                    <button 
                                        type="button"
                                        onClick={() => handleDateClick(date)} 
                                        className={`w-full h-full flex items-center justify-center rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-brand-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {date.getDate()}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- UPDATED INPUT FIELD COMPONENT ---

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
    customInput,
    // Add min and max props here
    min,
    max
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
    customInput?: React.ReactNode,
    // Add min and max to type definition to support range constraints in numeric inputs
    min?: string | number,
    max?: string | number
}) => (
    <div className={`space-y-1.5 w-full text-left ${colSpan}`}>
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all duration-300 ${(isEditing && !readOnly) ? 'bg-white border-brand-500 ring-4 ring-brand-500/10' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 shadow-sm'} ${readOnly && isEditing ? 'bg-slate-100/50 cursor-not-allowed opacity-80' : ''}`}>
            {icon && <span className={`shrink-0 transition-colors ${(isEditing && !readOnly) ? 'text-brand-500' : 'text-slate-400'}`}>{icon}</span>}
            <div className="flex-1 min-w-0 h-full">
                {isEditing ? (
                    readOnly ? (
                        <div className="flex items-center justify-between w-full h-full">
                            <span className="text-sm font-bold text-slate-500 block truncate leading-relaxed">{value || '—'}</span>
                            <Lock className="w-3 h-3 text-slate-300" />
                        </div>
                    ) : customInput ? (
                        customInput
                    ) : type === 'select' ? (
                        <CustomDropdown 
                            value={value} 
                            options={options} 
                            isEditing={isEditing} 
                            onChange={(val) => onChange && onChange({ target: { name, value: val } })} 
                        />
                    ) : (
                        <input 
                            type={type}
                            name={name}
                            value={value || ''}
                            onChange={onChange}
                            // Pass min and max to the input element
                            min={min}
                            max={max}
                            className="w-full bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300 h-full"
                        />
                    )
                ) : (
                    <span className="text-sm font-bold text-slate-900 block truncate">
                        {type === 'select' ? options.find(o => String(o.id) === String(value))?.label || value : value || '—'}
                    </span>
                )}
            </div>
        </div>
    </div>
);

export const AgencyPolicyRecordsDetails: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { queue = [], startIndex = 0 } = location.state || {};
    
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Data States
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [coverage, setCoverage] = useState<Coverage | null>(null);
    const [splits, setSplits] = useState<SplitRecord[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Meta States
    const [carrierOptions, setCarrierOptions] = useState<MetaOption[]>([]);
    const [statusOptions, setStatusOptions] = useState<MetaOption[]>([]);
    const [paidStatusOptions, setPaidStatusOptions] = useState<MetaOption[]>([]);
    
    // Form State (For Editing Coverage)
    const [coverageForm, setCoverageForm] = useState<Partial<Coverage>>({});
    
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
                const [clientData, coverageData, splitsData, commentsData, carriers, statuses, paidStatuses] = await Promise.all([
                    agencyPolicyRecordsDetailsApi.getClientProfile(token, policyId),
                    agencyPolicyRecordsDetailsApi.getPolicyCoverage(token, policyId),
                    agencyPolicyRecordsDetailsApi.getSplits(token, policyId),
                    agencyPolicyRecordsDetailsApi.getPublicComments(token, policyId),
                    agencyPolicyRecordsDetailsApi.getCarriers(token),
                    agencyPolicyRecordsDetailsApi.getPolicyStatuses(token),
                    agencyPolicyRecordsDetailsApi.getPaidStatuses(token)
                ]);
                
                const mapOptions = (data: any[]) => (data || []).map(o => ({ id: String(o.id), label: o.label }));

                setClient(clientData);
                setCoverage(coverageData);
                setCoverageForm(coverageData);
                setSplits(splitsData);
                setComments(commentsData);
                setCarrierOptions(mapOptions(carriers));
                setStatusOptions(mapOptions(statuses));
                setPaidStatusOptions(mapOptions(paidStatuses));
            } catch (err) {
                console.error("Failed to fetch policy data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [policyId, token]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleNext = () => currentIndex < queue.length - 1 && setCurrentIndex(prev => prev + 1);
    const handlePrev = () => currentIndex > 0 && setCurrentIndex(prev => prev - 1);

    const handleCoverageChange = (e: any) => {
        const { name, value } = e.target;
        
        // Auto calculate annual premium
        if (name === 'monthly_premium') {
            const monthly = parseFloat(value) || 0;
            setCoverageForm(prev => ({ 
                ...prev, 
                monthly_premium: monthly,
                annual_premium: monthly * 12 
            }));
            return;
        }

        // Validate draft day (1-31)
        if (name === 'recurring_draft_day') {
            let day = parseInt(value);
            if (isNaN(day)) {
                setCoverageForm(prev => ({ ...prev, recurring_draft_day: undefined }));
                return;
            }
            if (day < 1) day = 1;
            if (day > 31) day = 31;
            setCoverageForm(prev => ({ ...prev, recurring_draft_day: day }));
            return;
        }

        if (name === 'carrier_id') {
            const selected = carrierOptions.find(o => String(o.id) === String(value));
            setCoverageForm(prev => ({
                ...prev,
                carrier: { id: value, label: selected?.label || '', custom_carrier: null }
            }));
            return;
        }
        if (name === 'status_id') {
            const selected = statusOptions.find(o => String(o.id) === String(value));
            setCoverageForm(prev => ({
                ...prev,
                status: { id: value, label: selected?.label || '' }
            }));
            return;
        }
        if (name === 'paidstatus_id') {
            const selected = paidStatusOptions.find(o => String(o.id) === String(value));
            setCoverageForm(prev => ({
                ...prev,
                paidstatus: { id: value, label: selected?.label || '' }
            }));
            return;
        }

        setCoverageForm(prev => ({ ...prev, [name]: value }));
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
            await agencyPolicyRecordsDetailsApi.updatePolicyCoverage(token, policyId, payload);
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
        setSendingComment(true);
        try {
            const added = await agencyPolicyRecordsDetailsApi.createComment(token, policyId, newComment);
            setComments(prev => [...prev, added]);
            setNewComment('');
        } catch (err) {
            console.error(err);
        } finally {
            setSendingComment(false);
        }
    };

    const handleDeletePolicy = async () => {
        if (!token || !policyId || !deleteReason.trim()) return;
        
        setIsDeleting(true);
        try {
            await agencyPolicyRecordsDetailsApi.deletePolicy(token, policyId, deleteReason);
            setIsDeleteModalOpen(false);
            setDeleteReason('');
            
            if (queue.length > 1) {
                const nextQueue = queue.filter((id: string) => id !== policyId);
                const nextIndex = currentIndex >= nextQueue.length ? nextQueue.length - 1 : currentIndex;
                navigate('.', { state: { queue: nextQueue, startIndex: nextIndex }, replace: true });
            } else {
                navigate('/management/policies/records');
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete policy. Ensure you have administrative rights.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[600px] flex flex-col items-center justify-center text-center px-4">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Vault...</p>
            </div>
        );
    }

    if (!coverage || !client) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400">Policy not found or could not be loaded.</p>
                <button onClick={() => navigate('/management/policies/records')} className="mt-4 text-xs font-black text-brand-500 underline uppercase tracking-widest">Back to Portfolio</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-500/5">
                            <Trash2 className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Policy?</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                            This action is permanent and cannot be undone. Please provide a reason for deletion.
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
                                onClick={() => { setIsDeleteModalOpen(false); setDeleteReason(''); }}
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

            {/* Header / Navigation Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/management/policies/records')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-100 text-slate-400 font-bold text-xs hover:text-slate-900 shadow-sm transition-all group w-fit"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Portfolio
                    </button>
                    {!coverage.isLocked && (
                        <button 
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-red-100 text-red-500 font-bold text-xs hover:bg-red-50 shadow-sm transition-all group w-fit"
                        >
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            Delete Policy
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    <button 
                        onClick={handlePrev} 
                        disabled={currentIndex === 0}
                        className="p-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-6 text-center">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Policy {currentIndex + 1}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Of {queue.length}</p>
                    </div>
                    <button 
                        onClick={handleNext} 
                        disabled={currentIndex === queue.length - 1}
                        className="p-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* LOCKED BANNER */}
            {coverage.isLocked && (
                <div className="mx-2 bg-amber-50 border border-amber-200 rounded-[1.5rem] p-5 flex items-center justify-between shadow-xl shadow-amber-900/5 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 tracking-tight">Policy Vault Locked</h4>
                            <p className="text-xs font-bold text-amber-700/80 uppercase tracking-wide mt-0.5">Record is in read-only mode and cannot be modified at this time.</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-900 text-amber-50 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border border-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Restricted Access
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN 1: CLIENT & SPLITS */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center">
                        <div className="w-20 h-20 rounded-[1.75rem] bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-2xl mb-4 ring-4 ring-white">
                            {client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6 text-center leading-tight">{client.name}</h2>
                        <div className="w-full space-y-2.5">
                            <InputField label="State" icon={<MapPin className="w-3.5 h-3.5" />} value={client.state} isEditing={false} name="state" />
                            <InputField label="Source" icon={<Globe className="w-3.5 h-3.5" />} value={client.source?.label || 'Organic'} isEditing={false} name="source" />
                            <InputField label="Type" icon={<Tag className="w-3.5 h-3.5" />} value={client.type?.label || 'General'} isEditing={false} name="type" />
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                    <Split className="w-4 h-4" />
                                </div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Splits</h3>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {splits.length > 0 ? splits.map(split => (
                                <div key={split.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:border-brand-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400 group-hover:text-brand-500 transition-colors">
                                            {split.on_split_agent_name.split(' ').map(n=>n[0]).join('')}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-700">{split.on_split_agent_name}</span>
                                    </div>
                                    <span className="text-[11px] font-black text-navy-900 pr-1">{split.agent_on_split_percent}%</span>
                                </div>
                            )) : (
                                <div className="text-center py-4 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                                    <p className="text-[9px] font-bold uppercase tracking-widest">No Split Records</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: COVERAGE DETAILS */}
                <div className="lg:col-span-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100 shadow-sm transition-transform hover:rotate-6">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Policy Coverage</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Details & Benefits</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button 
                                            onClick={handleSaveCoverage}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] hover:bg-black shadow-lg transition-all disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button 
                                            onClick={() => { setIsEditing(false); setCoverageForm(coverage); }}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] hover:bg-slate-200 transition-all disabled:opacity-50"
                                        >
                                            <X className="w-3.5 h-3.5" /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    !coverage.isLocked && (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="p-2.5 bg-slate-50 text-slate-300 hover:text-brand-500 rounded-2xl transition-all hover:bg-brand-50 border border-slate-100"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <InputField 
                                label="Carrier" 
                                icon={<Briefcase className="w-3.5 h-3.5"/>} 
                                value={isEditing ? (coverageForm.carrier?.id || '') : coverage.carrier?.label} 
                                isEditing={isEditing} 
                                name="carrier_id" 
                                type="select"
                                options={carrierOptions}
                                onChange={handleCoverageChange}
                            />
                            <InputField 
                                label="Product" 
                                icon={<Tag className="w-3.5 h-3.5"/>} 
                                value={isEditing ? coverageForm.product : coverage.product} 
                                isEditing={isEditing} 
                                onChange={handleCoverageChange} 
                                name="product" 
                            />
                            
                            <InputField 
                                label="Policy Number" 
                                icon={<Hash className="w-3.5 h-3.5"/>} 
                                value={isEditing ? coverageForm.policy_number : coverage.policy_number} 
                                isEditing={isEditing} 
                                onChange={handleCoverageChange} 
                                name="policy_number" 
                            />
                            <InputField 
                                label="Status" 
                                icon={<Activity className="w-3.5 h-3.5"/>} 
                                value={isEditing ? (coverageForm.status?.id || '') : coverage.status?.label} 
                                isEditing={isEditing} 
                                name="status_id" 
                                type="select"
                                options={statusOptions}
                                onChange={handleCoverageChange}
                            />
                            
                            <InputField 
                                label="Paid Status" 
                                icon={<CreditCard className="w-3.5 h-3.5"/>} 
                                value={isEditing ? (coverageForm.paidstatus?.id || '') : (coverage.paidstatus?.label || '—')} 
                                isEditing={isEditing} 
                                name="paidstatus_id" 
                                type="select"
                                options={paidStatusOptions}
                                onChange={handleCoverageChange}
                            />
                            <InputField 
                                label="Beneficiary" 
                                icon={<User className="w-3.5 h-3.5"/>} 
                                value={isEditing ? coverageForm.beneficiary : coverage.beneficiary} 
                                isEditing={isEditing} 
                                onChange={handleCoverageChange} 
                                name="beneficiary" 
                            />
                            
                            <div className="md:col-span-2 h-px bg-slate-50 my-1"></div>
                            
                            <InputField label="Face Amount" icon={<DollarSign className="w-3.5 h-3.5"/>} value={isEditing ? coverageForm.face_amount : formatCurrency(coverage.face_amount)} isEditing={isEditing} onChange={handleCoverageChange} name="face_amount" type="number" />
                            <InputField label="Monthly Premium" icon={<DollarSign className="w-3.5 h-3.5"/>} value={isEditing ? coverageForm.monthly_premium : formatCurrency(coverage.monthly_premium)} isEditing={isEditing} onChange={handleCoverageChange} name="monthly_premium" type="number" />
                            
                            <InputField 
                                label="Annual Premium" 
                                icon={<DollarSign className="w-3.5 h-3.5"/>} 
                                value={isEditing ? formatCurrency(coverageForm.annual_premium || 0) : formatCurrency(coverage.annual_premium)} 
                                isEditing={isEditing} 
                                name="annual_premium" 
                                readOnly={true} 
                            />
                            <InputField label="Draft Day" icon={<Calendar className="w-3.5 h-3.5"/>} value={isEditing ? coverageForm.recurring_draft_day : coverage.recurring_draft_day} isEditing={isEditing} onChange={handleCoverageChange} name="recurring_draft_day" type="number" min="1" max="31" />
                            
                            <div className="md:col-span-2">
                                <InputField 
                                    label="Initial Draft Date" 
                                    icon={<Calendar className="w-3.5 h-3.5"/>} 
                                    value={isEditing ? coverageForm.initial_draft_date : formatDate(coverage.initial_draft_date)} 
                                    isEditing={isEditing} 
                                    name="initial_draft_date" 
                                    customInput={
                                        <SingleDatePicker 
                                            value={coverageForm.initial_draft_date || ''} 
                                            onChange={(date) => handleCoverageChange({ target: { name: 'initial_draft_date', value: date } })}
                                            isEditing={isEditing}
                                        />
                                    }
                                />
                            </div>

                            <div className="md:col-span-2 space-y-5 pt-4">
                                <InputField label="Highlights" icon={<FileText className="w-3.5 h-3.5"/>} value={isEditing ? coverageForm.appointment_highlights : coverage.appointment_highlights || 'NA'} isEditing={isEditing} onChange={handleCoverageChange} name="appointment_highlights" colSpan="md:col-span-2" />
                                <InputField label="Pending Follow Up" icon={<Clock className="w-3.5 h-3.5"/>} value={isEditing ? coverageForm.pending_follow_up : coverage.pending_follow_up || '—'} isEditing={isEditing} onChange={handleCoverageChange} name="pending_follow_up" colSpan="md:col-span-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: ACTIVITY LOG */}
                <div className="lg:col-span-3 h-full">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-[750px] overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex flex-col gap-4 bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                                    <Folder className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">Public Activity</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Timeline Log</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/10 scrollbar-hide">
                            {comments.length > 0 ? comments.map((c, i) => {
                                const isMe = c._commentby?.id === user?.id;
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="text-[9px] font-black text-slate-700">{c._commentby?.first_name} {c._commentby?.last_name}</span>
                                        </div>
                                        <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[12px] font-bold leading-relaxed shadow-sm ${
                                            isMe ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-600 rounded-tl-none'
                                        }`}>
                                            {c.message}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                                    <MessageSquare className="w-10 h-10 mb-3" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em]">Log Empty</p>
                                </div>
                            )}
                            <div ref={commentsEndRef}></div>
                        </div>

                        <div className="p-5 bg-white border-t border-slate-50 shrink-0">
                            <div className="relative group">
                                <input 
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                    placeholder="Add a public note..."
                                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border-0 rounded-2xl text-[12px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 transition-all shadow-inner"
                                />
                                <button 
                                    onClick={handleSendComment}
                                    disabled={!newComment.trim() || sendingComment}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-brand-500 transition-all disabled:opacity-30"
                                >
                                    {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};