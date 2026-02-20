import React from 'react';
import { Users, ShieldAlert } from 'lucide-react';

export const AgencyUsers: React.FC = () => (
    <div className="space-y-6">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
            <p className="text-slate-500 font-medium">Access control and organizational roles.</p>
        </div>
        
        <div className="bg-white rounded-[2.5rem] p-16 flex flex-col items-center justify-center border border-slate-100 min-h-[500px] text-center shadow-sm">
             <div className="bg-brand-50 p-6 rounded-[2rem] mb-8 relative group">
                <Users className="w-12 h-12 text-brand-500" />
                <div className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-brand-100">
                    <ShieldAlert className="w-4 h-4 text-brand-500" />
                </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Hybrid Managed Domain</h3>
            <p className="text-slate-500 max-w-md leading-relaxed font-medium">
                Administrative security and user role assignments for this agency are currently managed through the <span className="font-bold text-slate-800">Hybrid Command Center</span>.
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>
                Please contact organizational support for modifications
            </p>
        </div>
    </div>
);