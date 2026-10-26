import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import Colors, { EUCALIPTO_PALETTE } from '../constants/colors';

// Pantallas
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

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
            backgroundColor: EUCALIPTO_PALETTE.verdeOscuro // #233B32
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
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
                title: 'Unirme a la Red',
                headerBackTitle: 'Volver',
                headerTintColor: '#FFFFFF',
                headerStyle: {
                  backgroundColor: EUCALIPTO_PALETTE.verdeOscuro
                }
              }}
            />
          </>
        ) : (
          // Rutas Protegidas de la Aplicación
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Mi Perfil Comunitario',
              headerTitleAlign: 'center',
              headerTintColor: '#FFFFFF',
              headerStyle: {
                backgroundColor: EUCALIPTO_PALETTE.verdeOscuro
              }
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background
  }
});
