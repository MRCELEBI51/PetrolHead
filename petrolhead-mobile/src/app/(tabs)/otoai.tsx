import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from 'shared/constants/index';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import ChatBubble from '@/components/ChatBubble';
import { sendMessage } from 'shared/services/otoaiService';
import Header from '@/components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  images?: string[];
}

export default function OtoaiScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useSelector((state: RootState) => state.auth);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingUris, setUploadingUris] = useState<string[]>([]);

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error(response.error?.message || 'Fotoğraf yüklenemedi'));
          }
        } catch (e) {
          reject(new Error('Yanıt ayrıştırılamadı'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Ağ hatası oluştu'));
      };

      const formData = new FormData();
      if (Platform.OS === 'web') {
        fetch(uri)
          .then((res) => res.blob())
          .then((blob) => {
            formData.append('file', blob, 'otoai.jpg');
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'petrolhead/otoai');
            xhr.send(formData);
          })
          .catch((err) => reject(err));
      } else {
        const filename = uri.split('/').pop() || 'otoai.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        formData.append('file', { uri, name: filename, type: `image/${ext}` } as any);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'petrolhead/otoai');
        xhr.send(formData);
      }
    });
  };

  const handlePickImage = async () => {
    const remainingSlots = 4 - selectedImages.length;
    if (remainingSlots <= 0) {
      Alert.alert('Uyarı', 'En fazla 4 fotoğraf ekleyebilirsiniz.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraflarınıza erişmek için izin vermeniz gerekmektedir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAssets = result.assets.slice(0, remainingSlots);
      const newUris = selectedAssets.map(asset => asset.uri);
      
      setSelectedImages((prev) => [...prev, ...newUris]);
      setUploadingUris((prev) => [...prev, ...newUris]);

      const uploadPromises = selectedAssets.map(async (asset) => {
        try {
          const url = await uploadToCloudinary(asset.uri);
          return { uri: asset.uri, url, success: true };
        } catch (error) {
          return { uri: asset.uri, success: false };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter(r => r.success && r.url).map(r => r.url as string);
      const failedUris = results.filter(r => !r.success).map(r => r.uri);

      if (successfulUrls.length > 0) {
        setImageUrls((prev) => [...prev, ...successfulUrls]);
      }

      setUploadingUris((prev) => prev.filter((uri) => !newUris.includes(uri)));

      if (failedUris.length > 0) {
        Alert.alert('Hata', 'Bazı fotoğraflar yüklenemedi.');
        setSelectedImages((prev) => prev.filter((uri) => !failedUris.includes(uri)));
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Merhaba! Ben OTOAI. Aracınla ilgili sorunları analiz edebilirim.',
    },
  ]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if ((!messageContent && imageUrls.length === 0) || isLoading) {
      return;
    }

    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Asistanı kullanabilmek için lütfen giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    setIsLoading(true);

    const currentSelectedImages = [...selectedImages];
    const currentImageUrls = [...imageUrls];

    let base64Images: string[] = [];
    try {
      const readPromises = currentSelectedImages.map(async (uri) => {
        return await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      });
      base64Images = await Promise.all(readPromises);
    } catch (err: any) {
      console.error('Failed to read images as base64:', err);
    }

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      images: currentImageUrls,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSelectedImages([]);
    setImageUrls([]);

    const history = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const imagesToSend = base64Images.length > 0 ? base64Images : currentImageUrls;

    const { reply, error } = await sendMessage(apiKey, userMsg.content, history, imagesToSend as any);
    setIsLoading(false);

    if (error) {
      Alert.alert('Hata', `Asistan hatası: ${error}`);
      return;
    }

    if (reply) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
      };
      setMessages((prev) => [...prev, botMsg]);
    }
  };



  const listData = isLoading
    ? [...messages, { id: 'loading', role: 'assistant' as const, content: '', isLoading: true }]
    : messages;

  const renderTopInfo = () => (
    <View style={styles.assistantHeader}>
      <View style={styles.robotIconContainer}>
        <Ionicons name="hardware-chip-outline" size={28} color="#EF4444" />
      </View>
      <Text style={styles.assistantTitle}>OTOAİ Asistan</Text>
      <Text style={styles.assistantSubtitle}>Aracınızın Teknik Yardımcısı</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        style={styles.flexContainer}
      >
        <Header />

        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item.content}
              isUser={item.role === 'user'}
              isLoading={item.isLoading}
              images={item.images}
            />
          )}
          ListHeaderComponent={renderTopInfo}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.bottomSection}>
          {selectedImages.length > 0 && (
            <View style={styles.imagesPreviewContainer}>
              {selectedImages.map((uri, index) => {
                const isImgUploading = uploadingUris.includes(uri);
                return (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    {isImgUploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#FFFFFF" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.inputBarRow}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={handlePickImage}
              disabled={selectedImages.length >= 4}
            >
              <Ionicons
                name="image-outline"
                size={24}
                color={selectedImages.length > 0 ? '#EF4444' : '#9CA3AF'}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Aracınızla ilgili soruyu yazın..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: (inputText.trim() || imageUrls.length > 0) ? '#EF4444' : '#374151' },
              ]}
              onPress={() => handleSend()}
              disabled={(!inputText.trim() && imageUrls.length === 0) || isLoading || uploadingUris.length > 0}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={(inputText.trim() || imageUrls.length > 0) ? '#FFFFFF' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  flexContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 16,
  },
  assistantHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  robotIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistantTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  assistantSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'System',
    marginTop: 2,
  },
  bottomSection: {
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    padding: 12,
  },
  inputBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#161D30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
    marginHorizontal: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  imagesPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  imagePreviewWrapper: {
    position: 'relative',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
});
