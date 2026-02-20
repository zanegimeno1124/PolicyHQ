import { BASE_URL, ApiError } from '../../../services/api';

const authHeader = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const agencyPolicyRecordsApi = {
  /**
   * Fetches detailed policies under this agency hierarchy with filtering
   */
  getDetailedAgencyPolicies: async (token: string, agencyId: string, startDate: number, endDate: number, statusId?: string) => {
    const params = new URLSearchParams({
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });
    if (statusId) params.append('status_id', statusId);

    const response = await fetch(`${BASE_URL}/agency/policies/${agencyId}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agency policies', response.status);
    return response.json();
  },

  /**
   * Deletes a policy with a required reason
   */
  deletePolicy: async (token: string, policyId: string, reason: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}`, {
      method: 'DELETE',
      headers: authHeader(token),
      body: JSON.stringify({ reason })
    });

    if (!response.ok) throw new ApiError('Failed to delete policy', response.status);
    return response.json();
  }
};