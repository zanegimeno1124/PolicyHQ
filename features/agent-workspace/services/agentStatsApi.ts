import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface PersonalStats {
  agent_name: string;
  total_premium: number;
  total_submissions: number;
  placement_ratio: number;
  average_premium: number;
  carrier_distribution: { label: string; value: number }[];
  monthly_trend: { month: string; premium: number; submissions: number }[];
  recent_milestones: { id: string; title: string; date: number; icon: string }[];
}

export const agentStatsApi = {
  /**
   * Fetches detailed performance statistics for the current agent
   */
  getPersonalStats: async (agentId: string, startDate?: number, endDate?: number): Promise<PersonalStats> => {
    const params = new URLSearchParams({ agent_id: agentId });
    if (startDate) params.append('start_date', String(startDate));
    if (endDate) params.append('end_date', String(endDate));

    try {
      const response = await fetch(`${BASE_URL}/agent/${agentId}/personal_stats?${params.toString()}`, {
        method: 'GET',
        headers: authHeader(),
      });

      if (!response.ok) throw new ApiError('Failed to fetch personal stats', response.status);
      return response.json();
    } catch (error) {
      console.warn("Personal stats API unavailable, using simulation data");
      // Simulation for prototype
      return {
        agent_name: "Agent Profile",
        total_premium: 145800,
        total_submissions: 84,
        placement_ratio: 72.5,
        average_premium: 1735,
        carrier_distribution: [
          { label: 'Carrier A', value: 45000 },
          { label: 'Carrier B', value: 32000 },
          { label: 'Carrier C', value: 28000 },
          { label: 'Others', value: 40800 }
        ],
        monthly_trend: [
          { month: 'Jan', premium: 12000, submissions: 8 },
          { month: 'Feb', premium: 15000, submissions: 10 },
          { month: 'Mar', premium: 18000, submissions: 12 },
          { month: 'Apr', premium: 14000, submissions: 9 },
          { month: 'May', premium: 22000, submissions: 15 },
          { month: 'Jun', premium: 19000, submissions: 13 }
        ],
        recent_milestones: [
          { id: '1', title: 'Top 5 Weekly Producer', date: Date.now() - 86400000 * 2, icon: 'trophy' },
          { id: '2', title: 'Carrier Cert. Renewed', date: Date.now() - 86400000 * 5, icon: 'shield' },
          { id: '3', title: 'New 10k Milestone', date: Date.now() - 86400000 * 10, icon: 'star' }
        ]
      };
    }
  }
};
