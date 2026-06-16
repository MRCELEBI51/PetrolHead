import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from 'shared/constants/index';

interface StoryFeedItem {
  userId: string | { _id: string; username: string; profileImage?: string };
  username: string;
  profileImage: string;
  stories: any[];
  hasUnseenStory: boolean;
}

interface StoriesBarProps {
  refreshTrigger?: any;
}

export default function StoriesBar({ refreshTrigger }: StoriesBarProps) {
  const router = useRouter();
  const token = useSelector((state: any) => state.auth.token);
  const currentUser = useSelector((state: any) => state.auth.user);
  const [feed, setFeed] = useState<StoryFeedItem[]>([]);

  useEffect(() => {
    if (token) {
      fetchFeed();
    }
  }, [token, refreshTrigger]);

  const fetchFeed = async () => {
    try {
      const response = await fetch(`${BASE_URL}/stories/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setFeed(data);
      }
    } catch (_) {}
  };

  const formatUsername = (name: string) => {
    if (name.length > 8) {
      return name.substring(0, 8) + '...';
    }
    return name;
  };

  const ownUserId = currentUser?._id;
  const ownGroup = feed.find(item => {
    const id = typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId;
    return id === ownUserId;
  });

  const hasOwnStories = ownGroup && ownGroup.stories && ownGroup.stories.length > 0;
  const ownHasUnseen = ownGroup ? ownGroup.hasUnseenStory : false;
  const ownRingColor = ownHasUnseen ? '#E53935' : (hasOwnStories ? '#6B7280' : 'transparent');

  const otherGroups = feed.filter(item => {
    const id = typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId;
    return id !== ownUserId;
  });

  const handleOwnPress = () => {
    if (hasOwnStories) {
      router.push({ pathname: '/story-viewer' as any, params: { userId: ownUserId } });
    } else {
      router.push('/create-story' as any);
    }
  };

  const handlePlusPress = () => {
    router.push('/create-story' as any);
  };

  const handleOtherPress = (item: StoryFeedItem) => {
    const targetId = typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId;
    router.push({ pathname: '/story-viewer' as any, params: { userId: targetId } });
  };

  const handleGuardedStoryPress = () => {
    if (!token) {
      router.push('/login' as any);
      return;
    }
    handleOwnPress();
  };

  const handleGuardedPlusPress = () => {
    if (!token) {
      router.push('/login' as any);
      return;
    }
    handlePlusPress();
  };

  return (
    <View style={styles.barContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.itemContainer}>
          <TouchableOpacity onPress={handleGuardedStoryPress} activeOpacity={0.8}>
            <View style={[styles.avatarRing, { borderColor: ownRingColor }]}>
              {currentUser?.profileImage ? (
                <Image source={{ uri: currentUser.profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={28} color="#9CA3AF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.plusIconContainer}
            onPress={handleGuardedPlusPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={12} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.usernameText}>{token ? 'Hikayen' : 'Giriş Yap'}</Text>
        </View>

        {otherGroups.map(item => {
          const targetId = typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId;
          const displayUsername = item.username || 'Kullanıcı';
          const ringColor = item.hasUnseenStory ? '#E53935' : '#6B7280';

          return (
            <View key={targetId} style={styles.itemContainer}>
              <TouchableOpacity onPress={() => handleOtherPress(item)} activeOpacity={0.8}>
                <View style={[styles.avatarRing, { borderColor: ringColor }]}>
                  {item.profileImage ? (
                    <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={28} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.usernameText}>{formatUsername(displayUsername)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    height: 102,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  itemContainer: {
    width: 72,
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  avatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 20,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
  },
  usernameText: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
    textAlign: 'center',
  },
});

