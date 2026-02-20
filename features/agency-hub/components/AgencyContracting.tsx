import React from 'react';
import { Briefcase, Sparkles } from 'lucide-react';

export const AgencyContracting: React.FC = () => (
    <div className="space-y-6">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contracting</h1>
            <p className="text-slate-500 font-medium">Carrier appointments and new agent onboarding.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-16 flex flex-col items-center justify-center border border-slate-100 min-h-[500px] text-center shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent"></div>
             
             <div className="relative z-10 bg-amber-50 p-6 rounded-[2rem] mb-8 group">
                <Briefcase className="w-12 h-12 text-amber-600 transform transition-transform group-hover:rotate-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4 relative z-10">Carrier Onboarding Module</h3>
            <p className="text-slate-500 max-w-md leading-relaxed font-medium relative z-10">
                We are building an automated contracting engine to streamline carrier appointments and credentialing directly within your portal.
            </p>
            <div className="mt-10 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-navy-900/20 relative z-10">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-black uppercase tracking-widest">Coming Soon</span>
            </div>
        </div>
    </div>
);