import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AgencyAccess } from '../../../shared/types/index';

interface AgencyContextType {
  selectedAgencyIds: string[];
  selectedAgencies: AgencyAccess[];
  availableAgencies: AgencyAccess[];
  unionFeatures: string[];
  // Fix: Added activeAgency to the context interface
  activeAgency: AgencyAccess | null;
  toggleAgency: (id: string) => void;
  selectAllAgencies: () => void;
  clearAgencies: () => void;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export const AgencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const availableAgencies = user?.agencyAccess || [];
  
  // Persistence Key
  const STORAGE_KEY = `policyhq_selected_agencies_${user?.id}`;

  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return availableAgencies[0] ? [availableAgencies[0].agencyId] : [];
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedAgencyIds));
  }, [selectedAgencyIds]);

  const selectedAgencies = useMemo(() => 
    availableAgencies.filter(a => selectedAgencyIds.includes(a.agencyId)),
    [availableAgencies, selectedAgencyIds]
  );

  // Fix: Compute activeAgency as the first selected agency for single-context components
  const activeAgency = useMemo(() => selectedAgencies[0] || null, [selectedAgencies]);

  const unionFeatures = useMemo(() => {
    const features = new Set<string>();
    selectedAgencies.forEach(a => a.features.forEach(f => features.add(f)));
    return Array.from(features);
  }, [selectedAgencies]);

  const toggleAgency = (id: string) => {
    setSelectedAgencyIds(prev => {
      if (prev.includes(id)) {
        // Don't allow empty selection if possible, or handle empty states in components
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const selectAllAgencies = () => {
    setSelectedAgencyIds(availableAgencies.map(a => a.agencyId));
  };

  const clearAgencies = () => {
    setSelectedAgencyIds([]);
  };

  return (
    <AgencyContext.Provider value={{ 
        selectedAgencyIds, 
        selectedAgencies, 
        availableAgencies, 
        unionFeatures,
        // Fix: Expose activeAgency to consumers
        activeAgency,
        toggleAgency, 
        selectAllAgencies, 
        clearAgencies 
    }}>
      {children}
    </AgencyContext.Provider>
  );
};

export const useAgencyContext = () => {
  const context = useContext(AgencyContext);
  if (!context) throw new Error('useAgencyContext must be used within AgencyProvider');
  return context;
};