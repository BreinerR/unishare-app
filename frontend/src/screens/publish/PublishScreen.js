import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  ActionSheetIOS
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService, uploadImage } from '../../services/objectService';
import { resolveImageUrl } from '../../services/api';

const MODALITIES = [
  { id: 'prestamo', label: 'Préstamo', iconName: 'swap-horizontal-outline' },
  { id: 'trueque', label: 'Trueque', iconName: 'repeat-outline' },
  { id: 'ambos', label: 'Ambos', iconName: 'layers-outline' }
];

const CATEGORIES = [
  { id: 'herramientas', name: 'Herramientas', iconName: 'build-outline' },
  { id: 'hogar_jardineria', name: 'Hogar y Jardín', iconName: 'leaf-outline' },
  { id: 'libros_academico', name: 'Libros y Lectura', iconName: 'book-outline' },
  { id: 'electronica_gadgets', name: 'Tecnología', iconName: 'hardware-chip-outline' },
  { id: 'movilidad', name: 'Movilidad', iconName: 'bicycle-outline' },
  { id: 'camping_recreacion', name: 'Aire Libre', iconName: 'compass-outline' },
  { id: 'otros', name: 'Otros', iconName: 'cube-outline' }
];

export default function PublishScreen({ navigation }) {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('herramientas');
  const [modality, setModality] = useState('prestamo');
  // Campo de sector sin valor por defecto para que se vea el placeholder limpio
  const [zone, setZone] = useState('');
  const [photos, setPhotos] = useState([]); // URLs accesibles del servidor
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Subir foto física al servidor con respaldo silencioso (Fallback)
  const uploadSelectedPhoto = async (localUri) => {
    try {
      setUploadingPhoto(true);
      setErrorMessage('');

      // Enviar directamente la URI devuelta por el picker (resuelve con URL de servidor o URI local)
      const serverUrl = await uploadImage(localUri);
      const photoToUse = serverUrl || localUri;

      setPhotos((prev) => [...prev, photoToUse]);
    } catch (err) {
      // Respaldo silencioso: nunca interrumpir la experiencia con un alert de subida
      console.warn('Respaldo silencioso a imagen local:', err);
      setPhotos((prev) => [...prev, localUri]);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Selección de foto desde Galería
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita acceso a la galería para seleccionar fotografías.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadSelectedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error al seleccionar imagen:', err);
    }
  };

  // Toma de foto usando la Cámara
  const handleTakePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita permiso de cámara para fotografiar el artículo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadSelectedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error al capturar foto:', err);
    }
  };

  const showPhotoMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Tomar Foto con Cámara', 'Elegir de la Galería', 'Cancelar'],
          cancelButtonIndex: 2,
          title: 'Añadir Fotografía'
        },
        (btnIdx) => {
          if (btnIdx === 0) handleTakePhotoWithCamera();
          else if (btnIdx === 1) handlePickFromGallery();
        }
      );
    } else {
      Alert.alert(
        'Añadir Fotografía',
        'Elige cómo agregar una foto de tu objeto:',
        [
          { text: 'Tomar Foto con Cámara', onPress: handleTakePhotoWithCamera },
          { text: 'Elegir de la Galería', onPress: handlePickFromGallery },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Publicación con validación
  const handlePublish = async () => {
    setErrorMessage('');

    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage('El nombre del objeto es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('La descripción es obligatoria y debe tener al menos 5 caracteres.');
      return;
    }

    if (photos.length === 0) {
      setErrorMessage('Por favor incluye al menos una fotografía de tu artículo para publicarlo.');
      return;
    }

    const finalZone = zone.trim() || user?.ubicacion_general || 'Sector Comunitario General';

    try {
      setPublishing(true);

      const objectPayload = {
        nombre: title.trim(),
        descripcion: description.trim(),
        categoria: category,
        tipo_disponibilidad: modality,
        ubicacion: finalZone,
        imagenes: photos
      };

      await ObjectService.createObject(objectPayload);

      Alert.alert(
        'Publicación Exitosa',
        `"${title.trim()}" ya está disponible en el catálogo y visible en el mapa comunitario.`,
        [
          {
            text: 'Ver en Catálogo',
            onPress: () => {
              setTitle('');
              setDescription('');
              setPhotos([]);
              setZone('');
              navigation?.navigate('Inicio');
            }
          }
        ]
      );
    } catch (err) {
      console.warn('Error al publicar objeto:', err);
      setErrorMessage(err.message || 'Error al conectar con el servidor para publicar.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Publicar un Artículo</Text>
        <Text style={styles.pageSubtitle}>
          Comparte herramientas o artículos con los vecinos de tu sector
        </Text>
      </View>

      {/* Banner de Error */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Modalidad de Disponibilidad */}
      <Text style={styles.sectionHeaderLabel}>Modalidad de Disponibilidad</Text>
      <View style={styles.modalityRow}>
        {MODALITIES.map((mod) => {
          const isSelected = modality === mod.id;
          return (
            <TouchableOpacity
              key={mod.id}
              style={[styles.modalityCard, isSelected && styles.modalityCardActive]}
              onPress={() => setModality(mod.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mod.iconName}
                size={20}
                color={isSelected ? SICILY_PALETTE.azulProfundo : SICILY_PALETTE.textoMedio}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.modalityLabel, isSelected && styles.modalityLabelActive]}>
                {mod.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selector de Categorías */}
      <Text style={styles.sectionHeaderLabel}>Categoría del Objeto</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.iconName}
                size={14}
                color={isSelected ? '#FFFFFF' : SICILY_PALETTE.textoMedio}
                style={styles.categoryChipIcon}
              />
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Formulario Principal */}
      <View style={styles.formCard}>
        {/* Título */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Título del Artículo *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Ej. Taladro Percutor Inalámbrico 20V"
            placeholderTextColor={SICILY_PALETTE.textoMuted}
            maxLength={80}
          />
        </View>

        {/* Descripción */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Descripción y Estado *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            placeholder="Describe el estado de conservación, accesorios incluidos y condiciones de uso..."
            placeholderTextColor={SICILY_PALETTE.textoMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onChangeText={(t) => {
              setDescription(t);
              if (errorMessage) setErrorMessage('');
            }}
          />
        </View>

        {/* Fotografías */}
        <View style={styles.inputGroup}>
          <View style={styles.photoHeaderRow}>
            <Text style={styles.inputLabel}>Fotografías *</Text>
            <Text style={styles.photoCountText}>
              {photos.length === 0 ? 'Mínimo 1 requerida' : `${photos.length} adjunta(s)`}
            </Text>
          </View>

          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumbnailBox}>
                  <Image source={{ uri: resolveImageUrl(uri) || uri }} style={styles.photoThumbnail} />
                  <TouchableOpacity
                    style={styles.removeThumbnailBtn}
                    onPress={() => handleRemovePhoto(idx)}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addMorePhotoBtn}
                onPress={showPhotoMenu}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={SICILY_PALETTE.azulProfundo} />
                ) : (
                  <>
                    <Ionicons name="add" size={24} color={SICILY_PALETTE.azulProfundo} />
                    <Text style={styles.addMoreText}>Añadir</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Recuadro de subida completamente despejado (sin textos técnicos) */
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={showPhotoMenu}
              activeOpacity={0.75}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <View style={styles.uploadingBoxInner}>
                  <ActivityIndicator size="small" color={SICILY_PALETTE.azulProfundo} />
                  <Text style={styles.uploadingText}>Subiendo fotografía al servidor...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color={SICILY_PALETTE.azulProfundo} style={{ marginBottom: 6 }} />
                  <Text style={styles.uploadMainText}>Tomar foto o elegir de la galería</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Sector de Entrega */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sector de Entrega *</Text>
          <TextInput
            style={styles.input}
            value={zone}
            onChangeText={setZone}
            placeholder="Ej. Sector Parque Central / El Nogal"
            placeholderTextColor={SICILY_PALETTE.textoMuted}
          />
          <View style={styles.privacyBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#8A5D00" style={{ marginRight: 6 }} />
            <Text style={styles.privacyText}>
              Tu dirección domiciliaria exacta se mantiene privada. Solo se muestra el sector referencial para coordinar la entrega.
            </Text>
          </View>
        </View>

        {/* Botón de Publicar — Limpio sin emojis */}
        <TouchableOpacity
          style={[styles.submitButton, (publishing || uploadingPhoto) && styles.btnDisabled]}
          onPress={handlePublish}
          disabled={publishing || uploadingPhoto}
          activeOpacity={0.85}
        >
          {publishing ? (
            <ActivityIndicator color={SICILY_PALETTE.textoOscuro} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Publicar en la Comunidad</Text>
          )}
        </TouchableOpacity>
      </View>
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
  header: {
    marginBottom: 16,
    marginTop: 4
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro, // #0D2149
    letterSpacing: -0.3
  },
  pageSubtitle: {
    fontSize: 13,
    color: SICILY_PALETTE.textoMedio, // #475B7D
    marginTop: 3
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  sectionHeaderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 10,
    marginTop: 6
  },
  modalityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18
  },
  modalityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalityCardActive: {
    borderColor: SICILY_PALETTE.azulProfundo,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  modalityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SICILY_PALETTE.textoMedio
  },
  modalityLabelActive: {
    color: SICILY_PALETTE.azulProfundo
  },
  categoriesScroll: {
    paddingBottom: 18,
    gap: 8
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  categoryChipActive: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  categoryChipIcon: {
    marginRight: 6
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: SICILY_PALETTE.textoMedio
  },
  categoryChipTextActive: {
    color: '#FFFFFF'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 6
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 14
  },
  textArea: {
    minHeight: 90
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  photoCountText: {
    fontSize: 12,
    color: SICILY_PALETTE.textoMuted,
    fontWeight: '500'
  },
  photosScroll: {
    gap: 10,
    paddingVertical: 4
  },
  photoThumbnailBox: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden'
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12
  },
  removeThumbnailBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(13, 33, 73, 0.75)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addMorePhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: SICILY_PALETTE.azulClaro,
    backgroundColor: SICILY_PALETTE.azulSuave,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addMoreText: {
    fontSize: 11,
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '700',
    marginTop: 2
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: SICILY_PALETTE.azulClaro,
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderRadius: 14,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: SICILY_PALETTE.azulProfundo
  },
  uploadingBoxInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: SICILY_PALETTE.azulProfundo
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.3)'
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: '#6B4E00',
    lineHeight: 15
  },
  submitButton: {
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19 Acción Principal
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  btnDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 15,
    fontWeight: '800'
  }
});
