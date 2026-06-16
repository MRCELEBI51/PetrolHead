import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import PostCard, { Post } from '@/components/PostCard';
import { getPosts, likePost } from 'shared/services/postService';
import { getFollowing, followUser } from 'shared/services/userService';
import Header from '@/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StoriesBar from '../../components/StoriesBar';

const HEADER_HEIGHT = 56;
const STORIES_BAR_HEIGHT = 102;

export default function HomeScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const { token, user } = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();
  const totalTopHeight = HEADER_HEIGHT + STORIES_BAR_HEIGHT + insets.top;
  const totalTopHeightRef = useRef(totalTopHeight);

  useEffect(() => {
    totalTopHeightRef.current = totalTopHeight;
  }, [totalTopHeight]);

  // Animasyon Değerleri ve Scroll Takibi
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentOffsetY = event.nativeEvent.contentOffset.y;
        const currentTotalHeight = totalTopHeightRef.current;
        
        // Küçük hareketlerde titremeyi önlemek için eşik (threshold) değeri
        if (Math.abs(currentOffsetY - lastOffsetY.current) > 15) {
          if (currentOffsetY > lastOffsetY.current && currentOffsetY > currentTotalHeight) {
            // Aşağı kaydırma -> Gizle
            if (scrollDirection.current !== 'down') {
              scrollDirection.current = 'down';
              Animated.timing(headerTranslateY, {
                toValue: -currentTotalHeight,
                duration: 250,
                useNativeDriver: true,
              }).start();
            }
          } else if (currentOffsetY < lastOffsetY.current) {
            // Yukarı kaydırma -> Göster
            if (scrollDirection.current !== 'up') {
              scrollDirection.current = 'up';
              Animated.timing(headerTranslateY, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }).start();
            }
          }
        }
        
        // En yukarı kaydırıldığında barın açılmasını garanti et
        if (currentOffsetY <= 0 && scrollDirection.current !== 'up') {
          scrollDirection.current = 'up';
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }

        lastOffsetY.current = currentOffsetY;
      }
    }
  );

  const headerOpacity = headerTranslateY.interpolate({
    inputRange: [-totalTopHeight, 0],
    outputRange: [0, 1],
  });

  const fetchPosts = async () => {
    const { data } = await getPosts(1, token || undefined);
    if (data) {
      const postsList = Array.isArray(data) ? data : (data.posts || []);
      setPosts(postsList);
    }
    setIsLoading(false);
  };

  const fetchFollowing = async () => {
    if (!token || !user) return;
    const myId = user.id || user._id;
    if (!myId) return;
    const { data } = await getFollowing(myId, token);
    if (data && Array.isArray(data)) {
      setFollowingIds(data.map((u: any) => u._id));
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchFollowing();
  }, [token, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchFollowing()]);
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Beğenebilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    const { data } = await likePost(postId, token);
    if (data) {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            const updatedLikes = Array.isArray(data) ? data : (data.likes || post.likes);
            return { ...post, likes: updatedLikes };
          }
          return post;
        })
      );
    }
  };

  const handleFollowToggle = async (authorId: string) => {
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Takip edebilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    const isCurrentlyFollowing = followingIds.includes(authorId);
    if (isCurrentlyFollowing) {
      setFollowingIds(prev => prev.filter(id => id !== authorId));
    } else {
      setFollowingIds(prev => [...prev, authorId]);
    }

    const { data, error } = await followUser(authorId, token);
    if (error) {
      if (isCurrentlyFollowing) {
        setFollowingIds(prev => [...prev, authorId]);
      } else {
        setFollowingIds(prev => prev.filter(id => id !== authorId));
      }
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    }
  };

  const handleCreatePost = () => {
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Paylaşım yapabilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    router.push('/create-post');
  };

  const currentUserId = user?._id || '';

  const renderHeader = () => null;

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          <Text style={styles.aiTitle}>AI Insights</Text>
        </View>
        <Text style={styles.aiDescription}>
          Trending: Carbon fiber aerodynamic upgrades for 90s chassis are seeing a 200% spike in forum activity this week.
        </Text>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => router.push('/otoai')}
          activeOpacity={0.9}
        >
          <Text style={styles.aiButtonText}>ASK AI ASSISTANT</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomSpacer} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animasyonlu Üst Bar (Header + StoriesBar) */}
      <Animated.View
        style={[
          styles.animatedHeaderContainer,
          {
            paddingTop: insets.top,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          }
        ]}
      >
        <Header />
        <StoriesBar refreshTrigger={followingIds} />
      </Animated.View>
      
      <Animated.FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const isLiked = Array.isArray(item.likes) && item.likes.includes(currentUserId);
          const authorId = typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId;
          const isFollowing = followingIds.includes(authorId);
          return (
            <PostCard
              post={item}
              onLike={handleLike}
              isLiked={isLiked}
              currentUserId={currentUserId}
              isFollowing={isFollowing}
              onFollowToggle={handleFollowToggle}
            />
          );
        }}
        ListHeaderComponent={<View style={{ height: totalTopHeight }} />}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  animatedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#0D0D0D',
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
    paddingVertical: 12,
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
  footerContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  aiCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
    marginLeft: 8,
  },
  aiDescription: {
    fontSize: 14,
    color: '#9E9E9E',
    opacity: 0.9,
    lineHeight: 20,
    fontFamily: 'System',
    marginBottom: 16,
  },
  aiButton: {
    backgroundColor: '#E53935',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  bottomSpacer: {
    height: 24,
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

