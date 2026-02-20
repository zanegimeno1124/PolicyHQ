import React from 'react';
import { ShieldCheck, Activity, Lock, Terminal } from 'lucide-react';

export const GlobalAudit: React.FC = () => (
    <div className="h-[600px] bg-slate-950 rounded-[2.5rem] border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
            <div className="w-24 h-24 bg-slate-900/50 rounded-3xl border border-slate-700 flex items-center justify-center mb-10 relative group backdrop-blur-sm">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <Terminal className="w-12 h-12 text-green-500" />
                
                {/* Status Indicator */}
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            </div>

            <h2 className="text-4xl md:text-5xl font-mono font-bold text-slate-200 mb-6 tracking-tighter">
                SYSTEM_AUDIT_LOG_V2
            </h2>
            
            <p className="text-slate-400 font-mono text-sm md:text-base mb-12 max-w-lg leading-8 text-left bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <span className="text-green-500 mr-2">>></span> INITIALIZING AUDIT PROTOCOLS...<br/>
                <span className="text-green-500 mr-2">>></span> ENCRYPTING HISTORICAL LEDGERS...<br/>
                <span className="text-green-500 mr-2">>></span> ESTABLISHING SECURE UPLINK...
            </p>

            {/* Fake Loader */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-full h-12 relative overflow-hidden flex items-center px-6 shadow-inner">
                <div className="absolute left-0 top-0 bottom-0 bg-green-900/20 w-[60%] border-r border-green-500/50"></div>
                <div className="relative z-10 w-full flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-green-500 animate-pulse tracking-widest">UPGRADING CORE MODULES...</span>
                    <span className="font-mono text-xs font-bold text-green-500">60%</span>
                </div>
            </div>
            
            <div className="mt-16 grid grid-cols-3 gap-12 text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="flex flex-col items-center gap-3 group cursor-default">
                    <ShieldCheck className="w-8 h-8 text-slate-500 group-hover:text-green-500 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-green-500/70 transition-colors">Immutable</span>
                </div>
                 <div className="flex flex-col items-center gap-3 group cursor-default">
                    <Activity className="w-8 h-8 text-slate-500 group-hover:text-green-500 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-green-500/70 transition-colors">Real-Time</span>
                </div>
                 <div className="flex flex-col items-center gap-3 group cursor-default">
                    <Lock className="w-8 h-8 text-slate-500 group-hover:text-green-500 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-green-500/70 transition-colors">Encrypted</span>
                </div>
            </div>
        </div>
    </div>
);