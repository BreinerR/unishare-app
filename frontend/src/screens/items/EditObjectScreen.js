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

export default function EditObjectScreen({ route, navigation }) {
  const { objectId, item } = route.params || {};

  const [title, setTitle] = useState(item?.nombre || '');
  const [description, setDescription] = useState(item?.descripcion || '');
  const [category, setCategory] = useState(item?.categoria || 'herramientas');
  const [modality, setModality] = useState(item?.tipo_disponibilidad || 'prestamo');
  const [zone, setZone] = useState(item?.ubicacion || 'Sector Comunitario General');
  const [photos, setPhotos] = useState(item?.imagenes || []);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Selección de foto desde Galería
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita acceso a la galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        try {
          const uploadedUrl = await uploadImage(result.assets[0].uri);
          setPhotos((prev) => [...prev, uploadedUrl]);
        } catch {
          setPhotos((prev) => [...prev, result.assets[0].uri]);
        }
      }
    } catch (err) {
      console.warn('Error seleccionando imagen:', err);
    }
  };

  // Toma de foto usando Cámara
  const handleTakePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita permiso de cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        try {
          const uploadedUrl = await uploadImage(result.assets[0].uri);
          setPhotos((prev) => [...prev, uploadedUrl]);
        } catch {
          setPhotos((prev) => [...prev, result.assets[0].uri]);
        }
      }
    } catch (err) {
      console.warn('Error capturando foto:', err);
    }
  };

  const showPhotoMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Tomar Foto con Cámara', 'Elegir de Galería', 'Cancelar'],
          cancelButtonIndex: 2,
          title: 'Añadir Fotografía'
        },
        (btnIdx) => {
          if (btnIdx === 0) handleTakePhotoWithCamera();
          else if (btnIdx === 1) handlePickFromGallery();
        }
      );
    } else {
      Alert.alert('Añadir Fotografía', 'Elige cómo agregar una foto:', [
        { text: 'Cámara', onPress: handleTakePhotoWithCamera },
        { text: 'Galería', onPress: handlePickFromGallery },
        { text: 'Cancelar', style: 'cancel' }
      ]);
    }
  };

  const handleRemovePhoto = (index) => {
    if (photos.length <= 1) {
      Alert.alert('Aviso', 'El objeto debe conservar al menos una fotografía.');
      return;
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Guardar cambios editados
  const handleSaveChanges = async () => {
    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('La descripción debe tener al menos 5 caracteres.');
      return;
    }
    if (photos.length === 0) {
      setErrorMessage('Debes conservar al menos una fotografía.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setUploadProgress('Optimizando y subiendo fotografías...');

      // Normalizar fotos: subir nuevas que sean archivos locales
      const finalUrls = [];
      for (const p of photos) {
        if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/uploads/')) {
          finalUrls.push(p);
        } else {
          try {
            const up = await uploadImage(p);
            if (up) {
              const url = typeof up === 'string' ? up : (up.url || up.cleanPath);
              finalUrls.push(url);
            } else {
              finalUrls.push(p);
            }
          } catch {
            finalUrls.push(p);
          }
        }
      }

      setUploadProgress('Guardando cambios en el catálogo...');

      const updatePayload = {
        nombre: title.trim(),
        descripcion: description.trim(),
        categoria: category,
        tipo_disponibilidad: modality,
        ubicacion: zone.trim(),
        imagenes: finalUrls
      };

      await ObjectService.updateObject(objectId || item.id, updatePayload);

      Alert.alert(
        'Cambios Guardados',
        'La información del artículo ha sido actualizada con éxito.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
    } catch (err) {
      console.warn('Error guardando cambios:', err);
      setErrorMessage(err.message || 'Error al actualizar el objeto.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Editar Publicación</Text>
        <Text style={styles.pageSubtitle}>
          Actualiza los detalles y condiciones de tu artículo
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Modalidad */}
      <Text style={styles.sectionHeaderLabel}>Modalidad de Disponibilidad</Text>
      <View style={styles.modalityRow}>
        {MODALITIES.map((mod) => {
          const isSelected = modality === mod.id;
          return (
            <TouchableOpacity
              key={mod.id}
              style={[styles.modalityCard, isSelected && styles.modalityCardActive]}
              onPress={() => setModality(mod.id)}
            >
              <Ionicons
                name={mod.iconName}
                size={22}
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

      {/* Categoría */}
      <Text style={styles.sectionHeaderLabel}>Categoría</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Ionicons
                name={cat.iconName}
                size={15}
                color={isSelected ? '#FFFFFF' : SICILY_PALETTE.textoMedio}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Formulario */}
      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Título del Artículo *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título del objeto"
            placeholderTextColor={SICILY_PALETTE.textoMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Descripción y Estado *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe las condiciones del objeto..."
            placeholderTextColor={SICILY_PALETTE.textoMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Fotos */}
        <View style={styles.inputGroup}>
          <View style={styles.photoHeaderRow}>
            <Text style={styles.inputLabel}>Fotografías ({photos.length})</Text>
            <TouchableOpacity onPress={showPhotoMenu}>
              <Text style={styles.addPhotoText}>+ Añadir foto</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoThumbnailBox}>
                <Image source={{ uri: resolveImageUrl(uri) || uri }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.removeThumbnailBtn}
                  onPress={() => handleRemovePhoto(idx)}
                >
                  <Text style={styles.removeThumbnailText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Zona */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sector de Entrega *</Text>
          <TextInput
            style={styles.input}
            value={zone}
            onChangeText={setZone}
            placeholder="Sector general"
            placeholderTextColor={SICILY_PALETTE.textoMuted}
          />
        </View>

        {uploadProgress ? (
          <View style={styles.progressBox}>
            <ActivityIndicator size="small" color={SICILY_PALETTE.azulProfundo} />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        ) : null}

        {/* Botón Guardar Cambios (Color de Acción Principal Amarillo Cálido) */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSaveChanges}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={SICILY_PALETTE.textoOscuro} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Confirmar y Guardar Cambios</Text>
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
    paddingBottom: 40
  },
  header: {
    marginBottom: 16
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  },
  pageSubtitle: {
    fontSize: 13,
    color: SICILY_PALETTE.textoMedio,
    marginTop: 2
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600'
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 8
  },
  modalityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  modalityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalityCardActive: {
    borderColor: SICILY_PALETTE.azulProfundo,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  modalityIcon: {
    fontSize: 20,
    marginBottom: 4
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
    paddingBottom: 16,
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
    borderRadius: 18
  },
  categoryChipActive: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  categoryChipIcon: {
    fontSize: 13,
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
    minHeight: 85
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  addPhotoText: {
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '700',
    fontSize: 12
  },
  photosScroll: {
    gap: 10,
    paddingVertical: 4
  },
  photoThumbnailBox: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden'
  },
  photoThumbnail: {
    width: '100%',
    height: '100%'
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
  removeThumbnailText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: SICILY_PALETTE.azulProfundo
  },
  saveBtn: {
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 4
  },
  btnDisabled: {
    opacity: 0.6
  },
  saveBtnText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 15,
    fontWeight: '800'
  }
});
