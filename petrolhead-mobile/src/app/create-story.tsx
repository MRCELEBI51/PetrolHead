import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from 'shared/constants/index';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      player={player}
      contentFit="cover"
      nativeControls={false}
      style={styles.fullPreview}
    />
  );
}

export default function CreateStoryScreen() {
  const router = useRouter();
  const token = useSelector((state: any) => state.auth.token);

  React.useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token]);

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const launchCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Kamerayı kullanmak için izin vermeniz gerekmektedir.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 10,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const launchGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Galerinize erişmek için izin vermeniz gerekmektedir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 10,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const uploadToCloudinary = async (uri: string, type: 'image' | 'video'): Promise<string> => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`;
    if (Platform.OS === 'web') {
      const formData = new FormData();
      const localUri = uri;
      const filename = localUri.split('/').pop() || (type === 'video' ? 'story.mp4' : 'story.jpg');
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'petrolhead/stories');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await uploadResponse.json();
      if (data.secure_url) return data.secure_url;
      throw new Error(data.error?.message || 'Medya yüklenemedi');
    } else {
      const localUri = Platform.OS === 'android' ? (uri.startsWith('file://') ? uri : 'file://' + uri) : uri;
      const file = new ExpoFile(localUri);
      const uploadResult = await file.upload(uploadUrl, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        parameters: {
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
          folder: 'petrolhead/stories',
        },
      });
      let data;
      try {
        data = JSON.parse(uploadResult.body);
      } catch (err: any) {
        const error = new Error(err.message) as any;
        error.response = { data: uploadResult.body };
        throw error;
      }
      if (data.secure_url) return data.secure_url;
      throw new Error(data.error?.message || 'Medya yüklenemedi');
    }
  };

  const handlePublish = async () => {
    if (!mediaUri || !mediaType) return;
    setIsLoading(true);
    try {
      const mediaUrl = await uploadToCloudinary(mediaUri, mediaType);

      const response = await fetch(`${BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaUrl,
          mediaType,
          duration: 10,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = text;
        }
        const error = new Error('HTTP Error') as any;
        error.response = { data: errorData };
        throw error;
      }

      const data = await response.json();
      router.replace('/home');
    } catch (error: any) {
      if (error.response) {
        console.log("--- BACKEND DETAYLI HATA ÇIKTISI ---");
        console.log(typeof error.response.data === 'object' ? JSON.stringify(error.response.data, null, 2) : error.response.data);
        alert("Backend Hatası Yakalandı! Detay için terminali kontrol et.");
      } else {
        console.log("İstek Hatası:", error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPreview = () => {
    setMediaUri(null);
    setMediaType(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {mediaUri ? (
        <View style={styles.previewContainer}>
          {mediaType === 'video' ? (
            <VideoPreview uri={mediaUri} />
          ) : (
            <Image source={{ uri: mediaUri }} style={styles.fullPreview} />
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelPreview}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>✕ İptal</Text>
          </TouchableOpacity>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.publishButton}
              onPress={handlePublish}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.publishButtonText}>Hikayeni Paylaş</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.mainContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Geri</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hikaye Oluştur</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.content}>
            <TouchableOpacity style={styles.cardButton} onPress={launchCamera}>
              <Ionicons name="camera" size={48} color="#0A0F2C" />
              <Text style={styles.cardButtonText}>Kamera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardButton} onPress={launchGallery}>
              <Ionicons name="images" size={48} color="#0A0F2C" />
              <Text style={styles.cardButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F2C',
  },
  mainContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    width: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardButtonText: {
    color: '#0A0F2C',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  fullPreview: {
    width: '100%',
    height: '100%',
  },
  cancelButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  publishButton: {
    backgroundColor: '#2D4EF5',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#2D4EF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
