import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService } from '../../services/objectService';
import { resolveImageUrl } from '../../services/api';

const CATEGORIES = [
  { id: 'all', name: 'Todos', iconName: 'grid-outline' },
  { id: 'herramientas', name: 'Herramientas', iconName: 'build-outline' },
  { id: 'hogar_jardineria', name: 'Hogar', iconName: 'leaf-outline' },
  { id: 'electronica_gadgets', name: 'Tecnología', iconName: 'hardware-chip-outline' },
  { id: 'libros_academico', name: 'Libros', iconName: 'book-outline' },
  { id: 'movilidad', name: 'Movilidad', iconName: 'bicycle-outline' },
  { id: 'camping_recreacion', name: 'Aire Libre', iconName: 'compass-outline' }
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedCat, setSelectedCat] = useState('all');
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAvailableObjects = useCallback(async () => {
    try {
      const filters = {};
      if (selectedCat !== 'all') {
        filters.categoria = selectedCat;
      }
      const res = await ObjectService.getObjects(filters);
      if (res.success && Array.isArray(res.objects)) {
        setObjects(res.objects);
      }
    } catch (err) {
      console.warn('Error cargando catálogo:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCat]);

  // Carga inicial
  useEffect(() => {
    fetchAvailableObjects();
  }, [fetchAvailableObjects]);

  // Recarga automática garantizada con useFocusEffect al publicar o volver a Inicio
  useFocusEffect(
    useCallback(() => {
      fetchAvailableObjects();
    }, [fetchAvailableObjects])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableObjects();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={SICILY_PALETTE.azulProfundo}
          colors={[SICILY_PALETTE.azulProfundo, SICILY_PALETTE.amarilloCalido]}
        />
      }
    >
      {/* Cabecera Limpia (Sin emojis) */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.greeting}>
            Hola, {user?.nombre ? user.nombre.split(' ')[0] : 'Vecino'}
          </Text>
          <View style={styles.zoneSubtitleRow}>
            <Ionicons name="location-outline" size={13} color={SICILY_PALETTE.azulProfundo} />
            <Text style={styles.zoneSubtitle}>
              {user?.ubicacion_general || 'Sector Comunitario General'}
            </Text>
          </View>
        </View>
        <View style={styles.reputationBadge}>
          <Ionicons name="star" size={12} color="#8A5D00" style={{ marginRight: 3 }} />
          <Text style={styles.reputationText}>
            {user?.reputacion ? Number(user.reputacion).toFixed(1) : '5.0'}
          </Text>
        </View>
      </View>

      {/* Categorías Rápidas con Iconos Lineales Minimalistas */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCat(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.iconName}
                  size={14}
                  color={isSelected ? '#FFFFFF' : SICILY_PALETTE.textoMedio}
                  style={styles.categoryChipIcon}
                />
                <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sección del Catálogo de Artículos Disponibles */}
      <View style={styles.feedHeaderRow}>
        <Text style={styles.sectionTitle}>
          Disponibles cerca de ti
        </Text>
        <TouchableOpacity onPress={() => navigation?.navigate('Buscar')}>
          <Text style={styles.exploreLink}>Ver en mapa ›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={SICILY_PALETTE.azulProfundo} size="large" />
          <Text style={styles.loadingText}>Actualizando catálogo...</Text>
        </View>
      ) : objects.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={36} color={SICILY_PALETTE.textoMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>Sin artículos disponibles aquí</Text>
          <Text style={styles.emptySubtitle}>
            Sé el primero en compartir un objeto con tus vecinos de sector.
          </Text>
          {/* Botón Acción Principal */}
          <TouchableOpacity
            style={styles.publishPromptBtn}
            onPress={() => navigation?.navigate('Publicar')}
            activeOpacity={0.85}
          >
            <Text style={styles.publishPromptBtnText}>+ Publicar un objeto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {objects.map((item) => {
            const rawImg = Array.isArray(item.imagenes) && item.imagenes.length > 0
              ? item.imagenes[0]
              : null;
            const photoUrl = resolveImageUrl(rawImg) || 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => navigation.navigate('ItemDetail', { objectId: item.id, item })}
                activeOpacity={0.85}
              >
                <Image source={{ uri: photoUrl }} style={styles.itemImage} />

                <View style={styles.itemInfo}>
                  <View style={styles.itemTopRow}>
                    <View
                      style={[
                        styles.modalityBadge,
                        item.tipo_disponibilidad === 'trueque'
                          ? styles.truequeBadge
                          : styles.prestamoBadge
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalityBadgeText,
                          item.tipo_disponibilidad === 'trueque'
                            ? styles.truequeBadgeText
                            : styles.prestamoBadgeText
                        ]}
                      >
                        {item.tipo_disponibilidad === 'trueque' ? 'Trueque' : (item.tipo_disponibilidad === 'ambos' ? 'Préstamo o Trueque' : 'Préstamo')}
                      </Text>
                    </View>
                    <Text style={styles.categoryLabel}>
                      {item.categoria?.replace('_', ' ')}
                    </Text>
                  </View>

                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.nombre}
                  </Text>
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.descripcion}
                  </Text>

                  <View style={styles.itemFooterRow}>
                    <View style={styles.itemZoneGroup}>
                      <Ionicons name="location-outline" size={12} color={SICILY_PALETTE.textoMedio} style={{ marginRight: 3 }} />
                      <Text style={styles.itemZone} numberOfLines={1}>
                        {item.ubicacion}
                      </Text>
                    </View>
                    <View style={styles.ownerRatingBox}>
                      <Ionicons name="star" size={11} color="#D48806" style={{ marginRight: 2 }} />
                      <Text style={styles.ownerRating}>
                        {item.propietario_reputacion ? Number(item.propietario_reputacion).toFixed(1) : '5.0'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background // #F8F9FA
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  },
  headerTextGroup: {
    flex: 1
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro, // #0D2149
    letterSpacing: -0.3
  },
  zoneSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  zoneSubtitle: {
    fontSize: 13,
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '600',
    marginLeft: 3
  },
  reputationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SICILY_PALETTE.amarilloSuave,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(254, 189, 25, 0.4)'
  },
  reputationText: {
    color: '#8A5D00',
    fontWeight: '800',
    fontSize: 12
  },
  categoriesSection: {
    marginBottom: 20
  },
  categoriesRow: {
    gap: 8,
    paddingVertical: 2
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20
  },
  categoryChipActive: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  categoryChipIcon: {
    marginRight: 6
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: SICILY_PALETTE.textoMedio
  },
  categoryNameActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SICILY_PALETTE.textoOscuro
  },
  exploreLink: {
    fontSize: 13,
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '700'
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: SICILY_PALETTE.textoMedio,
    fontSize: 13
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginBottom: 4
  },
  emptySubtitle: {
    fontSize: 12,
    color: SICILY_PALETTE.textoMedio,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14
  },
  publishPromptBtn: {
    backgroundColor: SICILY_PALETTE.amarilloCalido, // #FEBD19
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  publishPromptBtnText: {
    color: SICILY_PALETTE.textoOscuro,
    fontWeight: '800',
    fontSize: 13
  },
  itemsList: {
    gap: 12
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  itemImage: {
    width: 110,
    height: 110,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between'
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  prestamoBadge: {
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  prestamoBadgeText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 10,
    fontWeight: '700'
  },
  truequeBadge: {
    backgroundColor: SICILY_PALETTE.amarilloSuave
  },
  truequeBadgeText: {
    color: '#8A5D00',
    fontSize: 10,
    fontWeight: '700'
  },
  categoryLabel: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMuted,
    textTransform: 'capitalize'
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginTop: 2
  },
  itemDescription: {
    fontSize: 12,
    color: SICILY_PALETTE.textoMedio,
    lineHeight: 16,
    marginTop: 2
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  itemZoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  itemZone: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMedio,
    flex: 1
  },
  ownerRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6
  },
  ownerRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D48806'
  }
});
