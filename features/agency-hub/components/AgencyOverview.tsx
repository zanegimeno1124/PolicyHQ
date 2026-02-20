import React from 'react';
import { Network, Globe, TrendingUp, Users } from 'lucide-react';

export const AgencyOverview: React.FC = () => {
  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center relative bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
       
       <div className="relative z-10 max-w-3xl w-full px-8 text-center">
          <div className="flex justify-center mb-10">
             <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
                <div className="relative bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100">
                   <Network className="w-16 h-16 text-slate-900" />
                </div>
                {/* Orbiting Elements */}
                <div className="absolute -top-6 -right-6 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 animate-bounce delay-100">
                    <Globe className="w-6 h-6 text-blue-500" />
                </div>
                 <div className="absolute -bottom-4 -left-6 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 animate-bounce delay-300">
                    <Users className="w-6 h-6 text-brand-500" />
                </div>
             </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8 tracking-tight leading-tight">
             Agency Intelligence
             <span className="text-slate-300 block text-4xl mt-3 font-medium">Evolved.</span>
          </h1>
          
          <p className="text-slate-500 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
             We are building a holistic view of your organization. Soon, you will be able to visualize hierarchy performance, global overrides, and expansion metrics in one unified hub.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
             <span className="px-6 py-3 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 flex items-center gap-2 shadow-sm">
                <TrendingUp className="w-4 h-4 text-green-500" /> Growth Tracking
             </span>
              <span className="px-6 py-3 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 flex items-center gap-2 shadow-sm">
                <Globe className="w-4 h-4 text-blue-500" /> Territorial Heatmaps
             </span>
              <span className="px-6 py-3 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 flex items-center gap-2 shadow-sm">
                <Users className="w-4 h-4 text-purple-500" /> Hierarchy Analysis
             </span>
          </div>
       </div>
    </div>
  );
};