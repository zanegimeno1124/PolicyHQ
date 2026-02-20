import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Send, 
    Loader2, 
    User, 
    CheckCircle2, 
    AlertCircle, 
    Calendar,
    MessageSquare
} from 'lucide-react';
import { DebtRecord, agentDebtRecoveryApi, DebtComment } from '../services/agentDebtRecoveryApi';
import { useAuth } from '../../../context/AuthContext';

interface AgentDebtDetailsProps {
    debt: DebtRecord;
    onClose: () => void;
    onUpdate: (updatedDebt: DebtRecord) => void;
}

export const AgentDebtDetails: React.FC<AgentDebtDetailsProps> = ({ debt, onClose, onUpdate }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<DebtComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [resolving, setResolving] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (debt.id) {
            setLoadingComments(true);
            agentDebtRecoveryApi.getDebtComments(debt.id)
                .then(data => setComments(data))
                .catch(err => console.error("Failed to load comments", err))
                .finally(() => setLoadingComments(false));
        }
    }, [debt.id]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            const added = await agentDebtRecoveryApi.createDebtComment(debt.id, newComment);
            // Construct optimistic comment to show immediately
            const optimisticComment: DebtComment = {
                created_at: Date.now(),
                message: newComment,
                _commentby: {
                    id: user?.id || 'me',
                    first_name: user?.name.split(' ')[0] || 'Me',
                    last_name: user?.name.split(' ')[1] || ''
                }
            };
            setComments(prev => [...prev, optimisticComment]);
            setNewComment('');
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

    const toggleResolved = async () => {
        setResolving(true);
        try {
            const newValue = !debt.isResolved;
            await agentDebtRecoveryApi.resolveDebt(debt.id, newValue);
            onUpdate({ ...debt, isResolved: newValue });
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setResolving(false);
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
        <>
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#F2F3F5] shadow-2xl z-[110] transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200 font-sans">
                {/* Header */}
                <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-start justify-between shrink-0 z-20">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-0.5">
                            Debt Details
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wide">ID: {debt.id}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Main Card */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carrier</p>
                                <h3 className="text-2xl font-black text-slate-900">{debt.carrier}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
                                <h3 className={`text-2xl font-black ${debt.isResolved ? 'text-emerald-500' : 'text-emerald-600'}`}>
                                    ${debt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100/50">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Statement Date</p>
                                <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {formatDate(debt.statement_date)}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created By</p>
                                <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    {debt.created_by}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Status</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-600">Mark as Resolved</span>
                                    <button 
                                        onClick={toggleResolved}
                                        disabled={resolving}
                                        className={`w-12 h-7 rounded-full transition-colors relative flex items-center shadow-inner ${debt.isResolved ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    >
                                        <span className={`w-5 h-5 bg-white rounded-full shadow-sm absolute transition-transform duration-300 ${debt.isResolved ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${debt.isResolved ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                {debt.isResolved ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                <span className="text-xs font-bold uppercase tracking-wide">
                                    {debt.isResolved ? 'Resolved' : 'Unresolved'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Log - Fixed Height for independent scrolling */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden h-[500px]">
                        <div className="px-6 py-4 border-b border-slate-50 bg-white flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Activity Log</h3>
                        </div>

                        <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/30">
                            {loadingComments ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                    <p className="text-[10px] font-bold uppercase">Loading...</p>
                                </div>
                            ) : comments.length > 0 ? (
                                comments.map((comment, idx) => {
                                    const isMe = comment._commentby.id === user?.id;
                                    return (
                                        <div key={idx} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0 border-2 border-white ${isMe ? 'bg-brand-500 text-white' : 'bg-slate-900 text-white'}`}>
                                                {comment._commentby.first_name[0]}{comment._commentby.last_name[0]}
                                            </div>
                                            <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-bold text-slate-900">{comment._commentby.first_name} {comment._commentby.last_name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{formatDate(comment.created_at)}, {formatTime(comment.created_at)}</span>
                                                </div>
                                                <div className={`p-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                                                    isMe 
                                                        ? 'bg-brand-500 text-white rounded-tr-none' 
                                                        : 'bg-white border border-slate-100 text-slate-600 rounded-tl-none'
                                                }`}>
                                                    {comment.message}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">No notes yet</p>
                                </div>
                            )}
                            <div ref={commentsEndRef}></div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-50">
                            <div className="relative">
                                <input
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add a note or update..."
                                    className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-5 pr-12 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                                    disabled={sending}
                                />
                                <button 
                                    onClick={handleSendComment}
                                    disabled={!newComment.trim() || sending}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brand-500 hover:bg-brand-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};