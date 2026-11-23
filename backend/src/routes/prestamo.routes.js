const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  solicitarPrestamo,
  getMisPrestamos,
  getPrestamoById,
  cambiarEstadoPrestamo,
  registrarDevolucion,
  verificarVencimientos
} = require('../controllers/prestamo.controller');

const router = Router();

// HU-12: Solicitar un préstamo
router.post('/', authMiddleware, solicitarPrestamo);

// Consulta de préstamos y solicitudes del usuario con filtros (tipo=recibidas|solicitadas, estado)
router.get('/', authMiddleware, getMisPrestamos);

// HU-15: Verificar y controlar vencimientos de préstamos
router.get('/verificar-vencimientos', authMiddleware, verificarVencimientos);

// Detalle de un préstamo específico
router.get('/:id', authMiddleware, getPrestamoById);

// HU-13: Aprobar o rechazar una solicitud (solo propietario)
router.patch('/:id/estado', authMiddleware, cambiarEstadoPrestamo);

// HU-14: Registrar devolución (propietario o solicitante)
router.post('/:id/devolver', authMiddleware, registrarDevolucion);

module.exports = router;
