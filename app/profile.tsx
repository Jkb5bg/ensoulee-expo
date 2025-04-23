// app/profile.tsx
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
import { GetUserProfileImages } from '@/api/GetUserProfileImages';
import { GetUserProfile } from '@/api/GetUserProfile';
import User from '@/types/user';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function ProfileScreen() {
  // Get route parameters
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const matchId = params.matchId as string;
  const didLoadImages = useRef(false);
  
  // Debug params
  console.log('Profile screen params:', params);
  
  // State for profile data
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Prevent infinite update loops
  const isInitialMount = useRef(true);
  const apiCallInProgress = useRef(false);
  
  // Get auth context
  const { authTokens, userInfo, getValidToken, user } = useAuth();
  const { potentialMatches, matches } = useAppData();
  
  // Debug auth context
  console.log('Auth context loaded:', {
    hasAuthTokens: !!authTokens,
    hasUserInfo: !!userInfo,
    hasGetValidToken: !!getValidToken,
    hasUser: !!user
  });
  
  // Find the user profile from potentialMatches or matches
  const findUserProfile = useCallback(() => {
    // Debug logging
    console.log('Potential matches:', potentialMatches?.length);
    console.log('Matches:', matches?.length);
    console.log('Looking for userId:', userId);
    
    // First check potential matches (from discover screen)
    const potentialMatch = potentialMatches.find(match => match.userName === userId);
    if (potentialMatch) {
      console.log('Found user in potentialMatches:', potentialMatch);
      return potentialMatch;
    }
    
    // Then check matches (from matches screen)
    const match = matches.find(match => 
      match.matchedUser && match.matchedUser.id === userId
    );
    
    if (match) {
      console.log('Found user in matches with images:', match.matchedUser.profileImage);
      // Create a more complete profile object
      return {
        userName: match.matchedUser.id,
        firstName: match.matchedUser.name,
        // Add both imageFilenames and presignedImageUrls for maximum compatibility
        imageFilenames: match.matchedUser.profileImage ? [match.matchedUser.profileImage] : [],
        presignedImageUrls: match.matchedUser.profileImage ? [match.matchedUser.profileImage] : [],
        birthDate: params.birthDate || '2000-01-01',
        city: params.city || 'City',
        state: params.state || 'State',
        bio: params.bio || 'No bio available',
        occupation: params.occupation || 'Occupation',
        matchScore: match.matchScore,
        matchRank: match.matchRank,
      };
    }
    
    // If not found in either, return null
    console.log('User not found in matches or potentialMatches');
    return null;
  }, [userId, potentialMatches, matches, params]);
  
  // Load profile images
  const loadProfileImages = useCallback(async () => {
    if (!userInfo || !userId) {
      console.log('Missing required data for loading images');
      return null;
    }
    
    try {
      setImageLoading(true);
      
      // Get a valid token - this will automatically refresh if needed
      const token = await getValidToken();
      if (!token) {
        throw new Error('Failed to get a valid token');
      }
      
      console.log('Got valid token for image loading');
      
      // Check if we have image filenames to load
      const imageFilenames = profileData?.imageFilenames || 
                            (profileData?.presignedImageUrls ? 
                              profileData.presignedImageUrls.map((url: string) => {
                                // Extract filename from URL if it's a URL
                                if (url && url.startsWith('http')) {
                                  const urlParts = url.split('/');
                                  return urlParts[urlParts.length - 1];
                                }
                                return url;
                              }) : 
                              []) || 
                            (params.profileImage ? [params.profileImage as string] : []);
      
      if (!imageFilenames || imageFilenames.length === 0) {
        console.log('No image filenames available');
        setImageLoading(false);
        return;
      }
      
      console.log('Image filenames to load:', imageFilenames);
      
      // Create complete user data for image API with all required fields
      const userData: User = {
        userName: userId,
        imageFilenames: imageFilenames,
        tier: profileData?.tier || 'FREE',
        occupation: profileData?.occupation || '',
        state: profileData?.state || '',
        city: profileData?.city || '',
        bio: profileData?.bio || '',
        matchSex: profileData?.matchSex || '',
        apiKey: profileData?.apiKey || userInfo.apiKey || '',
        birthDate: profileData?.birthDate || '',
        createdAt: profileData?.createdAt || new Date().toISOString(),
        email: profileData?.email || '',
        firstName: profileData?.firstName || params.name as string || 'User',
        privateProfile: profileData?.privateProfile || false,
        sex: profileData?.sex || '',
        firstLogin: profileData?.firstLogin || false
      };
      
      // Call multi-image API
      const imageUrls = await GetUserProfileImages(userInfo, token, userData);
      if (imageUrls && imageUrls.length > 0) {
        console.log(`Got ${imageUrls.length} profile image URLs`);
        
        // Clean URLs by removing token parameters
        const cleanUrls = imageUrls.map(url => {
          if (url.includes('s3.amazonaws.com') && url.includes('X-Amz-Security-Token')) {
            console.log('Cleaning S3 URL by removing token parameters');
            return url.split('?')[0];
          }
          return url;
        });
        
        setProfileImages(cleanUrls);
      } else {
        console.log('No profile images returned from API');
        
        // As a fallback, try to use presigned URLs directly if available
        if (profileData?.presignedImageUrls && profileData.presignedImageUrls.length > 0) {
          console.log('Using presigned URLs directly as fallback');
          // Clean URLs by removing token parameters
          const cleanUrls = profileData.presignedImageUrls.map((url: string) => {
            if (url && url.includes('s3.amazonaws.com') && url.includes('X-Amz-Security-Token')) {
              return url.split('?')[0];
            }
            return url;
          });
          setProfileImages(cleanUrls);
        }
      }
    } catch (error) {
      console.error('Error loading profile images:', error);
      
      // If we have a token error, try to get user profile directly as fallback
      if (String(error).includes('InvalidToken') || String(error).includes('token')) {
        console.log('Token error detected in image loading, trying profile lookup as fallback');
        try {
          // Use the imported GetUserProfile
          const token = await getValidToken();
          
          if (token && userId) {
            const profileResponse = await GetUserProfile(userInfo, token, userId);
            console.log('GetUserProfile fallback response:', profileResponse);
            
            if (profileResponse && profileResponse.imageFilenames && profileResponse.imageFilenames.length > 0) {
              // Try direct S3 URLs as last resort
              const directUrls = profileResponse.imageFilenames.map((filename: string) => 
                `https://ensoulee-user-images.s3.amazonaws.com/${userId}/${filename}`
              );
              
              setProfileImages(directUrls);
              
              // Also update profile data if we have it
              if (!profileData) {
                setProfileData(profileResponse);
              }
            }
          }
        } catch (fallbackError) {
          console.error('Fallback attempt also failed:', fallbackError);
        }
      }
    } finally {
      setImageLoading(false);
    }
  }, [userInfo, userId, getValidToken, profileData, params]);
  
  // Load profile data
  const loadProfileData = useCallback(async () => {
    // Skip if already loading
    if (apiCallInProgress.current) {
      console.log('API call already in progress, skipping duplicate call');
      return;
    }
    
    try {
      setLoading(true);
      apiCallInProgress.current = true;
      
      // Try to find user in potentialMatches or matches
      const userProfile = findUserProfile();
      
      if (userProfile) {
        console.log('Found user profile in cached data');
        setProfileData(userProfile);
      } else {
        // If current user is viewing their own profile
        if (!userId || userId === userInfo?.userName) {
          console.log('Loading current user profile');
          setProfileData(user);
        } else {
          // Try to get profile directly from API
          try {
            console.log('Trying to get profile directly from API');
            const token = await getValidToken();
            if (token) {
              if (userInfo) {
              const userProfileFromApi = await GetUserProfile(userInfo, token, userId);
                if (userProfileFromApi) {
                  console.log('Successfully fetched profile from API');
                  setProfileData(userProfileFromApi);
                  return;
                }
              }
            }
          } catch (apiError) {
            console.error('Error fetching from API, falling back to params:', apiError);
          }
          
          // Fallback to params data with improved image handling
          console.log('Using fallback profile data from params');
          const profileImage = params.profileImage as string;
          
          const fallbackProfile = {
            userName: userId,
            firstName: params.name || 'Unknown User',
            birthDate: params.birthDate || '2000-01-01', // Default to something
            city: params.city || 'City',
            state: params.state || 'State',
            bio: params.bio || 'No bio available',
            occupation: params.occupation || 'Occupation',
            matchScore: params.matchScore ? parseFloat(params.matchScore as string) : 0.5,
            matchRank: params.matchRank as string || 'GOLD',
            // Add both for maximum compatibility
            presignedImageUrls: profileImage ? [profileImage] : [],
            imageFilenames: profileImage ? [profileImage] : [],
          };
          
          console.log('Created fallback profile with data:', fallbackProfile);
          setProfileData(fallbackProfile);
        }
      }
    } catch (error: any) {
      console.error('Error loading profile data:', error);
      setError(error.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
      apiCallInProgress.current = false;
    }
  }, [userId, userInfo, findUserProfile, user, getValidToken, params]);
  
  // Initial setup on mount - load data and images once
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadProfileData();
    }
  }, [loadProfileData]);
  
  // Load profile images when profile data is available
  useEffect(() => {
    if (!profileData || didLoadImages.current) {
      return;
    }
    didLoadImages.current = true;
    loadProfileImages();
  }, [profileData, loadProfileImages]);
  
  // Handle back button press
  const handleBack = () => {
    router.back();
  };
  
  // Get profile image source for current image
  const getProfileImageSource = () => {
    if (profileImages.length > 0) {
      return { uri: profileImages[activeImageIndex] };
    }
    if (params.profileImage) {
      return { uri: params.profileImage as string };
    }
    return DEFAULT_AVATAR;
  };
  
  // Handle image navigation
  const handlePreviousImage = () => {
    if (profileImages.length > 1) {
      setActiveImageIndex((prev) => (prev === 0 ? profileImages.length - 1 : prev - 1));
    }
  };
  
  const handleNextImage = () => {
    if (profileImages.length > 1) {
      setActiveImageIndex((prev) => (prev === profileImages.length - 1 ? 0 : prev + 1));
    }
  };
  
  // Message button handler
  const handleMessage = () => {
    if (!profileData) {
      Alert.alert('Error', 'Cannot message this user. Profile data is missing.');
      return;
    }
    
    router.push({
      pathname: "/messages/chat",
      params: {
        matchId,
        userId: profileData.userName,
        userName: profileData.firstName,
        profileImage: profileImages[0] || params.profileImage
      }
    });
  };
  
  // Rendering indicator dots for image carousel
  const renderImageDots = () => {
    if (profileImages.length <= 1) return null;
    
    return (
      <View style={styles.imageDots}>
        {profileImages.map((_, index) => (
          <View 
            key={`dot-${index}`} 
            style={[
              styles.imageDot, 
              index === activeImageIndex && styles.activeImageDot
            ]} 
          />
        ))}
      </View>
    );
  };
  
  // Log final profile data before rendering
  console.log('Final profileData being rendered:', profileData);
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f44d7b" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No profile data available</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
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
        {/* Profile Header with Image Carousel */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {imageLoading ? (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#f44d7b" />
              </View>
            ) : (
              <>
                <Image
                  source={getProfileImageSource()}
                  style={styles.profileImage}
                  defaultSource={DEFAULT_AVATAR}
                />
                
                {/* Image navigation controls - only show if multiple images */}
                {profileImages.length > 1 && (
                  <>
                    <TouchableOpacity 
                      style={[styles.imageNavButton, styles.imageNavButtonLeft]} 
                      onPress={handlePreviousImage}
                    >
                      <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.imageNavButton, styles.imageNavButtonRight]} 
                      onPress={handleNextImage}
                    >
                      <Ionicons name="chevron-forward" size={28} color="white" />
                    </TouchableOpacity>
                  </>
                )}
                
                {/* Indicator dots for multi-image */}
                {renderImageDots()}
                
                {/* Add gradient overlay for better text visibility */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.imageGradient}
                />
              </>
            )}
          </View>
          
          <View style={styles.nameContainer}>
            <Text style={styles.nameText}>
              {profileData.firstName || 'Unknown'}, {calculateAge(profileData.birthDate || '2000-01-01')}
            </Text>
            {(profileData.city || profileData.state) && (
              <Text style={styles.locationText}>
                {[profileData.city, profileData.state].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
          
          {/* Match Details if available */}
          {(profileData.matchScore !== undefined || profileData.matchRank) && (
            <View style={styles.matchInfoContainer}>
              {profileData.matchScore !== undefined && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Match</Text>
                  <Text style={styles.scoreValue}>
                    {Math.round(profileData.matchScore * 100)}%
                  </Text>
                </View>
              )}
              
              {profileData.matchRank && (
                <View style={styles.rankContainer}>
                  <Text style={styles.rankLabel}>Rank</Text>
                  <Text style={[
                    styles.rankValue,
                    { color: getMatchRankColor(profileData.matchRank) }
                  ]}>
                    {profileData.matchRank}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profileData.bio || 'No bio available'}</Text>
        </View>
        
        {/* Personal Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          
          {profileData.occupation && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={20} color="#f44d7b" />
              <Text style={styles.infoText}>{profileData.occupation}</Text>
            </View>
          )}
          
          {profileData.birthDate && (
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
    backgroundColor: 'rgba(31, 34, 35, 1)',
    zIndex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f44d7b',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#f44d7b',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(31, 34, 35, 1)',
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 40,
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
    height: 350,
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
    height: 160,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageNavButtonLeft: {
    left: 15,
  },
  imageNavButtonRight: {
    right: 15,
  },
  imageDots: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 2,
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeImageDot: {
    backgroundColor: '#f44d7b',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nameContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  nameText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  matchInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    alignSelf: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 30,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 5,
  },
  scoreValue: {
    color: '#f44d7b',
    fontSize: 18,
    fontWeight: '600',
  },
  rankContainer: {
    alignItems: 'center',
  },
  rankLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 5,
  },
  rankValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    color: '#f44d7b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  bioText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
    borderRadius: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  actionButtonsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  messageButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});