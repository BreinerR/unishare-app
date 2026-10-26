const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error('[Error Handler]:', err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
