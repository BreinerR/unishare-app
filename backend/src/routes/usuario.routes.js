const { Router } = require('express');
const router = Router();
// TODO: Vincular controladores en la siguiente fase
router.get('/', (req, res) => res.json({ message: 'Ruta de usuarios inicializada' }));
module.exports = router;
