require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Verificar conexión a base de datos y asegurar columnas requeridas (HU-04)
pool.query('SELECT NOW()')
  .then(async () => {
    console.log('✓ Conectado exitosamente a PostgreSQL');
    
    // Verificación y unificación de esquema en PostgreSQL (HU-04)
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS profile_image TEXT;');
      await pool.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS foto_perfil;');
      console.log('✓ Esquema de usuarios unificado: profile_image (TEXT) activa.');
    } catch (migErr) {
      console.warn('! Advertencia en verificación de esquema:', migErr.message);
    }

    app.listen(PORT, () => {
      console.log(`✓ Servidor UniShare escuchando en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('✗ Error crítico al conectar a PostgreSQL:', err.message);
    process.exit(1);
  });
