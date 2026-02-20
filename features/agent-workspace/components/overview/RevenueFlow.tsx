import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell } from 'recharts';
import { TrendingUp, BookOpen, Star, Palette, History, Trophy, MoreHorizontal } from 'lucide-react';

const REVENUE_DATA = [
  { month: 'Sep', value: 30 },
  { month: 'Oct', value: 45 },
  { month: 'Nov', value: 35 },
  { month: 'Dec', value: 60 },
  { month: 'Jan', value: 80 },
  { month: 'Feb', value: 70 },
];

const BadgeCircle = ({ icon, label, color }: any) => {
  const colors: any = { 
    blue: 'bg-sky-50 shadow-sky-500/10', 
    red: 'bg-rose-50 shadow-rose-500/10', 
    amber: 'bg-amber-50 shadow-amber-500/10', 
    purple: 'bg-violet-50 shadow-violet-500/10' 
  };
  return (
    <div className="flex flex-col items-center gap-3 group cursor-pointer">
      <div className={`w-14 h-14 rounded-full ${colors[color]} flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-xl shadow-inner border border-white`}>{icon}</div>
      <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-900 text-center leading-tight max-w-[60px] uppercase tracking-wider transition-colors">{label}</span>
    </div>
  );
};

const ChallengeItem = ({ icon, title, subtitle, points, coins, color }: any) => {
  const colors: any = { blue: 'bg-blue-500 shadow-blue-500/30', amber: 'bg-brand-500 shadow-brand-500/30' };
  return (
    <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2.5 rounded-2xl transition-all border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>{icon}</div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{subtitle}</p>
          <p className="text-sm font-black text-slate-900">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
            {points && <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600"><Star className="w-3 h-3 fill-blue-600" /> +{points}</div>}
            {coins && <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500"><div className="w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-white font-black text-[9px]">$</div> +{coins}</div>}
        </div>
        <MoreHorizontal className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
    </div>
  );
};

export const RevenueFlow: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-black text-slate-900">Revenue Flow</h3>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">
          <TrendingUp className="w-3 h-3" />
          <span>2.3% OVER LAST WEEK</span>
        </div>
      </div>
      <div className="flex-1 min-h-[160px] mb-8 relative">
         <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_DATA}>
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={16}>
                {REVENUE_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === REVENUE_DATA.length - 1 ? '#0F172A' : '#F1F5F9'} />
                ))}
              </Bar>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} dy={8} />
            </BarChart>
         </ResponsiveContainer>
      </div>
      <div className="space-y-6">
        <div className="flex justify-between">
          <BadgeCircle icon={<BookOpen className="w-5 h-5 text-blue-500" />} label="Top Reader" color="blue" />
          <BadgeCircle icon={<Star className="w-5 h-5 text-red-500" />} label="Gold Writer" color="red" />
          <BadgeCircle icon={<Palette className="w-5 h-5 text-amber-500" />} label="Artisan" color="amber" />
          <BadgeCircle icon={<History className="w-5 h-5 text-purple-500" />} label="Veteran" color="purple" />
        </div>
        <div className="space-y-3">
          <ChallengeItem icon={<BookOpen className="w-4 h-4 text-white" />} title="Persistency Sprint" subtitle="Extra Challenge" points={250} color="blue" />
          <ChallengeItem icon={<Trophy className="w-4 h-4 text-white" />} title="Volume Day 10/32" subtitle="Daily Milestone" points={200} coins={5} color="amber" />
        </div>
      </div>
    </div>
  );
};