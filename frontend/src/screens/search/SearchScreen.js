import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors, { SICILY_PALETTE } from '../../constants/colors';
import { ObjectService } from '../../services/objectService';
import { resolveImageUrl } from '../../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'todos', name: 'Todos' },
  { id: 'herramientas', name: 'Herramientas' },
  { id: 'hogar_jardineria', name: 'Hogar' },
  { id: 'electronica_gadgets', name: 'Tecnología' },
  { id: 'libros_academico', name: 'Libros' },
  { id: 'movilidad', name: 'Movilidad' },
  { id: 'camping_recreacion', name: 'Aire Libre' },
  { id: 'otros', name: 'Otros' }
];

const MODALITIES = ['Todos', 'Préstamo', 'Trueque'];

const RADIUS_OPTIONS = [
  { label: '500 m', meters: 500 },
  { label: '1 km', meters: 1000 },
  { label: '3 km', meters: 3000 },
  { label: 'Todo el sector', meters: 6000 }
];

// Puntos de referencia públicos por sector para protección de privacidad
const ZONE_CENTROIDS = {
  'parque central': { latitude: 3.4516, longitude: -76.5320 },
  'el nogal': { latitude: 3.4530, longitude: -76.5310 },
  'álamos': { latitude: 3.4680, longitude: -76.5250 },
  'alamos': { latitude: 3.4680, longitude: -76.5250 },
  'valle verde': { latitude: 3.4420, longitude: -76.5400 },
  'mercedes': { latitude: 3.4350, longitude: -76.5280 },
  'san antonio': { latitude: 3.4480, longitude: -76.5430 },
  'granada': { latitude: 3.4570, longitude: -76.5350 },
  'santa mónica': { latitude: 3.4720, longitude: -76.5210 }
};

const DEFAULT_COORDS = {
  latitude: 3.4516,
  longitude: -76.5320,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035
};

export default function SearchScreen({ navigation }) {
  const mapRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedModality, setSelectedModality] = useState('Todos');
  const [selectedRadius, setSelectedRadius] = useState(RADIUS_OPTIONS[1]); // 1 km por defecto
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ubicación del usuario gestionada de forma fluida y en segundo plano
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [userSectorName, setUserSectorName] = useState('Sector Parque Central');

  // Obtener ubicación GPS en segundo plano
  useEffect(() => {
    let isMounted = true;

    async function initUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });

          if (isMounted && loc?.coords) {
            const newCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035
            };
            setUserLocation(newCoords);

            const reverse = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });

            if (reverse && reverse.length > 0) {
              const place = reverse[0];
              const sector = place.district || place.subregion || place.city || 'Sector Activo';
              setUserSectorName(sector);
            }
          }
        }
      } catch (e) {
        // Mantiene coordenadas predeterminadas
      }
    }

    initUserLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // Función de consulta a la API de objetos
  const executeSearch = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {};

      if (searchTerm.trim()) filters.q = searchTerm.trim();
      if (selectedCategory !== 'todos') filters.categoria = selectedCategory;
      if (selectedModality !== 'Todos') filters.modalidad = selectedModality;

      const res = await ObjectService.getObjects(filters);
      if (res.success && Array.isArray(res.objects)) {
        setObjects(res.objects);
      }
    } catch (err) {
      console.warn('Error en búsqueda de artículos:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedModality]);

  // Búsqueda reactiva con debounce al tipear o cambiar filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [executeSearch]);

  // Recarga automática con useFocusEffect: cuando el usuario publica un objeto y regresa a Buscar/Mapa
  useFocusEffect(
    useCallback(() => {
      executeSearch();
    }, [executeSearch])
  );

  // Centrar mapa si se activa el modo mapa
  useEffect(() => {
    if (viewMode === 'map' && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 600);
    }
  }, [viewMode, userLocation]);

  // Coordenadas calculadas por sector barrial para proteger privacidad residencial
  const getObjectCoords = (item, idx) => {
    const locText = (item.ubicacion || '').toLowerCase();
    let base = { latitude: userLocation.latitude, longitude: userLocation.longitude };

    for (const [key, coords] of Object.entries(ZONE_CENTROIDS)) {
      if (locText.includes(key)) {
        base = coords;
        break;
      }
    }

    const angle = (idx * 137.5 * Math.PI) / 180;
    const offsetDist = 0.0014 + (idx % 3) * 0.0009;

    return {
      latitude: base.latitude + offsetDist * Math.sin(angle),
      longitude: base.longitude + offsetDist * Math.cos(angle)
    };
  };

  const getCategoryIconName = (cat) => {
    if (!cat) return 'cube-outline';
    const c = cat.toLowerCase();
    if (c.includes('herramienta')) return 'build-outline';
    if (c.includes('libro')) return 'book-outline';
    if (c.includes('hogar')) return 'leaf-outline';
    if (c.includes('electronica')) return 'hardware-chip-outline';
    if (c.includes('movilidad')) return 'bicycle-outline';
    if (c.includes('camping')) return 'compass-outline';
    return 'cube-outline';
  };

  return (
    <View style={styles.container}>
      {/* Barra de Búsqueda y Selector de Modo (Lista / Mapa) */}
      <View style={styles.topSearchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={SICILY_PALETTE.azulProfundo} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, herramienta, libro..."
            placeholderTextColor={SICILY_PALETTE.textoMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={SICILY_PALETTE.textoMuted} style={{ paddingHorizontal: 4 }} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Toggle Lista / Mapa */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              Lista ({objects.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
              Mapa Interactivo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido según Modo de Vista */}
      {viewMode === 'map' ? (
        /* ================= MAPA INTERACTIVO REAL ================= */
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={userLocation}
            showsUserLocation
            showsMyLocationButton
            customMapStyle={cleanLightMapStyle}
          >
            {/* Círculo suave de radio de proximidad con paleta Sicily */}
            <Circle
              center={userLocation}
              radius={selectedRadius.meters}
              fillColor="rgba(29, 89, 187, 0.10)"
              strokeColor={SICILY_PALETTE.azulProfundo}
              strokeWidth={1.8}
            />

            {/* Marcador del punto de referencia del usuario */}
            <Marker
              coordinate={userLocation}
              title="Tu sector general"
              description={userSectorName}
            >
              <View style={styles.userMarkerBadge}>
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
              </View>
            </Marker>

            {/* Pines de los objetos disponibles en la comunidad */}
            {objects.map((item, idx) => {
              const coords = getObjectCoords(item, idx);
              return (
                <Marker
                  key={item.id}
                  coordinate={coords}
                  title={item.nombre}
                  description={`${item.tipo_disponibilidad === 'trueque' ? 'Trueque' : 'Préstamo'} • ${item.ubicacion}`}
                  onCalloutPress={() => navigation.navigate('ItemDetail', { objectId: item.id, item })}
                >
                  <View style={styles.itemPinBadge}>
                    <Ionicons
                      name={getCategoryIconName(item.categoria)}
                      size={16}
                      color={SICILY_PALETTE.textoOscuro}
                    />
                  </View>
                  <Callout tooltip>
                    <View style={styles.calloutCard}>
                      <Text style={styles.calloutTitle} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.calloutSubtitle}>{item.ubicacion}</Text>
                      <View style={styles.calloutBadgeRow}>
                        <Text style={styles.calloutBadgeText}>
                          {item.tipo_disponibilidad === 'trueque' ? 'Trueque' : 'Préstamo'}
                        </Text>
                        <Text style={styles.calloutAction}>Ver detalle ›</Text>
                      </View>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>

          {/* Selector flotante de radio de proximidad sobre el mapa */}
          <View style={styles.mapFloatingBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floatingRadiusRow}>
              {RADIUS_OPTIONS.map((rad) => {
                const isSelected = selectedRadius.label === rad.label;
                return (
                  <TouchableOpacity
                    key={rad.label}
                    style={[styles.floatingRadiusChip, isSelected && styles.floatingRadiusChipActive]}
                    onPress={() => setSelectedRadius(rad)}
                  >
                    <Text style={[styles.floatingRadiusText, isSelected && styles.floatingRadiusTextActive]}>
                      {rad.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : (
        /* ================= VISTA DE LISTA LIMPIA ================= */
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Filtros de Categorías */}
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Filtros de Modalidad */}
          <View style={styles.modalitiesRow}>
            {MODALITIES.map((mod) => {
              const isSelected = selectedModality === mod;
              return (
                <TouchableOpacity
                  key={mod}
                  style={[styles.modalityChip, isSelected && styles.modalityChipActive]}
                  onPress={() => setSelectedModality(mod)}
                >
                  <Text style={[styles.modalityChipText, isSelected && styles.modalityChipTextActive]}>
                    {mod}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Contador y Restablecer Filtros */}
          <View style={styles.resultsInfoRow}>
            <Text style={styles.resultsCountText}>
              {objects.length} {objects.length === 1 ? 'artículo encontrado' : 'artículos encontrados'}
            </Text>
            {(searchTerm || selectedCategory !== 'todos' || selectedModality !== 'Todos') ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchTerm('');
                  setSelectedCategory('todos');
                  setSelectedModality('Todos');
                }}
              >
                <Text style={styles.resetFiltersText}>Restablecer</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={SICILY_PALETTE.azulProfundo} size="large" />
              <Text style={styles.loadingText}>Buscando publicaciones en tu sector...</Text>
            </View>
          ) : objects.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Sin coincidencias</Text>
              <Text style={styles.emptySubtitle}>
                No se encontraron artículos con estos criterios. Prueba cambiando el término o ampliando la categoría.
              </Text>
            </View>
          ) : (
            <View style={styles.resultsList}>
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
                      <View style={styles.badgeRow}>
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
                            {item.tipo_disponibilidad === 'trueque' ? 'Trueque' : (item.tipo_disponibilidad === 'ambos' ? 'Préstamo/Trueque' : 'Préstamo')}
                          </Text>
                        </View>
                        <Text style={styles.categoryBadgeText}>
                          {item.categoria?.replace('_', ' ')}
                        </Text>
                      </View>

                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.itemZoneText} numberOfLines={1}>
                        📍 {item.ubicacion}
                      </Text>

                      <View style={styles.ownerFooterRow}>
                        <Text style={styles.ownerText} numberOfLines={1}>
                          {item.propietario_nombre || 'Vecino'}
                        </Text>
                        <Text style={styles.ownerRating}>
                          ★ {item.propietario_reputacion ? Number(item.propietario_reputacion).toFixed(1) : '5.0'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Estilo de mapa claro y refinado para MapView
const cleanLightMapStyle = [
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F4F7FB' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D8E8FC' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E2E8F0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E5F5E9' }] }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background // #F8F9FA
  },
  topSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: SICILY_PALETTE.textoOscuro,
    fontSize: 14
  },
  clearSearchIcon: {
    color: SICILY_PALETTE.textoMuted,
    fontSize: 16,
    paddingHorizontal: 6
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  toggleBtnActive: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  toggleText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 13,
    fontWeight: '600'
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  mapContainer: {
    flex: 1,
    position: 'relative'
  },
  map: {
    width: '100%',
    height: '100%'
  },
  userMarkerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SICILY_PALETTE.azulProfundo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 5
  },
  userMarkerIcon: {
    fontSize: 18
  },
  itemPinBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SICILY_PALETTE.amarilloCalido,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: SICILY_PALETTE.azulProfundo,
    elevation: 6
  },
  itemPinIcon: {
    fontSize: 16
  },
  calloutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    width: 190,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  calloutTitle: {
    color: SICILY_PALETTE.textoOscuro,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2
  },
  calloutSubtitle: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 11,
    marginBottom: 6
  },
  calloutBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  calloutBadgeText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: SICILY_PALETTE.azulSuave,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  calloutAction: {
    color: SICILY_PALETTE.amarilloCalido,
    fontSize: 11,
    fontWeight: '800'
  },
  mapFloatingBar: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16
  },
  floatingRadiusRow: {
    gap: 8,
    paddingVertical: 2
  },
  floatingRadiusChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: SICILY_PALETTE.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  floatingRadiusChipActive: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  floatingRadiusText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 12,
    fontWeight: '600'
  },
  floatingRadiusTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  listContainer: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110
  },
  filterSection: {
    marginBottom: 10
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border
  },
  categoryChipActive: {
    backgroundColor: SICILY_PALETTE.azulProfundo,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  categoryChipText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 12,
    fontWeight: '600'
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  modalitiesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  modalityChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalityChipActive: {
    backgroundColor: SICILY_PALETTE.azulSuave,
    borderColor: SICILY_PALETTE.azulProfundo
  },
  modalityChipText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 12,
    fontWeight: '600'
  },
  modalityChipTextActive: {
    color: SICILY_PALETTE.azulProfundo,
    fontWeight: '700'
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2
  },
  resultsCountText: {
    color: SICILY_PALETTE.textoMedio,
    fontSize: 12,
    fontWeight: '600'
  },
  resetFiltersText: {
    color: SICILY_PALETTE.azulProfundo,
    fontSize: 12,
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
    marginTop: 10
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8
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
    lineHeight: 18
  },
  resultsList: {
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
    width: 105,
    height: 105,
    backgroundColor: SICILY_PALETTE.azulSuave
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between'
  },
  badgeRow: {
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
  categoryBadgeText: {
    color: SICILY_PALETTE.textoMuted,
    fontSize: 11,
    textTransform: 'capitalize'
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SICILY_PALETTE.textoOscuro,
    marginTop: 2
  },
  itemZoneText: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMedio
  },
  ownerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ownerText: {
    fontSize: 11,
    color: SICILY_PALETTE.textoMedio,
    flex: 1
  },
  ownerRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D48806'
  }
});
