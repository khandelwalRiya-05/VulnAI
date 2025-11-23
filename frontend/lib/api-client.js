import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authenticateWithGoogle = async (googleToken) => {
  const response = await axios.post(`${API_URL}/auth/google`, {
    token: googleToken,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
};

// Model APIs
export const uploadModel = async (file, modelName) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model_name', modelName);

  const response = await apiClient.post('/upload-model', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response;
};

export const uploadTestData = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post('/upload-data', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response;
};

export const getUserModels = async () => {
  const response = await apiClient.get('/models');
  return response.data;
};

export const getUserImages = async () => {
  const response = await apiClient.get('/images');
  return response.data;
};

// Scan APIs
export const runScan = async (modelName, attackType, epsilon) => {
  const formData = new FormData();
  formData.append('model_name', modelName);
  formData.append('attack_type', attackType.toLowerCase());
  formData.append('epsilon', epsilon.toString());

  const response = await apiClient.post('/scan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response;
};

export const getScanResults = async (scanId) => {
  const response = await apiClient.get(`/scan/${scanId}`);
  return response.data;
};

export const getUserScans = async () => {
  const response = await apiClient.get('/scans');
  return response.data;
};

export default apiClient;