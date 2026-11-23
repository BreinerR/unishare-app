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
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import GoogleAccountSelectorModal from '../../components/auth/GoogleAccountSelectorModal';
import { validatePassword } from '../../utils/validators';

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle } = useAuth();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  /**
   * Al hacer clic en "Continuar con Google", despliega el modal interactivo
   * con el logotipo oficial de Google y el título "Elige una cuenta"
   */
  const handleGoogleLogin = () => {
    setErrorMessage('');
    setShowGoogleModal(true);
  };

  /**
   * Procesa la cuenta seleccionada en el modal, enviando los datos al backend
   * (/api/auth/google) para autenticar o auto-registrar al usuario en PostgreSQL (CA4)
   */
  const handleAccountSelectedFromModal = async (account) => {
    setShowGoogleModal(false);
    try {
      setGoogleLoading(true);
      setErrorMessage('');

      await loginWithGoogle({
        id: account.id,
        googleId: account.googleId || account.id,
        uid_auth: account.uid_auth || account.id,
        email: account.email,
        name: account.name,
        password: account.password,
        photoUrl: account.photoUrl || account.picture,
        ubicacion_general: account.ubicacion_general || 'Sector Comunitario / Por definir'
      });
    } catch (error) {
      console.error('[GoogleLogin Error]:', error);
      setErrorMessage(error.message || 'Error al autenticar con la cuenta de Google seleccionada.');
    } finally {
      setGoogleLoading(false);
    }
  };

  /**
   * Inicio de sesión con correo y contraseña con validación estricta de seguridad
   */
  const handleLogin = async () => {
    if (!correo.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    // Validación estricta de contraseña (longitud mínima 6, letras y números)
    const passValidation = validatePassword(password);
    if (!passValidation.isValid) {
      setErrorMessage(passValidation.message);
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

          {/* Botón de Acceso con Google */}
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
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '🔒'}</Text>
              </TouchableOpacity>
            </View>
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

      {/* Selector Modal Inteligente y Sincronizado de Cuentas Google */}
      <GoogleAccountSelectorModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleAccountSelectedFromModal}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: SICILY_PALETTE.azulProfundo // #1D59BB Identidad de marca
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
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: SICILY_PALETTE.amarilloCalido // #FEBD19
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
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 8
  },
  communityPillText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 12,
    fontWeight: '800'
  },
  appSubtitle: {
    fontSize: 13,
    color: '#EBF3FE',
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
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center'
  },
  passwordInput: {
    paddingRight: 44
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  eyeIconText: {
    fontSize: 16
  },
  primaryButton: {
    height: 50,
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19 Acción Principal
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 16,
    fontWeight: '800'
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
    fontWeight: '800',
    color: SICILY_PALETTE.azulProfundo
  }
});
