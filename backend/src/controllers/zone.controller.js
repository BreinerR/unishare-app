/**
 * Controlador para la Gestión y Geolocalización por Zonas Comunitarias (HU-04)
 * Garantiza la POLÍTICA DE PRIVACIDAD ESTRICTA:
 * - Solo se exponen sectores, barrios y puntos de encuentro comunitarios.
 * - NUNCA se exponen coordenadas GPS exactas de residencias ni datos de geolocalización en tiempo real.
 */

// Zonas comunitarias referenciales predeterminadas para mapeo y encuentro
const ZONAS_REFERENCIALES = [
  {
    id: 'zona-01',
    nombre_sector: 'Sector Parque Central / El Nogal',
    tipo_comunidad: 'barrio',
    punto_encuentro_publico: 'Kiosco del Parque Central',
    radio_cobertura_metros: 800,
    coordenadas_aproximadas: { lat: 4.6534, lng: -74.0581 },
    objetos_activos: 14,
    politica_privacidad: 'Protección de domicilio: Coordenadas referenciales con radio de seguridad de 800m'
  },
  {
    id: 'zona-02',
    nombre_sector: 'Conjunto Residencial Los Álamos',
    tipo_comunidad: 'conjunto_residencial',
    punto_encuentro_publico: 'Portería Principal / Salón Comunal',
    radio_cobertura_metros: 500,
    coordenadas_aproximadas: { lat: 4.6712, lng: -74.0725 },
    objetos_activos: 8,
    politica_privacidad: 'Protección de domicilio: Punto de intercambio en áreas comunes comunitarias'
  },
  {
    id: 'zona-03',
    nombre_sector: 'Distrito Empresarial & Coworking Tech',
    tipo_comunidad: 'empresa',
    punto_encuentro_publico: 'Recepción Central / Cafetería Principal',
    radio_cobertura_metros: 600,
    coordenadas_aproximadas: { lat: 4.6980, lng: -74.0320 },
    objetos_activos: 19,
    politica_privacidad: 'Protección corporativa: Intercambios en recepción y zonas abiertas autorizadas'
  },
  {
    id: 'zona-04',
    nombre_sector: 'Sector Universitario & Barrio La Floresta',
    tipo_comunidad: 'colectivo',
    punto_encuentro_publico: 'Plaza de las Banderas / Biblioteca Pública',
    radio_cobertura_metros: 900,
    coordenadas_aproximadas: { lat: 4.6402, lng: -74.0890 },
    objetos_activos: 27,
    politica_privacidad: 'Protección de privacidad: Radio amplio referencial'
  }
];

const getCommunityZones = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      privacidad_garantizada: true,
      mensaje_privacidad: 'Estricto cumplimiento de privacidad vecinal: no se divulgan direcciones domiciliarias ni coordenadas GPS exactas.',
      total_zonas: ZONAS_REFERENCIALES.length,
      zonas: ZONAS_REFERENCIALES
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCommunityZones
};
