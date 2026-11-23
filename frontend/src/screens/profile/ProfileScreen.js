import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ActionSheetIOS
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService } from '../../services/objectService';
import { resolveImageUrl } from '../../services/api';

export default function ProfileScreen({ navigation }) {
  const { user, updateProfile, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [ubicacionGeneral, setUbicacionGeneral] = useState(user?.ubicacion_general || '');
  const [saving, setSaving] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [myObjects, setMyObjects] = useState([]);

  // Obtener foto de perfil activa normalizada
  const currentPhoto = resolveImageUrl(user?.profile_image) || user?.profile_image || null;

  // Cargar publicaciones del propio usuario (HU-07 & HU-08)
  const loadMyObjects = async () => {
    try {
      const res = await ObjectService.getObjects({ my_objects: 'true' });
      if (res.success && Array.isArray(res.objects)) {
        setMyObjects(res.objects);
      }
    } catch (e) {
      console.warn('Error cargando publicaciones del usuario:', e);
    }
  };

  useEffect(() => {
    loadMyObjects();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadMyObjects();
    });
    return unsubscribe;
  }, [navigation]);

  // Sincronizar estados locales cuando cambie el usuario en contexto
  React.useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setUbicacionGeneral(user.ubicacion_general || '');
    }
  }, [user]);

  // Selección de foto desde la Galería
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso Requerido',
          'Se necesita acceso a la galería de fotos para cambiar tu foto de perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imagePayload = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        await saveNewPhoto(imagePayload);
      }
    } catch (err) {
      console.warn('Error al seleccionar imagen:', err);
      setStatusMessage({ text: 'No se pudo cargar la imagen seleccionada.', type: 'error' });
    }
  };

  // Toma de foto usando la Cámara
  const handleTakePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso Requerido',
          'Se necesita permiso de cámara para tomar una nueva foto de perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imagePayload = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        await saveNewPhoto(imagePayload);
      }
    } catch (err) {
      console.warn('Error capturando foto:', err);
      setStatusMessage({ text: 'No se pudo capturar la foto con la cámara.', type: 'error' });
    }
  };

  // Guardar nueva foto en backend y memoria local
  const saveNewPhoto = async (imageString) => {
    try {
      setUpdatingPhoto(true);
      setStatusMessage({ text: '', type: '' });
      await updateProfile({
        nombre: nombre.trim() || user?.nombre,
        ubicacion_general: ubicacionGeneral.trim() || user?.ubicacion_general,
        profile_image: imageString
      });
      setStatusMessage({
        text: '✓ Foto de perfil actualizada y sincronizada exitosamente.',
        type: 'success'
      });
    } catch (err) {
      setStatusMessage({
        text: err.message || 'Error al guardar la foto de perfil.',
        type: 'error'
      });
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // Eliminar foto de perfil
  const handleDeletePhoto = () => {
    Alert.alert(
      'Eliminar Foto de Perfil',
      '¿Deseas eliminar tu foto actual y volver al avatar por defecto con tus iniciales?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Foto',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingPhoto(true);
              setStatusMessage({ text: '', type: '' });
              await updateProfile({
                nombre: nombre.trim() || user?.nombre,
                ubicacion_general: ubicacionGeneral.trim() || user?.ubicacion_general,
                profile_image: null
              });
              setStatusMessage({
                text: '✓ Foto eliminada. Se restableció el avatar por defecto.',
                type: 'success'
              });
            } catch (err) {
              setStatusMessage({
                text: err.message || 'Error al eliminar la foto de perfil.',
                type: 'error'
              });
            } finally {
              setUpdatingPhoto(false);
            }
          }
        }
      ]
    );
  };

  // Desplegar menú de opciones para la foto
  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      const options = ['Tomar Foto con Cámara', 'Elegir de la Galería'];
      if (currentPhoto) options.push('Eliminar Foto Actual');
      options.push('Cancelar');

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: currentPhoto ? 2 : undefined,
          title: 'Foto de Perfil Comunitaria'
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleTakePhotoWithCamera();
          else if (buttonIndex === 1) handlePickFromGallery();
          else if (currentPhoto && buttonIndex === 2) handleDeletePhoto();
        }
      );
    } else {
      const buttons = [
        { text: 'Tomar Foto', onPress: handleTakePhotoWithCamera },
        { text: 'Galería', onPress: handlePickFromGallery }
      ];

      if (currentPhoto) {
        buttons.push({
          text: 'Eliminar Foto',
          style: 'destructive',
          onPress: handleDeletePhoto
        });
      }

      buttons.push({ text: 'Cancelar', style: 'cancel' });

      Alert.alert('Foto de Perfil', 'Elige cómo actualizar tu imagen:', buttons);
    }
  };

  // Guardar cambios de texto (Nombre y Ubicación General)
  const handleSaveProfile = async () => {
    if (!nombre.trim() || nombre.trim().length < 3) {
      setStatusMessage({ text: 'El nombre debe tener al menos 3 caracteres.', type: 'error' });
      return;
    }

    if (!ubicacionGeneral.trim()) {
      setStatusMessage({
        text: 'Por favor indica tu sector o barrio de referencia.',
        type: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage({ text: '', type: '' });
      await updateProfile({
        nombre: nombre.trim(),
        ubicacion_general: ubicacionGeneral.trim(),
        profile_image: currentPhoto
      });
      setIsEditing(false);
      setStatusMessage({
        text: '✓ Perfil comunitario actualizado y guardado en PostgreSQL.',
        type: 'success'
      });
    } catch (error) {
      setStatusMessage({
        text: error.message || 'Error al actualizar el perfil en la base de datos.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNombre(user?.nombre || '');
    setUbicacionGeneral(user?.ubicacion_general || '');
    setIsEditing(false);
    setStatusMessage({ text: '', type: '' });
  };

  const confirmLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta en UniShare?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout }
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Tarjeta de Encabezado con Verde Oscuro Protagonista (#233B32) */}
      <View style={styles.profileHeaderCard}>
        {/* Avatar Interactivo con Botón Flotante de Cámara */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            style={styles.avatarTouchArea}
            onPress={showPhotoOptions}
            activeOpacity={0.85}
          >
            {updatingPhoto ? (
              <View style={[styles.avatarContainer, styles.avatarLoading]}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{getInitials(user?.nombre)}</Text>
              </View>
            )}

            {/* Badge de Cámara Flotante para cambiar foto */}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.nombre || 'Miembro Comunitario'}</Text>
        <Text style={styles.userEmail}>{user?.correo}</Text>

        {/* Badges de Reputación y Rol (CA1) */}
        <View style={styles.badgesRow}>
          <View style={styles.communityBadge}>
            <Text style={styles.communityBadgeText}>MIEMBRO COMUNITARIO</Text>
          </View>
          <View style={styles.reputationBadge}>
            <Ionicons name="star" size={12} color="#8A5D00" />
            <Text style={styles.reputationBadgeText}>
              {user?.reputacion ? Number(user.reputacion).toFixed(1) : '5.0'} Confianza Vecinal
            </Text>
          </View>
        </View>
      </View>

      {/* Banner de Mensaje de Estado */}
      {statusMessage.text ? (
        <View
          style={[
            styles.messageBanner,
            statusMessage.type === 'success' ? styles.successBanner : styles.errorBanner
          ]}
        >
          <Text
            style={[
              styles.messageText,
              statusMessage.type === 'success' ? styles.successText : styles.errorText
            ]}
          >
            {statusMessage.text}
          </Text>
        </View>
      ) : null}

      {/* Tarjeta de Información del Perfil */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Información del Perfil</Text>
          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setIsEditing(true);
                setStatusMessage({ text: '', type: '' });
              }}
            >
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          /* Formulario de Edición Permitida (Nombre, Ubicación General y Foto) */
          <View style={styles.formContainer}>
            {/* Campo: Nombre Completo (Editable - CA2) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre Completo *</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tu nombre completo"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Campo: Ubicación General (Editable - CA2, CA4) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ubicación General (Barrio / Sector / Empresa) *</Text>
              <TextInput
                style={styles.input}
                value={ubicacionGeneral}
                onChangeText={setUbicacionGeneral}
                placeholder="Ej. Cali, Valle / Barrio El Nogal"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.privacyNoticeBox}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#6B4E00" />
                <Text style={styles.privacyNoticeText}>
                  Tu ubicación se muestra de forma general para proteger la privacidad de tu domicilio.
                </Text>
              </View>
            </View>

            {/* Campo de Solo Lectura: Correo Electrónico (Restricción HU-04) */}
            <View style={styles.readOnlyFieldBox}>
              <View style={styles.readOnlyHeader}>
                <Text style={styles.readOnlyLabel}>Correo Electrónico</Text>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={SICILY_PALETTE.azulProfundo} />
                  <Text style={styles.lockBadgeText}>Solo Lectura</Text>
                </View>
              </View>
              <Text style={styles.readOnlyValue}>{user?.correo}</Text>
              <Text style={styles.readOnlyNote}>
                El correo está vinculado a tu cuenta verificada y no puede ser alterado.
              </Text>
            </View>

            {/* Campo de Solo Lectura: Reputación y Calificación (Restricción HU-04) */}
            <View style={styles.readOnlyFieldBox}>
              <View style={styles.readOnlyHeader}>
                <Text style={styles.readOnlyLabel}>Reputación Comunitaria</Text>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={SICILY_PALETTE.azulProfundo} />
                  <Text style={styles.lockBadgeText}>Solo Lectura</Text>
                </View>
              </View>
              <Text style={styles.readOnlyValue}>
                ★ {user?.reputacion ? Number(user.reputacion).toFixed(1) : '5.0'} / 5.0
              </Text>
              <Text style={styles.readOnlyNote}>
                La calificación se deriva exclusivamente del cumplimiento en préstamos y trueques.
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Vista de Solo Lectura (CA1) */
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{user?.nombre || 'Por definir'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Correo Electrónico:</Text>
              <Text style={styles.infoValue}>{user?.correo}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ubicación General:</Text>
              <Text style={styles.infoValue}>
                {user?.ubicacion_general || 'Sector Comunitario General'}
              </Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Calificación de Préstamos:</Text>
              <View style={styles.reputationPill}>
                <Ionicons name="star" size={11} color="#8A5D00" />
                <Text style={styles.reputationPillText}>
                  {user?.reputacion ? Number(user.reputacion).toFixed(1) : '5.0'}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado de la Cuenta:</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {user?.estado_cuenta ? user.estado_cuenta.toUpperCase() : 'ACTIVO'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Sección: Mis Publicaciones Comunitarias */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis Publicaciones ({myObjects.length})</Text>
          <TouchableOpacity
            style={styles.newPublishPill}
            onPress={() => navigation?.navigate('Publicar')}
          >
            <Text style={styles.newPublishPillText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>

        {myObjects.length === 0 ? (
          <View style={styles.emptyObjectsBox}>
            <Text style={styles.emptyObjectsText}>
              Aún no tienes objetos compartidos en la red.
            </Text>
            <TouchableOpacity
              style={styles.createFirstObjectBtn}
              onPress={() => navigation?.navigate('Publicar')}
            >
              <Text style={styles.createFirstObjectBtnText}>Publicar Mi Primer Objeto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.myObjectsList}>
            {myObjects.map((obj) => (
              <TouchableOpacity
                key={obj.id}
                style={styles.myObjectItem}
                onPress={() => navigation?.navigate('ItemDetail', { objectId: obj.id, item: obj })}
                activeOpacity={0.7}
              >
                {Array.isArray(obj.imagenes) && obj.imagenes.length > 0 ? (
                  <Image source={{ uri: resolveImageUrl(obj.imagenes[0]) || obj.imagenes[0] }} style={styles.myObjectImg} />
                ) : (
                  <View style={styles.myObjectImgFallback}>
                    <Ionicons name="cube-outline" size={22} color={SICILY_PALETTE.azulProfundo} />
                  </View>
                )}

                <View style={styles.myObjectInfo}>
                  <Text style={styles.myObjectName} numberOfLines={1}>{obj.nombre}</Text>
                  <View style={styles.myObjectZoneRow}>
                    <Ionicons name="location-outline" size={11} color={SICILY_PALETTE.textoMedio} />
                    <Text style={styles.myObjectZone} numberOfLines={1}>{obj.ubicacion}</Text>
                  </View>
                  <View style={styles.myObjectStateRow}>
                    <View style={[styles.statePill, obj.estado === 'disponible' ? styles.statePillAvailable : styles.statePillRetired]}>
                      <Text style={styles.statePillText}>{obj.estado?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.myObjectModalityText}>{obj.tipo_disponibilidad?.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.myObjectChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Botón de Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.8}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background // #F8F9FA
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border
  },
  avatarWrapper: {
    marginBottom: 12,
    position: 'relative'
  },
  avatarTouchArea: {
    position: 'relative'
  },
  avatarContainer: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: SICILY_PALETTE.azulSuave,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  avatarLoading: {
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: SICILY_PALETTE.azulProfundo
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4
  },
  cameraIcon: {
    fontSize: 14
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 4
  },
  userEmail: {
    fontSize: 13,
    color: SICILY_PALETTE.textoMedio,
    marginBottom: 12
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  communityBadge: {
    backgroundColor: SICILY_PALETTE.azulSuave,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0E2FC'
  },
  communityBadgeText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 11,
    fontWeight: '700'
  },
  reputationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.4)'
  },
  reputationBadgeText: {
    color: '#8A5D00',
    fontSize: 11,
    fontWeight: '800'
  },
  messageBanner: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1
  },
  successBanner: {
    backgroundColor: Colors.successLight,
    borderColor: '#C8E6C9'
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderColor: '#FFCDD2'
  },
  messageText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600'
  },
  successText: {
    color: Colors.success
  },
  errorText: {
    color: Colors.error
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  },
  editButton: {
    backgroundColor: SICILY_PALETTE.azulSuave,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10
  },
  editButtonText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 13,
    fontWeight: '700'
  },
  infoList: {
    gap: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 13,
    color: SICILY_PALETTE.textoMedio,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    color: SICILY_PALETTE.textoOscuro,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right'
  },
  reputationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.4)'
  },
  reputationPillText: {
    color: '#8A5D00',
    fontSize: 12,
    fontWeight: '700'
  },
  statusPill: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  statusPillText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '700'
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.borderLight
  },
  formContainer: {
    gap: 14
  },
  inputGroup: {
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 6
  },
  input: {
    height: 48,
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: SICILY_PALETTE.textoOscuro
  },
  privacyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.35)'
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#6B4E00',
    lineHeight: 16
  },
  boldText: {
    fontWeight: '700',
    color: '#8A5D00'
  },
  readOnlyFieldBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },
  readOnlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SICILY_PALETTE.textoMedio
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SICILY_PALETTE.azulSuave,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  lockBadgeText: {
    fontSize: 10,
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '600'
  },
  readOnlyValue: {
    fontSize: 14,
    color: SICILY_PALETTE.textoOscuro,
    fontWeight: '600'
  },
  readOnlyNote: {
    fontSize: 10,
    color: SICILY_PALETTE.textoMuted,
    marginTop: 4
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelButtonText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 14,
    fontWeight: '600'
  },
  saveButton: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2
  },
  saveButtonText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 14,
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border
  },
  communityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SICILY_PALETTE.azulProfundo,
    marginBottom: 6
  },
  communityText: {
    fontSize: 12,
    color: SICILY_PALETTE.textoMedio,
    lineHeight: 18
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '700'
  },
  newPublishPill: {
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8
  },
  newPublishPillText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 12,
    fontWeight: '800'
  },
  emptyObjectsBox: {
    padding: 16,
    alignItems: 'center',
    gap: 8
  },
  emptyObjectsText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 12
  },
  createFirstObjectBtn: {
    backgroundColor: SICILY_PALETTE.azulSuave,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SICILY_PALETTE.azulProfundo,
    marginTop: 4
  },
  createFirstObjectBtnText: {
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '700',
    fontSize: 12
  },
  myObjectsList: {
    gap: 10
  },
  myObjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border
  },
  myObjectImg: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  myObjectImgFallback: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: SICILY_PALETTE.azulSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  myObjectImgFallbackText: {
    fontSize: 22
  },
  myObjectInfo: {
    flex: 1
  },
  myObjectName: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 13,
    fontWeight: '700'
  },
  myObjectZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1
  },
  myObjectZone: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 11
  },
  myObjectStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  statePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  statePillAvailable: {
    backgroundColor: Colors.successLight
  },
  statePillRetired: {
    backgroundColor: Colors.errorLight
  },
  statePillText: {
    color: Colors.success,
    fontSize: 9,
    fontWeight: '800'
  },
  myObjectModalityText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 10,
    fontWeight: '600'
  },
  myObjectChevron: {
    color: SICILY_PALETTE.textoMuted,
    fontSize: 20,
    paddingHorizontal: 6
  }
});
