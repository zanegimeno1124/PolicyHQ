import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface SummaryItem {
  id: string;
  label: string;
  total: number;
  records: number;
}

export interface PolicySummaryResponse {
  Status: SummaryItem[];
  Carrier: SummaryItem[];
}

export const agencyPoliciesApi = {
  /**
   * Fetches the agency policies summary grouped by status and carrier
   */
  getPolicySummary: async (agencyId: string, startDate: number, endDate: number): Promise<PolicySummaryResponse> => {
    const params = new URLSearchParams({
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });

    const response = await fetch(`${BASE_URL}/agency/policies/${agencyId}/summary?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agency policy summary', response.status);
    return response.json();
  }
};