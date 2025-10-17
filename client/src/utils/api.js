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

// Google Auth function
export const googleAuth = async (user) => {
  try {
    const response = await api.post('/auth/google', user);
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

// Reset password function
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, error: 'Failed to reset password' };
  }
};

export default api;