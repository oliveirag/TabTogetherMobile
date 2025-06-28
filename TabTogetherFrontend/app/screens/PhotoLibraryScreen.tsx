import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

interface PhotoLibraryScreenProps {
  onClose: () => void;
  onImageSelect: (imageUri: string) => void;
}

interface PhotoAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
  mediaType: string;
}

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  imageUri,
  onClose,
  onConfirm,
}) => {
  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={onClose} style={styles.previewButton}>
            <Ionicons name="close" size={24} color="#fff" />
            <Text style={styles.previewButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Preview Image</Text>
          <TouchableOpacity onPress={onConfirm} style={styles.previewButton}>
            <Text style={styles.previewButtonText}>Use Image</Text>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </View>
        
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={20} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Back to Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Process Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function PhotoLibraryScreen({ onClose, onImageSelect }: PhotoLibraryScreenProps) {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const numColumns = 3;
  const imageSize = (screenWidth - 60) / numColumns; // 60 = padding + gaps

  useEffect(() => {
    requestPermissionAndLoadPhotos();
  }, []);

  const requestPermissionAndLoadPhotos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        await loadPhotos();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request photo library permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const albumAssets = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: 'creationTime',
        first: 100, // Load first 100 photos
      });

      const photoAssets: PhotoAsset[] = albumAssets.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        mediaType: asset.mediaType,
      }));

      setPhotos(photoAssets);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos from library');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPhotos();
  };

  const handlePhotoPress = (photoUri: string) => {
    setSelectedImage(photoUri);
    setShowPreview(true);
  };

  const handleImageConfirm = () => {
    if (selectedImage) {
      onImageSelect(selectedImage);
      onClose();
    }
  };

  const handleOpenCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const renderPhoto = ({ item }: { item: PhotoAsset }) => (
    <TouchableOpacity
      style={[styles.photoItem, { width: imageSize, height: imageSize }]}
      onPress={() => handlePhotoPress(item.uri)}
    >
      <Image source={{ uri: item.uri }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="images-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Photos Found</Text>
      <Text style={styles.emptyMessage}>
                 Your photo library appears to be empty or we don&apos;t have permission to access it.
      </Text>
      <TouchableOpacity style={styles.cameraButton} onPress={handleOpenCamera}>
        <Ionicons name="camera" size={20} color="#fff" />
        <Text style={styles.cameraButtonText}>Take a Photo</Text>
      </TouchableOpacity>
    </View>
  );

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.title}>Photo Library</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.title}>Photo Library</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="lock-closed" size={64} color="#ef4444" />
          <Text style={styles.permissionTitle}>Permission Required</Text>
          <Text style={styles.permissionMessage}>
            TabTogether needs access to your photo library to select bill images.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermissionAndLoadPhotos}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraButton} onPress={handleOpenCamera}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.cameraButtonText}>Use Camera Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Photo Library</Text>
        <TouchableOpacity onPress={handleOpenCamera} style={styles.cameraHeaderButton}>
          <Ionicons name="camera" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Select a photo of a bill or receipt to split expenses
        </Text>
      </View>

      {/* Photo Grid */}
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        style={styles.photoGrid}
        contentContainerStyle={photos.length === 0 ? styles.emptyContainer : styles.gridContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={showPreview}
        imageUri={selectedImage}
        onClose={() => {
          setShowPreview(false);
          setSelectedImage(null);
        }}
        onConfirm={handleImageConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  backButton: {
    padding: 4,
  },
  cameraHeaderButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  instructionsContainer: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
  },
  photoGrid: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  photoItem: {
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  // Loading and Permission States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  // Preview Modal Styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  previewImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
}); 