import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Modal,
  LogBox
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { createEvent } from 'shared/services/eventService';
import * as ImagePicker from 'expo-image-picker';
import EventMap from '../components/EventMap';
import * as Location from 'expo-location';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, GOOGLE_MAPS_API_KEY } from 'shared/constants/index';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { BrandColors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const CATEGORIES = [
  'Aile Dostu Etkinlik',
  'Araç Buluşması',
  'Araç Güzellik Yarışması',
  'Araç Sergisi',
  'Araç Tanıtım Günü',
  'Bilgi Paylaşımı / Soru-Cevap Günü',
  'Arabalar & Kahve',
  'Çocuklara Özel Araç Etkinliği',
  'Kahvaltı Buluşması',
  'Kamp + Araç Etkinliği',
  'Kendi Bakımını Yap Eğitimi',
  'Konvoy Sürüşü',
  'Marka/Model Kulüp Buluşması',
  'Buluşma',
  'Modifiye Atölyesi',
  'Motor Buluşması',
  'Neon & Işık Şovu',
  'Off-Road Sürüşü',
  'Online Sohbet / Canlı Yayın Etkinliği',
  'Otomobil Festivali',
  'Piknikli Buluşma',
  'Pist Günü (Track Day)',
  'Simülasyon Yarışı Turnuvası',
  'Sound-Off (Ses Sistemi Yarışması)',
  'Doğa Gezisi',
  'Drift Gösterisi',
  'En İyi Modifiye Ödülü',
  'Fotoğraf Yarışması',
  'Gece Sürüşü',
  'Göl Kenarı Buluşması',
  'Güvenli Sürüş Eğitimi',
  'Hayır Amaçlı Sürüş'
];

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token]);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Date-Time Picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [tempCategory, setTempCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [capacity, setCapacity] = useState('500');

  // Map state variables
  const [region, setRegion] = useState({
    latitude: 41.0082, // Istanbul default
    longitude: 28.9784,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);

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
            formData.append('file', blob, 'event.jpg');
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'petrolhead/events');
            xhr.send(formData);
          })
          .catch((err) => reject(err));
      } else {
        const filename = uri.split('/').pop() || 'event.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        formData.append('file', { uri, name: filename, type: `image/${ext}` } as any);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'petrolhead/events');
        xhr.send(formData);
      }
    });
  };

  const pickCoverImage = async () => {
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
      setCoverImage(result.assets[0].uri);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(startDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setStartDate(newDate);
      // Automatically show time picker after date is selected
      setTimeout(() => setShowStartTimePicker(true), 200);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(startDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setStartDate(newDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const newDate = endDate ? new Date(endDate) : new Date();
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setEndDate(newDate);
      setTimeout(() => setShowEndTimePicker(true), 200);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const newDate = endDate ? new Date(endDate) : new Date();
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEndDate(newDate);
    }
  };

  // Reverse Geocoding helper
  const performReverseGeocoding = async (latitude: number, longitude: number) => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addr) {
        const street = addr.street || '';
        const name = addr.name || '';
        const district = addr.district || addr.subregion || '';
        const city = addr.city || addr.region || '';
        const formattedAddress = [street || name, district, city].filter(Boolean).join(', ');
        setLocation(formattedAddress);
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
    }
  };

  // Map click handler
  const handleMapPress = (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setMarkerCoordinate(coords);
    performReverseGeocoding(coords.latitude, coords.longitude);
  };

  // GPS Current Location Fetcher
  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Reddedildi', 'Konumunuza erişmek için izin vermelisiniz.');
        return;
      }
      const locationData = await Location.getCurrentPositionAsync({});
      const lat = locationData.coords.latitude;
      const lng = locationData.coords.longitude;
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      setMarkerCoordinate({ latitude: lat, longitude: lng });
      performReverseGeocoding(lat, lng);
    } catch (err: any) {
      Alert.alert('Hata', 'Mevcut konum alınamadı: ' + err.message);
    }
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !location.trim() || !description.trim() || !category) {
      Alert.alert('Hata', 'Lütfen başlık, kategori, açıklama ve konum alanlarını doldurun.');
      return;
    }

    setIsLoading(true);
    let coverImageUrl = '';
    if (coverImage) {
      setIsUploading(true);
      try {
        coverImageUrl = await uploadToCloudinary(coverImage);
      } catch (err: any) {
        Alert.alert('Hata', `Kapak resmi yüklenemedi: ${err.message || err}`);
        setIsLoading(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const { data, error } = await createEvent(
      title.trim(),
      location.trim(),
      startDate.toISOString(),
      description.trim(),
      category,
      coverImageUrl || undefined,
      capacity ? parseInt(capacity) : undefined,
      token
    );
    setIsLoading(false);

    if (error) {
      Alert.alert('Hata', 'Etkinlik oluşturulurken bir sorun oluştu.');
      return;
    }

    if (data) {
      router.replace('/events');
    }
  };

  const formatDateTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Etkinlik Oluştur</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Cover Photo */}
        <TouchableOpacity
          style={styles.coverPhotoContainer}
          onPress={pickCoverImage}
          activeOpacity={0.8}
        >
          {coverImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: coverImage }} style={styles.previewImage} />
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
              <View style={styles.changeOverlay}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.changeText}>Görseli Değiştir</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.uploaderIconCircle}>
                <Ionicons name="camera-outline" size={28} color="#E53935" />
              </View>
              <Text style={styles.placeholderTitle}>Görsel Ekle</Text>
              <Text style={styles.placeholderSubtitle}>İlk görseli ekle</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Category Picker Trigger */}
        <TouchableOpacity
          style={styles.selectorTrigger}
          onPress={() => {
            setTempCategory(category);
            setIsCategoryModalOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.selectorText, !category && styles.placeholderText]}>
            {category || 'Kategori Seçin'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#9E9E9E" />
        </TouchableOpacity>

        {/* Event Name */}
        <TextInput
          style={styles.textInput}
          placeholder="Etkinlik başlığı"
          placeholderTextColor="#9E9E9E"
          value={title}
          onChangeText={setTitle}
        />

        {/* Start Date & Time */}
        <View style={styles.inputLabelContainer}>
          <Text style={styles.inputLabel}>Başlangıç Zamanı</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStartDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerText}>{formatDateTime(startDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* End Date & Time */}
        <View style={styles.inputLabelContainer}>
          <Text style={styles.inputLabel}>Bitiş Zamanı (Opsiyonel)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowEndDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pickerText, !endDate && styles.placeholderText]}>
              {endDate ? formatDateTime(endDate) : 'Tarih ve Saat Seç'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Capacity */}
        <TextInput
          style={styles.textInput}
          placeholder="Kapasite (Katılımcı Sınırı)"
          placeholderTextColor="#9E9E9E"
          keyboardType="numeric"
          value={capacity}
          onChangeText={setCapacity}
        />

        {/* Description */}
        <TextInput
          style={styles.textArea}
          placeholder="Etkinlik açıklaması (program, kurallar vb.)"
          placeholderTextColor="#9E9E9E"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        {/* Location Input (Styled as mockup) */}
        <View style={styles.locationContainer}>
          {Platform.OS === 'web' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 16 }}>
              <TextInput
                style={{ flex: 1, height: 50, color: '#FFFFFF', fontSize: 15, fontFamily: 'System', outlineStyle: 'none' } as any}
                placeholder="Etkinlik konumu"
                placeholderTextColor="#9E9E9E"
                value={location}
                onChangeText={setLocation}
              />
              <Ionicons name="location" size={20} color="#E53935" />
            </View>
          ) : (
            <GooglePlacesAutocomplete
              placeholder="Etkinlik konumu"
              debounce={400}
              minLength={3}
              onPress={(data, details = null) => {
                setLocation(data.description);
                if (details?.geometry?.location) {
                  const lat = details.geometry.location.lat;
                  const lng = details.geometry.location.lng;
                  const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  };
                  setRegion(newRegion);
                  setMarkerCoordinate({ latitude: lat, longitude: lng });
                }
              }}
              query={{
                key: GOOGLE_MAPS_API_KEY,
                language: 'tr',
              }}
              fetchDetails={true}
              keyboardShouldPersistTaps="handled"
              styles={{
                container: { flex: 0 },
                textInputContainer: {
                  backgroundColor: 'transparent',
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                },
                textInput: {
                  height: 50,
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontFamily: 'System',
                  backgroundColor: 'transparent',
                },
                listView: {
                  backgroundColor: '#1A1A1A',
                  borderWidth: 1,
                  borderColor: '#2A2A2A',
                  borderRadius: 8,
                  marginTop: 4,
                  elevation: 3,
                  zIndex: 1000,
                  width: '100%',
                },
                row: {
                  backgroundColor: '#1A1A1A',
                  padding: 13,
                  height: 44,
                  flexDirection: 'row',
                },
                separator: {
                  backgroundColor: '#2A2A2A',
                  height: 1,
                },
                description: {
                  color: '#FFFFFF',
                },
              }}
              textInputProps={{
                placeholderTextColor: '#9E9E9E',
                value: location,
                onChangeText: setLocation,
              }}
              renderRightButton={() => (
                <Ionicons name="location" size={20} color="#E53935" style={{ marginRight: 12 }} />
              )}
            />
          )}
        </View>

        {/* Map Integration */}
        <EventMap
          region={region}
          setRegion={setRegion}
          markerCoordinate={markerCoordinate}
          handleMapPress={handleMapPress}
          handleGetCurrentLocation={handleGetCurrentLocation}
        />

        {/* Spacing for button */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky Bottom Create Button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.button, (!title.trim() || !location.trim() || !description.trim() || !category || isLoading) && styles.buttonDisabled]}
          onPress={handleCreateEvent}
          disabled={!title.trim() || !location.trim() || !description.trim() || !category || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Etkinlik Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display="default"
          onChange={handleStartTimeChange}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={startDate}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="time"
          display="default"
          onChange={handleEndTimeChange}
        />
      )}

      {/* Category Modal Selection */}
      <Modal
        visible={isCategoryModalOpen}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kategoriler</Text>
              <TouchableOpacity
                onPress={() => {
                  if (tempCategory) {
                    setCategory(tempCategory);
                  }
                  setIsCategoryModalOpen(false);
                }}
              >
                <Text style={styles.modalSaveButton}>Kaydet</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {CATEGORIES.map((cat) => {
                const isSelected = tempCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => setTempCategory(cat)}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {cat}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#E53935" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  headerRightPlaceholder: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  coverPhotoContainer: {
    height: 180,
    backgroundColor: '#161D30',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderStyle: 'dashed',
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
  uploadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(13, 13, 13, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  changeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: 'System',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploaderIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 4,
  },
  placeholderSubtitle: {
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: 'System',
  },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161D30',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  selectorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  placeholderText: {
    color: '#9E9E9E',
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161D30',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
    marginBottom: 16,
  },
  inputLabelContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontFamily: 'System',
    marginBottom: 6,
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161D30',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  pickerText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161D30',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
    marginBottom: 16,
  },
  locationContainer: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161D30',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapContainer: {
    height: 200,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  currentLocationFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#161D30',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    padding: 16,
  },
  button: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161D30',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  modalSaveButton: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  modalList: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(229, 57, 53, 0.05)',
  },
  modalItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'System',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#E53935',
    fontWeight: 'bold',
  },
});
