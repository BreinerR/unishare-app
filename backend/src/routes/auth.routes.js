const { Router } = require('express');
const { register, login, googleLogin } = require('../controllers/auth.controller');

const router = Router();

// HU-01: Registro de nuevo usuario en la comunidad
router.post('/register', register);

// HU-02: Inicio de sesión con credenciales directas
router.post('/login', login);

// Autenticación rápida con Google (OAuth2 / ID Token)
router.post('/google', googleLogin);

module.exports = router;
