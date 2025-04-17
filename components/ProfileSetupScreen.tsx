import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, Text, TextInput, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { UploadProfileImage } from '@/api/UpdateProfileImage';
import { UpdateUserProfile } from '@/api/UpdateUserProfile';
import ProfileImagePlaceholder from './ProfileImagePlaceholder';

interface ProfileSetupScreenProps {
  onComplete: () => void;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ onComplete }) => {
  const [images, setImages] = useState<string[]>([]); // Now an array of image URIs
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { userInfo, getValidToken } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Set to false for multiple selections
        aspect: [1, 1],
        quality: 1,
        allowsMultipleSelection: true, // Enable multiple selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add new images to existing ones (up to a maximum, e.g., 5)
        const newImageUris = result.assets.map(asset => asset.uri);
        setImages(prevImages => {
          const combined = [...prevImages, ...newImageUris];
          return combined.slice(0, 6); // Limit to 6 images
        });
      }
    } catch (error) {
      console.error('Error picking images:', error);
      alert('Failed to select images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      showLoading('Updating profile...');
      
      const token = await getValidToken();
      if (!token || !userInfo) {
        throw new Error('No valid token or user info found');
      }

      // Update the bio if provided
      if (bio) {
        const bioUpdateSuccess = await UpdateUserProfile(userInfo, token, { bio });
        if (!bioUpdateSuccess) {
          throw new Error('Failed to update bio');
        }
      }

      // Upload multiple images if selected
      let allUploadsSuccessful = true;
      if (images.length > 0) {
        for (const imageUri of images) {
          const imageUploadSuccess = await UploadProfileImage(userInfo, token, imageUri);
          if (!imageUploadSuccess) {
            allUploadsSuccessful = false;
            console.error(`Failed to upload image: ${imageUri}`);
          }
        }
        
        if (!allUploadsSuccessful) {
          console.warn('Some images failed to upload');
          // Continue anyway since some images might have been uploaded successfully
        }
      }

      // Move to the next step
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Profile</Text>
        </View>
        
        {/* Image preview section */}
        <View style={styles.imageGridContainer}>
          {images.length === 0 ? (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
              <ProfileImagePlaceholder />
              <Text style={styles.addImageText}>Add Photos</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 5 && (
                <TouchableOpacity 
                  style={styles.smallAddButton} 
                  onPress={pickImages}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            placeholder="Enter your bio here..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={bio}
            onChangeText={setBio}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={['#FF7B6F', '#F44D7B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.registerGradient}
            >
              <Text style={styles.registerButtonText}>
                {isSubmitting ? 'Submitting...' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#181818',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  header: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 28,
    fontWeight: '600',
  },
  imageGridContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  addImageButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    color: '#FF7B6F',
    fontSize: 16,
    marginTop: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  imageContainer: {
    width: 100,
    height: 100,
    margin: 5,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44D7B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  smallAddButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(66, 66, 66, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: 'white',
    fontSize: 32,
  },
  textAreaContainer: {
    paddingVertical: 20,
  },
  textArea: {
    backgroundColor: 'rgba(43, 46, 47, 1)',
    borderRadius: 8,
    height: 169,
    padding: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '400',
  },
  buttonContainer: {
    paddingTop: 20,
    width: '100%',
  },
  registerButton: {
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 8,
    height: 48,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProfileSetupScreen;