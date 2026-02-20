import { BASE_URL, ApiError } from '../../../services/api';

// Helper to handle authenticated requests
const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agencyCommissionsApi = {
  /**
   * Fetches agency commission summary (Agency Context)
   */
  getCommissionsSummary: async (agencyId: string, startDate: number, endDate: number) => {
    const params = new URLSearchParams({
      agency_id: agencyId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });

    const response = await fetch(`${BASE_URL}/agency/commissions/summary?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agency commission summary', response.status);
    return response.json();
  },

  /**
   * Fetches agency commission transactions list (Agency Context)
   */
  getCommissions: async (agencyId: string, startDate: number, endDate: number, statusId: string | null = null) => {
    const params = new URLSearchParams({
      agency_id: agencyId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });
    
    if (statusId) {
        params.append('status_id', statusId);
    }

    const response = await fetch(`${BASE_URL}/agency/commissions?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agency commissions', response.status);
    return response.json();
  }
};