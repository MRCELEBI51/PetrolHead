import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { searchUsers, getFollowing, followUser } from 'shared/services/userService';

interface SearchedUser {
  _id: string;
  username: string;
  fullName?: string;
  profileImage?: string;
  bio?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [usersList, setUsersList] = useState<SearchedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserId = user?._id || '';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (token) {
      fetchFollowingList();
    }
  }, [token]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    } else {
      setUsersList([]);
    }
  }, [debouncedQuery]);

  const fetchFollowingList = async () => {
    const myId = user?.id || user?._id;
    if (!myId || !token) return;
    const { data } = await getFollowing(myId, token);
    if (data && Array.isArray(data)) {
      setFollowingIds(data.map((u: any) => u._id));
    }
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    const { data } = await searchUsers(query, token);
    if (data && Array.isArray(data)) {
      setUsersList(data.filter((u: SearchedUser) => u._id !== currentUserId));
    } else {
      setUsersList([]);
    }
    setIsLoading(false);
  };

  const handleFollowToggle = async (targetUserId: string) => {
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

    const isCurrentlyFollowing = followingIds.includes(targetUserId);
    if (isCurrentlyFollowing) {
      setFollowingIds(prev => prev.filter(id => id !== targetUserId));
    } else {
      setFollowingIds(prev => [...prev, targetUserId]);
    }

    const { data, error } = await followUser(targetUserId, token);
    if (error) {
      if (isCurrentlyFollowing) {
        setFollowingIds(prev => [...prev, targetUserId]);
      } else {
        setFollowingIds(prev => prev.filter(id => id !== targetUserId));
      }
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    }
  };

  const renderUserItem = ({ item }: { item: SearchedUser }) => {
    const isFollowing = followingIds.includes(item._id);

    return (
      <TouchableOpacity
        style={styles.userRow}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/profile', params: { userId: item._id } } as any)}
      >
        <View style={styles.avatarContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.usernameText}>@{item.username}</Text>
          {item.fullName ? <Text style={styles.fullNameText}>{item.fullName}</Text> : null}
          {item.bio ? <Text style={styles.bioText} numberOfLines={1}>{item.bio}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.followButton, isFollowing ? styles.followingButton : styles.unfollowingButton]}
          onPress={() => handleFollowToggle(item._id)}
        >
          <Text style={[styles.followButtonText, isFollowing ? styles.followingButtonText : styles.unfollowingButtonText]}>
            {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0A0F2C" />
        </TouchableOpacity>
        
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kullanıcı adı veya ad soyad ara..."
            placeholderTextColor="#6B7280"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4EF5" />
        </View>
      ) : (
        <FlatList
          data={usersList}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            debouncedQuery.trim() ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="sad-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>Eşleşen kullanıcı bulunamadı.</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#2D4EF5" />
                <Text style={styles.emptyText}>Arkadaşlarını bulmak için aramaya başla!</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0A0F2C',
    fontFamily: 'System',
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0A0F2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#E8EDFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  usernameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0A0F2C',
    fontFamily: 'System',
  },
  fullNameText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'System',
    marginTop: 2,
  },
  bioText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'System',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  unfollowingButton: {
    backgroundColor: '#2D4EF5',
  },
  followingButton: {
    backgroundColor: '#E8EDFF',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  unfollowingButtonText: {
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#2D4EF5',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
});
