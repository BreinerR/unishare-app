import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService } from '../../services/objectService';
import { LoanService } from '../../services/loanService';
import { resolveImageUrl } from '../../services/api';

export default function ItemDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { objectId, item: initialItem } = route.params || {};

  const [item, setItem] = useState(initialItem || null);
  const [loading, setLoading] = useState(!initialItem);
  const [withdrawing, setWithdrawing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Estados para el Modal de Solicitud de Préstamo (HU-12)
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getFutureDateStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(getTodayStr());
  const [fechaFin, setFechaFin] = useState(getFutureDateStr(7));
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [loanMessage, setLoanMessage] = useState('');
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [loanModalError, setLoanModalError] = useState('');

  const handleSelectDuration = (days) => {
    setSelectedDuration(days);
    setFechaFin(getFutureDateStr(days));
    setLoanModalError('');
  };

  const openLoanModal = () => {
    if (isOwner) {
      Alert.alert('Acción no permitida', 'No puedes solicitar un préstamo de tu propio objeto.');
      return;
    }
    setLoanModalError('');
    setFechaInicio(getTodayStr());
    setFechaFin(getFutureDateStr(7));
    setSelectedDuration(7);
    setLoanMessage('');
    setLoanModalVisible(true);
  };

  const handleSubmitLoan = async () => {
    const hoy = getTodayStr();
    if (!fechaInicio || !fechaFin) {
      setLoanModalError('Debes indicar las fechas de inicio y devolución.');
      return;
    }
    if (fechaInicio < hoy) {
      setLoanModalError('La fecha de inicio no puede ser anterior a hoy.');
      return;
    }
    if (fechaFin < fechaInicio) {
      setLoanModalError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    try {
      setSubmittingLoan(true);
      setLoanModalError('');
      await LoanService.solicitarPrestamo({
        objeto_id: item.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        mensaje: loanMessage.trim()
      });

      setLoanModalVisible(false);
      Alert.alert(
        'Solicitud Enviada con Éxito',
        `Tu solicitud de préstamo para "${item.nombre}" ha sido enviada al propietario (${item.propietario_nombre || 'vecino'}).\n\nPodrás revisar el estado y coordinar la entrega desde tu perfil.`,
        [
          { text: 'Ver en Mi Perfil', onPress: () => navigation.navigate('Perfil') },
          { text: 'Aceptar' }
        ]
      );
    } catch (err) {
      setLoanModalError(err.message || 'Error al enviar la solicitud de préstamo.');
    } finally {
      setSubmittingLoan(false);
    }
  };

  useEffect(() => {
    if (objectId) {
      loadObjectDetail();
    }
  }, [objectId]);

  const loadObjectDetail = async () => {
    try {
      setLoading(true);
      const res = await ObjectService.getObjectById(objectId);
      if (res.success && res.object) {
        setItem(res.object);
      }
    } catch (err) {
      console.warn('Error cargando detalle del artículo:', err);
      Alert.alert('Error', 'No se pudo cargar la información del artículo.');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.id && item?.id_usuario && Number(user.id) === Number(item.id_usuario);

  // Retirar artículo del catálogo público
  const handleWithdrawObject = () => {
    Alert.alert(
      'Retirar Publicación',
      `¿Deseas retirar "${item.nombre}" del catálogo público?\n\nDejará de aparecer en las búsquedas pero se conservará en tu historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Retirar',
          style: 'destructive',
          onPress: async () => {
            try {
              setWithdrawing(true);
              await ObjectService.withdrawObject(item.id);
              Alert.alert(
                'Publicación Retirada',
                'El artículo fue retirado del catálogo público con éxito.',
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
              Alert.alert('Error', err.message || 'No se pudo retirar el objeto.');
            } finally {
              setWithdrawing(false);
            }
          }
        }
      ]
    );
  };

  // Solicitar Préstamo / Ofrecer Trueque
  const handleAction = (tipo) => {
    if (tipo === 'prestamo') {
      openLoanModal();
      return;
    }
    Alert.alert(
      'Ofrecer Trueque a Vecino',
      `¿Deseas enviar una propuesta a ${item.propietario_nombre || 'el vecino'} para coordinar el intercambio en ${item.ubicacion}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Solicitud',
          onPress: () => {
            Alert.alert(
              'Propuesta Enviada',
              `El vecino ${item.propietario_nombre || 'propietario'} ha recibido tu propuesta. Podrán coordinar el punto de entrega seguro en ${item.ubicacion}.`
            );
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SICILY_PALETTE.azulProfundo} />
        <Text style={styles.loadingText}>Cargando información del artículo...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Artículo no encontrado</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Volver al Catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rawImages = Array.isArray(item.imagenes) && item.imagenes.length > 0
    ? item.imagenes
    : ['https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600'];

  const resolvedImages = rawImages.map(img => resolveImageUrl(img) || img);
  const currentPhoto = resolvedImages[selectedPhotoIndex] || resolvedImages[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Imagen Principal Hero */}
      <View style={styles.heroImageWrapper}>
        <Image source={{ uri: currentPhoto }} style={styles.heroImage} />
        <View style={styles.topBadgesRow}>
          <View style={[styles.modalityBadge, item.tipo_disponibilidad === 'trueque' ? styles.truequeBadge : styles.prestamoBadge]}>
            <Text style={[styles.modalityBadgeText, item.tipo_disponibilidad === 'trueque' ? styles.truequeBadgeText : styles.prestamoBadgeText]}>
              {item.tipo_disponibilidad ? item.tipo_disponibilidad.toUpperCase() : 'PRÉSTAMO'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {item.estado ? item.estado.toUpperCase() : 'DISPONIBLE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Miniaturas si hay múltiples fotos */}
      {resolvedImages.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsRow}>
          {resolvedImages.map((img, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.thumbnailBox, selectedPhotoIndex === index && styles.thumbnailActive]}
              onPress={() => setSelectedPhotoIndex(index)}
            >
              <Image source={{ uri: img }} style={styles.thumbnailImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tarjeta de Información Principal */}
      <View style={styles.detailCard}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadgeRow}>
            <Ionicons name="folder-outline" size={14} color={SICILY_PALETTE.textoMedio} />
            <Text style={styles.categoryText}>{item.categoria?.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Text style={styles.dateText}>
            Publicado: {item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString('es-ES') : 'Reciente'}
          </Text>
        </View>

        <Text style={styles.itemTitle}>{item.nombre}</Text>

        <View style={styles.zoneRow}>
          <View style={styles.zoneSubRow}>
            <Ionicons name="location-outline" size={15} color={SICILY_PALETTE.textoMedio} />
            <Text style={styles.zoneText}>{item.ubicacion}</Text>
          </View>
          <Text style={styles.privacyNote}>Punto de entrega público</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>Descripción y Condiciones</Text>
        <Text style={styles.descriptionText}>{item.descripcion}</Text>

        <View style={styles.divider} />

        {/* Información del Propietario */}
        <Text style={styles.sectionHeader}>Vecino Propietario</Text>
        <View style={styles.ownerCard}>
          {item.propietario_foto ? (
            <Image source={{ uri: resolveImageUrl(item.propietario_foto) || item.propietario_foto }} style={styles.ownerAvatar} />
          ) : (
            <View style={styles.ownerAvatarFallback}>
              <Text style={styles.ownerAvatarText}>
                {(item.propietario_nombre || 'V').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.ownerDetails}>
            <Text style={styles.ownerName}>{item.propietario_nombre || 'Miembro Comunitario'}</Text>
            <View style={styles.ownerZoneRow}>
              <Ionicons name="location-outline" size={12} color={SICILY_PALETTE.textoMedio} />
              <Text style={styles.ownerZone}>{item.propietario_zona || item.ubicacion}</Text>
            </View>
          </View>

          <View style={styles.reputationPill}>
            <Ionicons name="star" size={12} color="#8A5D00" />
            <Text style={styles.reputationPillText}>
              {item.propietario_reputacion ? Number(item.propietario_reputacion).toFixed(1) : '5.0'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botones de Acción (Condicional según si es Propietario o Solicitante) */}
      <View style={styles.actionsContainer}>
        {isOwner ? (
          /* Opciones exclusivas del propietario */
          <View style={styles.ownerActionsCol}>
            <View style={styles.ownerNoticeBox}>
              <Ionicons name="information-circle-outline" size={16} color="#6B4E00" />
              <Text style={styles.ownerNoticeText}>
                Esta es tu publicación comunitaria. Puedes actualizar sus datos o retirarla del catálogo.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditObject', { objectId: item.id, item })}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color={SICILY_PALETTE.azulProfundo} />
              <Text style={styles.editBtnText}>Editar Publicación</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.withdrawBtn, withdrawing && styles.btnDisabled]}
              onPress={handleWithdrawObject}
              disabled={withdrawing}
              activeOpacity={0.85}
            >
              {withdrawing ? (
                <ActivityIndicator color={Colors.error} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={styles.withdrawBtnText}>Retirar del Catálogo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Acciones para vecinos interesados (Botones de Acción Principal Paleta Sicily) */
          <View style={styles.requestActionsRow}>
            {item.tipo_disponibilidad === 'trueque' || item.tipo_disponibilidad === 'ambos' ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.truequeActionBtn]}
                onPress={() => handleAction('trueque')}
                activeOpacity={0.85}
              >
                <Ionicons name="repeat-outline" size={20} color={SICILY_PALETTE.textoOscuro} />
                <Text style={styles.truequeActionBtnText}>Ofrecer Trueque</Text>
              </TouchableOpacity>
            ) : null}

            {item.tipo_disponibilidad === 'prestamo' || item.tipo_disponibilidad === 'ambos' ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.prestamoActionBtn]}
                onPress={openLoanModal}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={20} color={SICILY_PALETTE.textoOscuro} />
                <Text style={styles.prestamoActionBtnText}>Solicitar Préstamo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Modal de Solicitud de Préstamo (HU-12) */}
      <Modal
        visible={loanModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLoanModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons name="calendar" size={18} color={SICILY_PALETTE.azulProfundo} />
                </View>
                <Text style={styles.modalTitle}>Solicitar Préstamo</Text>
              </View>
              <TouchableOpacity
                onPress={() => setLoanModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={SICILY_PALETTE.textoMedio} />
              </TouchableOpacity>
            </View>

            {/* Resumen del Objeto */}
            <View style={styles.modalItemPreview}>
              <Image source={{ uri: currentPhoto }} style={styles.modalItemImg} />
              <View style={styles.modalItemDetails}>
                <Text style={styles.modalItemName} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.modalItemOwner}>
                  Propietario: {item.propietario_nombre || 'Miembro Comunitario'}
                </Text>
                <Text style={styles.modalItemZone} numberOfLines={1}>
                  Entrega en: {item.ubicacion}
                </Text>
              </View>
            </View>

            {/* Error Banner si las fechas son inválidas */}
            {loanModalError ? (
              <View style={styles.modalErrorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.modalErrorText}>{loanModalError}</Text>
              </View>
            ) : null}

            {/* Selector de Duración Rápida */}
            <Text style={styles.modalFieldLabel}>Duración sugerida</Text>
            <View style={styles.durationPillsRow}>
              {[3, 7, 14, 30].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationPill,
                    selectedDuration === days && styles.durationPillActive
                  ]}
                  onPress={() => handleSelectDuration(days)}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      selectedDuration === days && styles.durationPillTextActive
                    ]}
                  >
                    {days} días
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rango de Fechas (Inicio y Fin) */}
            <View style={styles.datesInputRow}>
              <View style={styles.dateFieldCol}>
                <Text style={styles.modalFieldLabel}>Fecha de Inicio *</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="calendar-outline" size={16} color={SICILY_PALETTE.azulProfundo} />
                  <TextInput
                    style={styles.dateTextInput}
                    value={fechaInicio}
                    onChangeText={(val) => {
                      setFechaInicio(val.trim());
                      setLoanModalError('');
                    }}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={SICILY_PALETTE.textoMuted}
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={styles.dateFieldCol}>
                <Text style={styles.modalFieldLabel}>Fecha Devolución *</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="time-outline" size={16} color={SICILY_PALETTE.azulProfundo} />
                  <TextInput
                    style={styles.dateTextInput}
                    value={fechaFin}
                    onChangeText={(val) => {
                      setFechaFin(val.trim());
                      setSelectedDuration(null);
                      setLoanModalError('');
                    }}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={SICILY_PALETTE.textoMuted}
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            {/* Mensaje opcional */}
            <Text style={styles.modalFieldLabel}>Mensaje para el propietario (opcional)</Text>
            <TextInput
              style={styles.modalTextArea}
              value={loanMessage}
              onChangeText={setLoanMessage}
              placeholder="Ej. Hola vecino, lo cuidaré mucho y lo devolveré a tiempo."
              placeholderTextColor={SICILY_PALETTE.textoMuted}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Botones de Acción */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLoanModalVisible(false)}
                disabled={submittingLoan}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingLoan && styles.btnDisabled]}
                onPress={handleSubmitLoan}
                disabled={submittingLoan}
                activeOpacity={0.85}
              >
                {submittingLoan ? (
                  <ActivityIndicator color={SICILY_PALETTE.textoOscuro} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={SICILY_PALETTE.textoOscuro} />
                    <Text style={styles.modalSubmitBtnText}>Enviar Solicitud</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background // #F8F9FA
  },
  contentContainer: {
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 14
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyTitle: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  backBtn: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  heroImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  topBadgesRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  prestamoBadge: {
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderWidth: 1,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  prestamoBadgeText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 11,
    fontWeight: '800'
  },
  truequeBadge: {
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    borderWidth: 1,
    borderColor: '#D48806'
  },
  truequeBadgeText: {
    color: '#8A5D00',
    fontSize: 11,
    fontWeight: '800'
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#81C784'
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '800'
  },
  thumbnailsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  thumbnailBox: {
    width: 65,
    height: 65,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden'
  },
  thumbnailActive: {
    borderColor: SICILY_PALETTE.azulProfundo
  },
  thumbnailImg: {
    width: '100%',
    height: '100%'
  },
  detailCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  categoryText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 11,
    fontWeight: '800'
  },
  dateText: {
    color: SICILY_PALETTE.textoMuted,
    fontSize: 11
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 8
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  zoneSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  zoneText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 13,
    fontWeight: '600'
  },
  privacyNote: {
    color: SICILY_PALETTE.textoMuted,
    fontSize: 11
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 8
  },
  descriptionText: {
    fontSize: 13,
    color: SICILY_PALETTE.textoMedio,
    lineHeight: 20
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D0E2FC'
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12
  },
  ownerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SICILY_PALETTE.azulProfundo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  ownerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  ownerDetails: {
    flex: 1
  },
  ownerName: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 14,
    fontWeight: '700'
  },
  ownerZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  ownerZone: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 11
  },
  reputationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.4)'
  },
  reputationPillText: {
    color: '#8A5D00',
    fontWeight: '800',
    fontSize: 12
  },
  actionsContainer: {
    paddingHorizontal: 16
  },
  ownerActionsCol: {
    gap: 10
  },
  ownerNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.35)',
    marginBottom: 4
  },
  ownerNoticeText: {
    flex: 1,
    color: '#6B4E00',
    fontSize: 12,
    lineHeight: 16
  },
  editBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  editBtnText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 14,
    fontWeight: '700'
  },
  withdrawBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  withdrawBtnText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '700'
  },
  btnDisabled: {
    opacity: 0.6
  },
  requestActionsRow: {
    gap: 12
  },
  actionBtn: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  truequeActionBtn: {
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19
    shadowColor: SICILY_PALETTE.amarilloCalido
  },
  truequeActionBtnText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 15,
    fontWeight: '800'
  },
  prestamoActionBtn: {
    backgroundColor: SICILY_PALETTE.azulClaro, // #76B9FF
    shadowColor: SICILY_PALETTE.azulClaro
  },
  prestamoActionBtnText: {
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 15,
    fontWeight: '800'
  },
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
    marginBottom: 14
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SICILY_PALETTE.azulSuave,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  },
  modalCloseBtn: {
    padding: 4
  },
  modalItemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D0E2FC'
  },
  modalItemImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#FFFFFF'
  },
  modalItemDetails: {
    flex: 1
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro
  },
  modalItemOwner: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMedio,
    marginTop: 2
  },
  modalItemZone: {
    fontSize: 11,
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '600',
    marginTop: 1
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  modalErrorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600'
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 6
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  durationPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center'
  },
  durationPillActive: {
    borderColor: SICILY_PALETTE.azulProfundo,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: SICILY_PALETTE.textoMedio
  },
  durationPillTextActive: {
    color: SICILY_PALETTE.azulProfundo
  },
  datesInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14
  },
  dateFieldCol: {
    flex: 1
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  dateTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: SICILY_PALETTE.textoOscuro,
    padding: 0
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
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19
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
