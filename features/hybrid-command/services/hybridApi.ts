import { BASE_URL, ApiError } from '../../../services/api';

const authHeader = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const hybridApi = {
  /**
   * Fetches the high-level system command center stats
   */
  getCommandCenterStats: async (token: string) => {
    const response = await fetch(`${BASE_URL}/hybrid/stats`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch command center stats', response.status);
    return response.json();
  },

  /**
   * Fetches the global audit log
   */
  getGlobalAudit: async (token: string, filters?: any) => {
    const response = await fetch(`${BASE_URL}/hybrid/audit`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(filters || {})
    });
    if (!response.ok) throw new ApiError('Failed to fetch global audit', response.status);
    return response.json();
  },

  /**
   * Fetches system configuration
   */
  getSystemConfig: async (token: string) => {
    const response = await fetch(`${BASE_URL}/hybrid/config`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch system config', response.status);
    return response.json();
  },

  /**
   * Fetches global policy search results
   */
  searchGlobalPolicies: async (token: string, query: string) => {
    const response = await fetch(`${BASE_URL}/hybrid/policies/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to search global policies', response.status);
    return response.json();
  },

  /**
   * Fetches global commission reconciliation data
   */
  getGlobalCommissions: async (token: string) => {
    const response = await fetch(`${BASE_URL}/hybrid/commissions`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch global commissions', response.status);
    return response.json();
  }
};