import { BASE_URL, ApiError } from '../../../services/api';

const authHeader = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const agencyPolicyRecordsDetailsApi = {
  /**
   * Fetches client profile for a specific policy (Agency Context)
   */
  getClientProfile: async (token: string, policyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/client_profile`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch client profile', response.status);
    return response.json();
  },

  /**
   * Fetches policy coverage details (Agency Context)
   */
  getPolicyCoverage: async (token: string, policyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/coverage`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch coverage details', response.status);
    return response.json();
  },

  /**
   * Updates policy coverage details (Agency Context)
   */
  updatePolicyCoverage: async (token: string, policyId: string, data: any) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/coverage`, {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new ApiError('Failed to update coverage', response.status);
    return response.json();
  },

  /**
   * Fetches splits for a specific policy (Agency Context)
   */
  getSplits: async (token: string, policyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/splits/${policyId}`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch splits', response.status);
    return response.json();
  },

  /**
   * Fetches public comments for a specific policy (Agency Context)
   */
  getPublicComments: async (token: string, policyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/comments/public`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch comments', response.status);
    return response.json();
  },

  /**
   * Creates a new public comment (Agency Context)
   */
  createComment: async (token: string, policyId: string, message: string) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/comments`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ type: 'public', message }),
    });
    if (!response.ok) throw new ApiError('Failed to create comment', response.status);
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
  },

  /**
   * Metadata for edit dropdowns
   */
  getCarriers: async (token: string) => {
    const response = await fetch(`${BASE_URL}/meta/carriers`, {
      method: 'GET',
      headers: authHeader(token),
    });
    return response.json();
  },

  getPolicyStatuses: async (token: string) => {
    const response = await fetch(`${BASE_URL}/meta/policyStatuses`, {
      method: 'GET',
      headers: authHeader(token),
    });
    return response.json();
  },

  getPaidStatuses: async (token: string) => {
    const response = await fetch(`${BASE_URL}/meta/policyPaidStatuses`, {
      method: 'GET',
      headers: authHeader(token),
    });
    return response.json();
  }
};