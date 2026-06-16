import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { getPosts } from 'shared/services/postService';
import { getTopics } from 'shared/services/forumService';
import { getEvents } from 'shared/services/eventService';
import { logout } from '../../../store/slices/authSlice';
import { BASE_URL } from 'shared/constants/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 4) / 3;

export default function ProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);
  const token = useSelector((state: any) => state.auth.token);
  const insets = useSafeAreaInsets();

  const targetUserId = userId && userId !== user?.id && userId !== user?._id
    ? (userId as string)
    : null;

  const [profileUser, setProfileUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (e) {
      // Continue silently
    }
    dispatch(logout());
    router.replace('/login');
  };

  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [connectionsType, setConnectionsType] = useState<'followers' | 'following'>('followers');
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    fetchProfileUser();
    if (targetUserId) {
      checkFollowStatus();
    }
  }, [user, targetUserId, token]);

  const fetchProfileUser = async () => {
    if (!token) return;
    try {
      const url = targetUserId
        ? `${BASE_URL}/users/${targetUserId}`
        : `${BASE_URL}/users/${user?.id || user?._id}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data) {
        setProfileUser(data);
      }
    } catch (_) {}
  };

  const checkFollowStatus = async () => {
    if (!targetUserId || !token) return;
    try {
      const response = await fetch(`${BASE_URL}/users/${targetUserId}/followers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const myId = user?.id || user?._id;
        const followingState = data.some((f: any) => f._id === myId);
        setIsFollowing(followingState);
      }
    } catch (_) {}
  };

  const handleFollowToggle = async () => {
    if (!targetUserId || !token) return;
    try {
      const response = await fetch(`${BASE_URL}/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data) {
        setIsFollowing(data.following);
        setProfileUser((prev: any) => ({
          ...prev,
          followersCount: data.followersCount,
        }));
      }
    } catch (_) {}
  };

  const fetchData = async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setIsLoading(true);
    try {
      const [postsRes, topicsRes, eventsRes] = await Promise.all([
        getPosts(1, token || undefined),
        getTopics(1, token || undefined),
        getEvents(1, token || undefined)
      ]);
      
      const filterUserId = targetUserId || user.id || user._id;

      if (postsRes.data) {
        setPosts(postsRes.data.filter((p: any) => {
          const authorId = typeof p.userId === 'object' && p.userId ? p.userId._id : p.userId;
          return authorId === filterUserId;
        }));
      }
      
      if (topicsRes.data) {
        setTopics(topicsRes.data.filter((t: any) => {
          const authorId = typeof t.userId === 'object' && t.userId ? t.userId._id : t.userId;
          return authorId === filterUserId;
        }));
      }
      
      if (eventsRes.data) {
        setEvents(eventsRes.data.filter((e: any) => {
          const authorId = typeof e.userId === 'object' && e.userId ? e.userId._id : e.userId;
          return authorId === filterUserId;
        }));
      }
    } catch (error) {
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const handleOpenConnectionsModal = async (type: 'followers' | 'following') => {
    setConnectionsType(type);
    setConnectionsModalVisible(true);
    setConnectionsList([]);
    setIsLoadingConnections(true);

    try {
      const activeUserId = targetUserId || user?.id || user?._id;
      if (!activeUserId || !token) return;

      const url = `${BASE_URL}/users/${activeUserId}/${type}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Hata', data?.error || 'Bağlantı listesi alınamadı.');
        setConnectionsList([]);
      } else if (data && Array.isArray(data)) {
        setConnectionsList(data);
      } else {
        setConnectionsList([]);
      }
    } catch (err) {
      console.error('Connections error:', err);
      Alert.alert('Hata', (err as any).message || JSON.stringify(err));
      setConnectionsList([]);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchData(false),
      fetchProfileUser()
    ]);
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{(profileUser?.username || user?.username) || 'Profil'}</Text>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() =>
          Alert.alert(
            "Çıkış Yap",
            "Hesabınızdan çıkış yapmak istediğinizden emin misiniz?",
            [
              { text: "İptal", style: "cancel" },
              { text: "Çıkış Yap", style: "destructive", onPress: handleLogout }
            ]
          )
        }
      >
        <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderProfileInfo = () => {
    const displayUser = profileUser || {
      username: user?.username,
      fullName: user?.fullName || user?.username,
      bio: user?.bio || '',
      profileImage: user?.profileImage || user?.avatar || '',
      followersCount: 0,
      followingCount: 0,
    };

    const avatarSource = displayUser.profileImage || displayUser.avatar;
    const initial = (displayUser.username || 'U').charAt(0).toUpperCase();

    return (
      <View style={styles.profileSection}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatarContainer}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={() => handleOpenConnectionsModal('followers')}>
              <Text style={styles.statNumber}>{displayUser.followersCount || 0}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => handleOpenConnectionsModal('following')}>
              <Text style={styles.statNumber}>{displayUser.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={styles.fullName}>{displayUser.fullName || displayUser.username}</Text>
          <Text style={styles.username}>@{displayUser.username}</Text>
          {displayUser.bio ? <Text style={styles.bioText}>{displayUser.bio}</Text> : null}
        </View>

        {targetUserId ? (
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.unfollowButton]}
            onPress={handleFollowToggle}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
              {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
        onPress={() => setActiveTab('posts')}
      >
        <Ionicons name="grid-outline" size={24} color={activeTab === 'posts' ? '#EF4444' : '#6B7280'} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'topics' && styles.tabItemActive]}
        onPress={() => setActiveTab('topics')}
      >
        <Ionicons name="help-circle-outline" size={26} color={activeTab === 'topics' ? '#EF4444' : '#6B7280'} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'events' && styles.tabItemActive]}
        onPress={() => setActiveTab('events')}
      >
        <Ionicons name="calendar-outline" size={24} color={activeTab === 'events' ? '#EF4444' : '#6B7280'} />
      </TouchableOpacity>
    </View>
  );

  const renderPostItem = ({ item, index }: { item: any, index: number }) => (
    <TouchableOpacity 
      style={styles.postGridItem} 
      activeOpacity={0.8}
      onPress={() => {
        setSelectedIndex(index);
        setModalVisible(true);
      }}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.postGridImage} />
      ) : (
        <View style={styles.postGridPlaceholder}>
          <Ionicons name="document-text-outline" size={32} color="#6B7280" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderModalPostItem = ({ item }: { item: any }) => {
    const postUsername = typeof item.userId === 'object' && item.userId ? item.userId.username : 'Kullanıcı';
    const postAvatar = typeof item.userId === 'object' && item.userId ? item.userId.profileImage : null;
    return (
      <View style={styles.modalPostCard}>
        <View style={styles.modalPostHeader}>
          {postAvatar ? (
            <Image source={{ uri: postAvatar }} style={styles.modalAvatar} />
          ) : (
            <View style={styles.modalAvatarPlaceholder}>
              <Text style={styles.modalAvatarInitials}>
                {postUsername.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.modalUsername}>{postUsername}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.modalDate}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
        </View>
        
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.modalImage} />
        )}
        
        <View style={styles.modalActions}>
          <View style={styles.modalActionLeft}>
            <Ionicons name="heart-outline" size={26} color="#FFFFFF" style={styles.modalIcon} />
            <Text style={styles.modalActionText}>{item.likes?.length || 0}</Text>
            
            <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" style={styles.modalIcon} />
            <Text style={styles.modalActionText}>{item.comments?.length || 0}</Text>
            
            <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" style={styles.modalIcon} />
          </View>
        </View>
        
        <View style={styles.modalContentBody}>
          <Text style={styles.modalDescription}>
            <Text style={styles.modalUsernameBold}>{postUsername} </Text>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const renderTopicItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/topic/${item._id}` as any)} activeOpacity={0.8}>
      <View style={styles.topicCard}>
        <Text style={styles.topicTitle}>{item.title}</Text>
        <View style={styles.topicFooter}>
          <Text style={styles.topicDate}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
          <View style={styles.topicComments}>
            <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
            <Text style={styles.topicCommentCount}>{item.comments?.length || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEventItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/event/${item._id}` as any)} activeOpacity={0.8}>
      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.eventDetailsRow}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.eventDetailText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.eventDetailsRow}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.eventDetailText}>{new Date(item.date).toLocaleDateString('tr-TR')}</Text>
        </View>
        <View style={styles.eventDetailsRow}>
          <Ionicons name="people-outline" size={14} color="#6B7280" />
          <Text style={styles.eventDetailText}>{item.attendees?.length || 0} Katılımcı</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      );
    }

    if (activeTab === 'posts') {
      if (posts.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz gönderi yok</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          numColumns={3}
          renderItem={renderPostItem}
          scrollEnabled={false}
        />
      );
    }

    if (activeTab === 'topics') {
      if (topics.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz soru sorulmadı</Text>
          </View>
        );
      }
      return (
        <View style={styles.listContainer}>
          {topics.map(item => (
            <React.Fragment key={item._id}>
              {renderTopicItem({ item })}
            </React.Fragment>
          ))}
        </View>
      );
    }

    if (activeTab === 'events') {
      if (events.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz etkinlik yok</Text>
          </View>
        );
      }
      return (
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Oluşturduklarım</Text>
          {events.map(item => (
            <React.Fragment key={item._id}>
              {renderEventItem({ item })}
            </React.Fragment>
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#EF4444"
            colors={["#EF4444"]}
          />
        }
      >
        {renderProfileInfo()}
        {renderTabs()}
        {renderContent()}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitle}>Gönderiler</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={posts}
            keyExtractor={(item) => item._id}
            renderItem={renderModalPostItem}
            initialScrollIndex={selectedIndex}
            onScrollToIndexFailed={(info) => {
              console.log(info);
            }}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={connectionsModalVisible}
        animationType="slide"
        onRequestClose={() => setConnectionsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitle}>
              {connectionsType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
            </Text>
            <TouchableOpacity
              onPress={() => setConnectionsModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {isLoadingConnections ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#EF4444" />
            </View>
          ) : connectionsList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {connectionsType === 'followers' ? 'Henüz takipçi yok.' : 'Henüz kimse takip edilmiyor.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={connectionsList}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
              renderItem={({ item }) => {
                const initial = (item.username || 'U').charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    style={styles.userRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setConnectionsModalVisible(false);
                      router.push({ pathname: '/profile', params: { userId: item._id } } as any);
                    }}
                  >
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.userRowAvatar} />
                    ) : (
                      <View style={styles.userRowAvatarPlaceholder}>
                        <Text style={styles.userRowAvatarText}>{initial}</Text>
                      </View>
                    )}
                    <View style={styles.userRowTextContainer}>
                      <Text style={styles.userRowUsername}>@{item.username}</Text>
                      {item.fullName ? (
                        <Text style={styles.userRowFullName}>{item.fullName}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0B0F19',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 24,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bioContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  fullName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editProfileButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
    backgroundColor: '#161D30',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#0B0F19',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#EF4444',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  postGridItem: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    marginRight: 2,
    marginBottom: 2,
    backgroundColor: '#161D30',
  },
  postGridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  postGridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#161D30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    position: 'relative',
    backgroundColor: '#0B0F19',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
  },
  modalPostCard: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingBottom: 16,
  },
  modalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  modalAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalAvatarInitials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  modalActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIcon: {
    marginRight: 6,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 16,
  },
  modalContentBody: {
    paddingHorizontal: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  modalUsernameBold: {
    fontWeight: 'bold',
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  modalTagText: {
    color: '#EF4444',
    fontSize: 14,
    marginRight: 6,
  },
  listContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  topicCard: {
    backgroundColor: '#161D30',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  topicComments: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicCommentCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  eventCard: {
    backgroundColor: '#161D30',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  eventDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 6,
    flex: 1,
  },
  bioText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  followButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unfollowButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.6)',
    borderWidth: 1,
    borderColor: '#374151',
  },
  unfollowButtonText: {
    color: '#D1D5DB',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  userRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userRowAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userRowAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userRowTextContainer: {
    flex: 1,
  },
  userRowUsername: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  userRowFullName: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
});
