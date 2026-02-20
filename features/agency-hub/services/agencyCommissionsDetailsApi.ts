
import { BASE_URL, ApiError } from '../../../services/api';

const authHeader = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const agencyCommissionsDetailsApi = {
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
   * Fetches commissions for a specific policy (Agency Context)
   */
  getPolicyCommissions: async (token: string, policyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/commissions`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch policy commissions', response.status);
    return response.json();
  },

  /**
   * Toggles the lock status of a policy
   */
  togglePolicyLock: async (token: string, policyId: string, isLocked: boolean) => {
    const response = await fetch(`${BASE_URL}/agency/policy/${policyId}/lock`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ isLocked })
    });
    if (!response.ok) throw new ApiError('Failed to update policy lock status', response.status);
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
   * Creates a new commission record for a policy
   */
  createCommissionRecord: async (token: string, policyId: string, payload: any) => {
    const response = await fetch(`${BASE_URL}/agency/policies/${policyId}/commissions`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new ApiError('Failed to create commission record', response.status);
    return response.json();
  },

  /**
   * Updates an existing commission record
   */
  updateCommissionRecord: async (token: string, commissionId: string, payload: any) => {
    const response = await fetch(`${BASE_URL}/agency/commissions/${commissionId}`, {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new ApiError('Failed to update commission record', response.status);
    return response.json();
  },

  /**
   * Deletes a commission record
   */
  deleteCommissionRecord: async (token: string, commissionId: string) => {
    const response = await fetch(`${BASE_URL}/commissions/${commissionId}`, {
      method: 'DELETE',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to delete commission record', response.status);
    return response.json();
  },

  /**
   * Fetches comments for a specific commission record (public/private)
   */
  getCommissionComments: async (token: string, commissionId: string, type: 'public' | 'private') => {
    const response = await fetch(`${BASE_URL}/commissions/${commissionId}/comments/${type}`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch commission comments', response.status);
    return response.json();
  },

  /**
   * Creates a new comment for a commission record
   */
  createCommissionComment: async (token: string, commissionId: string, type: 'public' | 'private', message: string) => {
    const response = await fetch(`${BASE_URL}/commissions/${commissionId}/comments`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ type, message }),
    });
    if (!response.ok) throw new ApiError('Failed to create commission comment', response.status);
    return response.json();
  },

  // Added deletePolicy to fix the error in AgencyCommissionsDetails component
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
  },

  getCommissionStatuses: async (token: string) => {
    const response = await fetch(`${BASE_URL}/meta/commissionStatuses`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch commission statuses', response.status);
    return response.json();
  },

  getAgents: async (token: string) => {
    const response = await fetch(`${BASE_URL}/meta/agents`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agents', response.status);
    return response.json();
  }
};
