const db = require('../config/db');
const { processImagesArray, processImageToCleanUrl } = require('../utils/imageStorage');

// Lista canónica de categorías válidas según ENUM categoria_objeto en PostgreSQL
const VALID_CATEGORIES = [
  'libros_academico',
  'herramientas',
  'electronica_gadgets',
  'laboratorio',
  'deportes_recreacion',
  'papeleria',
  'otros',
  'hogar_jardineria',
  'camping_recreacion',
  'movilidad'
];

// Mapeo amigable para normalizar categorías recibidas desde el frontend
const CATEGORY_MAP = {
  'herramientas': 'herramientas',
  'hogar': 'hogar_jardineria',
  'hogar y jardinería': 'hogar_jardineria',
  'libros': 'libros_academico',
  'libros y lectura': 'libros_academico',
  'libros_academico': 'libros_academico',
  'tecnología': 'electronica_gadgets',
  'tecnologia': 'electronica_gadgets',
  'tecnología y gadgets': 'electronica_gadgets',
  'electronica': 'electronica_gadgets',
  'electronica_gadgets': 'electronica_gadgets',
  'movilidad': 'movilidad',
  'movilidad y deporte': 'movilidad',
  'deportes': 'deportes_recreacion',
  'deportes y recreación': 'deportes_recreacion',
  'deportes_recreacion': 'deportes_recreacion',
  'camping': 'camping_recreacion',
  'camping y recreación': 'camping_recreacion',
  'camping_recreacion': 'camping_recreacion',
  'recreación': 'camping_recreacion',
  'laboratorio': 'laboratorio',
  'papelería': 'papeleria',
  'papeleria': 'papeleria',
  'otros': 'otros'
};

const normalizeCategory = (cat) => {
  if (!cat) return 'otros';
  const lower = cat.trim().toLowerCase();
  return CATEGORY_MAP[lower] || (VALID_CATEGORIES.includes(lower) ? lower : 'otros');
};

const normalizeModality = (mod) => {
  if (!mod) return 'prestamo';
  const lower = mod.trim().toLowerCase();
  if (lower.includes('trueque')) return 'trueque';
  if (lower.includes('ambos') || lower.includes('ambas')) return 'ambos';
  return 'prestamo';
};

/**
 * Normaliza las URLs de imágenes para garantizar que los clientes móviles (Expo)
 * y navegadores web puedan cargarlas directamente sin fallos.
 */
const formatObjectImages = (obj, req) => {
  if (!obj) return obj;
  const host = (req && req.get && req.get('host')) || '192.168.101.10:5000';
  const protocol = (req && req.protocol) || 'http';
  const baseUrl = `${protocol}://${host}`;

  let imgs = [];
  if (Array.isArray(obj.imagenes)) {
    imgs = obj.imagenes;
  } else if (typeof obj.imagenes === 'string') {
    try {
      imgs = JSON.parse(obj.imagenes);
    } catch {
      imgs = [obj.imagenes];
    }
  }

  const formatted = (Array.isArray(imgs) ? imgs : []).map((img) => {
    if (!img || typeof img !== 'string') return null;
    const trimmed = img.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/uploads/')) return `${baseUrl}${trimmed}`;
    if (trimmed.startsWith('obj_')) return `${baseUrl}/uploads/${trimmed}`;
    return trimmed;
  }).filter(Boolean);

  return {
    ...obj,
    imagenes: formatted
  };
};

/**
 * Subida directa de imágenes con Multer (/api/objects/upload)
 * Retorna URL limpia y accesible
 */
const uploadObjectImage = async (req, res, next) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha recibido ningún archivo de imagen para subir.'
      });
    }

    const host = (req.get && req.get('host')) || '192.168.101.10:5000';
    const cleanPath = `/uploads/${file.filename}`;
    const fullUrl = `${req.protocol}://${host}${cleanPath}`;

    return res.status(201).json({
      success: true,
      message: 'Fotografía subida exitosamente.',
      url: fullUrl,
      cleanPath,
      filename: file.filename
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-06: Publicar un Objeto
 * POST /api/objects (o /api/objetos)
 * Registra un objeto asociado al usuario autenticado (CA4).
 * Campos obligatorios: nombre, categoría (CA3), descripción, modalidad, fotografías (mínimo 1, CA2) y zona general.
 */
const createObject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      nombre,
      categoria,
      descripcion,
      tipo_disponibilidad,
      modalidad,
      imagenes,
      imagen,
      photoUri,
      ubicacion,
      zona
    } = req.body;

    // 1. Validar nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del objeto es obligatorio y debe tener al menos 3 caracteres.'
      });
    }

    // 2. Validar descripción
    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'La descripción es obligatoria y debe tener al menos 5 caracteres.'
      });
    }

    // 3. Validar imágenes y procesarlas a URLs limpias almacenadas en disco (/uploads)
    let candidateImages = [];
    if (Array.isArray(imagenes) && imagenes.length > 0) {
      candidateImages = imagenes;
    } else if (imagen && typeof imagen === 'string') {
      candidateImages = [imagen];
    } else if (photoUri && typeof photoUri === 'string') {
      candidateImages = [photoUri];
    }

    const finalImages = processImagesArray(candidateImages, req);

    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Es obligatorio adjuntar al menos una fotografía de tu artículo para publicarlo.'
      });
    }

    // 4. Normalizar categoría y modalidad
    const finalCategory = normalizeCategory(categoria);
    const finalModality = normalizeModality(tipo_disponibilidad || modalidad);

    // 5. Ubicación general (proteger privacidad, referencial de sector)
    const finalZone = (ubicacion && ubicacion.trim()) || (zona && zona.trim()) || req.user.ubicacion_general || 'Sector Comunitario General';

    // 6. Inserción en PostgreSQL
    const query = `
      INSERT INTO objetos (
        id_usuario, 
        nombre, 
        descripcion, 
        categoria, 
        tipo_disponibilidad, 
        ubicacion, 
        imagenes, 
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'disponible')
      RETURNING *
    `;

    const values = [
      userId,
      nombre.trim(),
      descripcion.trim(),
      finalCategory,
      finalModality,
      finalZone,
      finalImages
    ];

    const result = await db.query(query, values);
    const newObject = formatObjectImages(result.rows[0], req);

    return res.status(201).json({
      success: true,
      message: '¡Objeto publicado exitosamente en el catálogo comunitario!',
      object: newObject
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-09 & HU-10: Consultar Objetos Disponibles (Catálogo, Búsqueda y Filtros)
 * GET /api/objects (o /api/objetos)
 * Filtra únicamente objetos con estado 'disponible' (CA1).
 * Soporta filtros: q (texto), categoria (CA2), modalidad (CA3), zona y proximidad (HU-11).
 */
const getObjects = async (req, res, next) => {
  try {
    const { q, search, categoria, category, modalidad, tipo_disponibilidad, zona, my_objects } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Si se solicitan los objetos propios del usuario autenticado (para gestión/edición)
    if (my_objects === 'true' && req.user) {
      conditions.push(`o.id_usuario = $${paramIndex++}`);
      values.push(req.user.id);
    } else {
      // Regla CA1: El catálogo público solo muestra objetos disponibles
      conditions.push(`o.estado = 'disponible'`);
    }

    // HU-10 CA1: Búsqueda por texto en nombre o descripción
    const textQuery = q || search;
    if (textQuery && textQuery.trim()) {
      conditions.push(`(o.nombre ILIKE $${paramIndex} OR o.descripcion ILIKE $${paramIndex})`);
      values.push(`%${textQuery.trim()}%`);
      paramIndex++;
    }

    // HU-10 CA2: Filtrado por categoría
    const catQuery = categoria || category;
    if (catQuery && catQuery.trim() && catQuery.trim().toLowerCase() !== 'todos' && catQuery.trim().toLowerCase() !== 'all') {
      const normalizedCat = normalizeCategory(catQuery);
      conditions.push(`o.categoria = $${paramIndex++}`);
      values.push(normalizedCat);
    }

    // HU-10 CA3: Filtrado por modalidad (Préstamo, Trueque, Ambos)
    const modQuery = modalidad || tipo_disponibilidad;
    if (modQuery && modQuery.trim() && modQuery.trim().toLowerCase() !== 'todos' && modQuery.trim().toLowerCase() !== 'all') {
      const normalizedMod = normalizeModality(modQuery);
      if (normalizedMod === 'prestamo') {
        conditions.push(`(o.tipo_disponibilidad = 'prestamo' OR o.tipo_disponibilidad = 'ambos')`);
      } else if (normalizedMod === 'trueque') {
        conditions.push(`(o.tipo_disponibilidad = 'trueque' OR o.tipo_disponibilidad = 'ambos')`);
      } else {
        conditions.push(`o.tipo_disponibilidad = $${paramIndex++}`);
        values.push(normalizedMod);
      }
    }

    // HU-11: Filtro por zona general
    if (zona && zona.trim()) {
      conditions.push(`o.ubicacion ILIKE $${paramIndex++}`);
      values.push(`%${zona.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        o.id,
        o.id_usuario,
        o.nombre,
        o.descripcion,
        o.categoria,
        o.tipo_disponibilidad,
        o.ubicacion,
        o.imagenes,
        o.estado,
        o.fecha_publicacion,
        u.nombre AS propietario_nombre,
        u.correo AS propietario_correo,
        u.profile_image AS propietario_foto,
        u.reputacion AS propietario_reputacion,
        u.ubicacion_general AS propietario_zona
      FROM objetos o
      INNER JOIN usuarios u ON o.id_usuario = u.id
      ${whereClause}
      ORDER BY o.fecha_publicacion DESC
    `;

    const result = await db.query(query, values);
    const formattedObjects = result.rows.map((row) => formatObjectImages(row, req));

    return res.status(200).json({
      success: true,
      count: formattedObjects.length,
      objects: formattedObjects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-09 (CA2, CA3, CA4): Consultar Detalle de un Objeto
 * GET /api/objects/:id
 */
const getObjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        o.id,
        o.id_usuario,
        o.nombre,
        o.descripcion,
        o.categoria,
        o.tipo_disponibilidad,
        o.ubicacion,
        o.imagenes,
        o.estado,
        o.fecha_publicacion,
        u.nombre AS propietario_nombre,
        u.correo AS propietario_correo,
        u.profile_image AS propietario_foto,
        u.reputacion AS propietario_reputacion,
        u.ubicacion_general AS propietario_zona
      FROM objetos o
      INNER JOIN usuarios u ON o.id_usuario = u.id
      WHERE o.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El objeto solicitado no existe o fue retirado.'
      });
    }

    const objectData = formatObjectImages(result.rows[0], req);

    return res.status(200).json({
      success: true,
      object: objectData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-07: Editar Información de un Objeto
 * PUT /api/objects/:id
 * Seguridad (CA1): Valida estrictamente que solo el propietario (id_usuario) pueda editar.
 * Modifica campos habilitados (CA2) y persiste en PostgreSQL (CA3).
 */
const updateObject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      categoria,
      tipo_disponibilidad,
      modalidad,
      imagenes,
      imagen,
      photoUri,
      ubicacion,
      zona
    } = req.body;

    // 1. Verificar existencia del objeto y propiedad del usuario (CA1)
    const existingResult = await db.query('SELECT * FROM objetos WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Objeto no encontrado en el sistema.'
      });
    }

    const currentObj = existingResult.rows[0];

    // Seguridad de propiedad del objeto
    if (currentObj.id_usuario !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes autorización para modificar este objeto porque no eres su propietario.'
      });
    }

    // 2. Preparar campos actualizados
    let nuevoNombre = currentObj.nombre;
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 3 caracteres.'
        });
      }
      nuevoNombre = nombre.trim();
    }

    let nuevaDescripcion = currentObj.descripcion;
    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string' || descripcion.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'La descripción debe tener al menos 5 caracteres.'
        });
      }
      nuevaDescripcion = descripcion.trim();
    }

    const nuevaCategoria = categoria !== undefined ? normalizeCategory(categoria) : currentObj.categoria;
    const nuevaModalidad = (tipo_disponibilidad !== undefined || modalidad !== undefined)
      ? normalizeModality(tipo_disponibilidad || modalidad)
      : currentObj.tipo_disponibilidad;

    const nuevaUbicacion = (ubicacion !== undefined ? ubicacion.trim() : (zona !== undefined ? zona.trim() : currentObj.ubicacion));

    // Imágenes normalizadas a archivos estáticos (/uploads) y URLs limpias
    let nuevasImagenes = currentObj.imagenes;
    let candidateUpdate = null;
    if (Array.isArray(imagenes) && imagenes.length > 0) {
      candidateUpdate = imagenes;
    } else if (imagen && typeof imagen === 'string') {
      candidateUpdate = [imagen];
    } else if (photoUri && typeof photoUri === 'string') {
      candidateUpdate = [photoUri];
    }

    if (candidateUpdate) {
      const processed = processImagesArray(candidateUpdate, req);
      if (processed.length > 0) {
        nuevasImagenes = processed;
      }
    }

    // 3. Ejecutar UPDATE en PostgreSQL (CA3)
    const updateQuery = `
      UPDATE objetos 
      SET 
        nombre = $1, 
        descripcion = $2, 
        categoria = $3, 
        tipo_disponibilidad = $4, 
        ubicacion = $5, 
        imagenes = $6
      WHERE id = $7
      RETURNING *
    `;

    const updateValues = [
      nuevoNombre,
      nuevaDescripcion,
      nuevaCategoria,
      nuevaModalidad,
      nuevaUbicacion,
      nuevasImagenes,
      id
    ];

    const updatedResult = await db.query(updateQuery, updateValues);
    const updatedObject = formatObjectImages(updatedResult.rows[0], req);

    return res.status(200).json({
      success: true,
      message: 'Objeto actualizado exitosamente en el catálogo comunitario.',
      object: updatedObject
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HU-08: Retirar un Objeto del Catálogo (Soft-Delete)
 * DELETE /api/objects/:id o PATCH /api/objects/:id/retirar
 * Seguridad (CA1): Solo el propietario puede retirar.
 * En lugar de borrar físicamente (para proteger el historial de transacciones),
 * actualiza el estado a 'retirado' asegurando que desaparezca del catálogo público (CA2, CA3, CA4).
 */
const withdrawObject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 1. Verificar objeto y validación estricta de propiedad (CA1)
    const existingResult = await db.query('SELECT * FROM objetos WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Objeto no encontrado en la base de datos.'
      });
    }

    const currentObj = existingResult.rows[0];

    // Seguridad de propiedad del objeto
    if (currentObj.id_usuario !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Únicamente el usuario propietario tiene permiso para retirar este artículo del catálogo.'
      });
    }

    // 2. Soft-delete: Marcar como 'retirado' preservando integridad transaccional
    const updateQuery = `
      UPDATE objetos 
      SET estado = 'retirado' 
      WHERE id = $1 
      RETURNING *
    `;

    const result = await db.query(updateQuery, [id]);

    return res.status(200).json({
      success: true,
      message: 'El objeto ha sido retirado del catálogo público exitosamente.',
      object: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createObject,
  getObjects,
  getObjectById,
  updateObject,
  withdrawObject,
  uploadObjectImage
};
