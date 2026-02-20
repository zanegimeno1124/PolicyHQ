import React from 'react';
import { Settings } from 'lucide-react';

export const SystemConfig: React.FC = () => (
    <div className="border border-slate-800 bg-slate-900/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-96">
        <div className="bg-slate-800 p-4 rounded-2xl mb-4">
            <Settings className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-200 mb-2">System Configuration</h2>
        <p className="text-slate-500 max-w-md">Master settings, API configurations, and environment variables.</p>
    </div>
);