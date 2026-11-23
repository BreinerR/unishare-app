require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');
const { migratePrestamosAndCalificaciones } = require('./db/migrate_prestamos_calificaciones');

const PORT = process.env.PORT || 5000;

// Verificar conexión a base de datos y asegurar columnas requeridas (HU-04, HU-12 a HU-15, HU-05)
pool.query('SELECT NOW()')
  .then(async () => {
    console.log('✓ Conectado exitosamente a PostgreSQL');
    
    // Verificación y unificación de esquema en PostgreSQL
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS profile_image TEXT;');
      await pool.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS foto_perfil;');
      console.log('✓ Esquema de usuarios unificado: profile_image (TEXT) activa.');

      // Asegurar tablas y columnas para el flujo de préstamos y calificaciones
      await migratePrestamosAndCalificaciones(pool);
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
