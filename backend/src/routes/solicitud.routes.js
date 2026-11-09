const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => res.json({ message: 'Ruta de solicitudes inicializada' }));
module.exports = router;
