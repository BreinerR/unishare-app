const { Router } = require('express');
const { getCommunityZones } = require('../controllers/zone.controller');

const router = Router();

// HU-04: Consulta de mapa y zonas comunitarias referenciales
router.get('/', getCommunityZones);

module.exports = router;
