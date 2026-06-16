import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CommentsModal from './CommentsModal';

export interface Post {
  _id: string;
  userId: string | { _id: string; username: string; profileImage?: string };
  imageUrl: string;
  description: string;
  likes: string[];
  createdAt: string | Date;
  comments?: any[];
  commentsCount?: number;
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  isLiked?: boolean;
  currentUserId?: string;
  isFollowing?: boolean;
  onFollowToggle?: (authorId: string) => void;
}

export default function PostCard({
  post,
  onLike,
  isLiked,
  currentUserId,
  isFollowing,
  onFollowToggle
}: PostCardProps) {
  const router = useRouter();
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (post.imageUrl) {
      Image.getSize(
        post.imageUrl,
        (width, height) => {
          if (width && height) {
            setAspectRatio(width / height);
          }
        },
        (error) => {
          console.warn('PostCard: Görüntü boyutu alınamadı:', error);
        }
      );
    }
  }, [post.imageUrl]);

  const username = typeof post.userId === 'object' && post.userId
    ? post.userId.username
    : 'Kullanıcı';

  const authorId = typeof post.userId === 'object' && post.userId ? post.userId._id : post.userId;
  const profileImage = typeof post.userId === 'object' && post.userId ? post.userId.profileImage : null;
  const showFollowButton = currentUserId && authorId && authorId !== currentUserId;

  const handleNavigateToProfile = () => {
    if (!authorId) return;
    router.push({
      pathname: '/profile',
      params: { userId: authorId }
    } as any);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.description}\n\nGörsel: ${post.imageUrl}`,
      });
    } catch (_) {}
  };

  const hashtags = (post.description || '').match(/#\w+/g) || [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerUserClickable} onPress={handleNavigateToProfile}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={18} color="#6B7280" />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{username}</Text>
          </View>
        </TouchableOpacity>

        {!!showFollowButton && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing ? styles.followingButton : styles.unfollowingButton]}
            onPress={() => onFollowToggle && onFollowToggle(authorId)}
          >
            <Text style={[styles.followButtonText, isFollowing ? styles.followingButtonText : styles.unfollowingButtonText]}>
              {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Image
        source={{ uri: post.imageUrl }}
        style={[
          styles.image,
          aspectRatio ? { aspectRatio } : { height: 250 }
        ]}
        resizeMode="cover"
      />

      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(post._id)}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? "#E53935" : "#9E9E9E"}
            />
            <Text style={styles.actionText}>{post.likes?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCommentModalPostId(post._id)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#9E9E9E" />
            <Text style={styles.actionText}>{post.comments?.length || post.commentsCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton}>
          <Ionicons name="bookmark-outline" size={22} color="#9E9E9E" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.descriptionText}>
          <Text style={styles.descUsername} onPress={handleNavigateToProfile}>{username} </Text>
          {(post.description || '').replace(/#\w+/g, '').trim()}
        </Text>

        <View style={styles.tagContainer}>
          {hashtags.map((tag, idx) => (
            <View key={idx} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <CommentsModal
        visible={!!commentModalPostId}
        postId={commentModalPostId || ''}
        onClose={() => setCommentModalPostId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    marginVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerUserClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
  },
  unfollowingButton: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderColor: '#E53935',
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
    color: '#E53935',
  },
  moreButton: {
    padding: 4,
  },
  image: {
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
    marginLeft: 6,
    fontFamily: 'System',
  },
  saveButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    fontFamily: 'System',
  },
  descUsername: {
    fontWeight: 'bold',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    color: '#E53935',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});

