import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface CommissionCoverage {
    policy_number: string;
    carrier: {
        id: string;
        label: string;
        custom_carrier: string | null;
    };
    product: string;
    initial_draft_date: string;
    recurring_draft_day: number;
    face_amount: number;
    beneficiary: string;
    monthly_premium: number;
    annual_premium: number;
    status: {
        id: string;
        label: string;
    };
    paidstatus: {
        id: string | null;
        label: string | null;
    };
    appointment_highlights: string | null;
    pending_follow_up: string | null;
}

export interface CommissionComment {
    created_at: number;
    type: string;
    message: string;
    _commentby: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

export const agentCommissionsDetailsApi = {
  /**
   * Fetches policy coverage details for a commission record
   */
  getPolicyCoverage: async (policyId: string): Promise<CommissionCoverage> => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/coverage`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch coverage details', response.status);
    return response.json();
  },

  /**
   * Fetches public comments for the policy associated with the commission
   */
  getPublicComments: async (policyId: string): Promise<CommissionComment[]> => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/comments/public`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch comments', response.status);
    return response.json();
  },

  /**
   * Creates a new public comment for a policy
   */
  createComment: async (policyId: string, message: string) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/comments`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ type: 'public', message }),
    });

    if (!response.ok) throw new ApiError('Failed to create comment', response.status);
    return response.json();
  },

  /**
   * Fetches public comments for the specific commission record
   */
  getCommissionComments: async (commissionId: string): Promise<CommissionComment[]> => {
    const response = await fetch(`${BASE_URL}/commissions/${commissionId}/comments/public`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch commission comments', response.status);
    return response.json();
  },

  /**
   * Creates a new public comment for a commission
   */
  createCommissionComment: async (commissionId: string, message: string) => {
    const response = await fetch(`${BASE_URL}/commissions/${commissionId}/comments`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ type: 'public', message }),
    });

    if (!response.ok) throw new ApiError('Failed to create commission comment', response.status);
    return response.json();
  }
};