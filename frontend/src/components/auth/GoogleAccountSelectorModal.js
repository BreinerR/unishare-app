import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import Colors, { EUCALIPTO_PALETTE } from '../../constants/colors';
import { GoogleAuthService } from '../../services/googleAuth';
import { validatePassword, isValidGmail } from '../../utils/validators';

export default function GoogleAccountSelectorModal({ visible, onClose, onSelectAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Cargar cuentas dinámicas de Google guardadas en AsyncStorage
  useEffect(() => {
    if (visible) {
      loadAccounts();
      setShowAddForm(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowPassword(false);
      setValidationError('');
    }
  }, [visible]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const list = await GoogleAuthService.getRememberedAccounts();
      setAccounts(list);
    } catch (error) {
      console.warn('[GoogleAccountSelectorModal] Error cargando cuentas:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSelectAccount = async (account) => {
    await GoogleAuthService.saveRememberedAccount(account);
    onSelectAccount(account);
  };

  const isFormComplete =
    newName.trim().length > 0 &&
    newEmail.trim().length > 0 &&
    newPassword.length > 0;

  const handleAddAndSubmit = async () => {
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();

    // 1. Validación de campos obligatorios (Nombre, Correo y Contraseña)
    if (!cleanName) {
      setValidationError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!cleanEmail) {
      setValidationError('Por favor ingresa tu correo de Google.');
      return;
    }

    if (!newPassword) {
      setValidationError('Por favor ingresa una contraseña.');
      return;
    }

    // 2. Validación estricta de dominio @gmail.com
    if (!isValidGmail(cleanEmail)) {
      setValidationError(
        '⚠️ Cuenta no permitida: Debe ser una cuenta oficial de Google terminada en @gmail.com (no se admiten dominios como @hotmail.com o @yahoo.com).'
      );
      return;
    }

    // 3. Validación estricta de contraseña (mínimo 6 caracteres, letras y números)
    const passValidation = validatePassword(newPassword);
    if (!passValidation.isValid) {
      setValidationError(passValidation.message);
      return;
    }

    setValidationError('');

    const newProfile = GoogleAuthService.createProfile(
      cleanName,
      cleanEmail,
      newPassword,
      null,
      'Sector Comunitario / Por definir'
    );

    // Guardar en la lista dinámica de cuentas del dispositivo
    await GoogleAuthService.saveRememberedAccount(newProfile);

    // Enviar al flujo de autenticación
    onSelectAccount(newProfile);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          {/* Cabecera con Logotipo Oficial de Google y Título Solicitado */}
          <View style={styles.header}>
            <View style={styles.googleLogoBadge}>
              <Text style={styles.googleLogoG}>G</Text>
            </View>
            <Text style={styles.title}>Elige una cuenta</Text>
            <Text style={styles.subtitle}>
              Para continuar en <Text style={styles.brandHighlight}>UniShare</Text>
            </Text>
          </View>

          {/* Contenido: Lista Dinámica de Cuentas */}
          {loadingAccounts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={EUCALIPTO_PALETTE.verdeOscuro} size="small" />
              <Text style={styles.loadingText}>Cargando cuentas de Google del dispositivo...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.accountsScroll}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Lista dinámica de cuentas @gmail.com */}
              {accounts.map((acc, index) => (
                <TouchableOpacity
                  key={acc.id || acc.email || index}
                  style={styles.accountItem}
                  onPress={() => handleSelectAccount(acc)}
                  activeOpacity={0.7}
                >
                  {acc.photoUrl ? (
                    <Image source={{ uri: acc.photoUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {(acc.name || acc.email).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.accountTextContainer}>
                    <Text style={styles.accountName} numberOfLines={1}>
                      {acc.name || acc.email.split('@')[0]}
                    </Text>
                    <Text style={styles.accountEmail} numberOfLines={1}>
                      {acc.email}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}

              {/* Opción "Agregar otra cuenta" */}
              {!showAddForm ? (
                <TouchableOpacity
                  style={styles.addAccountButton}
                  onPress={() => {
                    setShowAddForm(true);
                    setValidationError('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.addIconCircle}>
                    <Text style={styles.addIconText}>+</Text>
                  </View>
                  <Text style={styles.addAccountText}>Agregar otra cuenta</Text>
                </TouchableOpacity>
              ) : (
                /* Formulario para añadir cuenta con Nombre, Correo @gmail.com y Contraseña con validación estricta */
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>Agregar cuenta de Google</Text>

                  {validationError ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorBoxText}>{validationError}</Text>
                    </View>
                  ) : null}

                  {/* Campo: Nombre Completo (Obligatorio) */}
                  <View style={styles.inputFieldGroup}>
                    <Text style={styles.inputLabel}>Nombre Completo *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Andrés Ramírez"
                      placeholderTextColor={Colors.textMuted}
                      value={newName}
                      onChangeText={(t) => {
                        setNewName(t);
                        if (validationError) setValidationError('');
                      }}
                    />
                  </View>

                  {/* Campo: Correo @gmail.com (Obligatorio) */}
                  <View style={styles.inputFieldGroup}>
                    <Text style={styles.inputLabel}>Correo de Google (@gmail.com) *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationError && validationError.includes('gmail.com')
                          ? styles.inputError
                          : null
                      ]}
                      placeholder="usuario@gmail.com"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={newEmail}
                      onChangeText={(t) => {
                        setNewEmail(t);
                        if (validationError) setValidationError('');
                      }}
                    />
                    <Text style={styles.hintText}>
                      Debe terminar obligatoriamente en <Text style={styles.boldText}>@gmail.com</Text>
                    </Text>
                  </View>

                  {/* Campo: Contraseña Obligatoria con Mostrar/Ocultar */}
                  <View style={styles.inputFieldGroup}>
                    <Text style={styles.inputLabel}>Contraseña *</Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.passwordInput,
                          validationError && validationError.includes('contraseña')
                            ? styles.inputError
                            : null
                        ]}
                        placeholder="Mínimo 6 caracteres (letras y números)"
                        placeholderTextColor={Colors.textMuted}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        value={newPassword}
                        onChangeText={(t) => {
                          setNewPassword(t);
                          if (validationError) setValidationError('');
                        }}
                      />
                      <TouchableOpacity
                        style={styles.eyeToggleBtn}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.eyeToggleText}>
                          {showPassword ? '👁️' : '🔒'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.hintText}>
                      Mínimo 6 caracteres, incluyendo al menos una letra y un número.
                    </Text>
                  </View>

                  <View style={styles.formActionsRow}>
                    <TouchableOpacity
                      style={styles.cancelFormBtn}
                      onPress={() => {
                        setShowAddForm(false);
                        setValidationError('');
                      }}
                    >
                      <Text style={styles.cancelFormBtnText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.submitFormBtn,
                        !isFormComplete && styles.submitFormBtnDisabled
                      ]}
                      onPress={handleAddAndSubmit}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.submitFormBtnText}>Continuar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Botón inferior de cerrar */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
    paddingBottom: 14
  },
  googleLogoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#EA4335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  googleLogoG: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 13,
    color: '#5F6368'
  },
  brandHighlight: {
    fontWeight: '700',
    color: EUCALIPTO_PALETTE.verdeOscuro
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary
  },
  accountsScroll: {
    maxHeight: 380
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4'
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: EUCALIPTO_PALETTE.verdeMedio,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  accountTextContainer: {
    flex: 1
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124'
  },
  accountEmail: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 2
  },
  chevron: {
    fontSize: 22,
    color: '#BDC1C6',
    fontWeight: '300',
    marginLeft: 6
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 4
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  addIconText: {
    fontSize: 20,
    color: '#5F6368',
    lineHeight: 22
  },
  addAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A73E8'
  },
  formContainer: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2EBE5'
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: EUCALIPTO_PALETTE.verdeOscuro,
    marginBottom: 8
  },
  errorBox: {
    backgroundColor: '#FDEDED',
    borderColor: '#F5C2C7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10
  },
  errorBoxText: {
    color: '#D32F2F',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500'
  },
  inputFieldGroup: {
    marginBottom: 10
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4
  },
  input: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#202124'
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center'
  },
  passwordInput: {
    paddingRight: 40
  },
  eyeToggleBtn: {
    position: 'absolute',
    right: 10,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  eyeToggleText: {
    fontSize: 16
  },
  inputError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF8F8'
  },
  hintText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3
  },
  boldText: {
    fontWeight: '700',
    color: EUCALIPTO_PALETTE.verdeOscuro
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8
  },
  cancelFormBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  cancelFormBtnText: {
    color: '#5F6368',
    fontSize: 13,
    fontWeight: '600'
  },
  submitFormBtn: {
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  submitFormBtnDisabled: {
    opacity: 0.5
  },
  submitFormBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  closeButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 10
  },
  closeButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  }
});
