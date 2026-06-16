import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  Platform,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getEventById, joinEvent } from 'shared/services/eventService';
import { getPosts } from 'shared/services/postService';
import { RootState } from '../../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import PostCard, { Post } from '@/components/PostCard';

interface EventDetail {
  _id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  category?: string;
  image?: string;
  capacity?: number;
  attendees: Array<{
    _id: string;
    username: string;
    profileImage?: string;
  }>;
  userId: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  createdAt: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'detaylar' | 'postlar'>('detaylar');
  
  // Map Geocoding States
  const [region, setRegion] = useState({
    latitude: 41.0082, // Istanbul default
    longitude: 28.9784,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);

  // Event Posts States
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    fetchEventDetails();
  }, [id, token]);

  useEffect(() => {
    if (event) {
      geocodeEventLocation();
    }
  }, [event?.location]);

  useEffect(() => {
    if (activeTab === 'postlar') {
      fetchEventPosts();
    }
  }, [activeTab, event?.title]);

  const fetchEventDetails = async () => {
    if (!id) return;
    const { data, error } = await getEventById(id, token);
    if (error) {
      Alert.alert('Hata', 'Etkinlik detayları yüklenemedi.');
    } else if (data) {
      setEvent(data);
    }
    setIsLoading(false);
  };

  const geocodeEventLocation = async () => {
    if (!event?.location) return;
    try {
      // Check permissions first to avoid crashes
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const geocoded = await Location.geocodeAsync(event.location);
      if (geocoded && geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
        setMarkerCoordinate({ latitude, longitude });
      }
    } catch (_) {
      // Silently catch geocoding failures
    }
  };

  const fetchEventPosts = async () => {
    if (!event) return;
    setIsLoadingPosts(true);
    try {
      const { data } = await getPosts(1, token || undefined);
      if (data) {
        const postsList = Array.isArray(data) ? data : (data.posts || []);
        // Filter posts mentioning the event name
        const filtered = postsList.filter((p: Post) => 
          p.description?.toLowerCase().includes(event.title.toLowerCase()) ||
          event.description?.toLowerCase().includes(p.description?.toLowerCase() || '')
        );
        setPosts(filtered);
      }
    } catch (_) {
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleJoinToggle = async () => {
    if (!id || !event) return;
    setIsJoining(true);
    const { data, error } = await joinEvent(id, token);
    setIsJoining(false);

    if (error) {
      Alert.alert('Hata', 'Etkinliğe katılım durumu güncellenemedi.');
    } else if (data) {
      // Reload details to get populated attendees
      fetchEventDetails();
    }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `${event.title} etkinliğine davetlisin! \nKonum: ${event.location} \nTarih: ${formatDate(event.date)} \nDetaylar Petrolheads uygulamasında!`,
      });
    } catch (e: any) {
      Alert.alert('Hata', 'Paylaşım yapılamadı.');
    }
  };

  const handleReport = () => {
    Alert.alert('Bildir', 'Bu etkinliği şikayet etmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Şikayet Et',
        style: 'destructive',
        onPress: () => Alert.alert('Teşekkürler', 'Şikayetiniz incelemeye alınmıştır.'),
      },
    ]);
  };

  const handleGetDirections = () => {
    if (!markerCoordinate) {
      // Fallback to searching location name on maps
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event?.location || '')}`;
      Linking.openURL(url);
      return;
    }
    const { latitude, longitude } = markerCoordinate;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
      }
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Etkinlik bulunamadı.</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={() => router.back()}>
          <Text style={{ color: '#E53935', fontWeight: 'bold' }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const myId = user?.id || user?._id || '';
  const hasJoined = event.attendees.some(att => att._id === myId);
  const participantCount = event.attendees.length;
  const capacity = event.capacity || 500;

  // Cover Image
  const defaultImages = [
    'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600',
  ];
  const hash = event._id ? event._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const placeholderImageUrl = defaultImages[hash % defaultImages.length];
  const coverUrl = event.image || placeholderImageUrl;

  const eventDate = new Date(event.date);
  const eventDay = eventDate.getDate().toString();
  const eventMonth = eventDate.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover Hero Banner */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: coverUrl }} style={styles.heroImage} />
          
          {/* Overlays */}
          <TouchableOpacity
            style={[styles.overlayButton, styles.leftOverlay]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.rightOverlayContainer}>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overlayButton, { marginLeft: 8 }]}
              onPress={handleReport}
              activeOpacity={0.8}
            >
              <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Date Badge Overlay */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{eventDay}</Text>
            <Text style={styles.dateMonth}>{eventMonth}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>{event.title}</Text>
          
          <TouchableOpacity
            style={[styles.joinButton, hasJoined && styles.joinedButton]}
            onPress={handleJoinToggle}
            disabled={isJoining}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.joinButtonText}>
                {hasJoined ? 'Katıldın' : 'Katıl'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'detaylar' && styles.tabItemActive]}
            onPress={() => setActiveTab('detaylar')}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabText, activeTab === 'detaylar' && styles.tabTextActive]}>
              Detaylar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'postlar' && styles.tabItemActive]}
            onPress={() => setActiveTab('postlar')}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabText, activeTab === 'postlar' && styles.tabTextActive]}>
              Postlar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        {activeTab === 'detaylar' ? (
          <View style={styles.tabContent}>
            {/* Description Card */}
            <View style={styles.detailCard}>
              <Text style={styles.cardHeader}>Açıklama</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>

            {/* Category badge */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category || 'Araç Buluşması'}</Text>
            </View>

            {/* Time Card */}
            <View style={styles.infoRowCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.infoRowTextContainer}>
                <Text style={styles.infoRowLabel}>Başlangıç</Text>
                <Text style={styles.infoRowValue}>{formatDate(event.date)}</Text>
              </View>
            </View>

            {/* Location Card */}
            <View style={styles.infoRowCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={24} color="#E53935" />
              </View>
              <View style={styles.infoRowTextContainer}>
                <Text style={styles.infoRowLabel}>Adres</Text>
                <Text style={styles.infoRowValue}>{event.location}</Text>
              </View>
            </View>

            {/* Attendees Card */}
            <View style={styles.infoRowCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="people-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.infoRowTextContainer}>
                <Text style={styles.infoRowLabel}>Katılımcılar</Text>
                <Text style={styles.infoRowValue}>{participantCount} / {capacity}</Text>
              </View>
            </View>

            {/* Google Map preview */}
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                region={region}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
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

              <TouchableOpacity
                style={styles.directionsButton}
                onPress={handleGetDirections}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.directionsButtonText}>Yol Tarifi Al</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {isLoadingPosts ? (
              <View style={styles.postsLoader}>
                <ActivityIndicator size="small" color="#E53935" />
              </View>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={() => {}}
                  currentUserId={user?._id}
                />
              ))
            ) : (
              <View style={styles.emptyPostsContainer}>
                <Ionicons name="image-outline" size={60} color="#374151" />
                <Text style={styles.emptyPostsTitle}>Henüz paylaşım yapılmadı</Text>
                <Text style={styles.emptyPostsSubtitle}>
                  Bu etkinliğe katıldıysanız ilk fotoğrafı siz paylaşın!
                </Text>
                <TouchableOpacity
                  style={styles.createPostButton}
                  onPress={() => router.push('/create-post')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createPostButtonText}>Fotoğraf Paylaş</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0B0F19', // Premium dark background
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  backButtonText: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    width: '100%',
    height: 260,
    backgroundColor: '#161D30',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
  },
  rightOverlayContainer: {
    position: 'absolute',
    top: 20,
    right: 16,
    flexDirection: 'row',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateDay: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  dateMonth: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginTop: 2,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 28,
    fontFamily: 'System',
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: '#E53935',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  joinedButton: {
    backgroundColor: '#374151',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161D30',
    borderRadius: 25,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#222B45',
  },
  tabItem: {
    flex: 1,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#E53935',
  },
  tabText: {
    color: '#8F9CAE',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  detailCard: {
    backgroundColor: '#161D30',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222B45',
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  descriptionText: {
    fontSize: 14,
    color: '#8F9CAE',
    lineHeight: 20,
    fontFamily: 'System',
  },
  categoryBadge: {
    backgroundColor: '#222B45',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161D30',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222B45',
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoRowTextContainer: {
    flex: 1,
  },
  infoRowLabel: {
    color: '#8F9CAE',
    fontSize: 12,
    fontFamily: 'System',
    marginBottom: 2,
  },
  infoRowValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222B45',
    marginTop: 12,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  directionsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderWidth: 1,
    borderColor: '#222B45',
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postsLoader: {
    padding: 30,
    alignItems: 'center',
  },
  emptyPostsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPostsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyPostsSubtitle: {
    color: '#8F9CAE',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: '#E53935',
    borderRadius: 20,
    paddingHorizontal: 24,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
