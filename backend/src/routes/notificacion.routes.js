const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => res.json({ message: 'Ruta de notificaciones inicializada' }));
module.exports = router;
