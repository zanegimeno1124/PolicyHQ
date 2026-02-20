
import { BASE_URL, ApiError } from '../../../services/api';
import { Policy } from '../../../shared/types/index';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentPoliciesApi = {
  /**
   * Fetches the list of policies based on agent_id and date range
   */
  getPolicies: async (agentId: string, startDate: number, endDate: number): Promise<Policy[]> => {
    const params = new URLSearchParams({
      agent_id: agentId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });

    const response = await fetch(`${BASE_URL}/policies?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch policies', response.status);
    return response.json();
  },

  /**
   * Searches for specific policies by name or number
   */
  searchPolicies: async (agentId: string, query: string): Promise<Policy[]> => {
    const params = new URLSearchParams({
      agent_id: agentId,
      search: query
    });

    const response = await fetch(`${BASE_URL}/policies?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Search failed', response.status);
    return response.json();
  },

  /**
   * Deletes a policy with a required reason
   */
  deletePolicy: async (policyId: string, reason: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}`, {
      method: 'DELETE',
      headers: authHeader(),
      body: JSON.stringify({ reason })
    });

    if (!response.ok) throw new ApiError('Failed to delete policy', response.status);
  }
};
