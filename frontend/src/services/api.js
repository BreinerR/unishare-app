/**
 * Cliente HTTP unificado para UniShare Mobile
 * Conecta con el backend Express y gestiona encabezados de autenticación JWT.
 */
import Storage from './storage';

// Permite configurar la IP de la máquina de desarrollo o localhost
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.101.10:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Recuperar token almacenado
  const token = await Storage.getItem('@unishare_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Error en la comunicación con el servidor');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      console.warn(`[Network/Server Connection Error] ${url}:`, error.message);
    }
    throw error;
  }
};

export const api = {
  get: (endpoint, headers) => apiClient(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers) => apiClient(endpoint, { method: 'POST', body: JSON.stringify(body), headers }),
  put: (endpoint, body, headers) => apiClient(endpoint, { method: 'PUT', body: JSON.stringify(body), headers }),
  delete: (endpoint, headers) => apiClient(endpoint, { method: 'DELETE', headers })
};

export default api;
