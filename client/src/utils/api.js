import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
// console.log('API Base URL:', API_BASE_URL, 'Environment:', import.meta.env.MODE, 'VITE_API_URL:', import.meta.env.VITE_API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 300 seconds (5 minutes) for file uploads with OCR
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Login failed'
    );
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Registration failed'
    );
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Failed to get user info'
    );
  }
};

// Upload file and process
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(progress);
        }
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload error details:', error.response?.data);
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.details ||
      'Failed to upload file';
    throw new Error(errorMessage);
  }
};

// Fetch all reports
export const fetchReports = async () => {
  try {
    const response = await api.get('/reports');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Failed to fetch reports'
    );
  }
};

// Fetch specific report
export const fetchReport = async (reportId) => {
  try {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Failed to fetch report'
    );
  }
};

// Fetch trend data for a report
export const fetchTrendData = async (reportId) => {
  try {
    const response = await api.get(`/reports/${reportId}/trends`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Failed to fetch trend data'
    );
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('API health check failed');
  }
};

// Forgot password - request reset link
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Failed to send reset link'
    );
  }
};

// Reset password using token
export const resetPassword = async (token, password) => {
  try {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 'Failed to reset password'
    );
  }
};