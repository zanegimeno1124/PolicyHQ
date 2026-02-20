import React from 'react';
import { Activity, Server, Users, Database, Globe, ShieldCheck } from 'lucide-react';

export const HybridOverview: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-green-500" />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health</span>
          </div>
          <div className="text-3xl font-bold text-slate-200 relative z-10">99.99%</div>
          <div className="text-[10px] text-green-500 mt-2 font-mono relative z-10 flex items-center gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
             OPERATIONAL
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-blue-500" />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Agents</span>
          </div>
          <div className="text-3xl font-bold text-slate-200 relative z-10">12,405</div>
          <div className="text-[10px] text-blue-500 mt-2 font-mono relative z-10">
             +125 NEW THIS WEEK
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database className="w-16 h-16 text-purple-500" />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <Database className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Records</span>
          </div>
          <div className="text-3xl font-bold text-slate-200 relative z-10">8.2M</div>
          <div className="text-[10px] text-purple-500 mt-2 font-mono relative z-10">
             OPTIMAL INDEXING
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-16 h-16 text-amber-500" />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Globe className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coverage</span>
          </div>
          <div className="text-3xl font-bold text-slate-200 relative z-10">42</div>
          <div className="text-[10px] text-amber-500 mt-2 font-mono relative z-10">
             STATES ACTIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Command Vis */}
          <div className="lg:col-span-2 h-80 bg-slate-900/30 border border-slate-800 rounded-3xl flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
             
             {/* Animated Radar/Scanner Effect */}
             <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <div className="w-64 h-64 border border-green-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="w-48 h-48 border border-green-500/20 rounded-full absolute"></div>
                <div className="w-32 h-32 border border-green-500/10 rounded-full absolute"></div>
             </div>

             <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-800 shadow-2xl shadow-slate-950 backdrop-blur-md">
                    <Server className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Central Command Active</h2>
                <p className="text-slate-500 font-mono text-sm tracking-widest">AWAITING INPUT_</p>
             </div>
          </div>

          {/* Quick Actions / Security Status */}
          <div className="h-80 bg-slate-900/30 border border-slate-800 rounded-3xl p-6 flex flex-col relative overflow-hidden">
             <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Protocols</span>
             </div>
             
             <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <span className="text-sm font-medium text-slate-300">Firewall Status</span>
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <span className="text-sm font-medium text-slate-300">Intrusion Detection</span>
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">MONITORING</span>
                </div>
                 <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <span className="text-sm font-medium text-slate-300">Database Encryption</span>
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">AES-256</span>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};