const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

/**
 * Middleware para validar el JWT y autenticar las solicitudes privadas
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. Se requiere un token de sesión válido.'
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación inválido.'
      });
    }

    // Verificar en la base de datos que el usuario aún exista y esté activo
    const userResult = await db.query(
      `SELECT id, nombre, correo, rol, estado_cuenta, ubicacion_general 
       FROM usuarios 
       WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o sesión revocada.'
      });
    }

    const user = userResult.rows[0];

    if (user.estado_cuenta !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta se encuentra inactiva o suspendida. Contacta a soporte universitario.'
      });
    }

    // Adjuntar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
