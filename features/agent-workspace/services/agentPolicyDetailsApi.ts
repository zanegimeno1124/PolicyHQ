import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentPolicyDetailsApi = {
  /**
   * Fetches specific policy details (Context-aware)
   */
  getPolicyDetails: async (agentId: string, policyId: string) => {
    const response = await fetch(`${BASE_URL}/agent/${agentId}/policies/${policyId}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch policy details', response.status);
    return response.json();
  },

  /**
   * Fetches specific policy details by ID directly
   */
  getPolicyById: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch policy', response.status);
    return response.json();
  },

  /**
   * Fetches client profile for a specific policy
   */
  getClientProfile: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/client_profile`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch client profile', response.status);
    return response.json();
  },

  /**
   * Updates client profile for a specific policy
   */
  updateClientProfile: async (policyId: string, data: any) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/client_profile/update`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new ApiError('Failed to update client profile', response.status);
    return response.json();
  },

  /**
   * Fetches coverage details for a specific policy
   */
  getPolicyCoverage: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/coverage`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch coverage details', response.status);
    return response.json();
  },

  /**
   * Update policy coverage details
   */
  updatePolicyCoverage: async (policyId: string, data: any) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/coverage`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new ApiError('Failed to update policy coverage', response.status);
    return response.json();
  },

  /**
   * Fetches public comments for a specific policy
   */
  getPublicComments: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/comments/public`, {
      method: 'GET',
      headers: authHeader()
    });

    if (!response.ok) throw new ApiError('Failed to fetch comments', response.status);
    return response.json();
  },

  /**
   * Fetches private comments for a specific policy
   */
  getPrivateComments: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/comments/private`, {
      method: 'GET',
      headers: authHeader()
    });

    if (!response.ok) throw new ApiError('Failed to fetch comments', response.status);
    return response.json();
  },

  /**
   * Creates a new comment for a policy
   */
  createComment: async (policyId: string, message: string, type: 'public' | 'private' = 'public') => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/comments`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ type, message }),
    });

    if (!response.ok) throw new ApiError('Failed to create comment', response.status);
    return response.json();
  },

  /**
   * Fetches contact sources metadata
   */
  getContactSources: async () => {
    const response = await fetch(`${BASE_URL}/meta/contactSources`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch contact sources', response.status);
    return response.json();
  },

  /**
   * Fetches contact types metadata
   */
  getContactTypes: async () => {
    const response = await fetch(`${BASE_URL}/meta/contactTypes`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch contact types', response.status);
    return response.json();
  },

  /**
   * Fetches carriers metadata
   */
  getCarriers: async () => {
    const response = await fetch(`${BASE_URL}/meta/carriers`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch carriers', response.status);
    return response.json();
  },

  /**
   * Fetches policy statuses metadata
   */
  getPolicyStatuses: async () => {
    const response = await fetch(`${BASE_URL}/meta/policyStatuses`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch policy statuses', response.status);
    return response.json();
  },

  /**
   * Fetches paid statuses metadata
   */
  getPaidStatuses: async () => {
    const response = await fetch(`${BASE_URL}/meta/policyPaidStatuses`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch paid statuses', response.status);
    return response.json();
  }
};