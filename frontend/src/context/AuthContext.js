import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Storage from '../services/storage';
import { GoogleAuthService } from '../services/googleAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicialización: Restaurar token y perfil en el inicio de la app
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await Storage.getItem('@unishare_token');
        const storedUser = await Storage.getItem('@unishare_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verificar validez contra el backend de manera transparente
          try {
            const res = await api.get('/users/profile');
            if (res.success && res.user) {
              setUser(res.user);
              await Storage.setItem('@unishare_user', JSON.stringify(res.user));
            }
          } catch (err) {
            // Si el token expiró (401), cerrar sesión
            if (err.status === 401) {
              await logout();
            }
          }
        }
      } catch (e) {
        console.warn('Error restaurando sesión:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (correo, password) => {
    const res = await api.post('/auth/login', { correo, password });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      await Storage.setItem('@unishare_token', res.token);
      await Storage.setItem('@unishare_user', JSON.stringify(res.user));
    }
    return res;
  };

  const loginWithGoogle = async (googleData) => {
    const res = await api.post('/auth/google', googleData);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      await Storage.setItem('@unishare_token', res.token);
      await Storage.setItem('@unishare_user', JSON.stringify(res.user));

      // Guardar en la lista dinámica de cuentas recordadas de Google si es @gmail.com
      if (googleData.email && GoogleAuthService.isValidGmail(googleData.email)) {
        await GoogleAuthService.saveRememberedAccount({
          id: googleData.id || googleData.googleId || res.user.uid_auth,
          name: googleData.name || res.user.nombre,
          email: googleData.email,
          photoUrl: googleData.photoUrl || googleData.picture || res.user.foto_perfil,
          ubicacion_general: googleData.ubicacion_general || res.user.ubicacion_general
        });
      }
    }
    return res;
  };

  const register = async ({ nombre, correo, password, ubicacion_general }) => {
    const res = await api.post('/auth/register', {
      nombre,
      correo,
      password,
      ubicacion_general
    });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      await Storage.setItem('@unishare_token', res.token);
      await Storage.setItem('@unishare_user', JSON.stringify(res.user));

      // Sincronización automática con el selector de Google:
      // Si el usuario se registra con un correo @gmail.com, se guarda en las cuentas recordadas del dispositivo
      if (correo && GoogleAuthService.isValidGmail(correo)) {
        await GoogleAuthService.saveRememberedAccount({
          name: nombre,
          email: correo,
          ubicacion_general: ubicacion_general
        });
      }
    }
    return res;
  };

  const updateProfile = async ({ nombre, ubicacion_general, foto_perfil }) => {
    const res = await api.put('/users/profile', {
      nombre,
      ubicacion_general,
      foto_perfil
    });
    if (res.success && res.user) {
      setUser(res.user);
      await Storage.setItem('@unishare_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Storage.removeItem('@unishare_token');
    await Storage.removeItem('@unishare_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        loginWithGoogle,
        register,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
