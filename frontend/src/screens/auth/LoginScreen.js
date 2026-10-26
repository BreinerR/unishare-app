import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Colors, { EUCALIPTO_PALETTE } from '../../constants/colors';
import GoogleAuthService from '../../services/googleAuth';

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle } = useAuth();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!correo.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      await login(correo.trim(), password);
    } catch (error) {
      setErrorMessage(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage('');
      const googleRes = await GoogleAuthService.signInAsync();

      if (googleRes.success && googleRes.profile) {
        await loginWithGoogle({
          email: googleRes.profile.email,
          name: googleRes.profile.name,
          photoUrl: googleRes.profile.photoUrl,
          googleId: googleRes.profile.googleId,
          ubicacion_general: googleRes.profile.ubicacion_general
        });
      } else if (googleRes.message) {
        setErrorMessage(googleRes.message);
      }
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo completar el inicio de sesión con Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Cabecera Comunitaria con Fondo Verde Oscuro Protagonista */}
        <View style={styles.header}>
          <View style={styles.brandIconWrapper}>
            <Text style={styles.brandIconText}>🤝</Text>
          </View>
          <Text style={styles.appTitle}>UniShare</Text>
          <View style={styles.communityPill}>
            <Text style={styles.communityPillText}>Red Colaborativa Comunitaria</Text>
          </View>
          <Text style={styles.appSubtitle}>
            Préstamo e intercambio entre vecinos, barrios, conjuntos, empresas y colectivos
          </Text>
        </View>

        {/* Tarjeta de Formulario con Elegante Contraste */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenido a tu Comunidad</Text>
          <Text style={styles.cardDescription}>
            Accede para compartir objetos, ahorrar recursos y fortalecer la economía circular local.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Botón de Acceso Rápido con Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <View style={styles.googleButtonContent}>
                <View style={styles.googleIconBadge}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o ingresa con tu correo</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico (personal o laboral)</Text>
            <TextInput
              style={styles.input}
              placeholder="tu.correo@ejemplo.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={correo}
              onChangeText={(text) => {
                setCorreo(text);
                if (errorMessage) setErrorMessage('');
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerLinkContainer}>
            <Text style={styles.footerText}>¿Aún no eres miembro de la red? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Únete aquí</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro // #233B32 Protagonista de fondo
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 36
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  brandIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(221, 238, 227, 0.15)', // Fondo claro translúcido
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.accent // #8FBBA6
  },
  brandIconText: {
    fontSize: 32
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  communityPill: {
    backgroundColor: EUCALIPTO_PALETTE.fondoClaro,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 8
  },
  communityPillText: {
    color: EUCALIPTO_PALETTE.verdeOscuro,
    fontSize: 12,
    fontWeight: '700'
  },
  appSubtitle: {
    fontSize: 13,
    color: EUCALIPTO_PALETTE.fondoClaro,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
    opacity: 0.95
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18
  },
  errorBanner: {
    backgroundColor: '#FDEDED',
    borderColor: '#F5C2C7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500'
  },
  googleButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  googleIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center'
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: Colors.textMuted
  },
  inputGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6
  },
  input: {
    height: 48,
    backgroundColor: '#F7FAF8',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary
  },
  primaryButton: {
    height: 50,
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro, // #233B32
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: EUCALIPTO_PALETTE.verdeOscuro,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary // #4C7A66
  }
});
