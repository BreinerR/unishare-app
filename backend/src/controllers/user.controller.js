const db = require('../config/db');

/**
 * HU-04 (CA1, CA4): Obtener perfil del usuario autenticado
 * Retorna nombre, correo, ubicación general, reputación y profile_image.
 * Protege la privacidad evitando divulgar coordenadas GPS exactas.
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        id, 
        uid_auth,
        nombre, 
        correo, 
        profile_image,
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
        message: 'Perfil de usuario no encontrado en la base de datos.'
      });
    }

    const userData = result.rows[0];
    userData.profile_image = userData.profile_image || null;

    return res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-04 (CA2, CA3, CA4): Actualizar datos del perfil de usuario
 * - Modificación EXCLUSIVA de: nombre, ubicación general y foto (profile_image).
 * - Restricción estricta: Correo y reputación/calificación son de SOLO LECTURA.
 * - Ubicación pública referencial (ej. "Cali, Valle", "Barrio El Nogal"), nunca coordenadas GPS.
 * - Guarda los cambios en PostgreSQL (CA3) utilizando únicamente profile_image (TEXT).
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { nombre, ubicacion_general, profile_image, foto_perfil, correo, email, reputacion, rol, estado_cuenta } = req.body;

    // Obtener datos actuales del usuario en PostgreSQL
    const currentUserResult = await db.query(
      `SELECT id, nombre, correo, ubicacion_general, reputacion, rol, estado_cuenta, profile_image 
       FROM usuarios WHERE id = $1`,
      [userId]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en la base de datos.'
      });
    }

    const current = currentUserResult.rows[0];

    // Restricción: Bloqueo explícito de intentos de editar el correo
    const attemptedEmail = correo || email;
    if (attemptedEmail !== undefined && attemptedEmail.trim().toLowerCase() !== current.correo.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'El correo electrónico está vinculado a tu cuenta y no puede ser modificado.'
      });
    }

    // Restricción: Bloqueo explícito de intentos de editar reputación o rol
    if (reputacion !== undefined && Number(reputacion) !== Number(current.reputacion)) {
      return res.status(403).json({
        success: false,
        message: 'La reputación comunitaria se calcula automáticamente a partir de préstamos e intercambios.'
      });
    }

    if (rol !== undefined && rol !== current.rol) {
      return res.status(403).json({
        success: false,
        message: 'El rol asignado en la comunidad no puede ser editado directamente.'
      });
    }

    // Validar nombre
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 3 caracteres.'
        });
      }
    }

    // Validar ubicación general (protección de privacidad, solo sector referencial)
    if (ubicacion_general !== undefined) {
      if (typeof ubicacion_general !== 'string' || ubicacion_general.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La ubicación general debe ser una referencia de barrio, sector o municipio válido (ej. Cali, Valle).'
        });
      }

      // Validar que no se envíen coordenadas GPS exactas (latitud, longitud numéricas crudas)
      const gpsPattern = /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/;
      if (gpsPattern.test(ubicacion_general.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Por seguridad y privacidad residencial, no se permite ingresar coordenadas GPS exactas. Ingrese solo una ubicación general (ej. Cali, Valle / Barrio El Nogal).'
        });
      }
    }

    // Gestionar foto de perfil (profile_image como única columna oficial)
    // Permite actualizar con nueva URL / Base64 o eliminar (null / vacío / 'delete')
    let nuevaFoto = current.profile_image;
    const incomingPhoto = profile_image !== undefined ? profile_image : foto_perfil;

    if (incomingPhoto !== undefined) {
      if (incomingPhoto === null || incomingPhoto === '' || incomingPhoto === 'delete') {
        nuevaFoto = null; // Eliminar foto y restablecer avatar por defecto
      } else if (typeof incomingPhoto === 'string') {
        nuevaFoto = incomingPhoto.trim();
      }
    }

    const nuevoNombre = nombre !== undefined ? nombre.trim() : current.nombre;
    const nuevaUbicacion = ubicacion_general !== undefined ? ubicacion_general.trim() : current.ubicacion_general;

    // Persistir cambios en PostgreSQL (CA3) usando únicamente profile_image
    const updateQuery = `
      UPDATE usuarios 
      SET 
        nombre = $1, 
        ubicacion_general = $2, 
        profile_image = $3
      WHERE id = $4
      RETURNING 
        id, 
        uid_auth,
        nombre, 
        correo, 
        profile_image,
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

    const updatedUser = updatedResult.rows[0];
    updatedUser.profile_image = updatedUser.profile_image || null;

    return res.status(200).json({
      success: true,
      message: 'Perfil comunitario actualizado exitosamente en la base de datos.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
