import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors } from '@/constants/theme';

export interface Event {
  _id: string;
  title: string;
  location: string;
  date: string | Date;
  description: string;
  category?: string;
  image?: string;
  capacity?: number;
  attendees?: string[];
}

interface EventCardProps {
  event: Event;
  onJoin: (eventId: string) => void;
  userId?: string;
}

export default function EventCard({ event, onJoin, userId }: EventCardProps) {
  const eventDate = event.date ? new Date(event.date) : new Date();
  const day = eventDate.getDate().toString();
  const month = eventDate.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase();
  const time = eventDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const hasJoined = event.attendees?.includes(userId || '') ?? false;
  const participantCount = event.attendees?.length ?? 0;
  const capacity = event.capacity ?? 500;

  // Placeholder images matching Petrolhead theme
  const defaultImages = [
    'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600',
  ];
  // Select a semi-random but stable placeholder based on event ID
  const hash = event._id ? event._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const placeholderImageUrl = defaultImages[hash % defaultImages.length];
  const coverUrl = event.image || placeholderImageUrl;

  return (
    <View style={styles.card}>
      {/* Banner & Gradient Overlay */}
      <View style={styles.bannerContainer}>
        <Image source={{ uri: coverUrl }} style={styles.bannerImage} />
        
        {/* Dark Fade Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(26, 26, 26, 0.8)', '#1A1A1A']}
          style={styles.gradient}
        />

        {/* Date Badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
      </View>

      {/* Info Content */}
      <View style={styles.infoContainer}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Categories / Tags */}
        <View style={styles.tagsContainer}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{event.category || 'Araç Buluşması'}</Text>
          </View>
          {event.location.toLowerCase().includes('online') && (
            <View style={[styles.tagPill, styles.onlinePill]}>
              <Text style={styles.tagText}>Online</Text>
            </View>
          )}
        </View>

        {/* Time */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={BrandColors.textSecondary} />
          <Text style={styles.metaText}>{time}</Text>
        </View>

        {/* Address */}
        <View style={styles.metaRow}>
          <Ionicons name="location" size={16} color={BrandColors.accent} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>

        {/* Divider line */}
        <View style={styles.divider} />

        {/* Footer */}
        <View style={styles.footerRow}>
          {/* Capacity and attendees */}
          <View style={styles.attendeesContainer}>
            <Ionicons name="people-outline" size={18} color={BrandColors.textSecondary} />
            <Text style={styles.attendeesText}>
              {`${participantCount} / ${capacity}`}
            </Text>
          </View>

          {/* Join Button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              hasJoined && styles.joinedButton
            ]}
            onPress={() => onJoin(event._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.joinButtonText}>
              {hasJoined ? 'Katılıyorsun' : 'Katıl'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  bannerContainer: {
    position: 'relative',
    height: 180,
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dateDay: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
    lineHeight: 20,
  },
  dateMonth: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginTop: 2,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  onlinePill: {
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaText: {
    color: '#9E9E9E',
    fontSize: 13,
    fontFamily: 'System',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeesText: {
    color: '#9E9E9E',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
  },
  joinButton: {
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 84,
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
});
