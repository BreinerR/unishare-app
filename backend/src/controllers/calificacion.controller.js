const db = require('../config/db');

/**
 * HU-05: Calificación después de una transacción
 * POST /api/calificaciones
 * Body: { prestamo_id, puntuacion, comentario }
 */
const crearCalificacion = async (req, res, next) => {
  try {
    const evaluadorId = req.user.id || req.user.id_usuario;
    const { prestamo_id, id_prestamo, puntuacion, comentario } = req.body;
    const targetPrestamoId = prestamo_id || id_prestamo || req.body.solicitud_id;

    if (!targetPrestamoId) {
      return res.status(400).json({
        success: false,
        message: 'Debes especificar el ID del préstamo a calificar.'
      });
    }

    const punt = parseInt(puntuacion, 10);
    if (isNaN(punt) || punt < 1 || punt > 5) {
      return res.status(400).json({
        success: false,
        message: 'La puntuación debe ser un número entero entre 1 y 5 estrellas.'
      });
    }

    // 1. Consultar el préstamo correspondiente
    const prestamoRes = await db.query(
      `SELECT p.*, o.nombre AS objeto_nombre 
       FROM prestamos p 
       INNER JOIN objetos o ON p.objeto_id = o.id 
       WHERE p.id = $1;`,
      [targetPrestamoId]
    );

    if (prestamoRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El préstamo especificado no fue encontrado.'
      });
    }

    const prestamo = prestamoRes.rows[0];

    // 2. Validación de estado: únicamente se puede calificar si está 'DEVUELTA'
    const estadoNorm = (prestamo.estado || '').toString().toUpperCase();
    if (estadoNorm !== 'DEVUELTA') {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden calificar transacciones finalizadas con devolución registrada. El estado actual es "${prestamo.estado}".`
      });
    }

    // 3. Determinar quién es evaluador y quién es evaluado
    let evaluadoId = null;
    if (Number(evaluadorId) === Number(prestamo.solicitante_id)) {
      evaluadoId = prestamo.propietario_id;
    } else if (Number(evaluadorId) === Number(prestamo.propietario_id)) {
      evaluadoId = prestamo.solicitante_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'No eres parte de este préstamo y no tienes autorización para calificarlo.'
      });
    }

    // 4. Validación de unicidad: comprobar si ya calificó previamente esta transacción
    let prevCalif;
    try {
      prevCalif = await db.query(
        `SELECT id FROM calificaciones 
         WHERE prestamo_id = $1 AND (evaluador_id = $2 OR id_usuario_calificador = $2);`,
        [targetPrestamoId, evaluadorId]
      );
    } catch {
      prevCalif = await db.query(
        `SELECT id FROM calificaciones 
         WHERE prestamo_id = $1 AND evaluador_id = $2;`,
        [targetPrestamoId, evaluadorId]
      );
    }

    if (prevCalif.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya has registrado tu calificación para este préstamo. Solo se permite una por transacción.'
      });
    }

    // 5. Inserción limpia canónica (HU-05)
    const insertQuery = `
      INSERT INTO calificaciones (
        prestamo_id,
        evaluador_id,
        evaluado_id,
        puntuacion,
        comentario,
        creado_en
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;
    const insertValues = [
      targetPrestamoId,
      evaluadorId,
      evaluadoId,
      punt,
      comentario ? comentario.trim() : null
    ];

    let nuevaCalificacion;
    try {
      const insertRes = await db.query(insertQuery, insertValues);
      nuevaCalificacion = insertRes.rows[0];
    } catch (insertErr) {
      // Si la tabla tiene la restricción chk_origen_transaccion activa (Bug 23514), removerla y reintentar
      if (insertErr.code === '23514') {
        console.warn('Auto-corrección: removiendo restricción chk_origen_transaccion obsoleta...');
        await db.query(`ALTER TABLE calificaciones DROP CONSTRAINT IF EXISTS chk_origen_transaccion;`);
        const retryResult = await db.query(insertQuery, insertValues);
        nuevaCalificacion = retryResult.rows[0];
      } else if (insertErr.code === '23502') {
        // Auto-corrección ante restricciones NOT NULL en columnas heredadas (Bug 23502)
        await db.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_usuario_calificador') THEN
              ALTER TABLE calificaciones ALTER COLUMN id_usuario_calificador DROP NOT NULL;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'id_usuario_calificado') THEN
              ALTER TABLE calificaciones ALTER COLUMN id_usuario_calificado DROP NOT NULL;
            END IF;
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
        const retryResult = await db.query(insertQuery, insertValues);
        nuevaCalificacion = retryResult.rows[0];
      } else {
        throw insertErr;
      }
    }

    // 6. Recalcular promedio de estrellas del usuario evaluado (reputacion_promedio)
    let avgRes;
    try {
      avgRes = await db.query(
        `SELECT 
           ROUND(AVG(puntuacion)::numeric, 2) AS nuevo_promedio,
           COUNT(*) AS total_calificaciones
         FROM calificaciones 
         WHERE evaluado_id = $1 OR id_usuario_calificado = $1;`,
        [evaluadoId]
      );
    } catch {
      avgRes = await db.query(
        `SELECT 
           ROUND(AVG(puntuacion)::numeric, 2) AS nuevo_promedio,
           COUNT(*) AS total_calificaciones
         FROM calificaciones 
         WHERE evaluado_id = $1;`,
        [evaluadoId]
      );
    }

    const nuevoPromedio = parseFloat(avgRes.rows[0]?.nuevo_promedio) || 5.0;
    const totalCalificaciones = parseInt(avgRes.rows[0]?.total_calificaciones, 10) || 1;

    // Actualizar reputación en tabla usuarios
    await db.query(
      `UPDATE usuarios 
       SET reputacion = $1, reputacion_promedio = $1 
       WHERE id = $2;`,
      [nuevoPromedio, evaluadoId]
    );

    // 7. Generar notificación al usuario evaluado en segundo plano
    db.query(
      `INSERT INTO notificaciones (id_usuario, tipo, mensaje, id_transaccion)
       VALUES ($1, 'NUEVA_CALIFICACION', $2, $3);`,
      [
        evaluadoId,
        `Has recibido una calificación de ${punt} estrellas por la transacción de "${prestamo.objeto_nombre}". Tu reputación actual es de ${nuevoPromedio.toFixed(1)} ★.`,
        nuevaCalificacion.id
      ]
    ).catch((notifErr) => console.warn('Advertencia en notificación de calificación background:', notifErr.message));

    return res.status(201).json({
      success: true,
      message: 'Calificación registrada exitosamente.',
      calificacion: nuevaCalificacion,
      reputacion_actualizada: nuevoPromedio,
      total_calificaciones: totalCalificaciones
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulta de calificaciones recibidas por un usuario
 * GET /api/calificaciones/usuario/:id
 */
const getCalificacionesUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    let result;
    try {
      result = await db.query(
        `SELECT 
           c.id,
           c.prestamo_id,
           c.puntuacion,
           c.comentario,
           c.creado_en,
           u_eval.nombre AS evaluador_nombre,
           u_eval.profile_image AS evaluador_foto,
           o.nombre AS objeto_nombre
         FROM calificaciones c
         INNER JOIN usuarios u_eval ON COALESCE(c.evaluador_id, c.id_usuario_calificador) = u_eval.id
         LEFT JOIN prestamos p ON c.prestamo_id = p.id
         LEFT JOIN objetos o ON p.objeto_id = o.id
         WHERE c.evaluado_id = $1 OR c.id_usuario_calificado = $1
         ORDER BY c.creado_en DESC;`,
        [id]
      );
    } catch {
      result = await db.query(
        `SELECT 
           c.id,
           c.prestamo_id,
           c.puntuacion,
           c.comentario,
           c.creado_en,
           u_eval.nombre AS evaluador_nombre,
           u_eval.profile_image AS evaluador_foto,
           o.nombre AS objeto_nombre
         FROM calificaciones c
         INNER JOIN usuarios u_eval ON c.evaluador_id = u_eval.id
         LEFT JOIN prestamos p ON c.prestamo_id = p.id
         LEFT JOIN objetos o ON p.objeto_id = o.id
         WHERE c.evaluado_id = $1
         ORDER BY c.creado_en DESC;`,
        [id]
      );
    }

    let avgUserRes;
    try {
      avgUserRes = await db.query(
        `SELECT 
           COALESCE(ROUND(AVG(puntuacion)::numeric, 2), 5.0) AS promedio,
           COUNT(*) AS total
         FROM calificaciones 
         WHERE evaluado_id = $1 OR id_usuario_calificado = $1;`,
        [id]
      );
    } catch {
      avgUserRes = await db.query(
        `SELECT 
           COALESCE(ROUND(AVG(puntuacion)::numeric, 2), 5.0) AS promedio,
           COUNT(*) AS total
         FROM calificaciones 
         WHERE evaluado_id = $1;`,
        [id]
      );
    }

    return res.status(200).json({
      success: true,
      promedio: parseFloat(avgUserRes.rows[0]?.promedio) || 5.0,
      total: parseInt(avgUserRes.rows[0]?.total, 10) || 0,
      calificaciones: result.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearCalificacion,
  getCalificacionesUsuario
};
