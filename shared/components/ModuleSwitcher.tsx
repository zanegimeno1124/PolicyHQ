import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Briefcase, Building2, Globe } from 'lucide-react';

export const ModuleSwitcher: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine current module based on URL
  const getCurrentModule = () => {
    if (location.pathname.startsWith('/management')) return 'agency';
    if (location.pathname.startsWith('/hybrid')) return 'hybrid';
    return 'agent';
  };

  const currentModule = getCurrentModule();

  // Build list of available modules
  const modules = [];
  
  if (user?.agentAccess && user.agentAccess.length > 0) {
    modules.push({ 
      id: 'agent',
      label: 'Agent Workspace', 
      path: '/',
      icon: <Briefcase size={18} />
    });
  }
  
  if (user?.agencyAccess && user.agencyAccess.length > 0) {
    modules.push({ 
      id: 'agency',
      label: 'Agency Hub', 
      path: '/management',
      icon: <Building2 size={18} />
    });
  }
  
  if (user?.hybridAccess) {
    modules.push({ 
      id: 'hybrid',
      label: 'Hybrid Command', 
      path: '/hybrid',
      icon: <Globe size={18} />
    });
  }

  // Don't show switcher if only one module available
  if (modules.length <= 1) return null;

  const currentModuleData = modules.find(m => m.id === currentModule);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModuleSwitch = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm font-semibold text-slate-700"
      >
        {currentModuleData?.icon}
        <span>{currentModuleData?.label}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[200px] z-50">
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => handleModuleSwitch(module.path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                module.id === currentModule ? 'bg-slate-100 font-semibold' : ''
              }`}
            >
              <span className={module.id === currentModule ? 'text-brand-500' : 'text-slate-400'}>
                {module.icon}
              </span>
              <span className="text-sm">{module.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};