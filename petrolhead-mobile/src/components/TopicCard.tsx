import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Comment {
  userId: string;
  content: string;
  createdAt: string | Date;
}

export interface Topic {
  _id: string;
  userId: string | { _id: string; username: string; profileImage?: string };
  title: string;
  body: string;
  category?: string;
  views?: number;
  images?: string[];
  comments: Comment[];
  createdAt: string | Date;
}

interface TopicCardProps {
  topic: Topic;
  onPress: (topicId: string) => void;
}

export default function TopicCard({ topic, onPress }: TopicCardProps) {
  const truncatedBody = topic.body
    ? topic.body.length > 80
      ? `${topic.body.substring(0, 80)}...`
      : topic.body
    : '';

  const formattedDate = topic.createdAt
    ? new Date(topic.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : 'Şimdi';

  // Determine category and visual based on ID to make the list look realistic
  const categories = ['Teknik', 'Performans', 'Klasik', 'Estetik'];
  const hash = topic._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const category = topic.category || categories[hash % categories.length];
  
  // Extract user details
  const username = typeof topic.userId === 'object' && topic.userId
    ? topic.userId.username
    : 'Kullanıcı';
  
  const profileImage = typeof topic.userId === 'object' && topic.userId
    ? topic.userId.profileImage
    : null;

  const hasImage = topic.images && topic.images.length > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(topic._id)}
      activeOpacity={0.8}
    >
      {/* Author Header Row */}
      <View style={styles.authorHeader}>
        <View style={styles.authorLeft}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={12} color="#9E9E9E" />
            )}
          </View>
          <Text style={styles.usernameText}>@{username}</Text>
        </View>
        <View style={styles.metaRight}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
          </View>
          <Text style={styles.dateText}>• {formattedDate}</Text>
        </View>
      </View>

      <View style={styles.mainContainer}>
        <View style={[styles.leftContent, !hasImage && { marginRight: 0 }]}>
          <Text style={styles.titleText}>{topic.title}</Text>
          <Text style={styles.bodyText}>{truncatedBody}</Text>

          <View style={styles.footerRow}>
            <View style={styles.counterItem}>
              <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
              <Text style={styles.counterText}>{topic.comments?.length || 0} Yorum</Text>
            </View>
            <View style={styles.counterItem}>
              <Ionicons name="eye-outline" size={14} color="#6B7280" />
              <Text style={styles.counterText}>{topic.views || 0} Görüntülenme</Text>
            </View>
          </View>
        </View>

        {hasImage && (
          <Image
            source={{ uri: topic.images![0] }}
            style={styles.thumbnail}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: 8,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  usernameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    fontFamily: 'System',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  categoryBadge: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#E53935',
    fontFamily: 'System',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'System',
    marginLeft: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13,
    color: '#9E9E9E',
    lineHeight: 18,
    fontFamily: 'System',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  counterText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: 'System',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#222222',
  },
});

