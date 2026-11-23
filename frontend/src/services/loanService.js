import api from './api';

/**
 * Servicio para gestión de Préstamos, Devoluciones, Vencimientos y Calificaciones
 * Cubre HU-12, HU-13, HU-14, HU-15 y HU-05
 */
export const LoanService = {
  /**
   * HU-12: Solicitar un préstamo para un objeto comunitario
   */
  async solicitarPrestamo({ objeto_id, fecha_inicio, fecha_fin, mensaje }) {
    return await api.post('/prestamos', {
      objeto_id,
      fecha_inicio,
      fecha_fin,
      mensaje
    });
  },

  /**
   * HU-13 & HU-14: Consultar lista de préstamos y solicitudes del usuario
   * @param {Object} params - { tipo: 'recibidas' | 'solicitadas' | 'all', estado }
   */
  async getMisPrestamos(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.tipo) searchParams.append('tipo', params.tipo);
    if (params.estado && params.estado !== 'todos' && params.estado !== 'all') {
      searchParams.append('estado', params.estado.toString().toUpperCase());
    }
    const query = searchParams.toString();
    const endpoint = query ? `/prestamos?${query}` : '/prestamos';
    return await api.get(endpoint);
  },

  /**
   * Consulta detalle de un préstamo específico
   */
  async getPrestamoById(id) {
    return await api.get(`/prestamos/${id}`);
  },

  /**
   * HU-13: Aprobar o rechazar una solicitud (solo propietario)
   * @param {number} id - ID del préstamo
   * @param {string} estado - 'ACTIVA' | 'RECHAZADA'
   */
  async cambiarEstado(id, estado) {
    const estadoUpper = (estado || '').toString().toUpperCase();
    return await api.patch(`/prestamos/${id}/estado`, { estado: estadoUpper });
  },

  /**
   * HU-14: Registrar devolución del objeto
   */
  async registrarDevolucion(id) {
    return await api.post(`/prestamos/${id}/devolver`, {});
  },

  /**
   * HU-15: Verificar préstamos vencidos
   */
  async verificarVencimientos() {
    return await api.get('/prestamos/verificar-vencimientos');
  },

  /**
   * HU-05: Calificar la transacción tras registrar la devolución
   * @param {Object} data - { prestamo_id, puntuacion (1 a 5), comentario }
   */
  async crearCalificacion({ prestamo_id, puntuacion, comentario }) {
    return await api.post('/calificaciones', {
      prestamo_id,
      puntuacion,
      comentario
    });
  },

  /**
   * Consultar calificaciones recibidas por un usuario
   */
  async getCalificacionesUsuario(userId) {
    return await api.get(`/calificaciones/usuario/${userId}`);
  }
};

export default LoanService;
