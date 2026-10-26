require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Verificar conexión a base de datos antes de escuchar peticiones
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✓ Conectado exitosamente a PostgreSQL');
    app.listen(PORT, () => {
      console.log(`✓ Servidor UniShare escuchando en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('✗ Error crítico al conectar a PostgreSQL:', err.message);
    process.exit(1);
  });
