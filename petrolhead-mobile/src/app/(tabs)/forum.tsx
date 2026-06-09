import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ForumScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forum</Text>
      <Text style={styles.subtitle}>Otomobil tutkunlarının sohbet alanı.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8'
  }
});
