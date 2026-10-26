const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => res.json({ message: 'Ruta de prestamos inicializada' }));
module.exports = router;
