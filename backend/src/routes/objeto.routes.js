const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const {
  createObject,
  getObjects,
  getObjectById,
  updateObject,
  withdrawObject,
  uploadObjectImage
} = require('../controllers/objeto.controller');

const router = Router();

// Subida de imagen para objetos (retorna URL accesible en /uploads)
router.post('/upload', upload.any(), uploadObjectImage);

// Catálogo público, búsqueda y filtros
router.get('/', getObjects);

// Detalle completo de un objeto
router.get('/:id', getObjectById);

// Publicar objeto (Soporta JSON o multipart/form-data con multer)
router.post('/', authMiddleware, upload.any(), createObject);

// Editar información del objeto (Soporta JSON o multipart)
router.put('/:id', authMiddleware, upload.any(), updateObject);

// Retirar objeto del catálogo (Soft delete)
router.delete('/:id', authMiddleware, withdrawObject);
router.patch('/:id/retirar', authMiddleware, withdrawObject);

module.exports = router;
