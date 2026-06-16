import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface VehiclePickerProps {
  onSelect: (vehicle: { make: string; model: string; year: string }) => void;
  onClear: () => void;
  selected: { make: string; model: string; year: string } | null;
}

const POPULAR_MAKES = [
  'Toyota', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Ford', 'Audi', 'Honda',
  'Hyundai', 'Kia', 'Renault', 'Peugeot', 'Fiat', 'Opel', 'Nissan', 'Mazda',
  'Volvo', 'Porsche', 'Ferrari', 'Lamborghini', 'Land Rover', 'Jeep',
  'Mitsubishi', 'Suzuki', 'Dacia', 'Skoda', 'Seat', 'Alfa Romeo',
  'Chevrolet', 'Dodge', 'Subaru'
];

export default function VehiclePicker({ onSelect, onClear, selected }: VehiclePickerProps) {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [step, setStep] = useState<'make' | 'model' | 'year' | 'done'>('make');
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMakes, setShowAllMakes] = useState(false);

  useEffect(() => {
    if (modalVisible && makes.length === 0) {
      fetchMakes();
    }
  }, [modalVisible]);

  const fetchMakes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json');
      const data = await response.json();
      if (data && data.Results) {
        const list = data.Results.map((r: any) => r.Make_Name).filter(Boolean);
        const uniqueList = Array.from(new Set(list)) as string[];
        setMakes(uniqueList.sort());
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModels = async (make: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${make}?format=json`);
      const data = await response.json();
      if (data && data.Results) {
        const list = data.Results.map((r: any) => r.Model_Name).filter(Boolean);
        const uniqueList = Array.from(new Set(list)) as string[];
        setModels(uniqueList.sort());
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const years = useMemo(() => {
    const list = [];
    for (let y = 2026; y >= 1990; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim();
    const queryLower = query.toLowerCase();

    if (step === 'make') {
      let baseOptions = showAllMakes ? makes : [...POPULAR_MAKES, 'Diğer'];
      if (queryLower) {
        baseOptions = makes.filter(m => m.toLowerCase().includes(queryLower));
        const exactMatch = baseOptions.some(m => m.toLowerCase() === queryLower);
        if (!exactMatch && query) {
          baseOptions = [query, ...baseOptions];
        }
      }
      return baseOptions;
    }

    if (step === 'model') {
      let baseOptions = models;
      if (queryLower) {
        baseOptions = models.filter(m => m.toLowerCase().includes(queryLower));
        const exactMatch = baseOptions.some(m => m.toLowerCase() === queryLower);
        if (!exactMatch && query) {
          baseOptions = [query, ...baseOptions];
        }
      } else if (models.length === 0 && !isLoading) {
        return ['Lütfen arama çubuğuna model yazın'];
      }
      return baseOptions;
    }

    if (step === 'year') {
      if (queryLower) {
        return years.filter(y => y.includes(queryLower));
      }
      return years;
    }

    return [];
  }, [step, makes, models, years, searchQuery, showAllMakes, isLoading]);

  const handleItemPress = (item: string) => {
    if (item === 'Lütfen arama çubuğuna model yazın') {
      return;
    }
    if (step === 'make') {
      if (item === 'Diğer') {
        setShowAllMakes(true);
        return;
      }
      setSelectedMake(item);
      setSearchQuery('');
      setStep('model');
      fetchModels(item);
    } else if (step === 'model') {
      setSelectedModel(item);
      setSearchQuery('');
      setStep('year');
    } else if (step === 'year') {
      setSelectedYear(item);
      onSelect({ make: selectedMake, model: selectedModel, year: item });
      setModalVisible(false);
      resetState();
    }
  };

  const handleBack = () => {
    if (step === 'model') {
      setStep('make');
      setSearchQuery('');
    } else if (step === 'year') {
      setStep('model');
      setSearchQuery('');
    } else {
      setModalVisible(false);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedMake('');
    setSelectedModel('');
    setSelectedYear('');
    setStep('make');
    setSearchQuery('');
    setShowAllMakes(false);
  };

  const showSpinner = useMemo(() => {
    if (!isLoading) return false;
    if (step === 'model') return true;
    if (step === 'make') {
      return showAllMakes || searchQuery.trim() !== '';
    }
    return false;
  }, [isLoading, step, showAllMakes, searchQuery]);

  const modalTitle = useMemo(() => {
    if (step === 'make') return 'Marka Seç';
    if (step === 'model') return 'Model Seç';
    if (step === 'year') return 'Yıl Seç';
    return '';
  }, [step]);

  return (
    <View style={styles.container}>
      {selected ? (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedLeft}>
            <Ionicons name="car" size={20} color="#E53935" />
            <Text style={styles.selectedText}>
              {`${selected.year} ${selected.make} ${selected.model}`}
            </Text>
          </View>
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="car-outline" size={20} color="#6B7280" />
          <Text style={styles.triggerText}>Araç Seç (Opsiyonel)</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleBack}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#E53935" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <View style={styles.placeholderHeader} />
          </View>

          {step !== 'year' && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Ara..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          )}

          {showSpinner ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : (
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isActive =
                  (step === 'make' && item === selectedMake) ||
                  (step === 'model' && item === selectedModel) ||
                  (step === 'year' && item === selectedYear);

                return (
                  <TouchableOpacity
                    style={[styles.item, isActive && styles.activeItem]}
                    onPress={() => handleItemPress(item)}
                  >
                    <Text style={styles.itemText}>{item}</Text>
                    {step !== 'year' && item !== 'Diğer' && item !== 'Lütfen arama çubuğuna model yazın' && (
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
  },
  triggerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#9E9E9E',
    fontFamily: 'System',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  clearButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  placeholderHeader: {
    width: 32,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#0D0D0D',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1A1A1A',
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  listContent: {
    padding: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  activeItem: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderColor: '#E53935',
  },
  itemText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
