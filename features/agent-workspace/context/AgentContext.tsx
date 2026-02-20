import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { SubAgent } from '../../../shared/types/index';

interface AgentContextType {
  currentAgentId: string;
  isImpersonating: boolean;
  startImpersonation: (downlineAgentId: string) => void;
  stopImpersonation: () => void;
  availableFeatures: string[];
  subAgents: SubAgent[];
  viewingAgentName: string;
  hasAgentProfile: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Default to the user's primary agent identity
  const primaryAgent = user?.agentAccess?.[0];
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);

  const subAgents = primaryAgent?.downline || [];

  const startImpersonation = (targetId: string) => {
    // Basic validation: ensure target is in downline
    if (subAgents.some(a => a.agentId === targetId)) {
      setImpersonatedId(targetId);
    }
  };

  const stopImpersonation = () => {
    setImpersonatedId(null);
  };

  const isImpersonating = !!impersonatedId;
  const currentAgentId = impersonatedId || primaryAgent?.agentId || '';
  const hasAgentProfile = !!currentAgentId;

  // Calculate Features
  // If impersonating, get features from the subAgent object.
  // If viewing self (Me), get features from primaryAgent object.
  let availableFeatures: string[] = [];
  
  if (isImpersonating) {
    const target = subAgents.find(a => a.agentId === impersonatedId);
    availableFeatures = target?.features || [];
  } else {
    availableFeatures = primaryAgent?.features || [];
  }

  // Determine the name of the agent currently being viewed
  const viewingAgentName = isImpersonating 
    ? subAgents.find(a => a.agentId === impersonatedId)?.name || 'Unknown Agent'
    : user?.name || 'My Workspace';

  return (
    <AgentContext.Provider value={{
      currentAgentId,
      isImpersonating,
      startImpersonation,
      stopImpersonation,
      availableFeatures,
      subAgents,
      viewingAgentName,
      hasAgentProfile
    }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgentContext must be used within AgentProvider');
  return context;
};