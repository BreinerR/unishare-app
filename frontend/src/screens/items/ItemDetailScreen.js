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
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService } from '../../services/objectService';
import { resolveImageUrl } from '../../services/api';

export default function ItemDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { objectId, item: initialItem } = route.params || {};

  const [item, setItem] = useState(initialItem || null);
  const [loading, setLoading] = useState(!initialItem);
  const [withdrawing, setWithdrawing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

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
    const accionTitulo = tipo === 'trueque' ? 'Ofrecer Trueque' : 'Solicitar Préstamo';
    Alert.alert(
      `${accionTitulo} a Vecino`,
      `¿Deseas enviar una propuesta a ${item.propietario_nombre || 'el vecino'} para coordinar la entrega en ${item.ubicacion}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Solicitud',
          onPress: () => {
            Alert.alert(
              'Propuesta Enviada',
              `El vecino ${item.propietario_nombre || 'propietario'} ha recibido tu mensaje. Podrán coordinar el punto de entrega seguro en ${item.ubicacion}.`
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
                onPress={() => handleAction('prestamo')}
                activeOpacity={0.85}
              >
                <Ionicons name="swap-horizontal-outline" size={20} color={SICILY_PALETTE.textoOscuro} />
                <Text style={styles.prestamoActionBtnText}>Solicitar Préstamo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
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
  }
});
