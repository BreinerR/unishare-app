const { Router } = require('express');
const { getProfile, updateProfile } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// HU-04: Consulta de perfil (Ruta protegida)
router.get('/profile', authMiddleware, getProfile);

// HU-04: Actualización de perfil (Ruta protegida)
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
