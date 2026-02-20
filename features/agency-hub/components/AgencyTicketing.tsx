import React from 'react';
import { Ticket, LifeBuoy } from 'lucide-react';

export const AgencyTicketing: React.FC = () => (
    <div className="space-y-6">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Support Tickets</h1>
            <p className="text-slate-500 font-medium">Internal help desk and resolution tracking.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-16 flex flex-col items-center justify-center border border-slate-100 min-h-[500px] text-center shadow-sm">
             <div className="bg-blue-50 p-6 rounded-[2rem] mb-8 relative group">
                <Ticket className="w-12 h-12 text-blue-500" />
                <div className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-blue-100">
                    <LifeBuoy className="w-4 h-4 text-blue-500 animate-spin-slow" />
                </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Centralized Support Infrastructure</h3>
            <p className="text-slate-500 max-w-md leading-relaxed font-medium">
                Agency-level support tickets are currently integrated into the <span className="font-bold text-slate-800">Hybrid Command Hub</span> for optimized response times.
            </p>
            <div className="mt-12 inline-flex items-center gap-3 px-6 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standalone Agency Desk</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[9px] font-black uppercase">Coming Soon</span>
            </div>
        </div>
    </div>
);