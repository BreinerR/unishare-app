/**
 * Cliente HTTP unificado para UniShare Mobile
 * Conecta con el backend Express y gestiona encabezados de autenticación JWT.
 */
import { Platform } from 'react-native';
import Storage from './storage';

// Permite configurar la IP de la máquina de desarrollo o localhost
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.101.10:5000/api';

/**
 * Normaliza y resuelve cualquier URL de imagen (relativa de /uploads o absoluta)
 * para que Expo Image y navegadores la rendericen sin fallos.
 */
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/uploads/')) {
    const hostBase = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${hostBase}${trimmed}`;
  }
  if (trimmed.startsWith('obj_')) {
    const hostBase = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${hostBase}/uploads/${trimmed}`;
  }
  return trimmed;
};

/**
 * Subida de archivos multipart/form-data al backend
 */
export const apiUpload = async (endpoint, fileUriOrFormData, fieldName = 'file') => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = await Storage.getItem('@unishare_token');

  let body;
  if (fileUriOrFormData instanceof FormData || (fileUriOrFormData && typeof fileUriOrFormData.append === 'function')) {
    body = fileUriOrFormData;
  } else if (typeof fileUriOrFormData === 'string') {
    const filename = fileUriOrFormData.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append(fieldName, {
      uri: Platform.OS === 'android' ? fileUriOrFormData : fileUriOrFormData.replace('file://', ''),
      name: filename,
      type: mimeType
    });
    body = formData;
  } else {
    throw new Error('Formato de imagen inválido para la subida');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Error ${response.status} al subir archivo`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

/**
 * Función canónica para subir imágenes al endpoint POST /api/objects/upload
 * Implementación basada en XMLHttpRequest (resuelve Unsupported FormDataPart implementation en Android)
 * con respaldo silencioso (Fallback) a la URI local si ocurre cualquier fallo de red o servidor.
 */
export const uploadImage = async (imageUri) => {
  if (!imageUri) return null;

  // 1. Si ya es una URL remota de servidor, retórnala directamente
  if (typeof imageUri === 'string' && (imageUri.startsWith('http') || imageUri.startsWith('/uploads'))) {
    return imageUri;
  }

  // 2. Subida vía XMLHttpRequest (resuelve Unsupported FormDataPart implementation en Android)
  return new Promise(async (resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      // Formatear nombre y MIME type
      const filename = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: mimeType,
      });

      xhr.open('POST', `${API_BASE_URL}/objects/upload`);

      // Token de autorización
      const token = await Storage.getItem('@unishare_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.url || res.cleanPath || imageUri);
          } catch (e) {
            resolve(imageUri); // Fallback: retorna URI local si el JSON falla
          }
        } else {
          // Fallback silencioso: si el servidor responde con error, usa la URI local sin bloquear al usuario
          resolve(imageUri);
        }
      };

      xhr.onerror = () => {
        // Fallback silencioso si falla la conexión de red
        resolve(imageUri);
      };

      xhr.send(formData);
    } catch (err) {
      // Garantizar que la app continúe usando la imagen local
      resolve(imageUri);
    }
  });
};

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
  patch: (endpoint, body, headers) => apiClient(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, headers }),
  delete: (endpoint, headers) => apiClient(endpoint, { method: 'DELETE', headers }),
  upload: (endpoint, fileUri, fieldName) => apiUpload(endpoint, fileUri, fieldName)
};

export default api;
