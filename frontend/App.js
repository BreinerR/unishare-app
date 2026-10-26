import React from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import Colors from './src/constants/colors';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.card}>
        <Text style={styles.title}>UniShare</Text>
        <Text style={styles.subtitle}>Plataforma Móvil Colaborativa Universitaria</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Estructura Base Lista</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceSoft,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 16
  },
  badge: {
    backgroundColor: Colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12
  }
});
