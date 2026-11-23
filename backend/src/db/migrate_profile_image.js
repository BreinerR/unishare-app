const { pool } = require('../config/db');

async function migrate() {
  try {
    console.log('--- Verificando conexión con PostgreSQL ---');
    await pool.query('SELECT NOW()');
    console.log('✓ Conexión exitosa a PostgreSQL.');

    // 1. Asegurar que profile_image exista como TEXT
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS profile_image TEXT;');
    console.log('✓ Columna profile_image verificada/creada como TEXT.');

    // 2. Comprobar si la columna foto_perfil existe
    const colCheck = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'foto_perfil';"
    );

    if (colCheck.rows.length > 0) {
      console.log('Fusionando datos de foto_perfil hacia profile_image...');
      const updateResult = await pool.query(
        "UPDATE usuarios SET profile_image = foto_perfil WHERE (profile_image IS NULL OR profile_image = '') AND foto_perfil IS NOT NULL;"
      );
      console.log(`✓ Datos fusionados. Registros actualizados: ${updateResult.rowCount}`);

      console.log('Eliminando columna obsoleta foto_perfil...');
      await pool.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS foto_perfil;');
      console.log('✓ Columna foto_perfil eliminada exitosamente.');
    } else {
      console.log('ℹ La columna foto_perfil ya no existe en la tabla usuarios.');
    }

    // 3. Mostrar estructura final de la tabla usuarios
    const columnsResult = await pool.query(
      "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'usuarios' ORDER BY ordinal_position;"
    );
    console.log('\n--- Estructura final de columnas en tabla usuarios: ---');
    console.table(columnsResult.rows);

    await pool.end();
    console.log('\n✓ Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error durante la migración:', err);
    process.exit(1);
  }
}

migrate();
