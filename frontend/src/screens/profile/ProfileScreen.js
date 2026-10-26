import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Colors, { EUCALIPTO_PALETTE } from '../../constants/colors';
import CommunityZoneMap from '../../components/map/CommunityZoneMap';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [ubicacionGeneral, setUbicacionGeneral] = useState(user?.ubicacion_general || '');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      setStatusMessage({ text: 'El nombre no puede estar vacío.', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage({ text: '', type: '' });
      await updateProfile({
        nombre: nombre.trim(),
        ubicacion_general: ubicacionGeneral.trim() || 'Sector Comunitario General'
      });
      setIsEditing(false);
      setStatusMessage({ text: 'Perfil comunitario actualizado exitosamente.', type: 'success' });
    } catch (error) {
      setStatusMessage({ text: error.message || 'Error al actualizar el perfil.', type: 'error' });
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Tarjeta de Encabezado con Verde Oscuro Protagonista (#233B32) */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(user?.nombre)}</Text>
        </View>

        <Text style={styles.userName}>{user?.nombre || 'Miembro de la Comunidad'}</Text>
        <Text style={styles.userEmail}>{user?.correo}</Text>

        {/* Badges de Reputación y Rol */}
        <View style={styles.badgesRow}>
          <View style={styles.communityBadge}>
            <Text style={styles.communityBadgeText}>MIEMBRO COMUNITARIO</Text>
          </View>
          <View style={styles.reputationBadge}>
            <Text style={styles.reputationBadgeText}>
              ★ {user?.reputacion ? Number(user.reputacion).toFixed(1) : '5.0'} Confianza Vecinal
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

      {/* Módulo de Mapas y Geolocalización por Zonas (HU-04) */}
      <CommunityZoneMap
        selectedZone={ubicacionGeneral}
        onSelectZone={(selectedSector) => {
          setUbicacionGeneral(selectedSector);
          if (!isEditing) {
            setIsEditing(true);
          }
        }}
      />

      {/* Tarjeta de Información Detallada / Edición (HU-04) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Datos de tu Comunidad</Text>
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
          /* Formulario de Edición */
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tu nombre completo"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zona / Sector Comunitario</Text>
              <TextInput
                style={styles.input}
                value={ubicacionGeneral}
                onChangeText={setUbicacionGeneral}
                placeholder="Ej. Sector Parque Central / Conjunto Los Álamos"
              />
              <View style={styles.privacyNoticeBox}>
                <Text style={styles.privacyNoticeText}>
                  🛡️ Protección Estricta: Solo se publica tu sector referencial para convenir el punto de intercambio común. Nunca tu dirección residencial exacta ni coordenadas GPS.
                </Text>
              </View>
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
                  <ActivityIndicator color={Colors.textOnPrimary} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Vista de Solo Lectura */
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sector / Barrio Activo:</Text>
              <Text style={styles.infoValue}>
                {user?.ubicacion_general || 'Sector Comunitario General'}
              </Text>
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

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Miembro de la red desde:</Text>
              <Text style={styles.infoValue}>
                {user?.fecha_registro
                  ? new Date(user.fecha_registro).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Reciente'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Tarjeta Informativa de Economía Circular Comunitaria */}
      <View style={styles.communityCard}>
        <Text style={styles.communityTitle}>Economía Circular y Confianza Vecinal</Text>
        <Text style={styles.communityText}>
          En UniShare compartimos objetos de poco uso frecuente para reducir gastos innecesarios y cuidar el medio ambiente. Los puntos de intercambio deben acordarse en lugares públicos y seguros de tu comunidad.
        </Text>
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
    backgroundColor: '#F4F7F5'
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40
  },
  profileHeaderCard: {
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro, // #233B32 Protagonista
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5
  },
  avatarContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: EUCALIPTO_PALETTE.verdeMedio, // #4C7A66
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: Colors.accent // #8FBBA6
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 13,
    color: EUCALIPTO_PALETTE.fondoClaro,
    marginBottom: 14,
    opacity: 0.95
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  communityBadge: {
    backgroundColor: 'rgba(221, 238, 227, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(143, 187, 166, 0.5)'
  },
  communityBadgeText: {
    color: EUCALIPTO_PALETTE.fondoClaro,
    fontSize: 11,
    fontWeight: '700'
  },
  reputationBadge: {
    backgroundColor: Colors.accent, // #8FBBA6
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14
  },
  reputationBadgeText: {
    color: EUCALIPTO_PALETTE.verdeOscuro,
    fontSize: 11,
    fontWeight: '700'
  },
  messageBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9'
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2'
  },
  messageText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500'
  },
  successText: {
    color: Colors.success
  },
  errorText: {
    color: Colors.error
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary
  },
  editButton: {
    backgroundColor: EUCALIPTO_PALETTE.fondoClaro,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10
  },
  editButtonText: {
    color: EUCALIPTO_PALETTE.verdeOscuro,
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
    color: Colors.textSecondary,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600'
  },
  statusPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusPillText: {
    color: '#2E7D32',
    fontSize: 12,
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
    color: Colors.textPrimary,
    marginBottom: 6
  },
  input: {
    height: 46,
    backgroundColor: '#F9FBF9',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary
  },
  privacyNoticeBox: {
    backgroundColor: 'rgba(221, 238, 227, 0.4)',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.accent
  },
  privacyNoticeText: {
    fontSize: 11,
    color: EUCALIPTO_PALETTE.verdeOscuro,
    lineHeight: 15
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14
  },
  saveButton: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.accent,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  communityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: EUCALIPTO_PALETTE.verdeOscuro,
    marginBottom: 4
  },
  communityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18
  },
  logoutButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '700'
  }
});
