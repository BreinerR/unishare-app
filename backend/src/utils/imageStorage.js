const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Normaliza y almacena imágenes, convirtiendo cadenas Base64 en archivos físicos en /uploads
 * y retornando URLs cortas y accesibles. Si ya es una URL HTTP o /uploads/, la conserva.
 */
const processImageToCleanUrl = (imageInput, req) => {
  if (!imageInput || typeof imageInput !== 'string') return null;

  const trimmed = imageInput.trim();
  if (!trimmed) return null;

  // Si ya es una URL web completa (HTTP / HTTPS)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Si ya es una ruta relativa oficial a /uploads
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  // Si es un nombre de archivo directo dentro de uploads
  if (trimmed.startsWith('obj_')) {
    return `/uploads/${trimmed}`;
  }

  // Si es una cadena Base64 (data:image/... o raw base64)
  const isDataUri = trimmed.startsWith('data:image/');
  const isRawBase64 = trimmed.length > 500 && /^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 100));

  if (isDataUri || isRawBase64) {
    try {
      let ext = 'jpg';
      let base64Data = trimmed;

      if (isDataUri) {
        const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mime = matches[1].toLowerCase();
          if (mime.includes('png')) ext = 'png';
          else if (mime.includes('webp')) ext = 'webp';
          else if (mime.includes('gif')) ext = 'gif';
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filePath, buffer);
      return `/uploads/${filename}`;
    } catch (err) {
      console.error('Error al decodificar y guardar imagen Base64:', err);
      return null;
    }
  }

  return trimmed;
};

/**
 * Procesa un arreglo de imágenes o cadenas individuales
 */
const processImagesArray = (images, req) => {
  if (!images) return [];
  const list = Array.isArray(images) ? images : [images];
  const results = [];

  for (const item of list) {
    const clean = processImageToCleanUrl(item, req);
    if (clean) {
      results.push(clean);
    }
  }

  return results;
};

module.exports = {
  UPLOADS_DIR,
  processImageToCleanUrl,
  processImagesArray
};
