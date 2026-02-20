import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentDownlineApi = {
  /**
   * Fetches organization hierarchy/downline
   */
  getHierarchy: async (agentId: string) => {
    const response = await fetch(`${BASE_URL}/heirarchy?agent_id=${agentId}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch hierarchy', response.status);
    return response.json();
  }
};