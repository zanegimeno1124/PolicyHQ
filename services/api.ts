export const BASE_URL = "https://api1.simplyworkcrm.com/api:xyNb4DPW";

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new ApiError('Login failed', response.status);
    }

    const data = await response.json();
    return data.authToken;
  },

  ghlLogin: async (userId: string, locationId: string) => {
    const response = await fetch(`${BASE_URL}/auth/ghl/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, location_id: locationId }),
    });

    if (!response.ok) {
      throw new ApiError('GHL Auto-login failed', response.status);
    }

    const data = await response.json();
    return data.authToken;
  },

  getMe: async (authToken: string) => {
    const response = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ApiError('Failed to fetch user data', response.status);
    }

    return response.json();
  }
};