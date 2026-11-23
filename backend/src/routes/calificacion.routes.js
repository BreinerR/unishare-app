const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  crearCalificacion,
  getCalificacionesUsuario
} = require('../controllers/calificacion.controller');

const router = Router();

// HU-05: Calificación después de una transacción
router.post('/', authMiddleware, crearCalificacion);

// Consultar calificaciones recibidas por un usuario
router.get('/usuario/:id', authMiddleware, getCalificacionesUsuario);

module.exports = router;
