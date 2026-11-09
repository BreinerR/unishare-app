const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../utils/jwt');

// Regex para validación de formato de correo (cualquier proveedor estándar: personal, laboral o vecinal)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * HU-01: Registro de un nuevo miembro en la red colaborativa comunitaria
 * Flexible para barrios, conjuntos residenciales, empresas y colectivos.
 */
const register = async (req, res, next) => {
  try {
    const { nombre, correo, password, ubicacion_general, foto_perfil } = req.body;

    // 1. Validaciones de entrada
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El nombre completo es requerido y debe tener al menos 3 caracteres.'
      });
    }

    if (!correo || typeof correo !== 'string' || !EMAIL_REGEX.test(correo.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar un correo electrónico válido (personal, laboral o vecinal).'
      });
    }

    // Validación estricta de contraseña: mínimo 6 caracteres, con letras y números
    const hasLetter = /[a-zA-Z]/.test(password || '');
    const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password || '');
    if (!password || typeof password !== 'string' || password.length < 6 || !hasLetter || !hasNumberOrSpecial) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres e incluir letras y números.'
      });
    }

    const emailNormalizado = correo.trim().toLowerCase();
    const ubicacionFinal = (ubicacion_general && ubicacion_general.trim()) 
      ? ubicacion_general.trim() 
      : 'Sector Comunitario / Sin especificar';

    // 2. Verificar existencia previa del correo
    const existingUser = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(correo) = $1',
      [emailNormalizado]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado en la red UniShare.'
      });
    }

    // 3. Encriptación segura con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Inserción en PostgreSQL (manteniendo intacta la estructura relacional)
    const insertQuery = `
      INSERT INTO usuarios (nombre, correo, password_hash, ubicacion_general, foto_perfil)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, correo, foto_perfil, ubicacion_general, reputacion, rol, estado_cuenta, fecha_registro
    `;

    const values = [
      nombre.trim(),
      emailNormalizado,
      passwordHash,
      ubicacionFinal,
      foto_perfil || null
    ];

    const result = await db.query(insertQuery, values);
    const nuevoUsuario = result.rows[0];

    // 5. Generación de Token JWT
    const token = generateToken({
      id: nuevoUsuario.id,
      correo: nuevoUsuario.correo,
      rol: nuevoUsuario.rol
    });

    return res.status(201).json({
      success: true,
      message: '¡Bienvenido a la red comunitaria UniShare! Registro completado con éxito.',
      token,
      user: nuevoUsuario
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-02: Inicio de sesión con credenciales directas y generación de JWT
 */
const login = async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    // 1. Validaciones básicas
    if (!correo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa tu correo y contraseña.'
      });
    }

    const emailNormalizado = correo.trim().toLowerCase();

    // 2. Buscar usuario en base de datos
    const userResult = await db.query(
      `SELECT id, nombre, correo, password_hash, foto_perfil, ubicacion_general, reputacion, rol, estado_cuenta, fecha_registro
       FROM usuarios 
       WHERE LOWER(correo) = $1`,
      [emailNormalizado]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifica tu correo y contraseña.'
      });
    }

    const user = userResult.rows[0];

    // 3. Verificar estado de la cuenta
    if (user.estado_cuenta !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta comunitaria se encuentra inactiva o suspendida. Por favor contacta al equipo de soporte.'
      });
    }

    // 4. Comparar contraseña con el hash almacenado
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifica tu correo y contraseña.'
      });
    }

    // 5. Generar Token JWT
    const token = generateToken({
      id: user.id,
      correo: user.correo,
      rol: user.rol
    });

    // 6. Sanitizar objeto usuario antes de enviar (sin hash de contraseña)
    delete user.password_hash;

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google Auth (HU-03): Inicio de sesión o registro rápido con cuenta de Google
 * Criterios de Aceptación CA1 - CA4:
 * - Recibe id/googleId (uid_auth), email y name reales desde la API de Google.
 * - Verifica si la cuenta ya existe en PostgreSQL por su uid_auth o correo.
 * - Si existe: Retorna el token de sesión e inicia sesión normalmente.
 * - Si es el primer acceso (CA4): Registra automáticamente el nuevo usuario en la tabla usuarios
 *   usando su uid_auth real de Google, su nombre y su correo, y luego inicia sesión.
 */
const googleLogin = async (req, res, next) => {
  try {
    const { id, googleId, uid_auth, email, name, password, photoUrl, picture, ubicacion_general } = req.body;

    // Obtener uid_auth real de Google
    const realGoogleUid = id || googleId || uid_auth;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un correo de Google válido para autenticar.'
      });
    }

    if (!realGoogleUid) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió el identificador único (uid/id) de la cuenta de Google.'
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const nombreUsuario = (name && name.trim()) ? name.trim() : 'Miembro Comunitario';
    const foto = photoUrl || picture || null;
    const ubicacionDefault = (ubicacion_general && ubicacion_general.trim())
      ? ubicacion_general.trim()
      : 'Sector Comunitario / Por definir';

    // 1. Verificar si el usuario ya existe en PostgreSQL por su uid_auth o por su correo
    const existingResult = await db.query(
      `SELECT id, uid_auth, nombre, correo, foto_perfil, ubicacion_general, reputacion, rol, estado_cuenta, fecha_registro
       FROM usuarios 
       WHERE uid_auth = $1 OR LOWER(correo) = $2`,
      [String(realGoogleUid), emailNormalizado]
    );

    let user;

    if (existingResult.rows.length > 0) {
      // Usuario ya existe en el sistema
      user = existingResult.rows[0];

      if (user.estado_cuenta !== 'activo') {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta comunitaria se encuentra inactiva o suspendida.'
        });
      }

      // Si no tenía su uid_auth de Google o foto actualizada, los sincronizamos
      const updates = [];
      const updateValues = [];
      let paramIndex = 1;

      if (!user.uid_auth || user.uid_auth !== String(realGoogleUid)) {
        updates.push(`uid_auth = $${paramIndex++}`);
        updateValues.push(String(realGoogleUid));
        user.uid_auth = String(realGoogleUid);
      }

      if (!user.foto_perfil && foto) {
        updates.push(`foto_perfil = $${paramIndex++}`);
        updateValues.push(foto);
        user.foto_perfil = foto;
      }

      if (updates.length > 0) {
        updateValues.push(user.id);
        await db.query(
          `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          updateValues
        );
      }
    } else {
      // 2. CA4: Primer acceso -> Registro automático del nuevo usuario
      // Se genera un hash seguro usando la contraseña suministrada o una clave criptográfica de respaldo
      const rawPassword = (password && typeof password === 'string' && password.trim().length >= 6)
        ? password.trim()
        : crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const generatedPasswordHash = await bcrypt.hash(rawPassword, salt);

      const insertQuery = `
        INSERT INTO usuarios (uid_auth, nombre, correo, password_hash, ubicacion_general, foto_perfil)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, uid_auth, nombre, correo, foto_perfil, ubicacion_general, reputacion, rol, estado_cuenta, fecha_registro
      `;

      const insertValues = [
        String(realGoogleUid),
        nombreUsuario,
        emailNormalizado,
        generatedPasswordHash,
        ubicacionDefault,
        foto
      ];

      const insertResult = await db.query(insertQuery, insertValues);
      user = insertResult.rows[0];
    }

    // 3. Generar token JWT seguro
    const token = generateToken({
      id: user.id,
      correo: user.correo,
      rol: user.rol
    });

    return res.status(200).json({
      success: true,
      message: 'Autenticación con Google exitosa.',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleLogin
};
