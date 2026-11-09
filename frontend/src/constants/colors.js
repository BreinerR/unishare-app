/**
 * Paleta de Colores Corporativa "Eucalipto" - UniShare
 * Diseñada para coherencia visual, accesibilidad y soporte de modos de contraste.
 */

export const EUCALIPTO_PALETTE = {
  // Colores Base de Marca "Eucalipto"
  verdeOscuro: '#233B32', // Principal / Navbar / Botones primarios
  verdeMedio: '#4C7A66',  // Acentos / Acciones secundarias / Iconos activos
  verdeClaro: '#8FBBA6',  // Badges / Estados activos / Tags
  fondoClaro: '#DDEEE3',  // Fondo claro / Tarjetas destacadas / Superficies suaves
};

export const Colors = {
  // Marca
  primary: EUCALIPTO_PALETTE.verdeOscuro,
  secondary: EUCALIPTO_PALETTE.verdeMedio,
  accent: EUCALIPTO_PALETTE.verdeClaro,
  surfaceSoft: EUCALIPTO_PALETTE.fondoClaro,

  // Fondos y Superficies
  background: '#F8FAF8',       // Fondo general de pantallas
  surface: '#FFFFFF',          // Fondo de tarjetas y modales
  surfaceMuted: '#EFF5F1',     // Fondo secundario atenuado

  // Tipografía y Textos
  textPrimary: '#14211C',      // Texto principal de alto contraste
  textSecondary: '#4A5B53',    // Subtítulos y etiquetas secundarias
  textMuted: '#7D8E86',        // Placeholders y texto desactivado
  textOnPrimary: '#FFFFFF',    // Texto sobre botones oscuros

  // Estados y Semántica
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#D32F2F',
  info: '#0288D1',

  // Bordes y Divisores
  border: '#CFDCD4',
  borderLight: '#E8F1EC',

  // Estados de Transacción (Préstamos y Trueques)
  status: {
    disponible: '#4C7A66',
    prestado: '#8FBBA6',
    enTrueque: '#D4A373',
    completado: '#233B32',
    cancelado: '#D32F2F'
  }
};

export default Colors;
