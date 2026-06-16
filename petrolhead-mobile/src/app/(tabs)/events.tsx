import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import EventCard, { Event } from '@/components/EventCard';
import { getEvents, joinEvent } from 'shared/services/eventService';
import { BrandColors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token, user } = useSelector((state: RootState) => state.auth);

  // Filter and Search state
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    const { data } = await getEvents(1, token || undefined);
    if (data) {
      const eventsList = Array.isArray(data) ? data : (data.events || []);
      setEvents(eventsList);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleJoin = async (eventId: string) => {
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Etkinliğe katılabilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    const { error } = await joinEvent(eventId, token);
    if (error) {
      Alert.alert('Hata', 'Etkinliğe katılırken bir sorun oluştu.');
      return;
    }
    // Refresh to show updated participant status
    fetchEvents();
  };

  const handleCreateEvent = () => {
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Etkinlik oluşturabilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    router.push('/create-event');
  };

  // Filter events in memory
  const filteredEvents = events.filter((event) => {
    // Search Query Filter
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.category && event.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header with Search Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ara..."
              placeholderTextColor="#9E9E9E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/event/${item._id}` as any)}>
            <EventCard event={item} onJoin={handleJoin} userId={user?._id} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#6B7280" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>
              Aktif etkinlik bulunamadı.
            </Text>
          </View>
        }
      />

      {/* Sticky Bottom Create Button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateEvent}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>Etkinlik Oluştur</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBackButton: {
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161D30',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'System',
    height: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#161D30',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  tabButtonText: {
    color: '#9E9E9E',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 100, // Safe padding for sticky button
  },
  emptyContainer: {
    padding: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9E9E9E',
    textAlign: 'center',
    fontFamily: 'System',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    padding: 16,
    zIndex: 10,
  },
  createButton: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
