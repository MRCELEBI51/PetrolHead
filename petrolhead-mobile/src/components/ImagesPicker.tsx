import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from 'shared/constants/index';

interface ImageItem {
  uri: string;
  uploaded: boolean;
  url?: string;
}

interface ImagesPickerProps {
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
}

export default function ImagesPicker({ onImagesChange, maxImages = 5 }: ImagesPickerProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const urls = images.map(img => img.url).filter(Boolean) as string[];
    onImagesChange(urls);
  }, [images]);

  const uploadToCloudinary = async (imageUri: string): Promise<string> => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    if (Platform.OS === 'web') {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'petrolhead/forum');

      const responseUpload = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await responseUpload.json();
      if (data.secure_url) {
        return data.secure_url;
      }
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
          folder: 'petrolhead/forum',
        },
      });
      const data = JSON.parse(uploadResult.body);
      if (data.secure_url) {
        return data.secure_url;
      }
      throw new Error(data.error?.message || 'Fotoğraf yüklenemedi');
    }
  };

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraflarınıza erişmek için izin vermeniz gerekmektedir.');
      return;
    }

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAssets = result.assets.slice(0, remainingSlots);
      setIsUploading(true);

      const newImages = selectedAssets.map(asset => ({
        uri: asset.uri,
        uploaded: false
      }));
      setImages(prev => [...prev, ...newImages]);

      const uploadPromises = selectedAssets.map(async (asset) => {
        try {
          const url = await uploadToCloudinary(asset.uri);
          return { uri: asset.uri, url, success: true };
        } catch (error) {
          return { uri: asset.uri, success: false };
        }
      });

      const uploadResults = await Promise.all(uploadPromises);

      setImages(prev => {
        return prev.map(img => {
          const res = uploadResults.find(r => r.uri === img.uri);
          if (res && res.success && res.url) {
            return { ...img, uploaded: true, url: res.url };
          }
          return img;
        }).filter(img => {
          const res = uploadResults.find(r => r.uri === img.uri);
          return !res || res.success;
        });
      });

      setIsUploading(false);
    }
  };

  const handleRemove = (uri: string) => {
    setImages(prev => prev.filter(img => img.uri !== uri));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        {`Resim Ekle (${images.length}/${maxImages})`}
      </Text>

      <View style={styles.grid}>
        {images.map((item) => (
          <View key={item.uri} style={styles.imageWrapper}>
            <Image source={{ uri: item.uri }} style={styles.image} />
            {!item.uploaded && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#E53935" />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemove(item.uri)}
            >
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity style={styles.addButton} onPress={pickImages}>
            <Ionicons name="add" size={28} color="#E53935" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    margin: 4,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000000',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    backgroundColor: '#1A1A1A',
  },
});
