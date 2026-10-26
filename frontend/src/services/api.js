/**
 * Cliente base para comunicación HTTP con el Backend de UniShare
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición al servidor');
    }

    return data;
  } catch (error) {
    console.error(`[API Client Error] ${options.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
};

export default apiClient;
