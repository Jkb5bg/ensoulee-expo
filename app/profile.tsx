// app/profile.tsx - Enhanced version

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/components/AuthContext';
import { useAppData } from '@/components/AppDataContext';
import calculateAge from '@/functions/calculateAge';
import { LinearGradient } from 'expo-linear-gradient';
import { GetUserProfile } from '@/api/GetUserProfile';
import User from '@/types/user';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

interface NameDisplayProps {
  profileData: {
    firstName?: string;
    birthDate?: string;
    city?: string;
    state?: string;
  } | null;
  name: string;
}


// Name display component for handling conditional age display
const NameDisplay: React.FC<NameDisplayProps> = ({ profileData, name }) => {
  const hasAge = profileData?.birthDate && profileData.birthDate.trim() !== "";
  
  return (
    <View style={styles.nameContainer}>
      <Text style={styles.nameText}>
        {profileData?.firstName || name || 'Unknown'}
        {hasAge && `, ${calculateAge(profileData.birthDate!)}`}
      </Text>
      {(profileData?.city || profileData?.state) && (
        <View style={styles.locationWrapper}>
          <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.locationText}>
            {[profileData.city, profileData.state].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function ProfileScreen() {
  // Get route parameters
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const matchId = params.matchId as string;
  const name = params.name as string;
  const profileImage = params.profileImage as string;
  const matchRank = params.matchRank as string;
  const matchScore = params.matchScore ? parseFloat(params.matchScore as string) : undefined;
  
  console.log('Profile screen params:', params);
  
  // State for profile data
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Get auth context
  const { authTokens, userInfo, getValidToken } = useAuth();
  
  // Extract just the filename from the profileImage
  const getImageFilename = useCallback(() => {
    if (!profileImage) return null;
    
    console.log("Original profile image:", profileImage);
    
    // If the profileImage doesn't contain slashes or special characters,
    // it's likely already just the filename (UUID)
    if (!profileImage.includes('/') && !profileImage.includes('?') && 
        !profileImage.includes('&') && !profileImage.includes('=')) {
      return profileImage;
    }
    
    // Based on the backend implementation, we expect profileImage to be just
    // a UUID or simple filename, not a full URL. However, if we're getting
    // a full URL or presigned URL, we need to extract just the filename.
    
    try {
      let filename;
      
      if (profileImage.includes('amazonaws.com')) {
        // This appears to be an S3 URL - extract just the filename
        // The S3 object key format is userId/filename
        // Get everything after the last slash before any query parameters
        const urlPath = profileImage.split('?')[0]; // Remove query parameters
        const pathParts = urlPath.split('/');
        filename = pathParts[pathParts.length - 1]; // Last part is the filename
      } else if (profileImage.includes('/')) {
        // Some other URL format - extract just the filename
        const urlPath = profileImage.split('?')[0]; // Remove query parameters
        const pathParts = urlPath.split('/');
        filename = pathParts[pathParts.length - 1]; // Get the last part
      } else {
        // If we're here, it might be a strange format - try to clean it up
        // Remove any query parameters
        filename = profileImage.split('?')[0];
      }
      
      console.log("Extracted filename:", filename);
      return filename || null;
    } catch (error) {
      console.error("Error extracting filename:", error);
      return null;
    }
  }, [profileImage]);
  
  // Load the user profile data
  const loadUserProfile = useCallback(async () => {
    if (!userInfo || !authTokens?.idToken || !userId) {
      setLoading(false);
      return;
    }
    
    try {
      // Get a valid token
      const token = await getValidToken();
      if (!token) {
        throw new Error('Could not get valid token');
      }
      
      // Get the user profile
      const userData = await GetUserProfile(userInfo, token, userId);
      if (userData) {
        console.log("User profile loaded:", {
          name: userData.firstName,
          birthDate: userData.birthDate,
          city: userData.city,
          state: userData.state,
          bio: userData.bio,
          imageFilenames: userData.imageFilenames?.length
        });
        
        setProfileData(userData);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, authTokens, userInfo, getValidToken]);
  
  // Load the profile image
  const loadProfileImage = useCallback(async () => {
    if (!userInfo || !authTokens?.idToken || !userId) {
      setImageLoading(false);
      return;
    }
    
    try {
      setImageLoading(true);
      
      // Get the filename
      const filename = getImageFilename();
      if (!filename) {
        console.log("No valid filename could be extracted");
        setImageLoading(false);
        return;
      }
      
      console.log("Loading image with filename:", filename);
      
      // Get a valid token
      const token = await getValidToken();
      if (!token) {
        throw new Error('Could not get valid token');
      }
      
      // Construct the API URL
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
      if (!BACKEND_URL) {
        throw new Error('Backend URL not configured');
      }
      
      // Normalize the base URL - remove trailing slash if present
      let baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
      
      // Remove duplicate dev paths if present (issue from logs)
      if (baseUrl.includes('/dev/dev')) {
        baseUrl = baseUrl.replace('/dev/dev', '/dev');
      }
      
      // Create the correct image API path
      // Based on the backend controller, the path should be:
      // /dev/api/images/{userId}/{imageFilename}
      const imageEndpoint = `${baseUrl}/api/images/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`;
      console.log("Image API endpoint:", imageEndpoint);
      
      // Make the request to get the presigned URL
      const response = await fetch(imageEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': userInfo.apiKey || ''
        }
      });
      
      if (!response.ok) {
        console.error(`Image API error: ${response.status}`);
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read error message';
        }
        console.error(`Error response: ${errorText}`);
        throw new Error(`Failed to get image: ${response.status}`);
      }
      
      // Get the presigned URL from the response
      const presignedUrl = await response.text();
      console.log(`Got presigned URL (length: ${presignedUrl.length})`);
      
      // Make sure we got a valid URL
      if (!presignedUrl || !presignedUrl.startsWith('http')) {
        console.error('Invalid presigned URL received:', presignedUrl.substring(0, 100) + '...');
        throw new Error('Invalid presigned URL received');
      }
      
      // Set the image URL for display
      setImageUrl(presignedUrl);
    } catch (error) {
      console.error('Error loading profile image:', error);
    } finally {
      setImageLoading(false);
    }
  }, [userId, getImageFilename, authTokens, userInfo, getValidToken]);
  
  // Load data on component mount
  useEffect(() => {
    Promise.all([
      loadUserProfile(),
      loadProfileImage()
    ]);
  }, [loadUserProfile, loadProfileImage]);
  
  // Handle back button
  const handleBack = () => {
    router.back();
  };
  
  // Handle message button
  const handleMessage = () => {
    if (!name || !userId) {
      Alert.alert('Error', 'Cannot message this user. Missing user information.');
      return;
    }
    
    router.push({
      pathname: "/messages/chat",
      params: {
        matchId,
        userId: userId,
        userName: name,
        profileImage: profileImage || ''
      }
    });
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButtonContainer}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f44d7b" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButtonContainer}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </SafeAreaView>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Profile Header with Image */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {imageLoading ? (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#f44d7b" />
              </View>
            ) : (
              <>
                <Image
                  source={imageUrl ? { uri: imageUrl } : DEFAULT_AVATAR}
                  style={styles.profileImage}
                  defaultSource={DEFAULT_AVATAR}
                  onError={(e) => console.warn('Image failed to load:', e.nativeEvent.error)}
                />
                
                {/* Add gradient overlay for better text visibility */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
                  style={styles.imageGradient}
                />
              </>
            )}
            
            {/* Use the NameDisplay component */}
            <NameDisplay profileData={profileData} name={name} />
          </View>
          
          {/* Match Details if available */}
          {(matchScore !== undefined || matchRank) && (
            <View style={styles.matchInfoContainer}>
              {matchScore !== undefined && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Match</Text>
                  <Text style={styles.scoreValue}>
                    {Math.round(matchScore * 100)}%
                  </Text>
                </View>
              )}
              
              {matchRank && (
                <View style={styles.rankContainer}>
                  <Text style={styles.rankLabel}>Rank</Text>
                  <Text style={[
                    styles.rankValue,
                    { color: getMatchRankColor(matchRank) }
                  ]}>
                    {matchRank}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Bio Section */}
        {profileData?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profileData.bio}</Text>
          </View>
        )}
        
        {/* Personal Info Section */}
        {(profileData?.occupation || profileData?.birthDate || profileData?.city || profileData?.state) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            
            {profileData.occupation && (
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color="#f44d7b" />
                <Text style={styles.infoText}>{profileData.occupation}</Text>
              </View>
            )}
            
            {profileData.birthDate && profileData.birthDate.trim() !== "" && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#f44d7b" />
                <Text style={styles.infoText}>
                  {formatDate(profileData.birthDate)}
                </Text>
              </View>
            )}
            
            {(profileData.city || profileData.state) && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#f44d7b" />
                <Text style={styles.infoText}>
                  {[profileData.city, profileData.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Action Buttons */}
        {matchId && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={handleMessage}
            >
              <LinearGradient
                colors={['#FF7B6F', '#F44D7B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Message</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helper function to get color based on match rank
function getMatchRankColor(rank: string): string {
  const upperRank = rank.toUpperCase();
  switch (upperRank) {
    case 'PLATINUM':
      return '#E5E4E2';
    case 'GOLD':
      return '#FFD700';
    case 'SILVER':
      return '#C0C0C0';
    case 'BRONZE':
      return '#CD7F32';
    default:
      return '#AAAAAA';
  }
}

// Helper function to format date
function formatDate(dateString: string): string {
  if (!dateString) return "Not provided";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerSafeArea: {
    backgroundColor: 'rgba(31, 34, 35, 0.95)',
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(31, 34, 35, 0.95)',
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileHeader: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  profileImageContainer: {
    width: '100%',
    height: 400, // Increased height for better visual impact
    position: 'relative',
  },
  imageLoadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180, // Increased height for better text visibility
  },
  nameContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  nameText: {
    color: '#fff',
    fontSize: 32, // Increased font size
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 6,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  matchInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(40, 40, 40, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 20, // Increased margin
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 40, // More spacing
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  scoreValue: {
    color: '#f44d7b',
    fontSize: 22, // Larger font
    fontWeight: '600',
  },
  rankContainer: {
    alignItems: 'center',
  },
  rankLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 22, // Larger font
    fontWeight: '600',
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#f44d7b',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  bioText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f44d7b',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
    letterSpacing: 0.2,
  },
  actionButtonsContainer: {
    paddingTop: 24,
    width: '100%',
    paddingHorizontal: 20,
  },
  messageButton: {
    width: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 12,
    height: 54, // Taller button
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});