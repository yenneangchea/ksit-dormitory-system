/**
 * API Client for KSIT Dormitory Management System
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Login user
   */
  login: async (credentials: {
    identifier: string;
    password: string;
    role?: string;
  }) => {
    return fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Logout user
   */
  logout: async () => {
    return fetchAPI('/api/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async () => {
    return fetchAPI('/api/auth/me', {
      method: 'GET',
    });
  },
};

/**
 * Health check
 */
export const healthCheck = async () => {
  return fetchAPI('/health', {
    method: 'GET',
  });
};
