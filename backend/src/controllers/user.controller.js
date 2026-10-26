const db = require('../config/db');

/**
 * HU-04: Obtener perfil del usuario autenticado
 * Protege información sensible y no expone coordenadas exactas.
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        id, 
        nombre, 
        correo, 
        foto_perfil, 
        ubicacion_general, 
        reputacion, 
        rol, 
        estado_cuenta, 
        fecha_registro
      FROM usuarios 
      WHERE id = $1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de usuario no encontrado.'
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-04: Actualizar datos del perfil de usuario
 * Permite modificar nombre, ubicación general (campus/zona referencial) y foto de perfil.
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { nombre, ubicacion_general, foto_perfil } = req.body;

    // Validar nombre si se suministra
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length < 3)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre debe tener al menos 3 caracteres.'
      });
    }

    // Validar ubicación general (proteger privacidad estricta: barrio, sector, conjunto o empresa; nunca coordenadas GPS exactas)
    if (ubicacion_general !== undefined && (typeof ubicacion_general !== 'string' || ubicacion_general.trim().length < 3)) {
      return res.status(400).json({
        success: false,
        message: 'La ubicación general debe ser una referencia de barrio, sector, conjunto o empresa válida.'
      });
    }

    // Consulta dinámica o selectiva
    const currentUserResult = await db.query(
      'SELECT nombre, ubicacion_general, foto_perfil FROM usuarios WHERE id = $1',
      [userId]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    const current = currentUserResult.rows[0];

    const nuevoNombre = nombre !== undefined ? nombre.trim() : current.nombre;
    const nuevaUbicacion = ubicacion_general !== undefined ? ubicacion_general.trim() : current.ubicacion_general;
    const nuevaFoto = foto_perfil !== undefined ? foto_perfil : current.foto_perfil;

    const updateQuery = `
      UPDATE usuarios 
      SET 
        nombre = $1, 
        ubicacion_general = $2, 
        foto_perfil = $3
      WHERE id = $4
      RETURNING 
        id, 
        nombre, 
        correo, 
        foto_perfil, 
        ubicacion_general, 
        reputacion, 
        rol, 
        estado_cuenta, 
        fecha_registro
    `;

    const updatedResult = await db.query(updateQuery, [
      nuevoNombre,
      nuevaUbicacion,
      nuevaFoto,
      userId
    ]);

    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente.',
      user: updatedResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
