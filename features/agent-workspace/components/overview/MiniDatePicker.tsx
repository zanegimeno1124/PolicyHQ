import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DateRange } from './utils';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const MiniDatePicker: React.FC<{ onChange: (range: DateRange) => void; }> = ({ onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date()); 
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
    
    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };
    
    const handleDateClick = (date: Date) => {
        if (!selectionStart || (selectionStart && selectionEnd)) {
            setSelectionStart(date);
            setSelectionEnd(null);
        } else {
            let start = selectionStart;
            let end = date;
            if (date < selectionStart) {
                start = date;
                end = selectionStart;
            }
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            onChange({ start: start.getTime(), end: end.getTime(), label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` });
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    };

    const days = useMemo(() => {
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        return { firstDay, daysInMonth };
    }, [currentMonth]);

    return (
        <div className="bg-white rounded-2xl p-4 w-[260px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 px-1">
                <button onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className="font-black text-slate-900 uppercase tracking-widest text-[9px]">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                <button onClick={(e) => { e.stopPropagation(); changeMonth(1); }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1.5 text-center text-[8px] font-black text-slate-300">
                {['S','M','T','W','T','F','S'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: days.firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: days.daysInMonth }).map((_, i) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                    const isSelected = (selectionStart && date.getTime() === selectionStart.getTime()) || (selectionEnd && date.getTime() === selectionEnd.getTime());
                    const inRange = selectionStart && selectionEnd && date > selectionStart && date < selectionEnd;
                    return (
                        <button 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); handleDateClick(date); }} 
                            className={`aspect-square flex items-center justify-center rounded-lg text-[9px] font-bold transition-all ${isSelected ? 'bg-brand-500 text-white shadow-sm' : inRange ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 text-center text-[7px] font-black text-slate-400 uppercase tracking-widest">Select range</div>
        </div>
    );
};