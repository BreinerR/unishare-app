import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Colors, { EUCALIPTO_PALETTE } from '../../constants/colors';
import api from '../../services/api';
import { DEFAULT_COMMUNITY_ZONES, PRIVACY_POLICY } from '../../utils/privacyLocation';

export default function CommunityZoneMap({ onSelectZone, selectedZone }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoading(true);
        const res = await api.get('/zones');
        if (res.success && res.zonas) {
          setZones(res.zonas);
          const initial = res.zonas.find((z) => z.nombre_sector === selectedZone) || res.zonas[0];
          setActiveZone(initial);
        }
      } catch (e) {
        // Fallback a zonas predefinidas si el backend aún no responde en esa ruta
        const fallbackZones = DEFAULT_COMMUNITY_ZONES.map((name, idx) => ({
          id: `fallback-${idx}`,
          nombre_sector: name,
          tipo_comunidad: idx % 2 === 0 ? 'barrio' : 'conjunto_residencial',
          punto_encuentro_publico: 'Punto de Encuentro Comunitario',
          radio_cobertura_metros: 700,
          objetos_activos: 10 + idx * 3,
          politica_privacidad: PRIVACY_POLICY.disclaimer
        }));
        setZones(fallbackZones);
        setActiveZone(fallbackZones[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, [selectedZone]);

  const handleSelect = (zone) => {
    setActiveZone(zone);
    if (onSelectZone) {
      onSelectZone(zone.nombre_sector);
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Encabezado con Insignia de Privacidad */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Mapa Comunitario de Zonas</Text>
          <View style={styles.privacyShield}>
            <Text style={styles.privacyShieldText}>🛡️ Privacidad 100%</Text>
          </View>
        </View>
        <Text style={styles.privacySubtitle}>
          Por seguridad vecinal, únicamente se mapean sectores amplios y puntos de encuentro públicos. Nunca coordenadas GPS exactas.
        </Text>
      </View>

      {/* Vista Previa Gráfica del Mapa Vectorial / Perímetros de Seguridad */}
      <View style={styles.mapCanvas}>
        {/* Anillos de radio de seguridad difuminado (500m - 900m) */}
        <View style={styles.radarOuterRing}>
          <View style={styles.radarMiddleRing}>
            <View style={styles.radarCenterPin}>
              <Text style={styles.pinIcon}>📍</Text>
            </View>
          </View>
        </View>

        <View style={styles.mapOverlayInfo}>
          <Text style={styles.overlaySectorTitle}>
            {activeZone ? activeZone.nombre_sector : 'Sector Seleccionado'}
          </Text>
          <Text style={styles.overlayMeetingPoint}>
            Punto de intercambio: {activeZone?.punto_encuentro_publico || 'Zona Común Segura'}
          </Text>
          <View style={styles.overlayBadge}>
            <Text style={styles.overlayBadgeText}>
              Radio de Privacidad: ~{activeZone?.radio_cobertura_metros || 800}m
            </Text>
          </View>
        </View>
      </View>

      {/* Carrusel / Lista de Sectores Comunitarios */}
      <Text style={styles.subheading}>Sectores Vecinales y Puntos de Encuentro:</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.zonesScrollList}
        >
          {zones.map((zone) => {
            const isSelected = activeZone?.id === zone.id;
            return (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.zoneChip,
                  isSelected && styles.zoneChipSelected
                ]}
                onPress={() => handleSelect(zone)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.zoneChipName,
                    isSelected && styles.zoneChipNameSelected
                  ]}
                  numberOfLines={1}
                >
                  {zone.nombre_sector}
                </Text>
                <View style={styles.zoneChipFooter}>
                  <Text
                    style={[
                      styles.zoneChipItems,
                      isSelected && styles.zoneChipItemsSelected
                    ]}
                  >
                    📦 {zone.objetos_activos || 12} objetos
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20
  },
  header: {
    marginBottom: 14
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary
  },
  privacyShield: {
    backgroundColor: EUCALIPTO_PALETTE.fondoClaro,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent
  },
  privacyShieldText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary
  },
  privacySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16
  },
  mapCanvas: {
    height: 160,
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro, // #233B32
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16
  },
  radarOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 187, 166, 0.3)', // #8FBBA6 translúcido
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 122, 102, 0.15)'
  },
  radarMiddleRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 187, 166, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143, 187, 166, 0.25)'
  },
  radarCenterPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pinIcon: {
    fontSize: 16
  },
  mapOverlayInfo: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(20, 33, 28, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(143, 187, 166, 0.4)'
  },
  overlaySectorTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  overlayMeetingPoint: {
    color: EUCALIPTO_PALETTE.fondoClaro,
    fontSize: 11,
    marginTop: 1
  },
  overlayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(143, 187, 166, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4
  },
  overlayBadgeText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '600'
  },
  subheading: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8
  },
  zonesScrollList: {
    gap: 10,
    paddingVertical: 4
  },
  zoneChip: {
    backgroundColor: '#F3FAF5',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 150
  },
  zoneChipSelected: {
    backgroundColor: EUCALIPTO_PALETTE.verdeOscuro, // #233B32
    borderColor: Colors.primary
  },
  zoneChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary
  },
  zoneChipNameSelected: {
    color: '#FFFFFF'
  },
  zoneChipFooter: {
    marginTop: 4
  },
  zoneChipItems: {
    fontSize: 11,
    color: Colors.secondary
  },
  zoneChipItemsSelected: {
    color: EUCALIPTO_PALETTE.fondoClaro
  }
});
