import React from 'react';
import { AlertCircle } from 'lucide-react';

export const HybridDebts: React.FC = () => (
    <div className="border border-slate-800 bg-slate-900/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-96">
        <div className="bg-slate-800 p-4 rounded-2xl mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-200 mb-2">Global Debt Recovery</h2>
        <p className="text-slate-500 max-w-md">Monitor outstanding balances and collections across the entire system.</p>
    </div>
);