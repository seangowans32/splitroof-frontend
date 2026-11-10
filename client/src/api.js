// API base URL - points to Express server
// Use environment variable in production, relative URL for same-origin requests
const envBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE = envBase
  ? `${String(envBase).replace(/\/$/, '')}${String(envBase).includes('/api') ? '' : '/api'}`
  : '/api';

const getAuthHeaders = () => {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/**
 * Generic API request function with credentials support
 */
async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include', // Important: sends cookies with request
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMessage = data.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status; // Include status code for handling
      throw error;
    }
    
    return data;
  } catch (error) {
    // If it's already our custom error with status, re-throw it
    if (error.status) {
      throw error;
    }
    // Otherwise, wrap the error
    throw error;
  }
}

// Authentication API methods
export const AuthAPI = {
  // Register new user
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: userData
  }),
  
  // Login user - receives JWT token in httpOnly cookie
  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },
  
  // Logout user - clears cookie
  logout: async () => {
    try {
      return await apiRequest('/auth/logout', {
        method: 'GET'
      });
    } finally {
      localStorage.removeItem('token');
    }
  },
  
  // Get current user data (requires authentication)
  getUser: () => apiRequest('/auth/user', {
    method: 'GET'
  }),
};

// User Data API methods
export const UserAPI = {
  updateUsername: (username) => apiRequest('/auth/username', {
    method: 'PUT',
    body: { username }
  }),

  createHousehold: (name) => apiRequest('/auth/household', {
    method: 'POST',
    body: { name }
  }),

  joinHousehold: (joinCode) => apiRequest('/auth/household/join', {
    method: 'POST',
    body: { joinCode }
  }),

  selectHousehold: (householdId) => apiRequest('/auth/household/active', {
    method: 'PUT',
    body: { householdId }
  }),

  createCategory: (category) => apiRequest('/auth/household/categories', {
    method: 'POST',
    body: category
  }),

  updateCategory: (id, category) => apiRequest(`/auth/household/categories/${id}`, {
    method: 'PUT',
    body: category
  }),

  removeCategory: (id) => apiRequest(`/auth/household/categories/${id}`, {
    method: 'DELETE'
  }),
};

export const ExpenseAPI = {
  list: () => apiRequest('/expenses', { method: 'GET' }),
  history: () => apiRequest('/expenses/history', { method: 'GET' }),
  create: (expense) => apiRequest('/expenses', { method: 'POST', body: expense }),
  update: (id, expense) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: expense }),
  remove: (id) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
};