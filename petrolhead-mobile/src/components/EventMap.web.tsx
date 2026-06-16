import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EventMapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  setRegion: (region: any) => void;
  markerCoordinate: { latitude: number; longitude: number } | null;
  handleMapPress: (e: any) => void;
  handleGetCurrentLocation: () => void;
}

export default function EventMap({
  region,
  setRegion,
  markerCoordinate,
  handleMapPress,
  handleGetCurrentLocation,
}: EventMapProps) {
  return (
    <View style={styles.mapContainer}>
      <View style={styles.placeholderContainer}>
        <Ionicons name="map-outline" size={32} color="#E53935" />
        <Text style={styles.title}>Web Harita Önizlemesi</Text>
        <Text style={styles.subtitle}>
          Seçilen Konum: {markerCoordinate ? `${markerCoordinate.latitude.toFixed(4)}, ${markerCoordinate.longitude.toFixed(4)}` : 'Seçilmedi'}
        </Text>
      </View>
      
      {/* Current Location FAB overlay */}
      <TouchableOpacity
        style={styles.currentLocationFab}
        onPress={handleGetCurrentLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={22} color="#E53935" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161D30',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  currentLocationFab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#1A1A1A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
});
