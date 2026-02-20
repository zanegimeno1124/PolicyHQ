import React, { createContext, useContext } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { HybridAccess } from '../../../shared/types/index';

interface HybridContextType {
  hybridAccess: HybridAccess | null;
}

const HybridContext = createContext<HybridContextType | undefined>(undefined);

export const HybridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const hybridAccess = user?.hybridAccess || null;

  return (
    <HybridContext.Provider value={{ hybridAccess }}>
      {children}
    </HybridContext.Provider>
  );
};

export const useHybridContext = () => {
  const context = useContext(HybridContext);
  if (!context) throw new Error('useHybridContext must be used within HybridProvider');
  return context;
};