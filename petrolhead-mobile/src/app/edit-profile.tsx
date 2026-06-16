import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../../store/slices/authSlice';
import { BASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from 'shared/constants/index';

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector((state: any) => state.auth.user);
  const token = useSelector((state: any) => state.auth.token);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setProfileImage(user.avatar || null);
    }
  }, [user]);

  const uploadToCloudinary = async (imageUri: string) => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    if (Platform.OS === 'web') {
      const formData = new FormData();
      const localUri = imageUri;
      const filename = localUri.split('/').pop() || 'profile.jpg';
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'petrolhead/profiles');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await uploadResponse.json();
      if (data.secure_url) return data.secure_url;
      throw new Error(data.error?.message || 'Yükleme başarısız');
    } else {
      const localUri = Platform.OS === 'android' ? (imageUri.startsWith('file://') ? imageUri : 'file://' + imageUri) : imageUri;
      const file = new ExpoFile(localUri);
      const uploadResult = await file.upload(uploadUrl, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        parameters: {
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
          folder: 'petrolhead/profiles',
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
      throw new Error(data.error?.message || 'Yükleme başarısız');
    }
  };


  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setProfileImage(result.assets[0].uri);
      setNewImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      let cloudinaryUrl: string | undefined;
      if (newImageUri) {
        cloudinaryUrl = await uploadToCloudinary(newImageUri);
      }

      const response = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          username,
          email,
          bio,
          ...(cloudinaryUrl ? { profileImage: cloudinaryUrl } : {}),
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
      dispatch(setUser(data.user || data));
      router.back();
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#0A0F2C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profili Düzenle</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#2D4EF5" />
            ) : (
              <Text style={styles.saveButtonText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Adınız ve Soyadınız"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kullanıcı Adı</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.prefixText}>@</Text>
              <TextInput
                style={styles.inputNoBorder}
                value={username}
                onChangeText={setUsername}
                placeholder="kullaniciadi"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinizden bahsedin..."
              placeholderTextColor="#6B7280"
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F4FF',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A0F2C',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D4EF5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#0A0F2C',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  prefixText: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 4,
  },
  inputNoBorder: {
    flex: 1,
    fontSize: 15,
    color: '#0A0F2C',
    height: '100%',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2D4EF5',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  }
});
