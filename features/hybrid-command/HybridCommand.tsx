import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Activity, 
  Settings, 
  ShieldAlert, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  Briefcase, 
  Ticket, 
  Users,
  Lock,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HybridProvider } from './context/HybridContext';
import { ModuleSwitcher } from '../../shared/components/ModuleSwitcher';
import { NotificationBell } from '../../shared/components/NotificationBell';
import { NotificationDirect } from '../../shared/components/NotificationDirect';
import { NotificationSale } from '../../shared/components/NotificationSale';

// Components
import { GlobalAudit } from './components/GlobalAudit';
import { HybridOverview } from './components/HybridOverview';
import { HybridPolicies } from './components/HybridPolicies';
import { HybridCommissions } from './components/HybridCommissions';
import { HybridDebts } from './components/HybridDebts';
import { HybridContracting } from './components/HybridContracting';
import { HybridTicketing } from './components/HybridTicketing';
import { HybridUsers } from './components/HybridUsers';
import { SystemConfig } from './components/SystemConfig';

// Sidebar Item Component
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
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl mb-2 text-slate-600 cursor-not-allowed select-none group relative opacity-50 font-medium">
                <span>{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                <Lock className="w-3.5 h-3.5 text-slate-600" />
            </div>
        );
    }

    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all mb-2 font-bold
                ${active 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-900/40' 
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
        >
            <span>{icon}</span>
            <span className="truncate">{label}</span>
        </Link>
    );
};

const HybridLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    
    // Permission Check
    const availableFeatures = user?.hybridAccess?.features || [];
    const isLocked = (featureKey: string) => !availableFeatures.includes(featureKey);
    const isActive = (path: string) => location.pathname === path || (path !== '/hybrid' && location.pathname.startsWith(path));

    return (
        <div className="h-screen bg-slate-950 text-slate-200 font-sans selection:bg-red-500/30 flex gap-6 p-4 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 border border-slate-800 bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden shrink-0 relative z-20">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-12 px-1">
                        <ShieldAlert className="text-red-500 w-10 h-10" />
                        <div className="flex flex-col">
                            <span className="font-extrabold text-xl tracking-wider text-white">COMMAND</span>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-red-500">SYSTEM ROOT</span>
                        </div>
                    </div>

                    <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-4 pl-4">System Modules</div>
                    <nav className="space-y-0.5">
                        <SidebarItem to="/hybrid" icon={<LayoutDashboard size={20} />} label="Command Center" active={location.pathname === '/hybrid'} locked={false} />
                        <SidebarItem to="/hybrid/audit" icon={<Activity size={20} />} label="Global Audit" active={isActive('/hybrid/audit')} locked={false} />
                        <SidebarItem to="/hybrid/policies" icon={<FileText size={20} />} label="Policies" active={isActive('/hybrid/policies')} locked={isLocked('policies')} />
                        <SidebarItem to="/hybrid/commissions" icon={<DollarSign size={20} />} label="Commissions" active={isActive('/hybrid/commissions')} locked={isLocked('commissions')} />
                        <SidebarItem to="/hybrid/debts" icon={<AlertCircle size={20} />} label="Debts" active={isActive('/hybrid/debts')} locked={isLocked('debts')} />
                        <SidebarItem to="/hybrid/contracting" icon={<Briefcase size={20} />} label="Contracting" active={isActive('/hybrid/contracting')} locked={isLocked('contracting')} />
                        <SidebarItem to="/hybrid/ticketing" icon={<Ticket size={20} />} label="Ticketing" active={isActive('/hybrid/ticketing')} locked={isLocked('ticketing')} />
                        <SidebarItem to="/hybrid/users" icon={<Users size={20} />} label="User & Roles" active={isActive('/hybrid/users')} locked={isLocked('users')} />
                        <SidebarItem to="/hybrid/settings" icon={<Settings size={20} />} label="Settings" active={isActive('/hybrid/settings')} locked={isLocked('settings')} />
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/30 border border-slate-800 rounded-[2.5rem] backdrop-blur-sm">
                <header className="h-24 border-b border-slate-800 flex items-center justify-between px-10">
                    <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                         <span className="font-mono text-sm text-green-500">SYSTEM_ONLINE</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModuleSwitcher />
                        <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-md p-1.5 rounded-full border border-slate-800 shadow-xl">
                            <NotificationDirect />
                            <NotificationBell />
                            <NotificationSale />
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-10 scroll-smooth">
                    {children}
                </div>
            </main>
        </div>
    );
};

export const HybridCommand: React.FC = () => {
    return (
        <HybridProvider>
            <HybridLayout>
                <Routes>
                    <Route path="/" element={<HybridOverview />} />
                    <Route path="/audit" element={<GlobalAudit />} />
                    <Route path="/policies" element={<HybridPolicies />} />
                    <Route path="/commissions" element={<HybridCommissions />} />
                    <Route path="/debts" element={<HybridDebts />} />
                    <Route path="/contracting" element={<HybridContracting />} />
                    <Route path="/ticketing" element={<HybridTicketing />} />
                    <Route path="/users" element={<HybridUsers />} />
                    <Route path="/settings" element={<SystemConfig />} />
                    <Route path="*" element={<Navigate to="/hybrid" replace />} />
                </Routes>
            </HybridLayout>
        </HybridProvider>
    );
};

export default HybridCommand;