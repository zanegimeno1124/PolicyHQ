import { BASE_URL, ApiError } from '../../../services/api';

// Helper to handle authenticated requests
const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentApi = {
  /**
   * Fetches the dashboard overview metrics for the agent
   */
  getOverview: async (agentId: string) => {
    const response = await fetch(`${BASE_URL}/agent/${agentId}/overview`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch overview', response.status);
    return response.json();
  },

  /**
   * Fetches debt and vector log information
   */
  getDebts: async (agentId: string) => {
    const response = await fetch(`${BASE_URL}/agent/${agentId}/debts`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch debts', response.status);
    return response.json();
  },

  /**
   * Creates a new support ticket
   */
  createTicket: async (ticketData: any) => {
    const response = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(ticketData),
    });

    if (!response.ok) throw new ApiError('Failed to create ticket', response.status);
    return response.json();
  }
};