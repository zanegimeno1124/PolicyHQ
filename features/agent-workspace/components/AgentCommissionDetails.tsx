import React, { useEffect, useState, useRef } from 'react';
import { 
    Shield, 
    Calendar, 
    DollarSign, 
    Hash, 
    Tag, 
    Briefcase, 
    User, 
    MessageSquare, 
    Send, 
    Loader2, 
    Activity,
    X,
    Folder,
    FileText, 
    Wallet,
    CheckCircle2,
    AlertCircle,
    Clock,
    Copy,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { 
    agentCommissionsDetailsApi, 
    CommissionCoverage, 
    CommissionComment 
} from '../services/agentCommissionsDetails';

// Redefine locally to avoid circular dependency issues if strict
interface CommissionRecord {
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
}

const formatDate = (dateString: string | number) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

// Clean Field Component
const Field = ({ label, value, className = '' }: { label: string, value: React.ReactNode, className?: string }) => (
    <div className={`flex flex-col min-w-0 ${className}`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 truncate">{label}</p>
        <div className="text-sm font-bold text-slate-900 leading-snug break-words">{value}</div>
    </div>
);

interface AgentCommissionDetailsProps {
    commission: CommissionRecord;
    onClose: () => void;
}

export const AgentCommissionDetails: React.FC<AgentCommissionDetailsProps> = ({ commission, onClose }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'commission' | 'policy'>('commission');

    // Policy State
    const [coverage, setCoverage] = useState<CommissionCoverage | null>(null);
    const [policyComments, setPolicyComments] = useState<CommissionComment[]>([]);
    
    // Commission State
    const [commissionComments, setCommissionComments] = useState<CommissionComment[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingCommComments, setLoadingCommComments] = useState(false);
    
    // Comment Input State
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Fetch Initial Data (Policy Coverage + Policy Comments)
    useEffect(() => {
        if (!commission.policy_id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [covData, pComments] = await Promise.all([
                    agentCommissionsDetailsApi.getPolicyCoverage(commission.policy_id),
                    agentCommissionsDetailsApi.getPublicComments(commission.policy_id)
                ]);
                setCoverage(covData);
                setPolicyComments(pComments);
            } catch (error) {
                console.error("Failed to load details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [commission.policy_id]);

    // Fetch Commission Comments
    useEffect(() => {
        if (!commission.id) return;
        
        const fetchCommComments = async () => {
            setLoadingCommComments(true);
            try {
                const cComments = await agentCommissionsDetailsApi.getCommissionComments(commission.id);
                setCommissionComments(cComments);
            } catch (error) {
                console.error("Failed to load commission comments", error);
            } finally {
                setLoadingCommComments(false);
            }
        };
        fetchCommComments();
    }, [commission.id]);

    // Scroll to bottom of active comments
    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [policyComments, commissionComments, activeTab]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        
        const textToSend = newComment; // Capture text immediately
        setSending(true);
        try {
            let added: CommissionComment | null = null;
            
            if (activeTab === 'policy' && commission.policy_id) {
                // Post to /policies/{policy_id}/comments
                added = await agentCommissionsDetailsApi.createComment(commission.policy_id, textToSend);
            } else if (activeTab === 'commission' && commission.id) {
                // Post to /commissions/{commission_id}/comments
                added = await agentCommissionsDetailsApi.createCommissionComment(commission.id, textToSend);
            }

            if (added) {
                // Ensure we have user details and message content for immediate display 
                // if API returns incomplete object
                const displayComment: CommissionComment = {
                    ...added,
                    message: added.message || textToSend, // Fallback to input text if API omits it
                    created_at: added.created_at || Date.now(),
                    _commentby: added._commentby || {
                        id: user?.id || 'currentUser',
                        first_name: user?.name?.split(' ')[0] || 'Me',
                        last_name: user?.name?.split(' ').slice(1).join(' ') || ''
                    }
                };

                if (activeTab === 'policy') {
                    setPolicyComments(prev => [...prev, displayComment]);
                } else if (activeTab === 'commission') {
                    setCommissionComments(prev => [...prev, displayComment]);
                }
                setNewComment('');
            }
        } catch (error) {
            console.error("Failed to send comment", error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendComment();
        }
    };

    const activeComments = activeTab === 'policy' ? policyComments : commissionComments;

    return (
        <>
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#F2F3F5] shadow-2xl z-[110] transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200 font-sans">
                {/* Header - Fixed */}
                <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-start justify-between shrink-0 z-20">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                            Commission Record
                        </h2>
                        <p className="text-xs font-bold text-slate-400 font-mono">ID: {commission.id}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs - Fixed */}
                <div className="px-8 pt-2 pb-0 bg-white border-b border-slate-100 shrink-0 z-20">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('commission')}
                            className={`pb-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'commission' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('policy')}
                            className={`pb-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'policy' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Policy Data
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Loading Details...</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
                        
                        {/* DETAILS SECTION - Top Card */}
                        {/* Use max-h to allow it to shrink if content is small, but scroll if massive. 
                            Constrained to ~55% of height so comments are always visible. */}
                        <div className="shrink-0 max-h-[55%] overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
                            
                            {/* TAB CONTENT: COMMISSION */}
                            {activeTab === 'commission' && (
                                <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
                                    {/* Main Summary Card */}
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Commission</p>
                                                <h2 className={`text-4xl font-black tracking-tight ${commission.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {formatCurrency(commission.amount)}
                                                </h2>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement Date</p>
                                                <p className="text-lg font-bold text-slate-900">{formatDate(commission.created_at)}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide ${
                                                    commission.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {commission.status}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Processed By</p>
                                                <p className="text-sm font-bold text-slate-700">{commission.submitted_by || 'System Auto'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Secondary Details */}
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Context</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <Field label="Agent Name" value={commission.agent_name} />
                                            <Field label="Client Name" value={commission.client_name} />
                                            <Field label="Policy Number" value={commission.policy_number || 'Pending'} className="font-mono text-slate-600" />
                                            <Field label="Carrier" value={commission.carrier} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB CONTENT: POLICY - REDESIGNED */}
                            {activeTab === 'policy' && coverage && (
                                <div className="animate-in slide-in-from-left-4 duration-300 space-y-4">
                                    {/* Main Coverage Card */}
                                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <Shield className="w-4 h-4 text-slate-400" />
                                            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Coverage</h3>
                                        </div>

                                        {/* Dark Top Card */}
                                        <div className="bg-slate-900 rounded-3xl p-6 mb-6 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                            
                                            <div className="mb-6">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Policy Number</p>
                                                <p className="text-2xl font-black tracking-tight text-white">{coverage.policy_number}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carrier</p>
                                                    <p className="text-sm font-bold text-blue-200">{coverage.carrier.label || coverage.carrier.custom_carrier || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product</p>
                                                    <p className="text-sm font-bold text-white">{coverage.product}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Row */}
                                        <div className="flex items-center justify-between py-2 mb-6 px-1">
                                            <span className="text-sm font-bold text-slate-500">Status</span>
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                                                coverage.status.label === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {coverage.status.label}
                                            </span>
                                        </div>

                                        {/* Annual Premium Highlight */}
                                        <div className="border-2 border-blue-500 bg-blue-50/20 rounded-2xl p-5 flex items-center justify-between mb-6 relative overflow-hidden">
                                             {/* Decorative */}
                                             <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-12 bg-blue-500 rounded-r-full"></div>
                                             
                                             <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Annual Premium</p>
                                                <p className="text-3xl font-black text-slate-900">{formatCurrency(coverage.annual_premium)}</p>
                                             </div>
                                             <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                <DollarSign className="w-5 h-5" strokeWidth={3} />
                                             </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coverage Amount</p>
                                                <p className="text-lg font-black text-slate-900">{formatCurrency(coverage.face_amount)}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly</p>
                                                <p className="text-lg font-black text-slate-900">{formatCurrency(coverage.monthly_premium)}</p>
                                            </div>
                                        </div>

                                        {/* List Items */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600">Effective Date</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-900">{formatDate(coverage.initial_draft_date)}</span>
                                            </div>
                                             <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600">Draft Day</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-900">Day {coverage.recurring_draft_day}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600">Payment Status</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-900">{coverage.paidstatus.label || 'Unpaid'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent Briefing Card */}
                                    {(coverage.appointment_highlights || coverage.pending_follow_up) && (
                                        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-6">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Agent Briefing</h3>
                                            </div>

                                            <div className="space-y-4">
                                                {coverage.appointment_highlights && (
                                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileText className="w-3 h-3 text-amber-600" />
                                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Appointment Summary</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-800 italic">"{coverage.appointment_highlights}"</p>
                                                    </div>
                                                )}

                                                {coverage.pending_follow_up && (
                                                    <div className="border border-dashed border-slate-300 rounded-2xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <AlertCircle className="w-3 h-3 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Follow Up Note</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-600 italic">{coverage.pending_follow_up}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* COMMENTS SECTION - Distinct Card filling remaining space */}
                        <div className="flex-1 min-h-0 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                            <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white z-10">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-4 h-4 text-slate-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        {activeTab === 'commission' ? 'Commission Notes' : 'Policy Notes'}
                                    </span>
                                </div>
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    {activeComments.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                                {loadingCommComments && activeTab === 'commission' ? (
                                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                                ) : activeComments.length > 0 ? (
                                    activeComments.map((comment, idx) => {
                                        // Safely handle missing author data
                                        const authorId = comment._commentby?.id;
                                        const authorFirstName = comment._commentby?.first_name || 'Unknown';
                                        const authorLastName = comment._commentby?.last_name || 'User';
                                        const initials = `${authorFirstName[0] || '?'}${authorLastName[0] || '?'}`;
                                        
                                        const isMe = authorId === user?.id;
                                        
                                        return (
                                            <div key={idx} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm border ${isMe ? 'bg-brand-500 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-100'}`}>
                                                    {initials}
                                                </div>
                                                <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-baseline gap-2 mb-1.5 opacity-80">
                                                        <span className="text-[10px] font-bold text-slate-700">{authorFirstName}</span>
                                                        <span className="text-[9px] font-bold text-slate-400">{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <div className={`px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isMe ? 'bg-brand-50 text-brand-900 border border-brand-100 rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                                                        {comment.message}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                        <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-wide">No notes yet</p>
                                    </div>
                                )}
                                <div ref={commentsEndRef}></div>
                            </div>

                            {/* Footer Input */}
                            <div className="p-4 bg-white border-t border-slate-50 shrink-0">
                                <div className="relative group">
                                    <input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={`Add a public note...`}
                                        className="w-full bg-slate-50 border-transparent rounded-2xl py-3.5 pl-5 pr-14 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none shadow-sm"
                                        disabled={sending}
                                    />
                                    <button 
                                        onClick={handleSendComment}
                                        disabled={!newComment.trim() || sending}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl hover:bg-brand-50 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center"
                                    >
                                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};