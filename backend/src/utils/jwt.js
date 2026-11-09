const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'unishare_secure_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Genera un token JWT para un usuario
 * @param {Object} payload - Datos esenciales del usuario (id, correo, rol)
 * @returns {string} Token firmado
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verifica un token JWT
 * @param {string} token 
 * @returns {Object} Payload decodificado
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
