/**
 * Servicio de Gestión y Autenticación de Cuentas de Google (OAuth 2.0 - HU-03 & HU-04)
 * Soporta almacenamiento dinámico local en AsyncStorage, sincronización de fotos de perfil (HU-04)
 * y persistencia de cuentas @gmail.com.
 */

import Storage from './storage';
import { isValidGmail, validatePassword } from '../utils/validators';

const GOOGLE_ACCOUNTS_KEY = '@unishare_google_accounts';

// Cuentas iniciales precargadas en el dispositivo para demostración
export const DEFAULT_INITIAL_GOOGLE_ACCOUNTS = [
  {
    id: '110293847561029384710',
    googleId: '110293847561029384710',
    uid_auth: '110293847561029384710',
    name: 'Camila Morales',
    email: 'camila.morales.estudiante@gmail.com',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    profile_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    ubicacion_general: 'Sector Parque Central / El Nogal'
  },
  {
    id: '109283746519283746520',
    googleId: '109283746519283746520',
    uid_auth: '109283746519283746520',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza.vecino@gmail.com',
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    ubicacion_general: 'Conjunto Residencial Los Álamos'
  }
];

export const GoogleAuthService = {
  isValidGmail,
  validatePassword,

  /**
   * Obtiene la lista de cuentas recordadas en el dispositivo desde AsyncStorage
   * @returns {Promise<Array>}
   */
  async getRememberedAccounts() {
    try {
      const stored = await Storage.getItem(GOOGLE_ACCOUNTS_KEY);
      let list = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }

      if (list.length === 0) {
        list = DEFAULT_INITIAL_GOOGLE_ACCOUNTS;
        await Storage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(list));
      }

      // Sincronizar con la foto más reciente del usuario almacenado en AsyncStorage (@unishare_user)
      try {
        const currentUserRaw = await Storage.getItem('@unishare_user');
        if (currentUserRaw) {
          const currentUser = JSON.parse(currentUserRaw);
          if (currentUser?.correo && isValidGmail(currentUser.correo)) {
            const userEmail = currentUser.correo.toLowerCase();
            const latestPhoto = currentUser.profile_image || null;

            list = list.map((acc) => {
              if (acc.email && acc.email.toLowerCase() === userEmail) {
                return {
                  ...acc,
                  name: currentUser.nombre || acc.name,
                  photoUrl: latestPhoto || null,
                  profile_image: latestPhoto || null,
                  picture: latestPhoto || null
                };
              }
              return acc;
            });
          }
        }
      } catch (syncErr) {
        // Silencioso si falla la sincronización secundaria
      }

      return list;
    } catch (error) {
      console.warn('[GoogleAuthService] Error cargando cuentas recordadas:', error);
      return DEFAULT_INITIAL_GOOGLE_ACCOUNTS;
    }
  },

  /**
   * Guarda o actualiza una cuenta @gmail.com en la memoria local del dispositivo
   * @param {Object} account Datos de la cuenta (name, email, photoUrl, profile_image, etc.)
   */
  async saveRememberedAccount(account) {
    try {
      if (!account || !account.email) return;

      const cleanEmail = account.email.trim().toLowerCase();

      // Validación estricta: solo se almacenan correos @gmail.com
      if (!isValidGmail(cleanEmail)) {
        return;
      }

      const currentAccounts = await this.getRememberedAccounts();

      let uid = account.id || account.googleId || account.uid_auth;
      if (!uid) {
        let hash = 0;
        for (let i = 0; i < cleanEmail.length; i++) {
          hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
          hash |= 0;
        }
        uid = `10${Math.abs(hash)}829104`;
      }

      const resolvedPhoto = account.profile_image !== undefined
        ? account.profile_image
        : (account.photoUrl || account.picture || null);

      const formattedAccount = {
        id: String(uid),
        googleId: String(uid),
        uid_auth: String(uid),
        name: account.name && account.name.trim() ? account.name.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        photoUrl: resolvedPhoto,
        profile_image: resolvedPhoto,
        picture: resolvedPhoto,
        ubicacion_general: account.ubicacion_general || 'Sector Comunitario / Por definir'
      };

      const filtered = currentAccounts.filter(
        (acc) => acc.email.toLowerCase() !== cleanEmail
      );

      const updatedList = [formattedAccount, ...filtered];
      await Storage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(updatedList));
      return formattedAccount;
    } catch (error) {
      console.warn('[GoogleAuthService] Error guardando cuenta recordada:', error);
    }
  },

  /**
   * Actualiza o elimina la foto de perfil en AsyncStorage para una cuenta específica (HU-04)
   * @param {string} email Correo electrónico de la cuenta
   * @param {string|null} newPhotoUrl Nueva URL/Base64 o null para eliminar
   */
  async updateAccountPhoto(email, newPhotoUrl) {
    try {
      if (!email) return;
      const cleanEmail = email.trim().toLowerCase();
      const accounts = await this.getRememberedAccounts();

      const updated = accounts.map((acc) => {
        if (acc.email && acc.email.toLowerCase() === cleanEmail) {
          return {
            ...acc,
            photoUrl: newPhotoUrl || null,
            profile_image: newPhotoUrl || null,
            picture: newPhotoUrl || null
          };
        }
        return acc;
      });

      await Storage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[GoogleAuthService] Error actualizando foto en cuenta de Google:', error);
    }
  },

  /**
   * Crea un perfil estructurado para enviar al backend
   */
  createProfile(name, email, password, photoUrl, ubicacion) {
    const cleanEmail = email.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
      hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
      hash |= 0;
    }
    const googleId = `10${Math.abs(hash)}829104`;
    const resolvedPhoto = photoUrl || null;

    return {
      id: googleId,
      googleId: googleId,
      uid_auth: googleId,
      name: name && name.trim() ? name.trim() : cleanEmail.split('@')[0],
      email: cleanEmail,
      password: password && password.trim() ? password.trim() : undefined,
      photoUrl: resolvedPhoto,
      profile_image: resolvedPhoto,
      picture: resolvedPhoto,
      ubicacion_general: ubicacion || 'Sector Comunitario / Por definir'
    };
  }
};

export default GoogleAuthService;
