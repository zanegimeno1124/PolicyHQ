import { BASE_URL, ApiError } from '../../../services/api';

const authHeader = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const hubApi = {
  /**
   * Fetches the agency hub dashboard data
   */
  getHubOverview: async (token: string, agencyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/overview`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch hub overview', response.status);
    return response.json();
  },

  /**
   * Fetches all policies under this agency hierarchy (Simple list)
   */
  getAgencyPolicies: async (token: string, agencyId: string, page = 1) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/policies?page=${page}`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agency policies', response.status);
    return response.json();
  },

  /**
   * Fetches agency-wide commission reports (overrides, etc.)
   */
  getAgencyCommissions: async (token: string, agencyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/commissions`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agency commissions', response.status);
    return response.json();
  },

  /**
   * Fetches agency debt rollup and vector logs
   */
  getAgencyDebts: async (token: string, agencyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/debts`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agency debts', response.status);
    return response.json();
  },

  /**
   * Fetches users and their roles within the agency
   */
  getAgencyUsers: async (token: string, agencyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/users`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agency users', response.status);
    return response.json();
  },

  /**
   * Fetches contracting requests and carrier appointments
   */
  getAgencyContracting: async (token: string, agencyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/contracting`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch contracting data', response.status);
    return response.json();
  },

  /**
   * Fetches support tickets for the agency
   */
  getAgencyTicketing: async (token: string, agencyId: string) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/tickets`, {
      method: 'GET',
      headers: authHeader(token),
    });
    if (!response.ok) throw new ApiError('Failed to fetch tickets', response.status);
    return response.json();
  },

  /**
   * Updates agency settings
   */
  updateAgencySettings: async (token: string, agencyId: string, settings: any) => {
    const response = await fetch(`${BASE_URL}/agency/${agencyId}/settings`, {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new ApiError('Failed to update settings', response.status);
    return response.json();
  }
};