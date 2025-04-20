// app/profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  Platform
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/components/AuthContext';
import { useAppData } from '@/components/AppDataContext';
import calculateAge from '@/functions/calculateAge';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function ProfileScreen() {
  // Get route parameters
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const matchId = params.matchId as string;
  
  // State for profile data
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get auth context
  const { authTokens, userInfo } = useAuth();
  const { profileImagesCache, loadProfileImage } = useAppData();
  
  // Calculate cache key for profile image
  const profileCacheKey = `${userId}-${params.profileImage ? 
    (typeof params.profileImage === 'string' && params.profileImage.includes('/') 
      ? params.profileImage.split('/').pop()?.split('?')[0] 
      : params.profileImage)
    : ''}`;
  
  // Load profile data
  const loadProfileData = useCallback(async () => {
    if (!userId || !authTokens?.idToken || !userInfo) {
      setError('Missing required authentication information');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real app, you would fetch the user's profile data from your API
      // For now, we'll use the match data passed in the params
      
      // If no profile data in params, try to construct from params
      let profile = null;
      
      if (params.firstName || params.name) {
        profile = {
          userName: userId,
          firstName: params.firstName || params.name || 'Unknown',
          birthDate: params.birthDate || '',
          city: params.city || '',
          state: params.state || '',
          bio: params.bio || 'No bio available',
          occupation: params.occupation || '',
          matchScore: params.matchScore ? parseFloat(params.matchScore as string) : undefined,
          matchRank: params.matchRank as string,
        };
      }
      
      // If we couldn't create profile from params, use a placeholder
      if (!profile) {
        profile = {
          userName: userId,
          firstName: params.name || 'User',
          bio: 'No bio available',
          city: '',
          state: '',
          birthDate: '',
        };
      }
      
      setProfileData(profile);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [userId, authTokens, userInfo, params]);
  
  // Load profile image if needed
  const loadImage = useCallback(async () => {
    if (!userId || !authTokens?.idToken || !userInfo) return;
    
    try {
      // Extract filename from params
      const profileImage = params.profileImage as string;
      if (!profileImage) return;
      
      const filename = profileImage.includes('/')
        ? profileImage.split('/').pop()?.split('?')[0]
        : profileImage;
      
      if (filename) {
        // If not in cache already, load it
        if (!profileImagesCache[profileCacheKey]) {
          await loadProfileImage(userId, filename);
        }
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  }, [userId, params.profileImage, profileImagesCache, profileCacheKey, loadProfileImage, authTokens, userInfo]);
  
  // Load data when component mounts
  useEffect(() => {
    loadProfileData();
    loadImage();
  }, [loadProfileData, loadImage]);
  
  // Determine the profile image source
  const profileImageSource = profileImagesCache[profileCacheKey]
    ? { uri: profileImagesCache[profileCacheKey] }
    : (params.profileImage 
      ? { uri: params.profileImage as string } 
      : DEFAULT_AVATAR);
  
  // Handle back button press
  const handleBack = () => {
    router.back();
  };
  
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
      <SafeAreaView>
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
            <Image
              source={profileImageSource}
              style={styles.profileImage}
              defaultSource={DEFAULT_AVATAR}
            />
          </View>
          
          <View style={styles.nameContainer}>
            <Text style={styles.nameText}>
              {profileData.firstName}, {calculateAge(profileData.birthDate)}
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
                {new Date(profileData.birthDate).toLocaleDateString()}
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
              onPress={() => {
                router.push({
                  pathname: "/messages/chat",
                  params: {
                    matchId,
                    userId: profileData.userName,
                    userName: profileData.firstName,
                    profileImage: params.profileImage
                  }
                });
              }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
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
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#f44d7b',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  nameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 5,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  matchInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(50, 50, 50, 0.4)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 30,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  actionButtonsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  messageButton: {
    width: '80%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
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