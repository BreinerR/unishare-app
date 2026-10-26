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

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña es requerida y debe contener al menos 6 caracteres.'
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
 * Google Auth: Inicio de sesión o registro rápido con cuenta de Google
 * Compatible con tokens de Google ID Token y perfiles OAuth2 de Expo/Web
 */
const googleLogin = async (req, res, next) => {
  try {
    const { email, name, photoUrl, googleId, ubicacion_general } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un correo de Google válido para autenticar.'
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const nombreUsuario = name ? name.trim() : 'Miembro Comunitario';
    const foto = photoUrl || null;
    const ubicacionDefault = ubicacion_general && ubicacion_general.trim()
      ? ubicacion_general.trim()
      : 'Sector Comunitario / Por definir';

    // 1. Verificar si el usuario ya existe por su correo
    const existingResult = await db.query(
      `SELECT id, uid_auth, nombre, correo, foto_perfil, ubicacion_general, reputacion, rol, estado_cuenta, fecha_registro
       FROM usuarios 
       WHERE LOWER(correo) = $1`,
      [emailNormalizado]
    );

    let user;

    if (existingResult.rows.length > 0) {
      user = existingResult.rows[0];

      if (user.estado_cuenta !== 'activo') {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta comunitaria se encuentra inactiva o suspendida.'
        });
      }

      // Si no tenía foto y Google nos provee una, la actualizamos opcionalmente
      if (!user.foto_perfil && foto) {
        await db.query('UPDATE usuarios SET foto_perfil = $1 WHERE id = $2', [foto, user.id]);
        user.foto_perfil = foto;
      }
    } else {
      // 2. Si no existe, crear usuario nuevo con Google
      // Se genera un hash aleatorio criptográficamente seguro para respetar la restricción NOT NULL de password_hash
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const generatedPasswordHash = await bcrypt.hash(randomSecret, salt);
      const googleUid = googleId || `google_${crypto.randomUUID()}`;

      const insertQuery = `
        INSERT INTO usuarios (uid_auth, nombre, correo, password_hash, ubicacion_general, foto_perfil)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nombre, correo, foto_perfil, ubicacion_general, reputacion, rol, estado_cuenta, fecha_registro
      `;

      const insertValues = [
        googleUid,
        nombreUsuario,
        emailNormalizado,
        generatedPasswordHash,
        ubicacionDefault,
        foto
      ];

      const insertResult = await db.query(insertQuery, insertValues);
      user = insertResult.rows[0];
    }

    // 3. Generar JWT firmado
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
