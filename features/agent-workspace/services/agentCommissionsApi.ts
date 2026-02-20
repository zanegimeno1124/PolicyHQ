import { BASE_URL, ApiError } from '../../../services/api';


// Helper to handle authenticated requests
const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentCommissionsApi = {
  /**
   * Fetches commission summary
   */
  getCommissionsSummary: async (agentId: string, startDate: number, endDate: number) => {
    const params = new URLSearchParams({
      agent_id: agentId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });

    const response = await fetch(`${BASE_URL}/commissions/summary?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch commission summary', response.status);
    return response.json();
  },

  /**
   * Fetches commission transactions list
   */
  getCommissions: async (agentId: string, startDate: number, endDate: number, statusId: string | null = null) => {
    const params = new URLSearchParams({
      agent_id: agentId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });
    
    if (statusId) {
        params.append('status_id', statusId);
    }

    const response = await fetch(`${BASE_URL}/commissions?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch commissions', response.status);
    return response.json();
  }
};