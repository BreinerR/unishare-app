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

export default function RegisterScreen({ navigation }) {
  const { register, loginWithGoogle } = useAuth();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [ubicacionGeneral, setUbicacionGeneral] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!nombre.trim() || !correo.trim() || !password) {
      setErrorMessage('Por favor completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      await register({
        nombre: nombre.trim(),
        correo: correo.trim(),
        password,
        ubicacion_general: ubicacionGeneral.trim() || 'Sector Comunitario General'
      });
    } catch (error) {
      setErrorMessage(error.message || 'Error al crear la cuenta comunitaria. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
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
          ubicacion_general: ubicacionGeneral.trim() || googleRes.profile.ubicacion_general
        });
      } else if (googleRes.message) {
        setErrorMessage(googleRes.message);
      }
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo vincular tu cuenta de Google.');
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
        {/* Cabecera con Verde Oscuro Protagonista */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Crea tu Cuenta</Text>
          <View style={styles.communityPill}>
            <Text style={styles.communityPillText}>Comunidad de Préstamo e Intercambio</Text>
          </View>
          <Text style={styles.appSubtitle}>
            Forma parte de la red colaborativa de tu barrio, conjunto o empresa
          </Text>
        </View>

        {/* Tarjeta de Formulario */}
        <View style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Acceso Rápido con Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleRegister}
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
                <Text style={styles.googleButtonText}>Registrarme con Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o completa tus datos</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Camila Morales"
              placeholderTextColor={Colors.textMuted}
              value={nombre}
              onChangeText={(text) => {
                setNombre(text);
                if (errorMessage) setErrorMessage('');
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico (personal o laboral) *</Text>
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
            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ubicación General (Barrio / Sector / Empresa / Conjunto)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Sector Parque Central / Conjunto Los Álamos"
              placeholderTextColor={Colors.textMuted}
              value={ubicacionGeneral}
              onChangeText={setUbicacionGeneral}
            />
            <View style={styles.privacyNoticeContainer}>
              <Text style={styles.privacyNoticeIcon}>🛡️</Text>
              <Text style={styles.privacyNoticeText}>
                Política de Privacidad Estricta (HU-04): Solo se muestra tu zona o sector general. NUNCA se solicitan ni comparten coordenadas GPS exactas ni la dirección de tu vivienda.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Crear Cuenta Comunitaria</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerLinkContainer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta en la red? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Inicia Sesión</Text>
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
    paddingVertical: 32
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  communityPill: {
    backgroundColor: EUCALIPTO_PALETTE.fondoClaro,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
    marginBottom: 6
  },
  communityPillText: {
    color: EUCALIPTO_PALETTE.verdeOscuro,
    fontSize: 11,
    fontWeight: '700'
  },
  appSubtitle: {
    fontSize: 13,
    color: EUCALIPTO_PALETTE.fondoClaro,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 18,
    opacity: 0.95
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8
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
    textAlign: 'center'
  },
  googleButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
    marginVertical: 12
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
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4
  },
  input: {
    height: 46,
    backgroundColor: '#F7FAF8',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary
  },
  privacyNoticeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(221, 238, 227, 0.45)', // #DDEEE3
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.accent
  },
  privacyNoticeIcon: {
    marginRight: 6,
    fontSize: 14
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: EUCALIPTO_PALETTE.verdeOscuro,
    lineHeight: 15,
    fontWeight: '500'
  },
  primaryButton: {
    height: 50,
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro, // #233B32
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
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
    marginTop: 16
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary
  }
});
