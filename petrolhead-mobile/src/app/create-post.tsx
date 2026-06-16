import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { createPost } from 'shared/services/postService';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from 'shared/constants/index';

export default function CreatePostScreen() {
  const router = useRouter();
  const token = useSelector((state: any) => state.auth.token);

  React.useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token]);

  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const uploadToCloudinary = async (imageUri: string): Promise<string> => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    if (Platform.OS === 'web') {
      const formData = new FormData();
      const localUri = imageUri;
      const filename = localUri.split('/').pop() || 'post.jpg';
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'petrolhead/posts');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await uploadResponse.json();
      if (data.secure_url) return data.secure_url;
      throw new Error(data.error?.message || 'Fotoğraf yüklenemedi');
    } else {
      const localUri = Platform.OS === 'android' ? (imageUri.startsWith('file://') ? imageUri : 'file://' + imageUri) : imageUri;
      const file = new ExpoFile(localUri);
      const uploadResult = await file.upload(uploadUrl, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        parameters: {
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
          folder: 'petrolhead/posts',
        },
      });
      const data = JSON.parse(uploadResult.body);
      if (data.secure_url) return data.secure_url;
      throw new Error(data.error?.message || 'Fotoğraf yüklenemedi');
    }
  };


  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraflarınıza erişmek için izin vermeniz gerekmektedir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!image) return;
    setIsLoading(true);
    try {
      console.log('[CreatePost] Token durumu:', token ? 'VAR' : 'YOK');

      const cloudinaryUrl = await uploadToCloudinary(image);
      console.log('[CreatePost] Cloudinary URL:', cloudinaryUrl);

      const fullDescription = description.trim();
      const { data, error } = await createPost(cloudinaryUrl, fullDescription, token);
      console.log('[CreatePost] Servis yanıtı:', { data, error });

      if (error) {
        console.log('[CreatePost] Hata detayı:', error);
        throw new Error(typeof error === 'string' ? error : 'Paylaşım oluşturulamadı.');
      }
      if (data) router.replace('/home');
    } catch (error: any) {
      console.log('[CreatePost] Catch hatası:', error.message);
      Alert.alert('Hata', error.message || 'Bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = !image || isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: 'Create New Post',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0A0F2C',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'System' },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create New Post</Text>
          <Text style={styles.subtitle}>Share your latest ride...</Text>
        </View>

        {/* Media Uploader Box */}
        <TouchableOpacity
          style={styles.imagePickerContainer}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {image ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <View style={styles.changeOverlay}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.changeText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.uploaderIconCircle}>
                <Ionicons name="camera" size={28} color="#2D4EF5" />
                <Ionicons name="add" size={16} color="#2D4EF5" style={styles.plusOverlayIcon} />
              </View>
              <Text style={styles.placeholderTitle}>Upload High-Res Media</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Description Section */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>



        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleCreatePost}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Post Content</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'stretch',
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A0F2C',
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
    marginTop: 4,
  },
  imagePickerContainer: {
    height: 220,
    backgroundColor: '#E8EDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 44, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  changeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
    fontFamily: 'System',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploaderIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  plusOverlayIcon: {
    position: 'absolute',
    top: 10,
    right: 8,
  },
  placeholderTitle: {
    color: '#2D4EF5',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0A0F2C',
    fontFamily: 'System',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    color: '#0A0F2C',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    height: 120,
    fontFamily: 'System',
  },

  button: {
    backgroundColor: '#2D4EF5',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
