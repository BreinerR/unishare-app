/**
 * Paleta de Colores Semántica "Sicily" - UniShare
 * Arquitectura de diseño limpio, minimalismo y alta legibilidad:
 * - Identidad / Marca (#1D59BB): Azul profundo para encabezados, branding y acentos principales.
 * - Acción Principal (#76B9FF / #FEBD19): Azul claro y amarillo cálido para CTAs clave.
 * - Fondo / Superficie (#FEF3B3 / #F8F9FA): Neutros claros que reducen la fatiga visual.
 * - Estados Semánticos: Verde, naranja suave y rojo accesibles.
 */

export const SICILY_PALETTE = {
  azulProfundo: '#1D59BB', // Identidad y marca
  azulClaro: '#76B9FF',    // Acción secundaria / Acentos vivos
  amarilloCalido: '#FEBD19', // Acción principal / CTAs clave
  amarilloSuave: '#FEF3B3',  // Superficie cálida / Destacados
  blancoRoto: '#F8F9FA',     // Fondo general neutro
  azulSuave: '#EBF3FE',      // Superficies tenues
  textoOscuro: '#0D2149',    // Texto principal de alto contraste
  textoMedio: '#475B7D',     // Subtítulos y etiquetas secundarias
  textoMuted: '#8596B2'      // Placeholders y texto desactivado
};

/**
 * Alias de compatibilidad semántica: mapea tokens de EUCALIPTO_PALETTE a la paleta SICILY
 * para prevenir errores de ReferenceError en tiempo de ejecución.
 */
export const EUCALIPTO_PALETTE = {
  verdeOscuro: SICILY_PALETTE.azulProfundo,   // #1D59BB
  verdeMedio: SICILY_PALETTE.azulClaro,       // #76B9FF
  verdeClaro: SICILY_PALETTE.amarilloCalido,  // #FEBD19
  fondoClaro: SICILY_PALETTE.amarilloSuave    // #FEF3B3
};

export const Colors = {
  // Marca e Identidad
  primary: SICILY_PALETTE.azulProfundo,
  secondary: SICILY_PALETTE.azulClaro,
  accent: SICILY_PALETTE.amarilloCalido,
  actionPrimary: SICILY_PALETTE.amarilloCalido,
  actionSecondary: SICILY_PALETTE.azulClaro,
  brandBlue: SICILY_PALETTE.azulProfundo,
  brandYellow: SICILY_PALETTE.amarilloCalido,

  // Fondos y Superficies (Neutros y cálidos, evitando blanco puro o negro puro)
  background: SICILY_PALETTE.blancoRoto,
  surface: '#FFFFFF',
  surfaceSoft: SICILY_PALETTE.azulSuave,
  surfaceWarm: SICILY_PALETTE.amarilloSuave,
  surfaceHighlight: SICILY_PALETTE.amarilloSuave,
  surfaceMuted: '#F1F4F9',

  // Tipografía y Textos
  textPrimary: SICILY_PALETTE.textoOscuro,
  textSecondary: SICILY_PALETTE.textoMedio,
  textMuted: SICILY_PALETTE.textoMuted,
  textOnPrimary: '#FFFFFF',
  textOnAction: '#0D2149', // Contraste oscuro óptimo sobre amarillo cálido

  // Estados y Semántica
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#ED6C02',
  warningLight: '#FFF3E0',
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  info: SICILY_PALETTE.azulProfundo,
  infoLight: SICILY_PALETTE.azulSuave,

  // Bordes y Divisores
  border: '#DCE4F0',
  borderLight: '#EDF2F8',

  // Estados de Transacción (Préstamos y Trueques)
  status: {
    disponible: '#2E7D32',
    prestado: SICILY_PALETTE.azulProfundo,
    enTrueque: '#E67E22',
    completado: '#1B5E20',
    cancelado: '#D32F2F'
  }
};

export default Colors;
