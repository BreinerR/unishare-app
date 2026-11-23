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
  ActionSheetIOS,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService } from '../../services/objectService';
import { LoanService } from '../../services/loanService';
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

  // Estados para Préstamos, Solicitudes y Calificaciones (HU-13, HU-14, HU-15, HU-05)
  const [activeTab, setActiveTab] = useState('publicaciones'); // 'publicaciones' | 'recibidas' | 'solicitadas'
  const [receivedLoans, setReceivedLoans] = useState([]);
  const [sentLoans, setSentLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Estados del Modal de Calificación (HU-05)
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingPrestamo, setRatingPrestamo] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

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

  // Cargar préstamos recibidos y solicitados (HU-13, HU-14, HU-15)
  const loadLoans = async () => {
    try {
      setLoadingLoans(true);
      const [recibidasRes, solicitadasRes] = await Promise.all([
        LoanService.getMisPrestamos({ tipo: 'recibidas' }),
        LoanService.getMisPrestamos({ tipo: 'solicitadas' })
      ]);

      if (recibidasRes?.success && Array.isArray(recibidasRes.prestamos)) {
        setReceivedLoans(recibidasRes.prestamos);
      }
      if (solicitadasRes?.success && Array.isArray(solicitadasRes.prestamos)) {
        setSentLoans(solicitadasRes.prestamos);
      }
    } catch (e) {
      console.warn('Error cargando préstamos:', e);
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    loadMyObjects();
    loadLoans();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadMyObjects();
      loadLoans();
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

  // HU-13: Aprobar solicitud (solo propietario)
  const handleAprobarSolicitud = (prestamo) => {
    Alert.alert(
      'Aprobar Solicitud',
      `¿Deseas aprobar el préstamo de "${prestamo.objeto_nombre}" a ${prestamo.solicitante_nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Aprobar',
          onPress: async () => {
            try {
              setActionLoadingId(prestamo.id);
              await LoanService.cambiarEstado(prestamo.id, 'ACTIVA');
              Alert.alert('Préstamo Aprobado', `El préstamo de "${prestamo.objeto_nombre}" ahora se encuentra activo.`);
              loadLoans();
              loadMyObjects();
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo aprobar la solicitud.');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  // HU-13: Rechazar solicitud (solo propietario)
  const handleRechazarSolicitud = (prestamo) => {
    Alert.alert(
      'Rechazar Solicitud',
      `¿Deseas rechazar la solicitud de ${prestamo.solicitante_nombre} para "${prestamo.objeto_nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(prestamo.id);
              await LoanService.cambiarEstado(prestamo.id, 'RECHAZADA');
              Alert.alert('Solicitud Rechazada', 'La solicitud ha sido rechazada.');
              loadLoans();
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo rechazar la solicitud.');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  // HU-14: Registrar devolución
  const handleRegistrarDevolucion = (prestamo) => {
    Alert.alert(
      'Registrar Devolución',
      `¿Confirmas que el objeto "${prestamo.objeto_nombre}" ha sido devuelto satisfactoriamente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Devolución',
          onPress: async () => {
            try {
              setActionLoadingId(prestamo.id);
              await LoanService.registrarDevolucion(prestamo.id);
              loadLoans();
              loadMyObjects();

              // Si el usuario aún no califica este préstamo, abrir modal de rating de inmediato
              if (!prestamo.ya_calificado) {
                openRatingModal(prestamo);
              } else {
                Alert.alert('Devolución Completada', 'La devolución fue registrada con éxito.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo registrar la devolución.');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  // HU-05: Modal de Calificación
  const openRatingModal = (prestamo) => {
    setRatingPrestamo(prestamo);
    setRatingStars(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!ratingPrestamo) return;
    try {
      setSubmittingRating(true);
      const res = await LoanService.crearCalificacion({
        prestamo_id: ratingPrestamo.id,
        puntuacion: ratingStars,
        comentario: ratingComment.trim()
      });

      setRatingModalVisible(false);
      Alert.alert(
        '¡Calificación Enviada!',
        `Gracias por tu valoración. La reputación comunitaria ha sido actualizada a ${res.reputacion_actualizada ? Number(res.reputacion_actualizada).toFixed(1) : '5.0'} ★.`
      );
      loadLoans();
    } catch (err) {
      Alert.alert('Error al calificar', err.message || 'No se pudo registrar la calificación.');
    } finally {
      setSubmittingRating(false);
    }
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

      {/* Selector de Pestañas Comunitarias Rediseñado con Scroll Horizontal y Pills Espaciosas */}
      <View style={styles.segmentWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentScrollContent}
        >
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'publicaciones' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('publicaciones')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cube-outline"
              size={16}
              color={activeTab === 'publicaciones' ? '#FFFFFF' : SICILY_PALETTE.azulProfundo}
            />
            <Text style={[styles.segmentBtnText, activeTab === 'publicaciones' && styles.segmentBtnTextActive]}>
              Mis Artículos ({myObjects.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'recibidas' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('recibidas')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="download-outline"
              size={16}
              color={activeTab === 'recibidas' ? '#FFFFFF' : SICILY_PALETTE.azulProfundo}
            />
            <Text style={[styles.segmentBtnText, activeTab === 'recibidas' && styles.segmentBtnTextActive]}>
              Recibidas ({receivedLoans.filter((l) => (l.estado || '').toUpperCase() === 'PENDIENTE').length > 0 ? `${receivedLoans.filter((l) => (l.estado || '').toUpperCase() === 'PENDIENTE').length}!` : receivedLoans.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'solicitadas' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('solicitadas')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send-outline"
              size={15}
              color={activeTab === 'solicitadas' ? '#FFFFFF' : SICILY_PALETTE.azulProfundo}
            />
            <Text style={[styles.segmentBtnText, activeTab === 'solicitadas' && styles.segmentBtnTextActive]}>
              Mis Préstamos ({sentLoans.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      {activeTab === 'publicaciones' && (
        /* Pestaña: Mis Publicaciones Comunitarias */
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
      )}

      {activeTab === 'recibidas' && (
        /* Pestaña: Solicitudes Recibidas como Propietario (HU-13, HU-14, HU-15, HU-05) */
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Solicitudes Recibidas ({receivedLoans.length})</Text>
            <TouchableOpacity onPress={loadLoans} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="reload-outline" size={18} color={SICILY_PALETTE.azulProfundo} />
            </TouchableOpacity>
          </View>

          {loadingLoans ? (
            <ActivityIndicator size="small" color={SICILY_PALETTE.azulProfundo} style={{ marginVertical: 20 }} />
          ) : receivedLoans.length === 0 ? (
            <View style={styles.emptyObjectsBox}>
              <Ionicons name="mail-open-outline" size={32} color={SICILY_PALETTE.textoMuted} />
              <Text style={styles.emptyObjectsText}>
                No tienes solicitudes de préstamo pendientes ni préstamos activos como propietario.
              </Text>
            </View>
          ) : (
            <View style={styles.loansList}>
              {receivedLoans.map((loan) => {
                const estadoNorm = (loan.estado || '').toUpperCase();
                const isPending = estadoNorm === 'PENDIENTE';
                const isActive = estadoNorm === 'ACTIVA';
                const isOverdue = estadoNorm === 'VENCIDO';
                const isReturned = estadoNorm === 'DEVUELTA';
                const isRejected = estadoNorm === 'RECHAZADA';
                return (
                  <View key={loan.id} style={[styles.loanCard, isOverdue && styles.loanCardOverdue]}>
                    {/* Encabezado: Objeto y Estado */}
                    <View style={styles.loanCardHeader}>
                      <View style={styles.loanObjectInfoCol}>
                        <Text style={styles.loanObjectName} numberOfLines={1}>{loan.objeto_nombre}</Text>
                        <Text style={styles.loanObjectZone} numberOfLines={1}>📍 {loan.objeto_ubicacion}</Text>
                      </View>
                      <View style={[
                        styles.loanStatusBadge,
                        isPending && styles.statusBadgePendiente,
                        isActive && styles.statusBadgeActiva,
                        isOverdue && styles.statusBadgeVencido,
                        isReturned && styles.statusBadgeDevuelta,
                        isRejected && styles.statusBadgeRechazada,
                      ]}>
                        <Text style={[
                          styles.loanStatusBadgeText,
                          isPending && styles.statusTextPendiente,
                          isActive && styles.statusTextActiva,
                          isOverdue && styles.statusTextVencido,
                          isReturned && styles.statusTextDevuelta,
                          isRejected && styles.statusTextRechazada,
                        ]}>
                          {loan.estado ? loan.estado.toUpperCase() : 'PENDIENTE'}
                        </Text>
                      </View>
                    </View>

                    {/* Alerta de Vencimiento si aplica (HU-15) */}
                    {isOverdue && (
                      <View style={styles.overdueAlertBox}>
                        <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                        <Text style={styles.overdueAlertText}>
                          Préstamo Vencido. La fecha pactada ({loan.fecha_fin}) ya expiró.
                        </Text>
                      </View>
                    )}

                    {/* Fila del Solicitante */}
                    <View style={styles.loanUserRow}>
                      <View style={styles.loanUserAvatar}>
                        <Text style={styles.loanUserAvatarText}>
                          {(loan.solicitante_nombre || 'S').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.loanUserDetails}>
                        <Text style={styles.loanUserName}>{loan.solicitante_nombre}</Text>
                        <Text style={styles.loanUserZone}>{loan.solicitante_zona || 'Sector Comunitario'}</Text>
                      </View>
                      <View style={styles.reputationMiniPill}>
                        <Ionicons name="star" size={11} color="#8A5D00" />
                        <Text style={styles.reputationMiniPillText}>
                          {loan.solicitante_reputacion ? Number(loan.solicitante_reputacion).toFixed(1) : '5.0'}
                        </Text>
                      </View>
                    </View>

                    {/* Fechas de Préstamo */}
                    <View style={styles.loanDatesBox}>
                      <Ionicons name="calendar-outline" size={14} color={SICILY_PALETTE.textoMedio} />
                      <Text style={styles.loanDatesText}>
                        Del {loan.fecha_inicio} al {loan.fecha_fin}
                      </Text>
                    </View>

                    {/* Mensaje del Solicitante si existe */}
                    {loan.mensaje ? (
                      <View style={styles.loanMessageBox}>
                        <Text style={styles.loanMessageText}>"{loan.mensaje}"</Text>
                      </View>
                    ) : null}

                    {/* Botones de Acción según estado (HU-13, HU-14, HU-05) */}
                    <View style={styles.loanActionsContainer}>
                      {isPending && (
                        <View style={styles.approvalButtonsRow}>
                          <TouchableOpacity
                            style={[styles.rejectBtn, actionLoadingId === loan.id && styles.btnDisabled]}
                            onPress={() => handleRechazarSolicitud(loan)}
                            disabled={actionLoadingId === loan.id}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                            <Text style={styles.rejectBtnText}>Rechazar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.approveBtn, actionLoadingId === loan.id && styles.btnDisabled]}
                            onPress={() => handleAprobarSolicitud(loan)}
                            disabled={actionLoadingId === loan.id}
                            activeOpacity={0.8}
                          >
                            {actionLoadingId === loan.id ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.approveBtnText}>Aprobar Préstamo</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {(isActive || isOverdue) && (
                        <TouchableOpacity
                          style={[styles.returnActionBtn, actionLoadingId === loan.id && styles.btnDisabled]}
                          onPress={() => handleRegistrarDevolucion(loan)}
                          disabled={actionLoadingId === loan.id}
                          activeOpacity={0.85}
                        >
                          {actionLoadingId === loan.id ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
                              <Text style={styles.returnActionBtnText}>Registrar Devolución</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {isReturned && (
                        loan.ya_calificado ? (
                          <View style={styles.ratedDonePill}>
                            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                            <Text style={styles.ratedDonePillText}>
                              Calificaste esta transacción con {loan.mi_calificacion || '5'} ★
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.rateActionBtn}
                            onPress={() => openRatingModal(loan)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="star" size={16} color={SICILY_PALETTE.textoOscuro} />
                            <Text style={styles.rateActionBtnText}>Calificar al Solicitante</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {activeTab === 'solicitadas' && (
        /* Pestaña: Mis Solicitudes como Solicitante (HU-12, HU-14, HU-15, HU-05) */
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Préstamos ({sentLoans.length})</Text>
            <TouchableOpacity onPress={loadLoans} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="reload-outline" size={18} color={SICILY_PALETTE.azulProfundo} />
            </TouchableOpacity>
          </View>

          {loadingLoans ? (
            <ActivityIndicator size="small" color={SICILY_PALETTE.azulProfundo} style={{ marginVertical: 20 }} />
          ) : sentLoans.length === 0 ? (
            <View style={styles.emptyObjectsBox}>
              <Ionicons name="search-outline" size={32} color={SICILY_PALETTE.textoMuted} />
              <Text style={styles.emptyObjectsText}>
                Aún no has solicitado ningún objeto en préstamo.
              </Text>
              <TouchableOpacity
                style={styles.createFirstObjectBtn}
                onPress={() => navigation?.navigate('Buscar')}
              >
                <Text style={styles.createFirstObjectBtnText}>Explorar Catálogo de Objetos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loansList}>
              {sentLoans.map((loan) => {
                const estadoNorm = (loan.estado || '').toUpperCase();
                const isPending = estadoNorm === 'PENDIENTE';
                const isActive = estadoNorm === 'ACTIVA';
                const isOverdue = estadoNorm === 'VENCIDO';
                const isReturned = estadoNorm === 'DEVUELTA';
                const isRejected = estadoNorm === 'RECHAZADA';
                return (
                  <View key={loan.id} style={[styles.loanCard, isOverdue && styles.loanCardOverdue]}>
                    {/* Encabezado: Objeto y Estado */}
                    <View style={styles.loanCardHeader}>
                      <View style={styles.loanObjectInfoCol}>
                        <Text style={styles.loanObjectName} numberOfLines={1}>{loan.objeto_nombre}</Text>
                        <Text style={styles.loanObjectZone} numberOfLines={1}>📍 {loan.objeto_ubicacion}</Text>
                      </View>
                      <View style={[
                        styles.loanStatusBadge,
                        isPending && styles.statusBadgePendiente,
                        isActive && styles.statusBadgeActiva,
                        isOverdue && styles.statusBadgeVencido,
                        isReturned && styles.statusBadgeDevuelta,
                        isRejected && styles.statusBadgeRechazada,
                      ]}>
                        <Text style={[
                          styles.loanStatusBadgeText,
                          isPending && styles.statusTextPendiente,
                          isActive && styles.statusTextActiva,
                          isOverdue && styles.statusTextVencido,
                          isReturned && styles.statusTextDevuelta,
                          isRejected && styles.statusTextRechazada,
                        ]}>
                          {loan.estado ? loan.estado.toUpperCase() : 'PENDIENTE'}
                        </Text>
                      </View>
                    </View>

                    {/* Alerta de Vencimiento si aplica (HU-15) */}
                    {isOverdue && (
                      <View style={styles.overdueAlertBox}>
                        <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                        <Text style={styles.overdueAlertText}>
                          Préstamo Vencido. Por favor entrega el objeto al propietario para no afectar tu reputación.
                        </Text>
                      </View>
                    )}

                    {/* Fila del Propietario */}
                    <View style={styles.loanUserRow}>
                      <View style={[styles.loanUserAvatar, { backgroundColor: SICILY_PALETTE.azulProfundo }]}>
                        <Text style={[styles.loanUserAvatarText, { color: '#FFFFFF' }]}>
                          {(loan.propietario_nombre || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.loanUserDetails}>
                        <Text style={styles.loanUserName}>{loan.propietario_nombre} (Propietario)</Text>
                        <Text style={styles.loanUserZone}>{loan.propietario_zona || 'Sector Comunitario'}</Text>
                      </View>
                      <View style={styles.reputationMiniPill}>
                        <Ionicons name="star" size={11} color="#8A5D00" />
                        <Text style={styles.reputationMiniPillText}>
                          {loan.propietario_reputacion ? Number(loan.propietario_reputacion).toFixed(1) : '5.0'}
                        </Text>
                      </View>
                    </View>

                    {/* Fechas de Préstamo */}
                    <View style={styles.loanDatesBox}>
                      <Ionicons name="calendar-outline" size={14} color={SICILY_PALETTE.textoMedio} />
                      <Text style={styles.loanDatesText}>
                        Vigencia: {loan.fecha_inicio} al {loan.fecha_fin}
                      </Text>
                    </View>

                    {/* Botones de Acción (HU-14, HU-05) */}
                    <View style={styles.loanActionsContainer}>
                      {isPending && (
                        <View style={styles.waitingNoticeBox}>
                          <Ionicons name="time-outline" size={15} color="#8A5D00" />
                          <Text style={styles.waitingNoticeText}>
                            Esperando respuesta y confirmación del propietario.
                          </Text>
                        </View>
                      )}

                      {(isActive || isOverdue) && (
                        <TouchableOpacity
                          style={[styles.returnActionBtn, actionLoadingId === loan.id && styles.btnDisabled]}
                          onPress={() => handleRegistrarDevolucion(loan)}
                          disabled={actionLoadingId === loan.id}
                          activeOpacity={0.85}
                        >
                          {actionLoadingId === loan.id ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
                              <Text style={styles.returnActionBtnText}>Registrar Devolución</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {isReturned && (
                        loan.ya_calificado ? (
                          <View style={styles.ratedDonePill}>
                            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                            <Text style={styles.ratedDonePillText}>
                              Calificaste al propietario con {loan.mi_calificacion || '5'} ★
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.rateActionBtn}
                            onPress={() => openRatingModal(loan)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="star" size={16} color={SICILY_PALETTE.textoOscuro} />
                            <Text style={styles.rateActionBtnText}>Calificar al Propietario</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Modal de Calificación de Transacción (HU-05) */}
      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconBadge, { backgroundColor: SICILY_PALETTE.amarilloSuave }]}>
                  <Ionicons name="star" size={20} color="#8A5D00" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Calificar Transacción</Text>
                  <Text style={styles.modalSubtitle}>
                    {ratingPrestamo?.objeto_nombre || 'Préstamo Comunitario'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={SICILY_PALETTE.textoMedio} />
              </TouchableOpacity>
            </View>

            {/* Estrellas Interactivas (1 a 5) */}
            <Text style={styles.ratingPromptText}>
              ¿Cómo calificarías el cumplimiento y cuidado en este préstamo?
            </Text>
            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingStars(star)}
                  style={styles.starTouchArea}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= ratingStars ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= ratingStars ? SICILY_PALETTE.amarilloCalido : '#CBD5E1'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabelText}>
              {ratingStars === 5 && '5 - ¡Excelente experiencia! Totalmente recomendado'}
              {ratingStars === 4 && '4 - Muy bueno. Cumplió con lo acordado'}
              {ratingStars === 3 && '3 - Bueno. Sin problemas mayores'}
              {ratingStars === 2 && '2 - Regular. Podría mejorar la puntualidad/cuidado'}
              {ratingStars === 1 && '1 - Deficiente. Tuve inconvenientes'}
            </Text>

            {/* Comentario opcional */}
            <Text style={styles.modalFieldLabel}>Comentario para la comunidad (opcional)</Text>
            <TextInput
              style={styles.modalTextArea}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Ej. Muy puntual en la entrega y cuidó el artículo en perfecto estado."
              placeholderTextColor={SICILY_PALETTE.textoMuted}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Botones */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRatingModalVisible(false)}
                disabled={submittingRating}
              >
                <Text style={styles.modalCancelBtnText}>Omitir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingRating && styles.btnDisabled]}
                onPress={handleSubmitRating}
                disabled={submittingRating}
                activeOpacity={0.85}
              >
                {submittingRating ? (
                  <ActivityIndicator color={SICILY_PALETTE.textoOscuro} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={SICILY_PALETTE.textoOscuro} />
                    <Text style={styles.modalSubmitBtnText}>Enviar Calificación</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  },
  // Selector de Pestañas Comunitarias Rediseñado (Scroll Horizontal con Pills Flotantes)
  segmentWrapper: {
    marginBottom: 16
  },
  segmentScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F4F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  segmentBtnActive: {
    backgroundColor: '#1D59BB',
    borderColor: '#1D59BB',
    shadowColor: '#1D59BB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568'
  },
  segmentBtnTextActive: {
    color: '#FFFFFF'
  },

  // Tarjetas de Préstamos (HU-13, HU-14, HU-15)
  loansList: {
    gap: 12
  },
  loanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  loanCardOverdue: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFBFB'
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  loanObjectInfoCol: {
    flex: 1,
    marginRight: 8
  },
  loanObjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  },
  loanObjectZone: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMedio,
    marginTop: 2
  },
  loanStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  loanStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  statusBadgePendiente: {
    backgroundColor: '#FEF3B3',
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.4)'
  },
  statusTextPendiente: {
    color: '#8A5D00'
  },
  statusBadgeActiva: {
    backgroundColor: '#EBF3FE',
    borderWidth: 1,
    borderColor: '#D0E2FC'
  },
  statusTextActiva: {
    color: SICILY_PALETTE.azulProfundo
  },
  statusBadgeVencido: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  statusTextVencido: {
    color: '#D32F2F'
  },
  statusBadgeDevuelta: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  statusTextDevuelta: {
    color: '#2E7D32'
  },
  statusBadgeRechazada: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statusTextRechazada: {
    color: '#6B7280'
  },
  overdueAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  overdueAlertText: {
    flex: 1,
    fontSize: 11,
    color: '#D32F2F',
    fontWeight: '700'
  },
  loanUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0EEFD'
  },
  loanUserAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  loanUserAvatarText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 14,
    fontWeight: '800'
  },
  loanUserDetails: {
    flex: 1
  },
  loanUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro
  },
  loanUserZone: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMedio,
    marginTop: 1
  },
  reputationMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.3)'
  },
  reputationMiniPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A5D00'
  },
  loanDatesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  loanDatesText: {
    fontSize: 12,
    color: SICILY_PALETTE.textoMedio,
    fontWeight: '600'
  },
  loanMessageBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: SICILY_PALETTE.azulProfundo
  },
  loanMessageText: {
    fontSize: 11,
    color: SICILY_PALETTE.textoOscuro,
    fontStyle: 'italic'
  },
  loanActionsContainer: {
    marginTop: 4
  },
  approvalButtonsRow: {
    flexDirection: 'row',
    gap: 10
  },
  approveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SICILY_PALETTE.azulProfundo,
    borderRadius: 12,
    paddingVertical: 10
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    paddingVertical: 10
  },
  rejectBtnText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '700'
  },
  returnActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 11,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  returnActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  rateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2
  },
  rateActionBtnText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 13,
    fontWeight: '800'
  },
  ratedDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  ratedDonePillText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700'
  },
  waitingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3B3',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.35)'
  },
  waitingNoticeText: {
    fontSize: 11,
    color: '#8A5D00',
    fontWeight: '600'
  },

  // Modal de Rating (HU-05)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: '90%',
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  modalHeaderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  },
  modalSubtitle: {
    fontSize: 12,
    color: SICILY_PALETTE.textoMedio,
    marginTop: 1
  },
  ratingPromptText: {
    fontSize: 13,
    color: SICILY_PALETTE.textoOscuro,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14
  },
  ratingStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  starTouchArea: {
    padding: 4
  },
  ratingLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A5D00',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'center'
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 6
  },
  modalTextArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: SICILY_PALETTE.textoOscuro,
    minHeight: 64,
    marginBottom: 18
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: SICILY_PALETTE.textoMedio
  },
  modalSubmitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 14,
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  }
});
