import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import Colors, { SICILY_PALETTE } from '../constants/colors';

// Pantallas de Autenticación
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Navegador Principal Flotante (Bottom Tabs)
import MainTabNavigator from './MainTabNavigator';

// Pantallas de Detalle y Edición de Objetos
import ItemDetailScreen from '../screens/items/ItemDetailScreen';
import EditObjectScreen from '../screens/items/EditObjectScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: SICILY_PALETTE.azulProfundo
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18
          },
          contentStyle: {
            backgroundColor: Colors.background
          }
        }}
      >
        {!isAuthenticated ? (
          // Rutas de Autenticación
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                title: 'Crear Cuenta Comunitaria',
                headerBackTitle: 'Volver',
                headerTintColor: '#FFFFFF',
                headerStyle: {
                  backgroundColor: SICILY_PALETTE.azulProfundo
                }
              }}
            />
          </>
        ) : (
          // Rutas Protegidas de la Aplicación
          <>
            <Stack.Screen
              name="MainApp"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ItemDetail"
              component={ItemDetailScreen}
              options={{
                title: 'Detalle del Artículo',
                headerTitleAlign: 'center',
                headerTintColor: '#FFFFFF',
                headerStyle: {
                  backgroundColor: SICILY_PALETTE.azulProfundo
                }
              }}
            />
            <Stack.Screen
              name="EditObject"
              component={EditObjectScreen}
              options={{
                title: 'Editar Publicación',
                headerTitleAlign: 'center',
                headerTintColor: '#FFFFFF',
                headerStyle: {
                  backgroundColor: SICILY_PALETTE.azulProfundo
                }
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background
  }
});
