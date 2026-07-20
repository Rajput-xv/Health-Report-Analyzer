// Fetch global stats (total users and reports)
export const fetchGlobalStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to fetch stats' };
  }
};
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to get current user
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Login function
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Login failed' };
  }
};

// Register function
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Registration failed' };
  }
};

// Google auth - send the Firebase ID token to the backend
export const googleAuth = async (idToken) => {
  try {
    const response = await api.post('/auth/google-auth', { idToken });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Google authentication failed' };
  }
};

// File upload function
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'File upload failed' };
  }
};

// Fetch trend data function
export const fetchTrendData = async (reportId) => {
  try {
    const response = await api.get(`/reports/${reportId}/trends`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to fetch trend data' };
  }
};

// Forgot password function
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to send reset email' };
  }
};

// Reset password function.
// Let HTTP/network errors propagate so the caller can tell an invalid/expired token
// (non-2xx) from a real success — do NOT swallow the error into a resolved value.
export const resetPassword = async (token, newPassword) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password: newPassword });
  return response.data;
};

// Get subscription status
export const getSubscription = async () => {
  try {
    const response = await api.get('/payments/subscription');
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to get subscription' };
  }
};

// Create checkout session
export const createCheckout = async (planId) => {
  try {
    const response = await api.post('/payments/create-checkout', { planId });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to create checkout' };
  }
};

// Cancel subscription
export const cancelSubscription = async () => {
  try {
    const response = await api.post('/payments/cancel');
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to cancel subscription' };
  }
};

// Get customer portal URL
export const getCustomerPortal = async () => {
  try {
    const response = await api.get('/payments/customer-portal');
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to get customer portal' };
  }
};

// Send a contact message through our backend
export const sendContactMessage = async (payload) => {
  try {
    const response = await api.post('/contact', payload);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to send message' };
  }
};

// Verify payment status after Gumroad redirect
export const verifyPayment = async (expectedPlan = '') => {
  try {
    const response = await api.get(`/payments/verify-payment?expectedPlan=${expectedPlan}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to verify payment' };
  }
};

// Regenerate AI insights for a report
export const regenerateInsights = async (reportId) => {
  try {
    const response = await api.post(`/analysis/${reportId}/regenerate`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to regenerate insights' };
  }
};

// Get insights for a report
export const getInsights = async (reportId) => {
  try {
    const response = await api.get(`/analysis/${reportId}/insights`);
    return response.data;
  } catch (error) {
    return error.response?.data || { hasInsights: false, error: 'Failed to get insights' };
  }
};

// Cross-report AI trend analysis (needs 2+ reports)
export const getTrendAnalysis = async (reportIds = []) => {
  try {
    const response = await api.post('/analysis/trends', { reportIds });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to generate trend analysis' };
  }
};

// Overall health summary across the user's reports
export const getHealthSummary = async () => {
  try {
    const response = await api.get('/analysis/summary');
    return response.data;
  } catch (error) {
    return error.response?.data || { hasReports: false, error: 'Failed to get summary' };
  }
};

// Compare two reports
export const compareReports = async (report1, report2) => {
  try {
    const response = await api.get(`/analysis/compare?report1=${report1}&report2=${report2}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { error: 'Failed to compare reports' };
  }
};

export default api;