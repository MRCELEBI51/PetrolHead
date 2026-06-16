import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { createTopic } from 'shared/services/forumService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import VehiclePicker from '../components/VehiclePicker';
import ImagesPicker from '../components/ImagesPicker';

const CATEGORIES = ['Teknik', 'Öneri', 'Modifiye', 'Upgrade', 'Parça', 'Servis Önerisi', 'Satılık'];

export default function CreateTopicScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Teknik');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicle, setVehicle] = useState<{ make: string; model: string; year: string } | null>(null);
  const [images, setImages] = useState<string[]>([]);

  const handleCreateTopic = async () => {
    if (!title.trim() || !body.trim()) {
      return;
    }

    setIsLoading(true);
    const { data, error } = await createTopic(
      title.trim(),
      body.trim(),
      category,
      vehicle || undefined,
      images,
      token
    );
    setIsLoading(false);

    if (error) {
      Alert.alert('Hata', typeof error === 'string' ? error : 'Konu oluşturulurken bir hata oluştu.');
      return;
    }

    if (data) {
      router.replace('/forum');
    }
  };

  const isButtonDisabled = !title.trim() || !body.trim() || isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <Stack.Screen
        options={{
          title: 'Soru Sor',
          headerStyle: { backgroundColor: '#0D0D0D' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'System' },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Yeni Konu Aç</Text>
          <Text style={styles.pageSubtitle}>Uzmanlığınızı paylaşın...</Text>
        </View>

        {/* Hero Banner */}
        <LinearGradient
          colors={['#E53935', '#C62828']}
          style={styles.heroBanner}
        >
          <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
          <Text style={styles.heroText}>Hızlı cevaplar almak, net ve açık sorular sormaya bağlıdır.</Text>
        </LinearGradient>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Araç Seç <Text style={{ color: '#6B7280', fontWeight: 'normal' }}>(Opsiyonel)</Text></Text>
          <VehiclePicker
            selected={vehicle}
            onSelect={setVehicle}
            onClear={() => setVehicle(null)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Soru Başlığı</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Örn. En iyi performans fren balatası..."
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Kategori</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownTriggerText}>{category}</Text>
            <Ionicons
              name={isCategoryDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {isCategoryDropdownOpen && (
            <View style={styles.dropdownList}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setIsCategoryDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                      {cat}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#E53935" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Detaylı Açıklama</Text>
          <View style={styles.textAreaWrapper}>
            <TextInput
              style={styles.textArea}
              placeholder="Sorunuzu, karşılaştığınız problemi veya detayları buraya yazın..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={6}
              value={body}
              onChangeText={setBody}
              textAlignVertical="top"
            />
            <View style={styles.textAreaActions}>
              <TouchableOpacity style={styles.actionIconButton}>
                <Ionicons name="image-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton}>
                <Ionicons name="code-slash-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.infoLine}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#E53935" />
          <Text style={styles.infoLineText}>Forum akışında otomatik paylaşılır</Text>
        </View>

        <View style={styles.inputContainer}>
          <ImagesPicker onImagesChange={setImages} maxImages={5} />
        </View>

        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleCreateTopic}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Soru Sor ➤</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'stretch',
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    fontFamily: 'System',
    marginTop: 4,
  },
  heroBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: 10,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  dropdownTriggerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  dropdownList: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
  },
  dropdownItemText: {
    color: '#9E9E9E',
    fontSize: 14,
    fontFamily: 'System',
  },
  dropdownItemTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textAreaWrapper: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 48,
    paddingHorizontal: 16,
    position: 'relative',
  },
  textArea: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
    minHeight: 120,
  },
  textAreaActions: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
  },
  actionIconButton: {
    marginLeft: 12,
    padding: 6,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoLineText: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: 6,
  },
  button: {
    backgroundColor: '#E53935',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
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
  tipsContainer: {
    marginTop: 28,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: '#9E9E9E',
    fontFamily: 'System',
    lineHeight: 16,
  },
});

