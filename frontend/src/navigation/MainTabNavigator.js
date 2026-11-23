import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Colors, { SICILY_PALETTE } from '../constants/colors';

// Pantallas del Tab Navigator
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import PublishScreen from '../screens/publish/PublishScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerStyle: {
          backgroundColor: SICILY_PALETTE.azulProfundo,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.12)'
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18
        },
        headerTitleAlign: 'center',
        tabBarShowLabel: true,
        tabBarActiveTintColor: SICILY_PALETTE.azulProfundo,
        tabBarInactiveTintColor: SICILY_PALETTE.textoMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
          marginBottom: 4
        },
        // Barra de Navegación Flotante Minimalista tipo Pinterest
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: Colors.border,
          shadowColor: SICILY_PALETTE.azulProfundo,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.10,
          shadowRadius: 14,
          elevation: 10
        }
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          title: 'UniShare',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={23}
              color={focused ? SICILY_PALETTE.azulProfundo : SICILY_PALETTE.textoMuted}
            />
          )
        }}
      />

      <Tab.Screen
        name="Buscar"
        component={SearchScreen}
        options={{
          title: 'Explorar y Mapa',
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={23}
              color={focused ? SICILY_PALETTE.azulProfundo : SICILY_PALETTE.textoMuted}
            />
          )
        }}
      />

      <Tab.Screen
        name="Publicar"
        component={PublishScreen}
        options={{
          title: 'Publicar Artículo',
          tabBarLabel: 'Publicar',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.specialIconWrapper, focused && styles.specialIconActive]}>
              <Ionicons name="add" size={26} color={SICILY_PALETTE.textoOscuro} />
            </View>
          )
        }}
      />

      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={23}
              color={focused ? SICILY_PALETTE.azulProfundo : SICILY_PALETTE.textoMuted}
            />
          )
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  specialIconWrapper: {
    width: 42,
    height: 38,
    borderRadius: 19,
    backgroundColor: SICILY_PALETTE.amarilloCalido, // Contenedor circular flotante en amarillo #FEBD19
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SICILY_PALETTE.amarilloCalido,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4
  },
  specialIconActive: {
    transform: [{ scale: 1.08 }]
  }
});
