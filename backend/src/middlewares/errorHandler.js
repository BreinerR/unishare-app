/**
 * Middleware centralizado de manejo de errores
 * Proporciona respuestas amigables y estandarizadas al cliente
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error Tracker]:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Ha ocurrido un error inesperado en el servidor.';

  // Error de clave única en PostgreSQL (ej. correo duplicado)
  if (err.code === '23505') {
    statusCode = 409;
    if (err.detail && err.detail.includes('correo')) {
      message = 'El correo electrónico ya se encuentra registrado.';
    } else {
      message = 'Ya existe un registro con los datos suministrados.';
    }
  }

  // Error de validación de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Formato JSON mal formado en la petición.';
  }

  // Error de JWT inválido o malformado
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token de autenticación inválido.';
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      dbCode: err.code 
    })
  });
};

module.exports = errorHandler;
