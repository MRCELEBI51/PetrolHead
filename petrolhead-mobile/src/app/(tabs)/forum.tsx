import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import TopicCard, { Topic } from '@/components/TopicCard';
import { getTopics } from 'shared/services/forumService';
import Header from '@/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useSelector((state: RootState) => state.auth);

  const fetchTopics = async () => {
    const { data } = await getTopics(1, token || undefined);
    if (data) {
      const topicsList = Array.isArray(data) ? data : (data.topics || []);
      setTopics(topicsList);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTopics();
    setRefreshing(false);
  };

  const handleCreateTopic = () => {
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Konu oluşturabilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    router.push('/create-topic');
  };

  const filteredTopics = topics.filter(
    (topic) =>
      topic.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <View>
      {/* Ask PetrolAI Card */}
      <View style={styles.aiCard}>
        <View style={styles.aiTextContainer}>
          <Text style={styles.aiTitle}>PetrolAI'a Sor</Text>
          <Text style={styles.aiSubtitle}>Yapay zeka asistanımıza teknik sorular sorun</Text>
        </View>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => router.push('/otoai')}
          activeOpacity={0.9}
        >
          <Text style={styles.aiButtonText}>Sohbete Başla</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Son Tartışmalar</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />

      <View style={styles.searchSection}>
        <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Forumda ara..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
        </View>
      ) : (
        <FlatList
          data={filteredTopics}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TopicCard
              topic={item}
              onPress={(topicId) => router.push(`/topic/${topicId}` as any)}
            />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz bir konu bulunmuyor.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateTopic}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  listContent: {
    paddingBottom: 80,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  categoryChipInactive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextInactive: {
    color: '#6B7280',
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    height: 180,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 44, 0.65)',
    padding: 16,
  },
  hotBadge: {
    backgroundColor: '#E53935',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  hotBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 4,
  },
  heroDescription: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'System',
  },
  aiCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  aiTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  aiSubtitle: {
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: 'System',
    marginTop: 2,
  },
  aiButton: {
    backgroundColor: '#E53935',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
});

