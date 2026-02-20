import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface AgencyDebtSummary {
  overall: {
    overalltotal: number;
    overallrecords: number;
  };
  resolved: {
    records: number;
    total_amount: number;
  };
  unresolved: {
    records: number;
    total_amount: number;
  };
}

export interface AgencyDebtRecord {
  id: string;
  amount: number;
  carrier: string;
  created_by: string;
  agentOndebt_id: string;
  agentOndebt_name: string;
  isResolved: boolean;
  statement_date: number;
  email?: string; // Optional email field if available
}

export interface DebtComment {
  message: string;
  created_at: number;
  _commentby: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface AgentWithEmail {
  id: string;
  label: string;
  email: string;
}

export interface CarrierMeta {
  id: string;
  label: string;
}

export const agencyDebtsApi = {
  /**
   * Fetches the agency debt summary metrics
   */
  getDebtSummary: async (agencyId: string): Promise<AgencyDebtSummary> => {
    const params = new URLSearchParams({
      agency_id: agencyId
    });

    const response = await fetch(`${BASE_URL}/agency/debts/summary?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agency debt summary', response.status);
    return response.json();
  },

  /**
   * Fetches detailed agency debt records
   */
  getDebtRecords: async (agencyId: string, status: 'all' | 'unresolved' | 'resolved' = 'unresolved'): Promise<AgencyDebtRecord[]> => {
    const params = new URLSearchParams({
      agency_id: agencyId,
      status: status
    });

    const response = await fetch(`${BASE_URL}/agency/debts?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agency debt records', response.status);
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
  createDebtComment: async (debtId: string, message: string): Promise<DebtComment> => {
    const response = await fetch(`${BASE_URL}/debts/${debtId}/comments`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ message })
    });

    if (!response.ok) throw new ApiError('Failed to create debt comment', response.status);
    return response.json();
  },

  /**
   * Resolves or unresolves a debt record
   */
  resolveDebt: async (debtId: string, isResolved: boolean): Promise<any> => {
    const response = await fetch(`${BASE_URL}/debts/${debtId}/resolve`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ isResolved })
    });

    if (!response.ok) throw new ApiError('Failed to update resolution status', response.status);
    return response.json();
  },

  /**
   * Fetches agents with emails for creation dropdown
   */
  getAgentsWithEmail: async (): Promise<AgentWithEmail[]> => {
    const response = await fetch(`${BASE_URL}/meta/agents_wEmail`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agents', response.status);
    return response.json();
  },

  /**
   * Fetches carriers for creation dropdown
   */
  getCarriers: async (): Promise<CarrierMeta[]> => {
    const response = await fetch(`${BASE_URL}/meta/carriers`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch carriers', response.status);
    return response.json();
  },

  /**
   * Creates a new agency debt record
   */
  createDebtRecord: async (data: any): Promise<any> => {
    const response = await fetch(`${BASE_URL}/agency/debts`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new ApiError('Failed to create debt record', response.status);
    return response.json();
  },

  /**
   * Updates an existing agency debt record
   */
  updateDebtRecord: async (debtId: string, data: any): Promise<any> => {
    const response = await fetch(`${BASE_URL}/agency/debts/${debtId}`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new ApiError('Failed to update debt record', response.status);
    return response.json();
  }
};