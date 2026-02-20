
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, AgentAccess, AgencyAccess, HybridAccess } from '../shared/types/index';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize token from localStorage if available, otherwise use dev default
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken') || "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.yZeAJ0dQLw_vpoOXSLgEVcRYC_aI1K2ykE4IA9VpabUQ-QeQffts1CmmjuepOXjgPg0NJbQCkDLz9xVCTqAPj9QQJMzKNsBt.JTBM0Pd9hNc886n-_Sy5aA.iXxNCLMPFMvZr34_YluCfT6fZp2WmHZ-c5r8czN0B304XcjhLFH1ymbpder2JOkdQ_UWJ_mFcx25BMqWcrdiLvODVV8ryVO3djKn8uITNgJcT6o6BmLw9fd5w_ojkS66VmPiIK3S_m3XU2AGkZNBTWS2pryOVfEc6zguvg0_-JzVMYZJnXAhkKJM8_dhUdmL.doH_ISvq0mYIGQ8F4mnZKa4oKkS4CCkMA1cpbucb6_o";
  });

  const hasCheckedAutoLogin = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Auto-Authentication for GHL (Run Once)
      if (!hasCheckedAutoLogin.current) {
        hasCheckedAutoLogin.current = true;
        
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        const locationId = urlParams.get('location_id');
        
        // Check Referrer or Hostname to ensure it's from an allowed source
        const referrer = document.referrer || '';
        const hostname = window.location.hostname;
        const allowedDomains = ['app.simplyworkcrm.com', 'app.gohighlevel.com'];
        
        const isAllowedSource = allowedDomains.some(d => referrer.includes(d) || hostname.includes(d));

        if (isAllowedSource && userId && locationId) {
          try {
            const newToken = await authApi.ghlLogin(userId, locationId);
            localStorage.setItem('authToken', newToken);
            setToken(newToken);
            // Return early to allow the re-render with new token to handle user fetching
            // This prevents setting isLoading(false) prematurely
            return;
          } catch (error) {
            console.error("Auto-authentication failed", error);
            // Fall through to normal auth check if auto-login fails
          }
        }
      }

      // 2. Standard Token Validation
      if (token) {
        // Ensure token is persisted for API services to access
        localStorage.setItem('authToken', token);
        try {
          const userData = await authApi.getMe(token);
          const mappedUser = mapApiUserToAppUser(userData);
          setUser(mappedUser);
        } catch (error) {
          console.error("Auth check failed", error);
          logout();
        }
      } else {
        localStorage.removeItem('authToken');
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  // Helper to normalize backend feature strings to frontend keys
  const normalizeFeature = (feature: string): string => {
    const lower = feature.toLowerCase().trim();
    
    // Agent Features
    if (lower.includes('polic')) return 'policies';
    if (lower.includes('debt')) return 'debts';
    if (lower.includes('commission')) return 'commissions';
    if (lower.includes('split')) return 'splits';
    if (lower.includes('overview')) return 'overview';
    if (lower.includes('downline')) return 'downlines';

    // Agency Features
    if (lower.includes('contract')) return 'contracting';
    if (lower.includes('ticket')) return 'ticketing';
    if (lower.includes('user')) return 'users'; // Handles 'user&roles'
    if (lower.includes('master')) return 'settings'; // Handles 'master' -> settings/admin
    
    return lower;
  };

  const mapApiUserToAppUser = (data: any): User => {
    // Map Agent Access
    // Primary agent is the root agent_id
    // Downline comes from agent_access list, which lists other agents the user can access
    const primaryAgentAccess: AgentAccess = {
      agentId: data.agent_id,
      // Default features for root user if not provided in JSON (Assuming full access for now)
      features: ['overview', 'policies', 'commissions', 'debts', 'splits', 'downlines'],
      downline: data.agent_access ? data.agent_access.map((a: any) => ({
        agentId: a.agent_id,
        name: a.agent_name,
        npn: a.agent_npn,
        features: Array.isArray(a.feature) ? a.feature.map(normalizeFeature) : []
      })) : []
    };

    // Map Agency Access
    const agencyAccess: AgencyAccess[] = data.agency_access ? data.agency_access.map((a: any) => ({
      agencyId: a.agency_id,
      agencyName: a.agency_name,
      role: 'admin', // Defaulting role as it's not explicitly in the API response object for agency
      features: Array.isArray(a.feature) ? a.feature.map(normalizeFeature) : []
    })) : [];

    // Map Hybrid Access
    const hybridAccess: HybridAccess | null = data.hybrid_access ? {
      role: 'superuser',
      features: data.hybrid_access.feature ? data.hybrid_access.feature.map(normalizeFeature) : []
    } : null;

    return {
      id: data.id,
      name: data.name,
      email: '', // API doesn't return email, leaving empty as it's not critical for display
      npn: data.agent_npn || data.npn,
      agencyName: data.agency_name || data.agency,
      agencyLogoUrl: data.agency_logo?.url,
      agentAccess: [primaryAgentAccess],
      agencyAccess: agencyAccess,
      hybridAccess: hybridAccess
    };
  };

  const login = async (email: string, pass: string) => {
    try {
      const authToken = await authApi.login(email, pass);
      localStorage.setItem('authToken', authToken);
      setToken(authToken); // Triggers useEffect to fetch user
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};