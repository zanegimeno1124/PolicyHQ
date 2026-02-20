import { BASE_URL, ApiError } from '../../../services/api';
import { SplitPolicy } from '../../../shared/types/index';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentSplitsApi = {
  /**
   * Fetches split business agreements
   */
  getSplits: async (agentId: string, startDate: number, endDate: number): Promise<SplitPolicy[]> => {
    const params = new URLSearchParams({
      agent_id: agentId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });

    const response = await fetch(`${BASE_URL}/splits?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch splits', response.status);
    return response.json();
  },

  /**
   * Fetches splits for a specific policy
   */
  getPolicySplits: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/splits/${policyId}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch policy splits', response.status);
    return response.json();
  },

  /**
   * Validates an agent NPN for split addition
   */
  validateAgent: async (npn: string) => {
    const response = await fetch(`${BASE_URL}/agent/${npn}/validate`, {
        method: 'GET',
        headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Invalid NPN', response.status);
    return response.json();
  },

  /**
   * Updates splits for a specific policy
   */
  updatePolicySplits: async (policyId: string, splits: any[]) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/splits`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify({ splits })
    });

    if (!response.ok) throw new ApiError('Failed to update splits', response.status);
    return response.json();
  }
};