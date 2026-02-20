import React, { useEffect, useState } from 'react';
import { useRealtime } from '../../context/RealtimeContext';
import { X, DollarSign, Trophy, Sparkles } from 'lucide-react';

export const SaleAlert: React.FC = () => {
  const { latestSale, setLatestSale } = useRealtime();
  const [visible, setVisible] = useState(false);
  const [isMounting, setIsMounting] = useState(false);

  useEffect(() => {
    if (latestSale) {
      setIsMounting(true);
      // Small delay to allow render before animating in
      requestAnimationFrame(() => setVisible(true));

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
            setIsMounting(false);
            setLatestSale(null);
        }, 700); // Wait for exit animation
      }, 8000); // Show for 8 seconds
      return () => clearTimeout(timer);
    }
  }, [latestSale, setLatestSale]);

  if (!latestSale && !isMounting) return null;

  return (
    <>
        <style>
            {`
            @keyframes shine {
                0% { transform: translateX(-150%) skewX(-15deg); }
                50% { transform: translateX(150%) skewX(-15deg); }
                100% { transform: translateX(150%) skewX(-15deg); }
            }
            @keyframes float3d {
                0%, 100% { transform: translateY(0) rotateX(5deg); }
                50% { transform: translateY(-10px) rotateX(0deg); }
            }
            @keyframes popIn {
                0% { transform: scale(0.8) translateY(-50px); opacity: 0; }
                60% { transform: scale(1.05) translateY(10px); opacity: 1; }
                80% { transform: scale(0.95) translateY(-5px); }
                100% { transform: scale(1) translateY(0); }
            }
            .animate-shine {
                animation: shine 3s infinite ease-in-out;
            }
            .animate-float-3d {
                animation: float3d 4s ease-in-out infinite;
            }
            .animate-pop-in {
                animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .text-shadow-sm {
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            .preserve-3d {
                transform-style: preserve-3d;
            }
            `}
        </style>

        <div 
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] transition-all duration-700 ease-in-out perspective-[1000px] pointer-events-auto
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-24 scale-90'}
            `}
        >
            {/* 3D Container - Rotates slightly and floats */}
            <div className={`relative group ${visible ? 'animate-pop-in' : ''}`}>
                
                {/* Backing Shadow (For Depth) */}
                <div className="absolute top-4 left-0 w-full h-full bg-black/40 rounded-[2rem] blur-xl transform scale-90 translate-y-4 -z-10 transition-all duration-500 group-hover:scale-95 group-hover:translate-y-6"></div>

                {/* Main Card Body - 3D Object */}
                <div className="
                    relative 
                    bg-gradient-to-br from-slate-800 via-slate-900 to-black 
                    text-white 
                    p-1.5 
                    rounded-[2rem] 
                    border-t border-l border-white/20 
                    border-b-4 border-b-black/60 
                    shadow-2xl 
                    min-w-[380px] 
                    overflow-visible
                    transform
                    transition-transform
                    duration-300
                    hover:-translate-y-1
                ">
                    {/* Glossy Overlay (Glass effect) */}
                    <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                    
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine"></div>
                    </div>

                    {/* Content Container */}
                    <div className="relative flex items-center bg-slate-900/50 backdrop-blur-md rounded-[1.7rem] p-4 gap-5 overflow-hidden">
                        
                        {/* Left: 3D Floating Icon */}
                        <div className="relative w-16 h-16 shrink-0">
                            <div className="absolute inset-0 bg-brand-500 rounded-2xl rotate-3 blur-lg opacity-40 animate-pulse"></div>
                            <div className="relative w-full h-full bg-gradient-to-br from-brand-300 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg border-t border-brand-200 border-b-4 border-b-brand-800 animate-float-3d z-10">
                                <Trophy className="w-8 h-8 text-white drop-shadow-md" />
                                {/* Sparkle decoration */}
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-200 animate-spin-slow" />
                            </div>
                        </div>

                        {/* Center: Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-400 drop-shadow-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-ping"></span>
                                    New Sale
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                    {latestSale?.teamName}
                                </span>
                            </div>
                            
                            <h3 className="text-lg font-black text-white leading-tight truncate text-shadow-sm tracking-tight">
                                {latestSale?.agentOwner_name}
                            </h3>
                            
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[120px]">
                                    {latestSale?.policyCarrier}
                                </span>
                            </div>
                        </div>

                        {/* Right: Big Money */}
                        <div className="text-right shrink-0 relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Premium</p>
                            <div className="flex items-center justify-end text-emerald-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                <DollarSign className="w-5 h-5" strokeWidth={3} />
                                <span className="text-2xl font-black tracking-tighter">
                                    {latestSale?.annual_premium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => setVisible(false)}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors z-20"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};
