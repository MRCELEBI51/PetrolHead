import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
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
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
      >
        {Platform.OS === 'android' && (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            tileSize={256}
          />
        )}
        {markerCoordinate && (
          <Marker coordinate={markerCoordinate} />
        )}
      </MapView>
      
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
  },
  map: {
    width: '100%',
    height: '100%',
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
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
