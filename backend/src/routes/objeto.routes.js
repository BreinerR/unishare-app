const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => res.json({ message: 'Ruta de objetos inicializada' }));
module.exports = router;
