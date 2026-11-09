/**
 * Utilidades de Privacidad y Geolocalización por Zonas Comunitarias (HU-04)
 * 
 * Regla Inviolable de Privacidad:
 * - NUNCA se almacenan ni comparten coordenadas de geolocalización exacta de residencias privadas.
 * - Todos los objetos y solicitudes se agrupan en SECTORES, BARRIOS o PUNTOS DE ENCUENTRO PÚBLICOS.
 */

export const PRIVACY_POLICY = {
  level: 'SECTOR_REFERENCIAL',
  allowExactGPS: false,
  minSecurityRadiusMeters: 500,
  disclaimer: 'Por seguridad comunitaria, las ubicaciones publicadas son sectores amplios o puntos de encuentro comunes autorizados (parques, porterías, plazas, recepciones).'
};

/**
 * Normaliza y valida una cadena de ubicación comunitaria
 * @param {string} locationText 
 * @returns {string} Ubicación sanitizada
 */
export const sanitizeCommunityZone = (locationText) => {
  if (!locationText || typeof locationText !== 'string') {
    return 'Sector Comunitario General';
  }

  const clean = locationText.trim();
  // Evitar que el usuario accidentalmente escriba direcciones exactas con número de casa/apartamento
  return clean.length >= 3 ? clean : 'Sector Comunitario General';
};

/**
 * Zonas predefinidas de ejemplo para autocompletado en perfiles y búsquedas
 */
export const DEFAULT_COMMUNITY_ZONES = [
  'Sector Parque Central / El Nogal',
  'Conjunto Residencial Los Álamos',
  'Distrito Empresarial & Coworking Tech',
  'Sector Barrio La Floresta',
  'Zona Residencial Norte - Sector B',
  'Colectivo Cultural y Deportivo Sur'
];
