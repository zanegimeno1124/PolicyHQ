import { BASE_URL, ApiError } from '../../../services/api';

// Helper to handle authenticated requests
const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface DebtSummary {
  overall: {
    overalltotal: number;
    overallrecords: number;
  };
  resolved: {
    total_amount: number;
    records: number;
  };
  unresolved: {
    total_amount: number;
    records: number;
  };
}

export interface DebtRecord {
  id: string;
  amount: number;
  isResolved: boolean;
  carrier: string;
  statement_date: number;
  created_by: string;
  comments: any[];
}

export interface DebtComment {
  created_at: number;
  message: string;
  _commentby: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export const agentDebtRecoveryApi = {
  /**
   * Fetches the debt summary dashboard metrics
   */
  getDebtSummary: async (agentId: string): Promise<DebtSummary> => {
    const params = new URLSearchParams({
      agent_id: agentId
    });

    const response = await fetch(`${BASE_URL}/debts/summary?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch debt summary', response.status);
    return response.json();
  },

  /**
   * Fetches debt records list
   */
  getDebtRecords: async (agentId: string, status: 'unresolved' | 'resolved' | 'all' = 'unresolved'): Promise<DebtRecord[]> => {
    const params = new URLSearchParams({
      agent_id: agentId,
      status: status
    });

    const response = await fetch(`${BASE_URL}/debts?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch debt records', response.status);
    return response.json();
  },

  /**
   * Fetches comments for a specific debt record
   */
  getDebtComments: async (debtId: string): Promise<DebtComment[]> => {
    const response = await fetch(`${BASE_URL}/debts/${debtId}/comments`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch debt comments', response.status);
    return response.json();
  },

  /**
   * Creates a new comment for a debt record
   */
  createDebtComment: async (debtId: string, message: string) => {
    const response = await fetch(`${BASE_URL}/debts/${debtId}/comments`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ message })
    });

    if (!response.ok) throw new ApiError('Failed to create comment', response.status);
    return response.json();
  },

  /**
   * Resolves or unresolves a debt record
   */
  resolveDebt: async (debtId: string, isResolved: boolean) => {
    const response = await fetch(`${BASE_URL}/debts/${debtId}/resolve`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ isResolved })
    });

    if (!response.ok) throw new ApiError('Failed to update status', response.status);
    return response.json();
  },

  /**
   * Updates a debt record (Generic update)
   */
  updateDebt: async (debtId: string, updates: Partial<DebtRecord>) => {
    const response = await fetch(`${BASE_URL}/debts/${debtId}`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new ApiError('Failed to update debt', response.status);
    return response.json();
  }
};