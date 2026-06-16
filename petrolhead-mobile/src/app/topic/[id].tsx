import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getTopicById, addComment, voteComment } from 'shared/services/forumService';
import { RootState } from '../../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from 'shared/constants/index';

const parseCommentText = (text: string) => {
  if (!text) return { cleanText: '', imageUrl: null };
  const regex = /\[Görsel:\s*(https?:\/\/[^\s\]]+)\]/i;
  const match = text.match(regex);
  if (match) {
    const imageUrl = match[1];
    const cleanText = text.replace(regex, '').trim();
    return { cleanText, imageUrl };
  }
  return { cleanText: text, imageUrl: null };
};

interface Comment {
  _id: string;
  userId: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  text: string;
  upvotes?: string[];
  downvotes?: string[];
  createdAt: string;
}

interface TopicDetail {
  _id: string;
  title: string;
  body: string;
  category: string;
  images: string[];
  vehicle?: {
    make: string;
    model: string;
    year: string;
  };
  userId: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  comments: Comment[];
  createdAt: string;
  views?: number;
}

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notificationsActive, setNotificationsActive] = useState(false);
  const [sortBy, setSortBy] = useState<'tarih' | 'populer'>('tarih');
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [activeHeroImageIndex, setActiveHeroImageIndex] = useState(0);
  const [activeModalImageIndex, setActiveModalImageIndex] = useState(0);
  const modalFlatListRef = React.useRef<FlatList>(null);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [modalImages, setModalImages] = useState<string[]>([]);

  // Local upvotes/downvotes dictionary for comments
  const [votes, setVotes] = useState<Record<string, { up: number; down: number; myVote: 'up' | 'down' | null }>>({});

  useEffect(() => {
    fetchTopic();
  }, [id, token]);

  const fetchTopic = async () => {
    if (!id) return;
    const { data, error } = await getTopicById(id, token);
    if (error) {
      Alert.alert('Hata', 'Konu detayları yüklenemedi.');
    } else if (data) {
      setTopic(data);
      // Initialize local votes from database upvotes/downvotes
      const initialVotes: typeof votes = {};
      data.comments.forEach((c: Comment) => {
        const upList = c.upvotes || [];
        const downList = c.downvotes || [];
        const myVote = user?._id ? (upList.includes(user._id) ? 'up' : downList.includes(user._id) ? 'down' : null) : null;
        initialVotes[c._id] = {
          up: upList.length,
          down: downList.length,
          myVote
        };
      });
      setVotes(initialVotes);
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTopic();
    setRefreshing(false);
  };

  const handleSendComment = async () => {
    if ((!commentText.trim() && !commentImage) || !id) return;
    setIsSubmitting(true);
    const finalText = commentImage 
      ? `${commentText.trim()} [Görsel: ${commentImage}]` 
      : commentText.trim();

    const { data, error } = await addComment(id, finalText, token);
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Hata', 'Yorum gönderilirken bir sorun oluştu.');
    } else if (data) {
      setCommentText('');
      setCommentImage(null);
      fetchTopic(); // Reload comments
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraflarınıza erişmek için izin vermeniz gerekmektedir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadCommentImage(result.assets[0].uri);
    }
  };

  const uploadCommentImage = async (imageUri: string) => {
    setIsUploading(true);
    try {
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      let secureUrl = '';

      if (Platform.OS === 'web') {
        const formData = new FormData();
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, 'comment.jpg');
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'petrolhead/forum');

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        const data = await uploadResponse.json();
        secureUrl = data.secure_url;
      } else {
        const localUri = Platform.OS === 'android' ? (imageUri.startsWith('file://') ? imageUri : 'file://' + imageUri) : imageUri;
        const file = new ExpoFile(localUri);
        const uploadResult = await file.upload(uploadUrl, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: UploadType.MULTIPART,
          parameters: {
            upload_preset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'petrolhead/forum',
          },
        });
        const data = JSON.parse(uploadResult.body);
        secureUrl = data.secure_url;
      }

      if (secureUrl) {
        setCommentImage(secureUrl);
      } else {
        throw new Error('Upload failed');
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi: ' + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVote = async (commentId: string, type: 'up' | 'down') => {
    if (!id || !token) return;

    // Optimistically update frontend state
    setVotes((prev) => {
      const commentVotes = prev[commentId] || { up: 0, down: 0, myVote: null };
      let newUp = commentVotes.up;
      let newDown = commentVotes.down;
      let newMyVote = commentVotes.myVote;

      if (commentVotes.myVote === type) {
        if (type === 'up') newUp--;
        else newDown--;
        newMyVote = null;
      } else {
        if (commentVotes.myVote === 'up') newUp--;
        if (commentVotes.myVote === 'down') newDown--;

        if (type === 'up') newUp++;
        else newDown++;
        newMyVote = type;
      }

      return {
        ...prev,
        [commentId]: { up: newUp, down: newDown, myVote: newMyVote }
      };
    });

    const { data, error } = await voteComment(id, commentId, type, token);
    if (error) {
      fetchTopic();
    } else if (data) {
      const updatedVotes: typeof votes = {};
      data.comments.forEach((c: any) => {
        const upList = c.upvotes || [];
        const downList = c.downvotes || [];
        const myVote = user?._id ? (upList.includes(user._id) ? 'up' : downList.includes(user._id) ? 'down' : null) : null;
        updatedVotes[c._id] = {
          up: upList.length,
          down: downList.length,
          myVote
        };
      });
      setVotes(updatedVotes);
    }
  };

  const toggleNotifications = () => {
    setNotificationsActive((prev) => {
      const next = !prev;
      Alert.alert(
        'Bildirimler',
        next ? 'Bu konu için bildirimler açıldı.' : 'Bu konu için bildirimler kapatıldı.'
      );
      return next;
    });
  };

  const promptLogin = () => {
    Alert.alert(
      'Giriş Gerekli',
      'Yorum yapabilmek için lütfen giriş yapın.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/login') }
      ]
    );
  };

  function getRelativeTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'şimdi';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHour < 24) return `${diffHour} sa önce`;
    if (diffDay < 30) return `${diffDay} gün önce`;
    return `${diffMonth} ay önce`;
  }

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Konu bulunamadı.</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={() => router.back()}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedComments = [...topic.comments].sort((a, b) => {
    if (sortBy === 'populer') {
      const votesA = (votes[a._id]?.up || 0) - (votes[a._id]?.down || 0);
      const votesB = (votes[b._id]?.up || 0) - (votes[b._id]?.down || 0);
      return votesB - votesA;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const renderCommentItem = ({ item, index }: { item: Comment; index: number }) => {
    const isLast = index === sortedComments.length - 1;
    const commentUser = item.userId || { username: 'Kullanıcı', profileImage: undefined };
    const commentVote = votes[item._id] || { up: 0, down: 0, myVote: null };
    const { cleanText, imageUrl } = parseCommentText(item.text);

    return (
      <View style={styles.commentRow}>
        <View style={styles.avatarCol}>
          {commentUser.profileImage ? (
            <Image source={{ uri: commentUser.profileImage }} style={styles.commentAvatar} />
          ) : (
            <View style={styles.commentAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
          )}
          {!isLast && <View style={styles.threadLine} />}
        </View>

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>@{commentUser.username}</Text>
            <Text style={styles.commentTime}>{getRelativeTime(item.createdAt)}</Text>
          </View>

          {cleanText ? (
            <Text style={styles.commentText}>{cleanText}</Text>
          ) : null}

          {imageUrl && (
            <TouchableOpacity
              onPress={() => {
                setModalImages([imageUrl]);
                setPreviewImageIndex(0);
                setActiveModalImageIndex(0);
              }}
              activeOpacity={0.8}
              style={styles.commentImageWrapper}
            >
              <Image source={{ uri: imageUrl }} style={styles.commentImage} />
            </TouchableOpacity>
          )}

          {/* Voting controls */}
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                commentVote.myVote === 'up' && styles.voteButtonActiveUp
              ]}
              onPress={() => !token ? promptLogin() : handleVote(item._id, 'up')}
              activeOpacity={0.8}
            >
              <Text style={[styles.voteText, commentVote.myVote === 'up' && styles.voteTextActive]}>
                ↑ {commentVote.up}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voteButton,
                commentVote.myVote === 'down' && styles.voteButtonActiveDown
              ]}
              onPress={() => !token ? promptLogin() : handleVote(item._id, 'down')}
              activeOpacity={0.8}
            >
              <Text style={[styles.voteText, commentVote.myVote === 'down' && styles.voteTextActive]}>
                ↓ {commentVote.down}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const hasImage = topic.images && topic.images.length > 0;
  const coverImage = hasImage ? topic.images[0] : null;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
          {/* FlatList for scrolling both header content and comments */}
          <FlatList
            data={sortedComments}
            keyExtractor={(item) => item._id}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.scrollContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListHeaderComponent={
              <View style={styles.topicHeaderContainer}>
                {/* Topic Hero Image Section */}
                {hasImage ? (
                  <View style={styles.heroImageContainer}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      style={{ width: '100%', height: '100%' }}
                      onScroll={(event) => {
                        const slideSize = event.nativeEvent.layoutMeasurement.width;
                        if (slideSize > 0) {
                          const index = event.nativeEvent.contentOffset.x / slideSize;
                          setActiveHeroImageIndex(Math.round(index));
                        }
                      }}
                      scrollEventThrottle={16}
                    >
                      {topic.images.map((imgUrl, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setModalImages(topic.images);
                            setPreviewImageIndex(idx);
                            setActiveModalImageIndex(idx);
                          }}
                          activeOpacity={0.9}
                          style={{ width: SCREEN_WIDTH, height: 260 }}
                        >
                          <Image source={{ uri: imgUrl }} style={styles.heroImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Indicators dots overlay for multiple images */}
                    {topic.images.length > 1 && (
                      <View style={styles.heroPagination}>
                        {topic.images.map((_, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.heroDot,
                              idx === activeHeroImageIndex && styles.heroDotActive
                            ]}
                          />
                        ))}
                      </View>
                    )}

                    {/* Overlays */}
                    <TouchableOpacity
                      style={[styles.overlayButton, styles.leftOverlay]}
                      onPress={() => router.back()}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.overlayButton,
                        styles.rightOverlay,
                        notificationsActive && styles.overlayButtonActive
                      ]}
                      onPress={toggleNotifications}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={notificationsActive ? "notifications" : "notifications-outline"}
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.overlayButtonText}>Bildirimleri Aç</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.textHeaderBar}>
                    <TouchableOpacity
                      style={styles.headerBarButton}
                      onPress={() => router.back()}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.headerBarButton,
                        notificationsActive && styles.headerBarButtonActive
                      ]}
                      onPress={toggleNotifications}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={notificationsActive ? "notifications" : "notifications-outline"}
                        size={20}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Title & Metadata */}
                <View style={styles.titleSection}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>

                  {/* Badges Row */}
                  <View style={styles.metadataRow}>
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryText}>{topic.category}</Text>
                    </View>

                    {topic.vehicle && topic.vehicle.make ? (
                      <View style={styles.vehicleChip}>
                        <Ionicons name="car-outline" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                        <Text style={styles.vehicleText}>
                          {topic.vehicle.make} {topic.vehicle.model} ({topic.vehicle.year})
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.topicBody}>{topic.body}</Text>

                  {/* Topic Images Gallery */}
                  {topic.images && topic.images.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.galleryContainer}
                      contentContainerStyle={styles.galleryContent}
                    >
                      {topic.images.map((imgUrl, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setModalImages(topic.images);
                            setPreviewImageIndex(idx);
                            setActiveModalImageIndex(idx);
                          }}
                          activeOpacity={0.8}
                          style={styles.galleryImageWrapper}
                        >
                          <Image source={{ uri: imgUrl }} style={styles.galleryImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Author detail */}
                  <View style={styles.authorRow}>
                    {topic.userId.profileImage ? (
                      <Image source={{ uri: topic.userId.profileImage }} style={styles.authorAvatar} />
                    ) : (
                      <View style={styles.authorAvatarPlaceholder}>
                        <Ionicons name="person" size={16} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.authorName}>@{topic.userId.username}</Text>
                    <View style={styles.bullet} />
                    <Text style={styles.topicDate}>{getRelativeTime(topic.createdAt)}</Text>
                    <View style={styles.bullet} />
                    <Ionicons name="eye-outline" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                    <Text style={styles.topicDate}>{topic.views || 0} Görüntülenme</Text>
                  </View>
                </View>

                {/* Sort / Comment Stats Row */}
                <View style={styles.sortRow}>
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tabButton, sortBy === 'tarih' && styles.tabButtonActive]}
                      onPress={() => setSortBy('tarih')}
                    >
                      <Text style={[styles.tabText, sortBy === 'tarih' && styles.tabTextActive]}>Tarih</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.tabButton, sortBy === 'populer' && styles.tabButtonActive]}
                      onPress={() => setSortBy('populer')}
                    >
                      <Text style={[styles.tabText, sortBy === 'populer' && styles.tabTextActive]}>Popüler</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.commentCountBadge}>
                    <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.commentCountText}>{topic.comments.length} Entriler</Text>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#4B5563" />
                <Text style={styles.emptyText}>Henüz cevap yazılmamış. İlk cevabı siz yazın!</Text>
              </View>
            }
          />

          {/* Bottom input area */}
          <View style={[styles.bottomInputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {!token ? (
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={promptLogin}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-closed-outline" size={16} color="#6B7280" style={{ marginRight: 4, marginLeft: 4 }} />
                <Text style={[styles.textInput, { color: '#9CA3AF', paddingVertical: 8 }]}>
                  Yorum yazmak için giriş yapın...
                </Text>
                <View style={[styles.sendButton, styles.sendButtonDisabled]}>
                  <Ionicons name="paper-plane" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View>
                {commentImage && (
                  <View style={styles.draftImageContainer}>
                    <Image source={{ uri: commentImage }} style={styles.draftImage} />
                    <TouchableOpacity
                      style={styles.draftImageClose}
                      onPress={() => setCommentImage(null)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Yorumunuzu yazın..."
                    placeholderTextColor="#9CA3AF"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    editable={!isSubmitting && !isUploading}
                  />

                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={handlePickImage}
                    disabled={isSubmitting || isUploading}
                    activeOpacity={0.8}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="image" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!commentText.trim() && !commentImage || isSubmitting) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSendComment}
                    disabled={(!commentText.trim() && !commentImage) || isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Fullscreen Image Preview Modal */}
        <Modal
          visible={previewImageIndex !== null}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setPreviewImageIndex(null)}
        >
          <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={true} />
          <View style={styles.modalBackdrop}>
            {/* Safe Top spacing for close button */}
            <TouchableOpacity
              style={[styles.modalCloseButton, { top: insets.top + 10 }]}
              onPress={() => setPreviewImageIndex(null)}
            >
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            {previewImageIndex !== null && modalImages && (
              <View style={[styles.modalSliderWrapper, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
                <FlatList
                  ref={modalFlatListRef}
                  data={modalImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={previewImageIndex}
                  getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  keyExtractor={(item, index) => index.toString()}
                  style={{ flex: 1, width: SCREEN_WIDTH }}
                  onMomentumScrollEnd={(event) => {
                    const slideSize = event.nativeEvent.layoutMeasurement.width;
                    if (slideSize > 0) {
                      const index = event.nativeEvent.contentOffset.x / slideSize;
                      setActiveModalImageIndex(Math.round(index));
                    }
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                      <Image
                        source={{ uri: item }}
                        style={styles.modalImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                />
                
                {/* Pagination indicators if multiple images */}
                {modalImages.length > 1 && (
                  <View style={styles.modalPagination}>
                    {modalImages.map((_, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.paginationDot,
                          idx === activeModalImageIndex && styles.paginationDotActive
                        ]}
                        onPress={() => {
                          setActiveModalImageIndex(idx);
                          modalFlatListRef.current?.scrollToIndex({ index: idx, animated: true });
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0B0F19', // Premium dark
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
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
    paddingBottom: 24,
  },
  topicHeaderContainer: {
    marginBottom: 16,
  },
  heroImageContainer: {
    width: '100%',
    height: 260,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayButton: {
    position: 'absolute',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    top: 20,
  },
  leftOverlay: {
    left: 16,
    width: 40,
  },
  rightOverlay: {
    right: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  overlayButtonActive: {
    backgroundColor: '#EF4444',
  },
  overlayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    fontFamily: 'System',
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topicTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 12,
    fontFamily: 'System',
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  categoryChip: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  vehicleChip: {
    backgroundColor: 'rgba(55, 65, 81, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  vehicleText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  topicBody: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'System',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingBottom: 16,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  authorAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  authorName: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4B5563',
    marginHorizontal: 8,
  },
  topicDate: {
    color: '#6B7280',
    fontSize: 13,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    paddingBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 3,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#1F2937',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  commentCountBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
  },
  commentCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatarCol: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  commentAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadLine: {
    position: 'absolute',
    top: 42,
    bottom: -18,
    width: 2,
    backgroundColor: '#1F2937',
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#161D30',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentUsername: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  commentTime: {
    color: '#6B7280',
    fontSize: 12,
  },
  commentText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    fontFamily: 'System',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  voteButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  voteButtonActiveUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  voteButtonActiveDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  voteText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  voteTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  bottomInputContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#0B0F19',
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 80,
    paddingHorizontal: 8,
    fontFamily: 'System',
  },
  attachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  textHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0B0F19',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  headerBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  headerBarButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  galleryContainer: {
    marginVertical: 14,
  },
  galleryContent: {
    paddingRight: 16,
  },
  galleryImageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalSliderWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: '100%',
    resizeMode: 'contain' as const,
  },
  modalPagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#EF4444',
    width: 12,
    height: 8,
  },
  draftImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  draftImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  draftImageClose: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    zIndex: 10,
  },
  commentImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  commentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  heroDotActive: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 6,
    borderRadius: 3,
  },
});
