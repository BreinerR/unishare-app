const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Ruta Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'UniShare API',
    timestamp: new Date().toISOString()
  });
});

// Importación y montaje de rutas principales (placeholders modulares)
app.use('/api/usuarios', require('./routes/usuario.routes'));
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
