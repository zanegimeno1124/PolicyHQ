
import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileCheck, 
  Split, 
  DollarSign, 
  AlertCircle, 
  LogOut,
  ChevronDown, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  RotateCcw, 
  Users, 
  Ticket,
  Trophy
} from 'lucide-react';
import { useAgentContext } from './context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { AgentOverview } from './components/AgentOverview';
import { AgentPolicies } from './components/AgentPolicies';
import { AgentPolicyDetails } from './components/AgentPolicyDetails';
import { AgentCommissions } from './components/AgentCommissions';
import { AgentSplits } from './components/AgentSplits';
import { AgentDebtRecovery } from './components/AgentDebtRecovery';
import { AgentDownlines } from './components/AgentDownlines';
import { AgentTickets } from './components/AgentTickets';
import { AgentleaderboardRealtime } from './components/AgentleaderboardRealtime';
import { AgentStats } from './components/AgentStats';
import { ModuleSwitcher } from '../../shared/components/ModuleSwitcher';
import { NotificationBell } from '../../shared/components/NotificationBell';
import { NotificationDirect } from '../../shared/components/NotificationDirect';
import { NotificationSale } from '../../shared/components/NotificationSale';

// Sidebar Item - Polished iOS Style
const SidebarItem = ({ 
  to, 
  icon, 
  label, 
  active, 
  locked, 
  collapsed 
}: { 
  to: string, 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  locked?: boolean, 
  collapsed?: boolean 
}) => {
  return (
    <Link 
      to={locked ? '#' : to} 
      onClick={(e) => locked && e.preventDefault()}
      className={`
        relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group
        ${collapsed 
          ? 'justify-center w-12 h-12 rounded-2xl mx-auto mb-3' 
          : 'w-full px-5 py-4 rounded-[1.25rem] gap-4 mb-2'
        }
        ${active 
          ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]' 
          : locked 
            ? 'opacity-50 cursor-not-allowed grayscale' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }
      `}
      title={collapsed ? label : undefined}
    >
      <span className={`shrink-0 transition-transform duration-300 ${collapsed ? 'scale-110' : 'scale-100'} ${active ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      
      <span className={`
        font-bold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 origin-left
        ${collapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto opacity-100 translate-x-0 flex-1'}
      `}>
        {label}
      </span>

      {!collapsed && locked && <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}

      {/* Active Dot for Collapsed Mode */}
      {active && collapsed && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border border-white animate-in zoom-in duration-300"></span>
      )}
    </Link>
  );
};

const AgentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    isImpersonating, 
    currentAgentId, 
    stopImpersonation, 
    startImpersonation, 
    subAgents, 
    viewingAgentName, 
    availableFeatures 
  } = useAgentContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  
  // Feature Key Determination
  const featureKey = (() => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'overview';
    if (path.startsWith('/policies')) return 'policies';
    if (path.startsWith('/downlines')) return 'downlines';
    if (path.startsWith('/splits')) return 'splits';
    if (path.startsWith('/commissions')) return 'commissions';
    if (path.startsWith('/debts')) return 'debts';
    if (path.startsWith('/tickets')) return 'ticketing';
    if (path.startsWith('/leaderboard/realtime')) return 'overview';
    if (path.startsWith('/stats')) return 'overview';
    return null;
  })();

  // Permission Logic
  const isLocked = (key: string) => {
    if (key === 'ticketing' && !isImpersonating) return false;
    return !availableFeatures.includes(key);
  };

  const isRestricted = featureKey && isLocked(featureKey);

  const currentSelectionLabel = isImpersonating 
    ? subAgents.find(a => a.agentId === currentAgentId)?.name 
    : 'My Workspace';

  // Extract agency initials for fallback logo
  const agencyInitials = user?.agencyName
    ? user.agencyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'HQ';

  return (
    <div className="h-screen bg-[#F2F3F5] flex font-sans overflow-hidden p-4 gap-4 selection:bg-brand-500/30 selection:text-brand-900">
      {/* Floating Sidebar */}
      <aside 
        className={`
          ${isCollapsed ? 'w-24 px-3' : 'w-80 px-6'} 
          bg-white rounded-[2.5rem] flex flex-col transition-[width,padding] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] 
          shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/60 relative z-20 shrink-0 py-8
        `}
      >
        {/* Toggle Handle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="absolute -right-3 top-12 w-8 h-8 bg-white border border-slate-100 rounded-full shadow-lg shadow-slate-200/50 flex items-center justify-center text-slate-400 hover:text-brand-500 transition-all z-50 hover:scale-110 active:scale-95"
        >
          {isCollapsed ? <ChevronRight size={16} strokeWidth={3} /> : <ChevronLeft size={16} strokeWidth={3} />}
        </button>

        {/* Brand Header */}
        <div className={`flex items-center gap-4 mb-10 transition-all duration-500 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-slate-900/20 shrink-0 text-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-brand-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                {user?.agencyLogoUrl ? (
                    <img src={user.agencyLogoUrl} alt="Agency Logo" className="relative z-10 w-full h-full object-contain p-2" />
                ) : (
                    <span className="relative z-10 text-brand-500">{agencyInitials}</span>
                )}
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <span className="font-extrabold text-2xl text-slate-900 tracking-tight whitespace-nowrap block">
                  PolicyHQ
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase truncate block">
                  {user?.agencyName || 'Agent Portal'}
                </span>
            </div>
        </div>
        
        {/* Context Switcher - Collapsible */}
        <div className="mb-8 relative z-40">
            {!isCollapsed ? (
              <>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between bg-slate-50 border border-slate-100 text-slate-800 text-sm font-bold rounded-2xl py-4 px-5 transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 ${isDropdownOpen ? 'ring-2 ring-brand-500/20 border-brand-500 bg-white' : ''}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isImpersonating ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                      <span className="truncate">{currentSelectionLabel}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl shadow-slate-300/50 z-50 p-2 animate-in fade-in zoom-in-95 duration-200 origin-top">
                      <button
                          onClick={() => {
                            stopImpersonation();
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${!isImpersonating ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <span>My Workspace</span>
                        {!isImpersonating && <CheckCircleIcon />}
                      </button>
                      
                      {subAgents.length > 0 && (
                        <>
                          <div className="px-5 py-3 mt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Team Access</div>
                          <div className="max-h-60 overflow-y-auto pr-1">
                            {subAgents.map(agent => {
                              const isSelected = isImpersonating && currentAgentId === agent.agentId;
                              return (
                                <button
                                  key={agent.agentId}
                                  onClick={() => {
                                    startImpersonation(agent.agentId);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-between mb-1 ${isSelected ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="truncate">{agent.name}</span>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <button 
                onClick={() => setIsCollapsed(false)} 
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all mx-auto ${isImpersonating ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-md'}`}
                title="Switch Context"
              >
                  <Briefcase size={20} strokeWidth={2.5} />
              </button>
            )}
        </div>

        {/* Navigation Label */}
        <div className={`transition-all duration-300 px-2 mb-4 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-2">Menu</div>
        </div>
        
        {/* Nav Items */}
        <nav className="space-y-1 flex flex-col items-center w-full flex-1">
            <SidebarItem to="/" icon={<Trophy size={20} />} label="Leaderboard" active={location.pathname === '/' || location.pathname === ''} locked={isLocked('overview')} collapsed={isCollapsed} />
            <SidebarItem to="/policies" icon={<FileCheck size={20} />} label="Policies" active={isActive('/policies')} locked={isLocked('policies')} collapsed={isCollapsed} />
            <SidebarItem to="/downlines" icon={<Users size={20} />} label="Downlines" active={isActive('/downlines')} locked={isLocked('downlines')} collapsed={isCollapsed} />
            <SidebarItem to="/splits" icon={<Split size={20} />} label="Splits" active={isActive('/splits')} locked={isLocked('splits')} collapsed={isCollapsed} />
            <SidebarItem to="/commissions" icon={<DollarSign size={20} />} label="Commissions" active={isActive('/commissions')} locked={isLocked('commissions')} collapsed={isCollapsed} />
            <SidebarItem to="/debts" icon={<AlertCircle size={20} />} label="Debt Recovery" active={isActive('/debts')} locked={isLocked('debts')} collapsed={isCollapsed} />
            <SidebarItem to="/tickets" icon={<Ticket size={20} />} label="Tickets" active={isActive('/tickets')} locked={isLocked('ticketing')} collapsed={isCollapsed} />
        </nav>

        {/* User Profile Footer */}
        <div className="mt-auto w-full pt-4">
            <div className={`flex items-center gap-3 p-2.5 rounded-[1.25rem] border transition-all duration-500 ${isCollapsed ? 'justify-center border-transparent bg-transparent' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50'}`}>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 text-xs font-black border-2 border-slate-100 shadow-sm shrink-0">
                  {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                
                <div className={`flex-1 min-w-0 transition-all duration-500 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-wider">NPN: {user?.npn || '11241995'}</p>
                        <p className="text-[9px] text-brand-500 truncate font-black uppercase tracking-tighter">{user?.agencyName || 'PolicyHQ'}</p>
                    </div>
                </div>
                
                <button onClick={logout} className={`rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ${isCollapsed ? 'hidden' : 'p-2'}`} title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content - Floating Panel */}
      <main className={`flex-1 min-w-0 h-full overflow-hidden ${isRestricted ? 'bg-slate-950 border-slate-900' : 'bg-transparent'} flex flex-col relative transition-colors duration-500`}>
        {isRestricted ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-8 animate-in fade-in duration-500 rounded-[2.5rem]">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-center mb-8 shadow-2xl shadow-black/50 ring-1 ring-white/5 relative group">
                    <div className="absolute inset-0 bg-brand-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Lock className="w-10 h-10 text-brand-500 relative z-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-400 text-base mb-10 max-w-md">This module is not enabled for <span className="text-white font-semibold">{viewingAgentName}</span>.<br/><span className="text-sm opacity-60 mt-1 block">Please request permission from the organization administrator.</span></p>
                <button onClick={() => { stopImpersonation(); navigate('/'); }} className="flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 hover:-translate-y-1 active:scale-95">
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore My View</span>
                </button>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide">
            <header className="h-24 sticky top-0 z-[100] px-6 flex items-center justify-between mb-2 bg-[#F2F3F5]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {viewingAgentName}
                    {isImpersonating && <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 align-middle border border-amber-200">READ ONLY</span>}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <ModuleSwitcher />
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-slate-200/50 shadow-sm">
                        <NotificationDirect />
                        <NotificationBell />
                        <NotificationSale />
                    </div>
                </div>
            </header>

            <div className="px-6 pb-12 max-w-[1600px] mx-auto">
                <Routes>
                  <Route path="/" element={<AgentOverview />} />
                  <Route path="/leaderboard/realtime" element={<AgentleaderboardRealtime />} />
                  <Route path="/stats" element={<AgentStats />} />
                  <Route path="/policies" element={<AgentPolicies />} />
                  <Route path="/policies/details" element={<AgentPolicyDetails />} />
                  <Route path="/downlines" element={<AgentDownlines />} />
                  <Route path="/commissions" element={<AgentCommissions />} />
                  <Route path="/splits" element={<AgentSplits />} />
                  <Route path="/debts" element={<AgentDebtRecovery />} />
                  <Route path="/tickets" element={<AgentTickets />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            </div>
        )}
      </main>
    </div>
  );
};

const CheckCircleIcon = () => (
  <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export const AgentWorkspace: React.FC = () => {
  return <AgentLayout />;
};

export default AgentWorkspace;