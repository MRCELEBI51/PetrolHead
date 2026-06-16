import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from 'shared/constants/index';

interface Comment {
  _id: string;
  userId: string | { _id: string; username: string; profileImage?: string };
  text: string;
  createdAt: string;
  replies?: Array<{
    _id: string;
    userId: string | { _id: string; username: string; profileImage?: string };
    text: string;
    createdAt: string;
  }>;
}

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export default function CommentsModal({ visible, postId, onClose }: CommentsModalProps) {
  const token = useSelector((state: any) => state.auth.token);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    if (visible && postId) {
      fetchComments();
    }
  }, [visible, postId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setComments(data);
      }
    } catch (_) {}
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim()) return;
    try {
      const url = replyingTo
        ? `${BASE_URL}/posts/${postId}/comments/${replyingTo.commentId}/replies`
        : `${BASE_URL}/posts/${postId}/comments`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newCommentText }),
      });
      const data = await response.json();
      if (response.ok && data) {
        setReplyingTo(null);
        setNewCommentText('');
        fetchComments();
      } else {
        Alert.alert('Hata', data.error || 'Yorum gönderilemedi');
      }
    } catch (_) {
      Alert.alert('Hata', 'Bir ağ hatası oluştu');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={styles.headerLeftSpacer} />
              <Text style={styles.headerTitle}>Yorumlar</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={comments}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={({ item }) => {
                const username = typeof item.userId === 'object' && item.userId
                  ? item.userId.username
                  : 'Kullanıcı';
                const commentAvatar = typeof item.userId === 'object' && item.userId
                  ? item.userId.profileImage
                  : null;
                const initial = username.charAt(0).toUpperCase();
                return (
                  <View style={styles.commentContainer}>
                    <View style={styles.commentItem}>
                      <View style={styles.avatar}>
                        {commentAvatar ? (
                          <Image source={{ uri: commentAvatar }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarText}>{initial}</Text>
                        )}
                      </View>
                      <View style={styles.commentContent}>
                        <Text style={styles.commentUsername}>{username}</Text>
                        <Text style={styles.commentText}>{item.text}</Text>
                        <View style={styles.commentFooter}>
                          <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setReplyingTo({ commentId: item._id, username });
                              setNewCommentText(`@${username} `);
                            }}
                            style={styles.replyButton}
                          >
                            <Text style={styles.replyButtonText}>Yanıtla</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    {item.replies && item.replies.map((reply) => {
                      const replyUsername = typeof reply.userId === 'object' && reply.userId
                        ? reply.userId.username
                        : 'Kullanıcı';
                      const replyAvatar = typeof reply.userId === 'object' && reply.userId
                        ? reply.userId.profileImage
                        : null;
                      const replyInitial = replyUsername.charAt(0).toUpperCase();
                      return (
                        <View key={reply._id} style={styles.replyItem}>
                          <View style={styles.replyAvatar}>
                            {replyAvatar ? (
                              <Image source={{ uri: replyAvatar }} style={styles.replyAvatarImage} />
                            ) : (
                              <Text style={styles.replyAvatarText}>{replyInitial}</Text>
                            )}
                          </View>
                          <View style={styles.replyContent}>
                            <Text style={styles.replyUsername}>{replyUsername}</Text>
                            <Text style={styles.replyText}>{reply.text}</Text>
                            <Text style={styles.replyDate}>{formatDate(reply.createdAt)}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Henüz yorum yok</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
            />

            {replyingTo && (
              <View style={styles.replyIndicator}>
                <Text style={styles.replyIndicatorText}>
                  @{replyingTo.username} kullanıcısına yanıt veriyorsunuz
                </Text>
                <TouchableOpacity onPress={() => {
                  setReplyingTo(null);
                  setNewCommentText('');
                }}>
                  <Text style={styles.replyCancelText}>İptal</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Yorum yaz..."
                placeholderTextColor="#6B7280"
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity onPress={handleSendComment} style={styles.sendButton}>
                <Text style={styles.sendButtonText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardContainer: {
    height: '70%',
    width: '100%',
  },
  panel: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  list: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerLeftSpacer: {
    width: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 12,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#9E9E9E',
    lineHeight: 18,
    marginBottom: 6,
  },
  commentDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#222222',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    marginRight: 12,
    fontSize: 14,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  sendButtonText: {
    color: '#E53935',
    fontSize: 20,
    fontWeight: 'bold',
  },
  commentContainer: {},
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  replyButton: {
    marginLeft: 12,
  },
  replyButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  replyItem: {
    flexDirection: 'row',
    marginLeft: 52,
    borderLeftWidth: 2,
    borderLeftColor: '#E53935',
    paddingLeft: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  replyAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  replyAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  replyContent: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 8,
  },
  replyUsername: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#9E9E9E',
    lineHeight: 16,
    marginBottom: 4,
  },
  replyDate: {
    fontSize: 9,
    color: '#6B7280',
  },
  replyIndicator: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#222222',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  replyIndicatorText: {
    color: '#9E9E9E',
    fontSize: 12,
  },
  replyCancelText: {
    color: '#E53935',
    fontSize: 12,
    marginLeft: 8,
  },
});

