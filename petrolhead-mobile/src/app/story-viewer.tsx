import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { BASE_URL } from 'shared/constants/index';

interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration?: number;
  viewers: string[];
  createdAt: string;
}

function VideoPlayerComponent({
  uri,
  onFinish,
  onDurationReady,
}: {
  uri: string;
  onFinish: () => void;
  onDurationReady: (duration: number) => void;
}) {
  const player = useVideoPlayer(uri, (player) => {
    player.play();
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      const duration = (player.duration || 10) * 1000;
      onDurationReady(duration);
    }
  });

  useEventListener(player, 'playToEnd', () => {
    onFinish();
  });

  return (
    <VideoView
      player={player}
      contentFit="cover"
      nativeControls={false}
      style={styles.fullMedia}
    />
  );
}

export default function StoryViewerScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const token = useSelector((state: any) => state.auth.token);

  const [stories, setStories] = useState<Story[]>([]);
  const [author, setAuthor] = useState<{ username: string; profileImage?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (token && userId) {
      fetchFeed();
    }
  }, [token, userId]);

  const fetchFeed = async () => {
    try {
      const response = await fetch(`${BASE_URL}/stories/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const userGroup = data.find((item: any) => {
          const id = typeof item.userId === 'object' && item.userId ? item.userId._id : item.userId;
          return id === userId;
        });

        if (userGroup && userGroup.stories && userGroup.stories.length > 0) {
          setAuthor({
            username: userGroup.username,
            profileImage: userGroup.profileImage,
          });
          setStories(userGroup.stories);
        } else {
          router.back();
        }
      } else {
        router.back();
      }
    } catch (_) {
      router.back();
    }
  };

  useEffect(() => {
    if (stories.length === 0) return;

    const currentStory = stories[currentIndex];
    if (currentStory) {
      fetch(`${BASE_URL}/stories/${currentStory._id}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(() => {});

      if (currentStory.mediaType === 'image') {
        startProgress(10000);
      } else {
        progressAnim.setValue(0);
      }
    }
  }, [currentIndex, stories]);

  const startProgress = (duration: number) => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      progressAnim.stopAnimation();
      setCurrentIndex((prev) => prev + 1);
    } else {
      progressAnim.stopAnimation();
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      progressAnim.stopAnimation();
      setCurrentIndex((prev) => prev - 1);
    } else {
      progressAnim.stopAnimation();
      setCurrentIndex(0);
    }
  };

  const handleVideoLoad = (data: any) => {
    const duration = data.durationMillis || 10000;
    startProgress(duration);
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const created = new Date(dateStr);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    return `${diffHours} sa önce`;
  };

  if (stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const currentStory = stories[currentIndex];
  const authorInitial = (author?.username || 'S').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.viewerContainer}>
        {currentStory.mediaType === 'video' ? (
          <VideoPlayerComponent
            key={currentStory._id}
            uri={currentStory.mediaUrl}
            onFinish={handleNext}
            onDurationReady={startProgress}
          />
        ) : (
          <Image source={{ uri: currentStory.mediaUrl }} style={styles.fullMedia} />
        )}

        <View style={styles.progressBarContainer}>
          {stories.map((story, index) => (
            <View style={styles.progressBarWrapper} key={story._id}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width:
                      index < currentIndex
                        ? '100%'
                        : index === currentIndex
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.topHeader}>
          <View style={styles.authorContainer}>
            {author?.profileImage ? (
              <Image source={{ uri: author.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>{authorInitial}</Text>
              </View>
            )}
            <Text style={styles.usernameText}>{author?.username}</Text>
            <Text style={styles.timeText}>{timeAgo(currentStory.createdAt)}</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.touchContainer}>
          <TouchableOpacity style={styles.leftTouch} onPress={handlePrev} activeOpacity={1} />
          <TouchableOpacity style={styles.rightTouch} onPress={handleNext} activeOpacity={1} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 16,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  progressBarWrapper: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    position: 'absolute',
    top: 28,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profilePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D4EF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  usernameText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  timeText: {
    color: '#D1D5DB',
    fontSize: 12,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  touchContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 4,
  },
  leftTouch: {
    flex: 1,
    height: '100%',
  },
  rightTouch: {
    flex: 1,
    height: '100%',
  },
});
