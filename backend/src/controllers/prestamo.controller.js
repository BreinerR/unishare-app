const db = require('../config/db');

/**
 * Normaliza fechas en formato YYYY-MM-DD
 */
const formatDateOnly = (dateInput) => {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

/**
 * HU-15: Tarea interna para verificar y actualizar automáticamente préstamos vencidos
 */
const verificarVencimientosInterno = async () => {
  try {
    const res = await db.query(`
      UPDATE prestamos 
      SET estado = 'VENCIDO', actualizado_en = NOW()
      WHERE UPPER(estado::text) = 'ACTIVA' AND fecha_fin < CURRENT_DATE
      RETURNING id, objeto_id, solicitante_id, propietario_id, fecha_fin;
    `);

    // Notificar a usuarios de préstamos que acaban de vencer de forma asíncrona
    if (res.rows.length > 0) {
      for (const p of res.rows) {
        db.query(`
          INSERT INTO notificaciones (id_usuario, tipo, mensaje, id_transaccion)
          VALUES 
            ($1, 'PRESTAMO_VENCIDO', 'Tu préstamo ha superado la fecha de entrega acordada. Por favor gestiona la devolución.', $3),
            ($2, 'PRESTAMO_VENCIDO', 'Un préstamo de tu objeto ha vencido y requiere seguimiento de devolución.', $3);
        `, [p.solicitante_id, p.propietario_id, p.id]).catch(() => {});
      }
    }
    return res.rows;
  } catch (err) {
    console.warn('Advertencia en verificarVencimientosInterno:', err.message);
    return [];
  }
};

/**
 * HU-12: Solicitar un préstamo
 * POST /api/prestamos
 */
const solicitarPrestamo = async (req, res, next) => {
  try {
    const solicitanteId = req.user.id;
    const { objeto_id, id_objeto, fecha_inicio, fecha_fin, mensaje } = req.body;
    const targetObjectId = objeto_id || id_objeto;

    // 1. Validaciones de presencia
    if (!targetObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Debes especificar el ID del objeto a solicitar.'
      });
    }

    const inicioStr = formatDateOnly(fecha_inicio);
    const finStr = formatDateOnly(fecha_fin);

    if (!inicioStr || !finStr) {
      return res.status(400).json({
        success: false,
        message: 'Las fechas de inicio y fin son obligatorias en formato válido (AAAA-MM-DD).'
      });
    }

    // 2. Validaciones de rango de fechas
    const hoyStr = new Date().toISOString().split('T')[0];

    if (inicioStr < hoyStr) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio no puede ser anterior al día de hoy.'
      });
    }

    if (finStr < inicioStr) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio.'
      });
    }

    // 3. Consultar y verificar el objeto solicitado
    const objResult = await db.query(
      `SELECT id, id_usuario, nombre, estado, tipo_disponibilidad, imagenes, ubicacion 
       FROM objetos 
       WHERE id = $1`,
      [targetObjectId]
    );

    if (objResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El objeto solicitado no fue encontrado o ha sido retirado.'
      });
    }

    const objeto = objResult.rows[0];

    // Impedir que el usuario solicite su propio objeto
    if (Number(objeto.id_usuario) === Number(solicitanteId)) {
      return res.status(400).json({
        success: false,
        message: 'No puedes solicitar en préstamo un objeto que te pertenece.'
      });
    }

    // Comprobar si el usuario ya tiene una solicitud pendiente o activa para este objeto
    const existingReq = await db.query(
      `SELECT id, estado FROM prestamos 
       WHERE objeto_id = $1 AND solicitante_id = $2 AND UPPER(estado::text) IN ('PENDIENTE', 'ACTIVA')`,
      [targetObjectId, solicitanteId]
    );

    if (existingReq.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Ya tienes una solicitud en curso para este artículo.`
      });
    }

    const propietarioId = objeto.id_usuario;

    // 4. Registrar la solicitud en la tabla prestamos (HU-12)
    const insertQuery = `
      INSERT INTO prestamos (
        objeto_id,
        solicitante_id,
        propietario_id,
        fecha_inicio,
        fecha_fin,
        fecha_vencimiento,
        estado,
        mensaje
      )
      VALUES ($1, $2, $3, $4, $5, $5::timestamp, 'PENDIENTE', $6)
      RETURNING *;
    `;
    const insertValues = [
      targetObjectId,
      solicitanteId,
      propietarioId,
      inicioStr,
      finStr,
      mensaje ? mensaje.trim() : null
    ];

    let nuevoPrestamo;
    try {
      const insertResult = await db.query(insertQuery, insertValues);
      nuevoPrestamo = insertResult.rows[0];
    } catch (insertErr) {
      // Manejo si fecha_vencimiento no existe (42703) o hay conflicto de tipos (42P08): fallback a inserción limpia
      if (
        (insertErr.code === '42703' && insertErr.message && insertErr.message.includes('fecha_vencimiento')) ||
        insertErr.code === '42P08'
      ) {
        const fallbackQuery = `
          INSERT INTO prestamos (
            objeto_id,
            solicitante_id,
            propietario_id,
            fecha_inicio,
            fecha_fin,
            estado,
            mensaje
          )
          VALUES ($1, $2, $3, $4, $5, 'PENDIENTE', $6)
          RETURNING *;
        `;
        const retryResult = await db.query(fallbackQuery, insertValues);
        nuevoPrestamo = retryResult.rows[0];
      } else if (insertErr.code === '23502') {
        // Auto-corrección activa ante restricciones NOT NULL en fecha_vencimiento o id_solicitud (Bug 23502)
        if (insertErr.message && insertErr.message.includes('fecha_vencimiento')) {
          console.warn('Auto-corrección activa: eliminando restricción NOT NULL en fecha_vencimiento...');
          await db.query(`ALTER TABLE prestamos ALTER COLUMN fecha_vencimiento DROP NOT NULL;`);
        }
        if (insertErr.message && insertErr.message.includes('id_solicitud')) {
          console.warn('Auto-corrección activa: eliminando restricción NOT NULL en id_solicitud...');
          await db.query(`ALTER TABLE prestamos ALTER COLUMN id_solicitud DROP NOT NULL;`);
        }
        const retryResult = await db.query(insertQuery, insertValues);
        nuevoPrestamo = retryResult.rows[0];
      } else {
        throw insertErr;
      }
    }

    // 5. Notificación interna para el propietario en segundo plano
    db.query(
      `INSERT INTO notificaciones (id_usuario, tipo, mensaje, id_transaccion)
       VALUES ($1, 'NUEVA_SOLICITUD', $2, $3);`,
      [
        propietarioId,
        `${req.user.nombre || 'Un vecino'} ha solicitado tu objeto "${objeto.nombre}" en préstamo del ${inicioStr} al ${finStr}.`,
        nuevoPrestamo.id
      ]
    ).catch((notifErr) => console.warn('Advertencia creando notificación background:', notifErr.message));

    return res.status(201).json({
      success: true,
      message: 'Solicitud de préstamo enviada exitosamente al propietario.',
      prestamo: {
        ...nuevoPrestamo,
        objeto_nombre: objeto.nombre,
        objeto_ubicacion: objeto.ubicacion
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulta de préstamos y solicitudes del usuario autenticado
 * GET /api/prestamos?tipo=recibidas|solicitadas|all&estado=Pendiente|Activa|...
 */
const getMisPrestamos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tipo = 'all', estado } = req.query;

    // Ejecutar verificación de vencimientos en background sin bloquear la consulta principal
    verificarVencimientosInterno().catch((e) =>
      console.warn('Advertencia en verificación background de vencimientos:', e.message)
    );

    let whereClauses = [];
    let queryParams = [userId];

    if (tipo === 'recibidas') {
      whereClauses.push('p.propietario_id = $1');
    } else if (tipo === 'solicitadas') {
      whereClauses.push('p.solicitante_id = $1');
    } else {
      whereClauses.push('(p.propietario_id = $1 OR p.solicitante_id = $1)');
    }

    if (estado && estado !== 'todos' && estado !== 'all') {
      queryParams.push(estado.toString().toUpperCase().trim());
      whereClauses.push(`UPPER(p.estado::text) = $${queryParams.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        p.id,
        p.objeto_id,
        p.solicitante_id,
        p.propietario_id,
        TO_CHAR(p.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(p.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
        UPPER(p.estado::text) AS estado,
        p.fecha_devolucion_real,
        p.mensaje,
        p.creado_en,
        p.actualizado_en,
        -- Datos del Objeto
        o.nombre AS objeto_nombre,
        o.categoria AS objeto_categoria,
        o.ubicacion AS objeto_ubicacion,
        o.imagenes AS objeto_imagenes,
        o.estado AS objeto_estado,
        -- Datos del Solicitante
        u_sol.nombre AS solicitante_nombre,
        u_sol.correo AS solicitante_correo,
        u_sol.profile_image AS solicitante_foto,
        COALESCE(u_sol.reputacion, 5.0) AS solicitante_reputacion,
        u_sol.ubicacion_general AS solicitante_zona,
        -- Datos del Propietario
        u_prop.nombre AS propietario_nombre,
        u_prop.correo AS propietario_correo,
        u_prop.profile_image AS propietario_foto,
        COALESCE(u_prop.reputacion, 5.0) AS propietario_reputacion,
        u_prop.ubicacion_general AS propietario_zona,
        -- Comprobación de calificación por parte del usuario actual
        EXISTS (
          SELECT 1 FROM calificaciones c 
          WHERE c.prestamo_id = p.id AND c.evaluador_id = $1
        ) AS ya_calificado,
        (
          SELECT c.puntuacion FROM calificaciones c 
          WHERE c.prestamo_id = p.id AND c.evaluador_id = $1 
          LIMIT 1
        ) AS mi_calificacion,
        -- Días restantes o días de atraso
        (p.fecha_fin - CURRENT_DATE) AS dias_restantes
      FROM prestamos p
      INNER JOIN objetos o ON p.objeto_id = o.id
      INNER JOIN usuarios u_sol ON p.solicitante_id = u_sol.id
      INNER JOIN usuarios u_prop ON p.propietario_id = u_prop.id
      ${whereSql}
      ORDER BY 
        CASE UPPER(p.estado::text) 
          WHEN 'PENDIENTE' THEN 1 
          WHEN 'VENCIDO' THEN 2 
          WHEN 'ACTIVA' THEN 3 
          WHEN 'DEVUELTA' THEN 4 
          ELSE 5 
        END,
        p.creado_en DESC;
    `;

    const result = await db.query(sql, queryParams);

    return res.status(200).json({
      success: true,
      prestamos: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulta de un préstamo por su ID
 * GET /api/prestamos/:id
 */
const getPrestamoById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const sql = `
      SELECT 
        p.*,
        TO_CHAR(p.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(p.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
        UPPER(p.estado::text) AS estado,
        o.nombre AS objeto_nombre,
        o.imagenes AS objeto_imagenes,
        o.ubicacion AS objeto_ubicacion,
        o.categoria AS objeto_categoria,
        u_sol.nombre AS solicitante_nombre,
        u_sol.profile_image AS solicitante_foto,
        COALESCE(u_sol.reputacion, 5.0) AS solicitante_reputacion,
        u_prop.nombre AS propietario_nombre,
        u_prop.profile_image AS propietario_foto,
        COALESCE(u_prop.reputacion, 5.0) AS propietario_reputacion,
        EXISTS (
          SELECT 1 FROM calificaciones c 
          WHERE c.prestamo_id = p.id AND c.evaluador_id = $2
        ) AS ya_calificado
      FROM prestamos p
      INNER JOIN objetos o ON p.objeto_id = o.id
      INNER JOIN usuarios u_sol ON p.solicitante_id = u_sol.id
      INNER JOIN usuarios u_prop ON p.propietario_id = u_prop.id
      WHERE p.id = $1 AND (p.solicitante_id = $2 OR p.propietario_id = $2);
    `;

    const result = await db.query(sql, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado o no tienes permiso para consultarlo.'
      });
    }

    return res.status(200).json({
      success: true,
      prestamo: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-13: Aprobar o rechazar una solicitud
 * PATCH /api/prestamos/:id/estado
 * Body: { estado: 'Activa' | 'Rechazada' }
 */
const cambiarEstadoPrestamo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    let { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar el nuevo estado deseado ("ACTIVA" o "RECHAZADA").'
      });
    }

    // Normalizar capitalización a mayúsculas sostenidas para compatibilidad con PostgreSQL ENUM
    const estadoUpper = estado.toString().toUpperCase().trim();
    let estadoFinal = null;
    if (estadoUpper.includes('ACT') || estadoUpper.includes('APRO') || estadoUpper.includes('ACEP')) {
      estadoFinal = 'ACTIVA';
    } else if (estadoUpper.includes('RECH')) {
      estadoFinal = 'RECHAZADA';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Solo se puede "ACTIVA" o "RECHAZADA".'
      });
    }

    // Consultar el préstamo y validar pertenencia del propietario
    const prestamoRes = await db.query(
      `SELECT p.*, UPPER(p.estado::text) AS estado_norm, o.nombre AS objeto_nombre 
       FROM prestamos p 
       INNER JOIN objetos o ON p.objeto_id = o.id 
       WHERE p.id = $1`,
      [id]
    );

    if (prestamoRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de préstamo no encontrada.'
      });
    }

    const prestamo = prestamoRes.rows[0];

    // Solo el propietario puede aprobar o rechazar
    if (Number(prestamo.propietario_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el propietario del objeto tiene permisos para aprobar o rechazar esta solicitud.'
      });
    }

    if (prestamo.estado_norm !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `Esta solicitud ya se encuentra en estado "${prestamo.estado}" y no puede ser modificada.`
      });
    }

    // Actualizar estado del préstamo
    const updateRes = await db.query(
      `UPDATE prestamos 
       SET estado = $1, actualizado_en = NOW() 
       WHERE id = $2 
       RETURNING *;`,
      [estadoFinal, id]
    );

    // Si fue aprobada, marcar el objeto como 'en_prestamo'
    if (estadoFinal === 'ACTIVA') {
      await db.query(
        `UPDATE objetos SET estado = 'en_prestamo' WHERE id = $1;`,
        [prestamo.objeto_id]
      );
    }

    // Generar notificación al solicitante en background
    const msgNotif = estadoFinal === 'ACTIVA'
      ? `¡Buenas noticias! Tu solicitud para "${prestamo.objeto_nombre}" fue aprobada. Ya se encuentra en curso.`
      : `Tu solicitud para "${prestamo.objeto_nombre}" ha sido rechazada por el propietario.`;

    db.query(
      `INSERT INTO notificaciones (id_usuario, tipo, mensaje, id_transaccion)
       VALUES ($1, $2, $3, $4);`,
      [
        prestamo.solicitante_id,
        estadoFinal === 'ACTIVA' ? 'SOLICITUD_APROBADA' : 'SOLICITUD_RECHAZADA',
        msgNotif,
        prestamo.id
      ]
    ).catch((notifErr) => console.warn('Advertencia en notificación background:', notifErr.message));

    return res.status(200).json({
      success: true,
      message: `Solicitud de préstamo marcada como "${estadoFinal}" exitosamente.`,
      prestamo: {
        ...updateRes.rows[0],
        estado: estadoFinal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-14: Registrar devolución
 * POST /api/prestamos/:id/devolver
 */
const registrarDevolucion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Consultar el préstamo
    const prestamoRes = await db.query(
      `SELECT p.*, UPPER(p.estado::text) AS estado_norm, o.nombre AS objeto_nombre 
       FROM prestamos p 
       INNER JOIN objetos o ON p.objeto_id = o.id 
       WHERE p.id = $1;`,
      [id]
    );

    if (prestamoRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado.'
      });
    }

    const prestamo = prestamoRes.rows[0];

    // Comprobar que el usuario sea o bien el solicitante o bien el propietario
    const isOwner = Number(prestamo.propietario_id) === Number(userId);
    const isBorrower = Number(prestamo.solicitante_id) === Number(userId);

    if (!isOwner && !isBorrower) {
      return res.status(403).json({
        success: false,
        message: 'No tienes autorización para registrar la devolución de este préstamo.'
      });
    }

    if (prestamo.estado_norm === 'DEVUELTA') {
      return res.status(400).json({
        success: false,
        message: 'Este préstamo ya fue registrado como devuelto previamente.'
      });
    }

    if (prestamo.estado_norm !== 'ACTIVA' && prestamo.estado_norm !== 'VENCIDO') {
      return res.status(400).json({
        success: false,
        message: `No se puede registrar devolución de un préstamo en estado "${prestamo.estado}".`
      });
    }

    // Actualizar estado a 'DEVUELTA' y registrar fecha_devolucion_real
    const updateRes = await db.query(
      `UPDATE prestamos 
       SET estado = 'DEVUELTA', fecha_devolucion_real = NOW(), actualizado_en = NOW() 
       WHERE id = $1 
       RETURNING *;`,
      [id]
    );

    // Marcar el objeto nuevamente como 'disponible' en el catálogo
    await db.query(
      `UPDATE objetos SET estado = 'disponible' WHERE id = $1;`,
      [prestamo.objeto_id]
    );

    // Notificar a la contraparte en segundo plano
    const destinatarioId = isOwner ? prestamo.solicitante_id : prestamo.propietario_id;
    db.query(
      `INSERT INTO notificaciones (id_usuario, tipo, mensaje, id_transaccion)
       VALUES ($1, 'DEVOLUCION_REGISTRADA', $2, $3);`,
      [
        destinatarioId,
        `Se ha completado la devolución de "${prestamo.objeto_nombre}". Por favor califica la transacción para actualizar la confianza vecinal.`,
        prestamo.id
      ]
    ).catch((notifErr) => console.warn('Advertencia en notificación background:', notifErr.message));

    return res.status(200).json({
      success: true,
      message: 'Devolución registrada exitosamente. El objeto vuelve a estar disponible en el catálogo.',
      prestamo: {
        ...updateRes.rows[0],
        estado: 'DEVUELTA'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-15: Controlar préstamos vencidos
 * GET /api/prestamos/verificar-vencimientos
 */
const verificarVencimientos = async (req, res, next) => {
  try {
    // Ejecutar en background usando pool.query(...) sin bloquear la respuesta del servidor
    verificarVencimientosInterno()
      .then((vencidos) => {
        if (vencidos && vencidos.length > 0) {
          console.log(`[HU-15] Verificación background: ${vencidos.length} préstamos marcados como VENCIDO.`);
        }
      })
      .catch((err) => {
        console.warn('[HU-15] Error en verificación background:', err.message);
      });

    return res.status(200).json({
      success: true,
      message: 'Verificación de vencimientos ejecutándose en segundo plano sin bloqueos.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  solicitarPrestamo,
  getMisPrestamos,
  getPrestamoById,
  cambiarEstadoPrestamo,
  registrarDevolucion,
  verificarVencimientos
};
