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
  // formData.append('attack_type', attackType.toLowerCase());
  // formData.append('epsilon', epsilon.toString());

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
// ==========================================
// LLM SECURITY SCAN APIs (use apiClient so interceptor adds token)
// ==========================================

export const runLLMSecurityScan = async (modelName) => {
  try {
    console.log('🔒 Starting LLM security scan for:', modelName);

    const formData = new FormData();
    formData.append('model_name', modelName);

    const response = await apiClient.post('/llm-security/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ LLM security scan initiated:', response.data);
    return response;
  } catch (error) {
    console.error('❌ LLM security scan error:', error);
    throw error;
  }
};

export const getLLMScanResults = async (scanId) => {
  try {
    console.log('📊 Fetching LLM scan results for:', scanId);

    const response = await apiClient.get(`/llm-security/scan/${scanId}`);
    console.log('✅ LLM scan results retrieved');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching LLM scan results:', error);
    throw error;
  }
};

export const listLLMScans = async () => {
  try {
    const response = await apiClient.get('/llm-security/scans');
    return response.data;
  } catch (error) {
    console.error('❌ Error listing LLM scans:', error);
    throw error;
  }
};

export const deleteLLMScan = async (scanId) => {
  try {
    const response = await apiClient.delete(`/llm-security/scan/${scanId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting LLM scan:', error);
    throw error;
  }
};

// ==========================================
// UNIFIED SCAN FUNCTION (uses apiClient and interceptor)
// ==========================================

export const runUnifiedScan = async (
  scanMode,
  modelName,
  modelFile,
  additionalFiles = []
) => {
  try {
    // First, upload the model (apiClient/interceptor will attach token)
    await uploadModel(modelFile, modelName);

    // Upload additional files if provided
    if (additionalFiles.length > 0) {
      if (scanMode === 'adversarial') {
        await uploadTestData(additionalFiles);
      }
      // LLM additional prompt files are optional; not uploaded by default
    }

    // Run the appropriate scan
    if (scanMode === 'adversarial') {
      return await runScan(modelName);
    } else if (scanMode === 'llm') {
      return await runLLMSecurityScan(modelName);
    } else {
      throw new Error(`Unknown scan mode: ${scanMode}`);
    }
  } catch (error) {
    console.error('❌ Unified scan error:', error);
    throw error;
  }
};

export const getUnifiedScanResults = async (scanId, scanMode) => {
  try {
    if (scanMode === 'adversarial') {
      return await getScanResults(scanId);
    } else if (scanMode === 'llm') {
      return await getLLMScanResults(scanId);
    } else {
      throw new Error(`Unknown scan mode: ${scanMode}`);
    }
  } catch (error) {
    console.error('❌ Error getting unified scan results:', error);
    throw error;
  }
};



































// import axios from 'axios';

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// // Create axios instance with default config
// const apiClient = axios.create({
//   baseURL: API_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Add token to requests automatically
// apiClient.interceptors.request.use(
//   (config) => {
//     // In a real app, retrieve token from secure storage or context
//     // For now, token is managed by parent component
//     const token = sessionStorage?.getItem?.('auth_token') || '';
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Handle authentication errors
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Token expired or invalid
//       // Clear auth state - parent component should handle this
//       if (typeof window !== 'undefined') {
//         window.dispatchEvent(new CustomEvent('auth-expired'));
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// // ==========================================
// // AUTHENTICATION APIs
// // ==========================================

// export const authenticateWithGoogle = async (googleToken) => {
//   const response = await axios.post(`${API_URL}/auth/google`, {
//     token: googleToken,
//   });
//   return response.data;
// };

// export const getCurrentUser = async (token) => {
//   const response = await axios.get(`${API_URL}/auth/me`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   return response.data;
// };

// export const logout = async (token) => {
//   try {
//     await axios.post(
//       `${API_URL}/auth/logout`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );
//   } catch (error) {
//     console.error('Logout error:', error);
//   }
// };

// // ==========================================
// // MODEL UPLOAD APIs
// // ==========================================

// export const uploadModel = async (file, modelName, token) => {
//   const formData = new FormData();
//   formData.append('file', file);
//   formData.append('model_name', modelName);

//   const response = await axios.post(`${API_URL}/upload-model`, formData, {
//     headers: {
//       'Content-Type': 'multipart/form-data',
//       Authorization: `Bearer ${token}`,
//     },
//   });

//   return response;
// };

// export const uploadTestData = async (files, token) => {
//   const formData = new FormData();
//   files.forEach((file) => {
//     formData.append('files', file);
//   });

//   const response = await axios.post(`${API_URL}/upload-data`, formData, {
//     headers: {
//       'Content-Type': 'multipart/form-data',
//       Authorization: `Bearer ${token}`,
//     },
//   });

//   return response;
// };

// export const getUserModels = async (token) => {
//   const response = await axios.get(`${API_URL}/models`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   return response.data;
// };

// export const getUserImages = async (token) => {
//   const response = await axios.get(`${API_URL}/images`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   return response.data;
// };

// // ==========================================
// // ADVERSARIAL SCAN APIs
// // ==========================================

// export const runScan = async (modelName, token) => {
//   const formData = new FormData();
//   formData.append('model_name', modelName);

//   const response = await axios.post(`${API_URL}/scan`, formData, {
//     headers: {
//       'Content-Type': 'multipart/form-data',
//       Authorization: `Bearer ${token}`,
//     },
//   });

//   return response;
// };

// export const getScanResults = async (scanId, token) => {
//   const response = await axios.get(`${API_URL}/scan/${scanId}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   return response.data;
// };

// export const getUserScans = async (token) => {
//   const response = await axios.get(`${API_URL}/scans`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });
//   return response.data;
// };

// // ==========================================
// // LLM SECURITY SCAN APIs
// // ==========================================

// export const runLLMSecurityScan = async (modelName, token) => {
//   try {
//     console.log('🔒 Starting LLM security scan for:', modelName);
    
//     const response = await axios.post(
//       `${API_URL}/llm-security/scan?model_name=${encodeURIComponent(modelName)}`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     console.log('✅ LLM security scan initiated:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error('❌ LLM security scan error:', error);
//     throw error;
//   }
// };

// export const getLLMScanResults = async (scanId, token) => {
//   try {
//     console.log('📊 Fetching LLM scan results for:', scanId);
    
//     const response = await axios.get(
//       `${API_URL}/llm-security/scan/${scanId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     console.log('✅ LLM scan results retrieved');
//     return response.data;
//   } catch (error) {
//     console.error('❌ Error fetching LLM scan results:', error);
//     throw error;
//   }
// };

// export const listLLMScans = async (token) => {
//   try {
//     const response = await axios.get(`${API_URL}/llm-security/scans`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     return response.data;
//   } catch (error) {
//     console.error('❌ Error listing LLM scans:', error);
//     throw error;
//   }
// };

// export const deleteLLMScan = async (scanId, token) => {
//   try {
//     const response = await axios.delete(
//       `${API_URL}/llm-security/scan/${scanId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     return response.data;
//   } catch (error) {
//     console.error('❌ Error deleting LLM scan:', error);
//     throw error;
//   }
// };

// // ==========================================
// // UNIFIED SCAN FUNCTION
// // ==========================================

// export const runUnifiedScan = async (
//   scanMode,
//   modelName,
//   modelFile,
//   token,
//   additionalFiles = []
// ) => {
//   try {
//     // First, upload the model
//     await uploadModel(modelFile, modelName, token);
    
//     // Upload additional files if provided
//     if (additionalFiles.length > 0) {
//       if (scanMode === 'adversarial') {
//         await uploadTestData(additionalFiles, token);
//       }
//     }
    
//     // Run the appropriate scan
//     if (scanMode === 'adversarial') {
//       return await runScan(modelName, token);
//     } else if (scanMode === 'llm') {
//       return await runLLMSecurityScan(modelName, token);
//     } else {
//       throw new Error(`Unknown scan mode: ${scanMode}`);
//     }
//   } catch (error) {
//     console.error('❌ Unified scan error:', error);
//     throw error;
//   }
// };

// export const getUnifiedScanResults = async (scanId, scanMode, token) => {
//   try {
//     if (scanMode === 'adversarial') {
//       return await getScanResults(scanId, token);
//     } else if (scanMode === 'llm') {
//       return await getLLMScanResults(scanId, token);
//     } else {
//       throw new Error(`Unknown scan mode: ${scanMode}`);
//     }
//   } catch (error) {
//     console.error('❌ Error getting unified scan results:', error);
//     throw error;
//   }
// };

// export default apiClient;