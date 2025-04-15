import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, Text, TextInput } from 'react-native';
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
  const [image, setImage] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { userInfo, getValidToken } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to select image. Please try again.');
    }
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

      // Upload the profile image if selected
      if (image) {
        const imageUploadSuccess = await UploadProfileImage(userInfo, token, image);
        if (!imageUploadSuccess) {
          throw new Error('Failed to upload profile image');
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
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Profile</Text>
      </View>
      
      <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <ProfileImagePlaceholder />
        )}
      </TouchableOpacity>
      
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
  );
};

const styles = StyleSheet.create({
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
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ff5f6d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
