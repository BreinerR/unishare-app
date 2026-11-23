const { pool } = require('../config/db');

async function migratePrestamosAndCalificaciones(dbPool = pool) {
  try {
    console.log('--- Verificando y actualizando tablas de Préstamos y Calificaciones (HU-12 a HU-15, HU-05) ---');

    // 1. Columnas de reputación en usuarios
    await dbPool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reputacion NUMERIC(3,2) DEFAULT 5.00;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reputacion_promedio NUMERIC(3,2) DEFAULT 5.00;
    `);

    // 2. Crear o actualizar tabla prestamos y asegurar compatibilidad de ENUM estado_prestamo
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          -- Si el tipo ENUM estado_prestamo existe, asegurar los valores en mayúsculas
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_prestamo') THEN
            BEGIN
              ALTER TYPE estado_prestamo ADD VALUE IF NOT EXISTS 'PENDIENTE';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
            BEGIN
              ALTER TYPE estado_prestamo ADD VALUE IF NOT EXISTS 'ACTIVA';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
            BEGIN
              ALTER TYPE estado_prestamo ADD VALUE IF NOT EXISTS 'RECHAZADA';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
            BEGIN
              ALTER TYPE estado_prestamo ADD VALUE IF NOT EXISTS 'DEVUELTA';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
            BEGIN
              ALTER TYPE estado_prestamo ADD VALUE IF NOT EXISTS 'VENCIDO';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
          END IF;
        END $$;
      `);
    } catch (enumErr) {
      console.warn('Nota sobre tipo ENUM estado_prestamo:', enumErr.message);
    }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS prestamos (
        id SERIAL PRIMARY KEY,
        objeto_id INT REFERENCES objetos(id) ON DELETE CASCADE,
        solicitante_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        propietario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
        fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
        estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
        fecha_devolucion_real TIMESTAMPTZ,
        mensaje TEXT,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Asegurar columnas y normalizar estados si prestamos ya existía
    await dbPool.query(`
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS objeto_id INT REFERENCES objetos(id) ON DELETE CASCADE;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS solicitante_id INT REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS propietario_id INT REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS fecha_inicio DATE DEFAULT CURRENT_DATE;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS fecha_fin DATE DEFAULT CURRENT_DATE;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE DEFAULT CURRENT_DATE;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'PENDIENTE';
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS fecha_devolucion_real TIMESTAMPTZ;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS mensaje TEXT;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    `);

    // Eliminar restricciones restrictivas obsoletas sobre 'estado' si existen
    try {
      await dbPool.query(`
        ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS chk_prestamo_estado;
      `);
    } catch (dropErr) {
      // Ignorar si no existe
    }

    // Asegurar que id_solicitud sea opcional (DROP NOT NULL) en caso de esquemas previos (Bug 23502)
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'prestamos' AND column_name = 'id_solicitud'
          ) THEN
            ALTER TABLE prestamos ALTER COLUMN id_solicitud DROP NOT NULL;
            ALTER TABLE prestamos ALTER COLUMN id_solicitud SET DEFAULT NULL;
          END IF;
        END $$;
      `);
      console.log('✓ Restricción NOT NULL eliminada de id_solicitud en prestamos.');
    } catch (solErr) {
      console.warn('Nota sobre id_solicitud en prestamos:', solErr.message);
    }

    // Asegurar que fecha_vencimiento sea opcional o se iguale a fecha_fin (Bug 23502)
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'prestamos' AND column_name = 'fecha_vencimiento'
          ) THEN
            ALTER TABLE prestamos ALTER COLUMN fecha_vencimiento DROP NOT NULL;
            ALTER TABLE prestamos ALTER COLUMN fecha_vencimiento SET DEFAULT NULL;
          END IF;
        END $$;
      `);
      console.log('✓ Restricción NOT NULL eliminada de fecha_vencimiento en prestamos.');
    } catch (err) {
      console.warn('Nota sobre fecha_vencimiento:', err.message);
    }

    // Sincronizar fecha_fin y fecha_vencimiento para consistencia de registros
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          UPDATE prestamos SET fecha_vencimiento = fecha_fin WHERE fecha_vencimiento IS NULL AND fecha_fin IS NOT NULL;
          UPDATE prestamos SET fecha_fin = fecha_vencimiento WHERE fecha_fin IS NULL AND fecha_vencimiento IS NOT NULL;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END $$;
      `);
    } catch (syncErr) {
      // Ignorar si alguna columna no existe en esquemas antiguos
    }

    // Normalizar registros existentes a mayúsculas sostenidas
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          UPDATE prestamos SET estado = 'PENDIENTE' WHERE UPPER(estado::text) IN ('PENDIENTE');
          UPDATE prestamos SET estado = 'ACTIVA' WHERE UPPER(estado::text) IN ('ACTIVA', 'ACTIVO');
          UPDATE prestamos SET estado = 'RECHAZADA' WHERE UPPER(estado::text) IN ('RECHAZADA');
          UPDATE prestamos SET estado = 'DEVUELTA' WHERE UPPER(estado::text) IN ('DEVUELTA', 'DEVUELTO');
          UPDATE prestamos SET estado = 'VENCIDO' WHERE UPPER(estado::text) IN ('VENCIDO', 'ATRASADO');
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END $$;
      `);
    } catch (normErr) {
      console.warn('Nota normalizando estados de prestamos:', normErr.message);
    }

    // 3. Crear o actualizar tabla calificaciones
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS calificaciones (
        id SERIAL PRIMARY KEY,
        prestamo_id INT REFERENCES prestamos(id) ON DELETE CASCADE,
        evaluador_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        evaluado_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        puntuacion INTEGER NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
        comentario TEXT,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query(`
      ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS prestamo_id INT REFERENCES prestamos(id) ON DELETE CASCADE;
      ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS evaluador_id INT REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS evaluado_id INT REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5);
      ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS comentario TEXT;
      ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    `);

    // Hacer opcionales nombres heredados si existen en calificaciones (Bug 23502)
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_usuario_calificador') THEN
            ALTER TABLE calificaciones ALTER COLUMN id_usuario_calificador DROP NOT NULL;
            ALTER TABLE calificaciones ALTER COLUMN id_usuario_calificador SET DEFAULT NULL;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_usuario_calificado') THEN
            ALTER TABLE calificaciones ALTER COLUMN id_usuario_calificado DROP NOT NULL;
            ALTER TABLE calificaciones ALTER COLUMN id_usuario_calificado SET DEFAULT NULL;
          END IF;
        END $$;
      `);
      console.log('✓ Restricciones NOT NULL eliminadas de columnas heredadas en calificaciones.');
    } catch (err) {
      console.warn('Nota sobre columnas heredadas en calificaciones:', err.message);
    }

    // Sincronizar datos existentes entre columnas heredadas y canónicas
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_usuario_calificador') THEN
            UPDATE calificaciones SET evaluador_id = id_usuario_calificador WHERE evaluador_id IS NULL AND id_usuario_calificador IS NOT NULL;
            UPDATE calificaciones SET id_usuario_calificador = evaluador_id WHERE id_usuario_calificador IS NULL AND evaluador_id IS NOT NULL;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_usuario_calificado') THEN
            UPDATE calificaciones SET evaluado_id = id_usuario_calificado WHERE evaluado_id IS NULL AND id_usuario_calificado IS NOT NULL;
            UPDATE calificaciones SET id_usuario_calificado = evaluado_id WHERE id_usuario_calificado IS NULL AND evaluado_id IS NOT NULL;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END $$;
      `);
    } catch (syncCalErr) {
      // Ignorar si no existen
    }

    // Remover la restricción CHECK chk_origen_transaccion si existe (Bug 23514)
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'chk_origen_transaccion' AND table_name = 'calificaciones'
          ) THEN
            ALTER TABLE calificaciones DROP CONSTRAINT chk_origen_transaccion;
          END IF;
          -- También hacer opcionales columnas heredadas de origen si existen
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_prestamo') THEN
            ALTER TABLE calificaciones ALTER COLUMN id_prestamo DROP NOT NULL;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_solicitud') THEN
            ALTER TABLE calificaciones ALTER COLUMN id_solicitud DROP NOT NULL;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_trueque') THEN
            ALTER TABLE calificaciones ALTER COLUMN id_trueque DROP NOT NULL;
          END IF;
        END $$;
      `);
      console.log('✓ Restricción chk_origen_transaccion removida de calificaciones.');
    } catch (err) {
      console.warn('Nota sobre chk_origen_transaccion:', err.message);
    }

    // Añadir restricción UNIQUE(prestamo_id, evaluador_id) si no existe
    try {
      await dbPool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_calificaciones_prestamo_evaluador'
          ) THEN
            ALTER TABLE calificaciones ADD CONSTRAINT uq_calificaciones_prestamo_evaluador UNIQUE (prestamo_id, evaluador_id);
          END IF;
        END $$;
      `);
    } catch (conErr) {
      console.warn('Nota sobre restricción UNIQUE en calificaciones:', conErr.message);
    }

    // 4. Crear tabla de notificaciones si no existe
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id SERIAL PRIMARY KEY,
        id_usuario INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        mensaje TEXT NOT NULL,
        id_transaccion INT,
        estado_lectura BOOLEAN NOT NULL DEFAULT FALSE,
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✓ Tablas prestamos, calificaciones y notificaciones aseguradas correctamente.');
    return true;
  } catch (err) {
    console.error('✗ Error en migración de préstamos y calificaciones:', err.message);
    return false;
  }
}

if (require.main === module) {
  migratePrestamosAndCalificaciones()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migratePrestamosAndCalificaciones };
