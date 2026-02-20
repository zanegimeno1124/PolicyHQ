import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Settings, 
  Ticket, 
  Briefcase,
  ChevronDown,
  LayoutGrid,
  DollarSign,
  AlertCircle,
  Lock,
  Sparkles,
  Check,
  Building2,
  X
} from 'lucide-react';
import { AgencyProvider, useAgencyContext } from './context/AgencyContext';
import { useAuth } from '../../context/AuthContext';
import { AgencyOverview } from './components/AgencyOverview';
import { AgencyPolicies } from './components/AgencyPolicies';
import { AgencyPolicyRecords } from './components/AgencyPolicyRecords';
import { AgencyPolicyRecordsDetails } from './components/AgencyPolicyRecordsDetails';
import { AgencyCommissions } from './components/AgencyCommissions';
import { AgencyCommissionsDetails } from './components/AgencyCommissionsDetails';
import { AgencyDebts } from './components/AgencyDebts';
import { AgencyContracting } from './components/AgencyContracting';
import { AgencyTicketing } from './components/AgencyTicketing';
import { AgencyUsers } from './components/AgencyUsers';
import { ModuleSwitcher } from '../../shared/components/ModuleSwitcher';
import { NotificationBell } from '../../shared/components/NotificationBell';
import { NotificationDirect } from '../../shared/components/NotificationDirect';
import { NotificationSale } from '../../shared/components/NotificationSale';

const SidebarItem = ({ 
    to, 
    icon, 
    label, 
    active, 
    locked
}: { 
    to: string, 
    icon: React.ReactNode, 
    label: string, 
    active: boolean, 
    locked?: boolean
}) => {
    if (locked) {
        return (
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold mb-1 text-slate-600 cursor-not-allowed select-none group relative opacity-60">
                <span>{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                <Lock className="w-3.5 h-3.5 text-slate-600" />
            </div>
        );
    }

    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all mb-1
                ${active 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/20' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
        >
            <span>{icon}</span>
            <span className="truncate">{label}</span>
        </Link>
    );
};

const AgencyLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { 
        selectedAgencyIds, 
        selectedAgencies, 
        availableAgencies, 
        toggleAgency, 
        selectAllAgencies, 
        clearAgencies,
        unionFeatures 
    } = useAgencyContext();
    const location = useLocation();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActive = (path: string) => location.pathname === path || (path !== '/management' && location.pathname.startsWith(path));
    const isLocked = (featureKey: string) => !unionFeatures.includes(featureKey);

    const activeLabel = selectedAgencies.length === 0 
        ? 'No Agencies Selected' 
        : selectedAgencies.length === 1 
            ? selectedAgencies[0].agencyName 
            : `${selectedAgencies.length} Agencies Selected`;

    return (
        <div className="h-screen bg-[#F2F3F5] flex gap-4 p-4 font-sans overflow-hidden selection:bg-brand-500/30 selection:text-brand-900">
            <aside className="w-80 bg-slate-900 text-slate-300 flex flex-col rounded-[2.5rem] shadow-2xl shrink-0 relative z-50">
                <div className="p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-8 text-white px-2 shrink-0">
                        <div className="w-11 h-11 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-900/50 text-xl">H</div>
                        <div>
                            <span className="font-extrabold text-2xl tracking-tight block leading-none">Agency Hub</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enterprise Mode</span>
                        </div>
                    </div>

                    <div className="mb-8 px-1 shrink-0" ref={switcherRef}>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 block ml-1">Aggregated Context</label>
                        <div className="relative">
                            <button 
                                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                                className={`w-full flex items-center justify-between bg-slate-800 p-4 rounded-2xl hover:bg-slate-700 transition-all text-white border border-slate-700/50 shadow-lg ${isSwitcherOpen ? 'ring-2 ring-brand-500/50 border-brand-500' : ''}`}
                            >
                                <span className="text-sm font-bold truncate">{activeLabel}</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isSwitcherOpen && (
                                <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-[1.5rem] mt-2 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                                    <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between">
                                        <button onClick={selectAllAgencies} className="text-[9px] font-black text-brand-500 uppercase tracking-widest hover:text-brand-400">Select All</button>
                                        <button onClick={clearAgencies} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300">Clear</button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 p-1.5 space-y-1">
                                        {availableAgencies.map(agency => {
                                            const isSelected = selectedAgencyIds.includes(agency.agencyId);
                                            return (
                                                <button 
                                                    key={agency.agencyId}
                                                    onClick={() => toggleAgency(agency.agencyId)}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all font-bold ${isSelected ? 'text-white bg-brand-500/10 border border-brand-500/30' : 'text-slate-400 hover:bg-slate-700 border border-transparent'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-brand-500 border-brand-500' : 'border-slate-600'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-slate-900" strokeWidth={4} />}
                                                    </div>
                                                    <span className="truncate">{agency.agencyName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-4 pl-4 shrink-0">Management</div>
                    <nav className="space-y-0.5 flex-1 overflow-y-auto scrollbar-hide -mx-2 px-2">
                        <SidebarItem to="/management" icon={<LayoutGrid size={20} />} label="Hub Overview" active={location.pathname === '/management'} locked={false} />
                        <SidebarItem to="/management/policies" icon={<FileText size={20} />} label="Policies" active={isActive('/management/policies')} locked={isLocked('policies')} />
                        <SidebarItem to="/management/commissions" icon={<DollarSign size={20} />} label="Commissions" active={isActive('/management/commissions')} locked={isLocked('commissions')} />
                        <SidebarItem to="/management/debts" icon={<AlertCircle size={20} />} label="Debt Monitoring" active={isActive('/management/debts')} locked={isLocked('debts')} />
                        <SidebarItem to="/management/users" icon={<Users size={20} />} label="Users & Roles" active={isActive('/management/users')} locked={isLocked('users')} />
                        <SidebarItem to="/management/contracting" icon={<Briefcase size={20} />} label="Contracting" active={isActive('/management/contracting')} locked={isLocked('contracting')} />
                        <SidebarItem to="/management/ticketing" icon={<Ticket size={20} />} label="Ticketing" active={isActive('/management/ticketing')} locked={isLocked('ticketing')} />
                        <SidebarItem to="/management/settings" icon={<Settings size={20} />} label="Settings" active={isActive('/management/settings')} locked={isLocked('settings')} />
                    </nav>
                </div>
            </aside>

             <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                <header className="h-24 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                             <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeLabel}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Management Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModuleSwitcher />
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm">
                            <NotificationDirect />
                            <NotificationBell />
                            <NotificationSale />
                        </div>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto px-8 pb-10 scroll-smooth scrollbar-hide">
                    <div className="max-w-[1600px] mx-auto">
                        {selectedAgencyIds.length > 0 ? children : (
                            <div className="flex flex-col items-center justify-center min-h-[500px] text-center bg-white rounded-[2.5rem] border border-slate-100 p-16">
                                <div className="p-6 bg-slate-50 rounded-[2rem] mb-6">
                                    <Building2 className="w-16 h-16 text-slate-200" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No Organization Selected</h3>
                                <p className="text-slate-500 max-w-sm mb-10 leading-relaxed font-medium">Please select at least one organization from the switcher in the sidebar to aggregate your production data.</p>
                            </div>
                        )}
                    </div>
                </div>
             </main>
        </div>
    );
};

export const AgencyHub: React.FC = () => {
  return (
    <AgencyProvider>
      <AgencyLayout>
        <Routes>
          <Route path="/" element={<AgencyOverview />} />
          <Route path="/policies" element={<AgencyPolicies />} />
          <Route path="/policies/records" element={<AgencyPolicyRecords />} />
          <Route path="/policies/details" element={<AgencyPolicyRecordsDetails />} />
          <Route path="/commissions" element={<AgencyCommissions />} />
          <Route path="/commissions/details" element={<AgencyCommissionsDetails />} />
          <Route path="/debts" element={<AgencyDebts />} />
          <Route path="/users" element={<AgencyUsers />} />
          <Route path="/contracting" element={<AgencyContracting />} />
          <Route path="/ticketing" element={<AgencyTicketing />} />
          <Route path="/settings" element={
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center">
                <div className="bg-slate-50 p-6 rounded-3xl mb-6">
                    <Settings className="w-12 h-12 text-slate-400 animate-spin-slow" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Agency Settings</h3>
                <p className="text-slate-500 max-w-md leading-relaxed font-medium mb-10">Enterprise-wide identity configurations are currently being finalized.</p>
                <div className="flex items-center gap-2 px-6 py-2 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/20">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Coming Soon</span>
                </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AgencyLayout>
    </AgencyProvider>
  );
};

export default AgencyHub;