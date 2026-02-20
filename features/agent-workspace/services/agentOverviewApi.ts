
import { BASE_URL, ApiError } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface DashboardStats {
  productionGoal: number; // Percentage
  pendingItems: {
    current: number;
    total: number;
  };
  fieldHours: {
    current: number;
    target: number;
  };
}

export interface SubmissionSummary {
  submissions: number;
  premiums: number;
}

export interface CarrierBreakdown {
  id: string;
  label: string;
  total_premium: number;
  submissions: number;
  issued: number;
  logo?: {
    url: string;
    [key: string]: any;
  } | null;
  top_agent?: {
    id: string;
    name: string;
    agency: string;
    submissions: number;
    submitted_premium: number;
  } | null;
}

export interface TeamRankingEntry {
  id: string;
  name: string;
  logo: { url: string } | null;
  manager: string;
  agents: number;
  submissions: number;
  issued: number;
  total_premium: number;
}

export interface LeadBreakdownItem {
  id: string;
  label: string;
  total_premium: number;
  submissions: number;
  issued: number;
}

export interface LeadBreakdownResponse {
  source: LeadBreakdownItem[];
  type: LeadBreakdownItem[];
}

export interface RevenuePoint {
  month: string;
  value: number;
}

export interface AchievementBadge {
  id: string;
  label: string;
  iconType: 'book' | 'star' | 'palette' | 'history';
  color: 'blue' | 'red' | 'amber' | 'purple';
}

export interface ActiveChallenge {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  coins?: number;
  color: 'blue' | 'amber';
  type: 'daily' | 'extra';
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  trend: 'up' | 'down';
  avatarSeed: string;
}

export interface AllTimeLeaderboardEntry {
  agent_id: string;
  agent_name: string;
  total_annualPremium: number;
  agency?: {
    id: string;
    label: string;
  } | null;
  agent_profile?: {
    url?: string | null;
  } | null;
}

export interface AgencyMeta {
  id: string;
  label: string;
}

export interface AgentOverviewData {
  stats: DashboardStats;
  revenueTrend: RevenuePoint[];
  badges: AchievementBadge[];
  challenges: ActiveChallenge[];
  leaderboard: {
    podium: LeaderboardEntry[];
    challengers: LeaderboardEntry[];
  };
}

export const agentOverviewApi = {
  /**
   * Fetches the submission summary for specific filters
   */
  getSubmissionSummary: async (agencyId: string | null, startDate: number | null, endDate: number | null): Promise<SubmissionSummary> => {
    const params = new URLSearchParams();
    if (startDate !== null) params.append('start_date', String(startDate));
    if (endDate !== null) params.append('end_date', String(endDate));
    if (agencyId) params.append('agency_id', agencyId);

    const response = await fetch(`${BASE_URL}/leaderboard/submissionSummary?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch submission summary', response.status);
    return response.json();
  },

  /**
   * Fetches the lead breakdown data
   */
  getLeadBreakdown: async (agencyId: string | null, startDate: number | null, endDate: number | null): Promise<LeadBreakdownResponse> => {
    const params = new URLSearchParams();
    if (startDate !== null) params.append('start_date', String(startDate));
    if (endDate !== null) params.append('end_date', String(endDate));
    if (agencyId) params.append('agency_id', agencyId);

    const response = await fetch(`${BASE_URL}/leaderboard/leadBreakdown?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch lead breakdown', response.status);
    return response.json();
  },

  /**
   * Fetches the carrier performance breakdown
   */
  getCarrierBreakdown: async (agencyId: string | null, startDate: number | null, endDate: number | null): Promise<CarrierBreakdown[]> => {
    const params = new URLSearchParams();
    if (startDate !== null) params.append('start_date', String(startDate));
    if (endDate !== null) params.append('end_date', String(endDate));
    if (agencyId) params.append('agency_id', agencyId);

    const response = await fetch(`${BASE_URL}/leaderboard/carrierBreakdown?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch carrier breakdown', response.status);
    return response.json();
  },

  /**
   * Fetches the team production rankings
   */
  getTeamRanking: async (startDate: number | null, endDate: number | null): Promise<TeamRankingEntry[]> => {
    const params = new URLSearchParams();
    if (startDate !== null) params.append('start_date', String(startDate));
    if (endDate !== null) params.append('end_date', String(endDate));

    const response = await fetch(`${BASE_URL}/leaderboard/teamRanking?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch team ranking', response.status);
    return response.json();
  },

  /**
   * Fetches the complete dashboard data for the agent workspace
   */
  getDashboardData: async (agentId: string): Promise<AgentOverviewData> => {
    const response = await fetch(`${BASE_URL}/agent/${agentId}/dashboard`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch dashboard data', response.status);
    return response.json();
  },

  /**
   * Fetches the agency-wide leaderboard ranking
   */
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await fetch(`${BASE_URL}/leaderboard`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch leaderboard', response.status);
    return response.json();
  },

  /**
   * Fetches the all-time top closers leaderboard with date filtering
   */
  getAllTimeLeaderboard: async (agencyId: string | null, startDate: number | null, endDate: number | null): Promise<AllTimeLeaderboardEntry[]> => {
    const params = new URLSearchParams();
    if (agencyId) params.append('agency_id', agencyId);
    if (startDate !== null) params.append('start_date', String(startDate));
    if (endDate !== null) params.append('end_date', String(endDate));
    
    const response = await fetch(`${BASE_URL}/leaderboard/all_time?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch all time leaderboard', response.status);
    return response.json();
  },

  /**
   * Fetches agency metadata for filtering
   */
  getAgencies: async (): Promise<AgencyMeta[]> => {
    const response = await fetch(`${BASE_URL}/meta/agencies`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agencies metadata', response.status);
    return response.json();
  },

  /**
   * Fetches categorized module access permissions (discovery grid)
   */
  getModuleCategories: async (agentId: string) => {
    const response = await fetch(`${BASE_URL}/agent/${agentId}/modules/categories`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch module categories', response.status);
    return response.json();
  }
};
