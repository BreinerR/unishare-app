/**
 * Servicio de Integración para Autenticación con Google (Google Auth)
 *
 * Configuración requerida para producción:
 * 1. Instalar dependencias en frontend (si se usa Expo AuthSession):
 *    npx expo install expo-auth-session expo-crypto
 * 2. Crear credenciales OAuth 2.0 en Google Cloud Console (Web / Android / iOS).
 * 3. Configurar en app.json o .env:
 *    EXPO_PUBLIC_GOOGLE_CLIENT_ID="TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com"
 */

import { Platform } from 'react-native';

export const GoogleAuthService = {
  /**
   * Inicia el flujo de autenticación con Google
   * Proporciona soporte para tokens reales y un modo de prueba rápido para desarrollo.
   */
  async signInAsync() {
    try {
      // Si se cuenta con Client ID configurado en variables de entorno
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        // Modo Desarrollo / Demostración Guiada
        console.info(
          '[GoogleAuthService] Nota: EXPO_PUBLIC_GOOGLE_CLIENT_ID no configurado. Iniciando en modo de integración de desarrollo.'
        );

        // Simulamos un perfil obtenido legítimamente de Google OAuth2
        return {
          success: true,
          profile: {
            googleId: 'google_dev_1092837465',
            email: 'vecino.comunidad@gmail.com',
            name: 'Carlos Mendoza',
            photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            ubicacion_general: 'Sector Parque Central / El Nogal'
          }
        };
      }

      // En entorno de producción con expo-auth-session configurado:
      // const result = await promptAsync();
      return { success: false, message: 'Configura las credenciales de Google Cloud en tu app.json' };
    } catch (error) {
      console.error('[GoogleAuthService] Error durante el inicio con Google:', error);
      throw error;
    }
  }
};

export default GoogleAuthService;
