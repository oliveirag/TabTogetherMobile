import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import CameraScreen from '../screens/CameraScreen';
import BillHistoryScreen from '../screens/BillHistoryScreen';
import PhotoLibraryScreen from '../screens/PhotoLibraryScreen';

export default function HomeScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);

  const handleCapturePress = () => {
    setShowCamera(true);
  };

  const handleHistoryPress = () => {
    setShowHistory(true);
  };

  const handlePhotoLibraryPress = () => {
    setShowPhotoLibrary(true);
  };

  const handleCameraClose = () => {
    setShowCamera(false);
  };

  const handleHistoryClose = () => {
    setShowHistory(false);
  };

  const handlePhotoLibraryClose = () => {
    setShowPhotoLibrary(false);
  };

  const handleImageCapture = (imageUri: string) => {
    // TODO: Navigate to OCR processing screen
    console.log('Captured image:', imageUri);
    Alert.alert('Success', 'Bill captured!');
  };

  const handleCreateSampleData = async () => {
    try {
      // Temporarily disabled - will implement after fixing imports
      Alert.alert('Info', 'Sample data feature will be available soon!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create sample bills');
    }
  };
  return (
    <View style={styles.container}>
      {/* App Logo and Name */}
      <View style={styles.header}>
        <Image source={require('@/assets/images/TabTogether.png')} style={styles.logo} />
        <Text style={styles.title}>TabTogether</Text>
      </View>
      {/* Welcome Message */}
      <Text style={styles.welcome}>Split any bill, instantly.</Text>
      {/* Main Actions */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCapturePress}>
          <Ionicons name="camera" size={32} color="#fff" />
          <Text style={styles.buttonText}>Capture Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleHistoryPress}>
          <MaterialIcons name="history" size={32} color="#fff" />
          <Text style={styles.buttonText}>Bill History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handlePhotoLibraryPress}>
          <Ionicons name="images" size={32} color="#fff" />
          <Text style={styles.buttonText}>Photo Library</Text>
        </TouchableOpacity>
        
        {/* Debug button for sample data */}
        <TouchableOpacity style={[styles.actionButton, styles.debugButton]} onPress={handleCreateSampleData}>
          <MaterialIcons name="bug-report" size={32} color="#fff" />
          <Text style={styles.buttonText}>Create Sample Bills</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <CameraScreen
          onClose={handleCameraClose}
          onCapture={handleImageCapture}
        />
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <BillHistoryScreen onClose={handleHistoryClose} />
      </Modal>

      {/* Photo Library Modal */}
      <Modal
        visible={showPhotoLibrary}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PhotoLibraryScreen 
          onClose={handlePhotoLibraryClose} 
          onImageSelect={handleImageCapture}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 1,
  },
  welcome: {
    fontSize: 18,
    color: '#444',
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 8,
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  debugButton: {
    backgroundColor: '#f59e0b',
  },
});
