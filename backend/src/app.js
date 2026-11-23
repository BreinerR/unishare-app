const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middlewares globales con soporte para recursos cruzados (imágenes en Expo/móvil)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Servir archivos estáticos subidos (/uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'UniShare API',
    timestamp: new Date().toISOString()
  });
});

// Importación y montaje de rutas principales
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/usuario.routes'));
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/zones', require('./routes/zone.routes'));
app.use('/api/objects', require('./routes/objeto.routes'));
app.use('/api/objetos', require('./routes/objeto.routes'));
app.use('/api/solicitudes', require('./routes/solicitud.routes'));
app.use('/api/prestamos', require('./routes/prestamo.routes'));
app.use('/api/trueques', require('./routes/trueque.routes'));
app.use('/api/calificaciones', require('./routes/calificacion.routes'));
app.use('/api/notificaciones', require('./routes/notificacion.routes'));
app.use('/api/reportes', require('./routes/reporte.routes'));

// Middleware de manejo de errores global
app.use(require('./middlewares/errorHandler'));

module.exports = app;
