/**
 * Servicio para la gestión de objetos y catálogo colaborativo (HU-06 a HU-11)
 * Conecta con los endpoints /api/objects de Express y PostgreSQL.
 */
import api, { uploadImage as apiUploadImage } from './api';

export const uploadImage = apiUploadImage;

export const ObjectService = {
  /**
   * HU-09 & HU-10: Obtiene el catálogo de objetos disponibles con filtros opcionales
   */
  async getObjects(filters = {}) {
    const params = new URLSearchParams();

    if (filters.q) params.append('q', filters.q.trim());
    if (filters.search) params.append('search', filters.search.trim());
    if (filters.categoria && filters.categoria !== 'todos' && filters.categoria !== 'all') {
      params.append('categoria', filters.categoria);
    }
    if (filters.modalidad && filters.modalidad !== 'todos' && filters.modalidad !== 'all') {
      params.append('modalidad', filters.modalidad);
    }
    if (filters.zona) params.append('zona', filters.zona.trim());
    if (filters.my_objects) params.append('my_objects', 'true');

    const queryString = params.toString();
    const endpoint = queryString ? `/objects?${queryString}` : '/objects';
    return await api.get(endpoint);
  },

  /**
   * HU-09: Consulta el detalle completo de un objeto por su ID
   */
  async getObjectById(id) {
    return await api.get(`/objects/${id}`);
  },

  /**
   * Subir fotografía del objeto a /api/objects/upload mediante multipart/form-data
   * Retorna la URL directa del servidor (ej. http://192.168.101.10:5000/uploads/obj_xxx.jpg)
   */
  async uploadImage(fileUriOrFormData) {
    return await apiUploadImage(fileUriOrFormData);
  },

  /**
   * HU-06: Publicar un nuevo objeto en el catálogo comunitario
   */
  async createObject(objectData) {
    return await api.post('/objects', objectData);
  },

  /**
   * HU-07: Editar la información de un objeto (solo propietario)
   */
  async updateObject(id, objectData) {
    return await api.put(`/objects/${id}`, objectData);
  },

  /**
   * HU-08: Retirar un objeto del catálogo público (Soft-Delete)
   */
  async withdrawObject(id) {
    return await api.delete(`/objects/${id}`);
  }
};

export default ObjectService;
