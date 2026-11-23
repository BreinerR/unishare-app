const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext || ext === '.') {
      ext = file.mimetype && file.mimetype.includes('png') ? '.png' : '.jpg';
    }
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `obj_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Acepta imágenes JPG, PNG, WEBP, GIF e imágenes móviles con mimetypes genéricos
  if (!file.mimetype || file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream') {
    return cb(null, true);
  }
  const allowedExts = /\.(jpg|jpeg|png|webp|gif|bmp)$/i;
  if (file.originalname && allowedExts.test(file.originalname)) {
    return cb(null, true);
  }
  // En caso de duda en subidas desde React Native / Expo, permitir y guardar
  return cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter
});

module.exports = upload;
