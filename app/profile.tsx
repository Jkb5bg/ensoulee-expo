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
  Platform,
  Alert,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/components/AuthContext';
import { useAppData } from '@/components/AppDataContext';
import calculateAge from '@/functions/calculateAge';
import { LinearGradient } from 'expo-linear-gradient';
import { GetUserProfile } from '@/api/GetUserProfile';
import Swiper from 'react-native-swiper';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const matchId = params.matchId as string;
  const name = params.name as string;
  const profileImage = params.profileImage as string;
  const matchRank = params.matchRank as string;
  const matchScore = params.matchScore ? parseFloat(params.matchScore as string) : undefined;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);

  const { authTokens, userInfo, getValidToken } = useAuth();

  const loadUserProfile = useCallback(async () => {
    if (!userInfo || !authTokens?.idToken || !userId) {
      setLoading(false);
      return;
    }
    try {
      const token = await getValidToken();
      if (!token) throw new Error('Could not get valid token');

      const userData = await GetUserProfile(userInfo, token, userId);
      if (userData) {
        setProfileData(userData);

        let imageUrls: string[] = [];
        if (userData.imageFilenames?.length) {
          imageUrls = await loadProfileImages(userData.imageFilenames);
        }
        if (!imageUrls.length && profileImage) {
          imageUrls = [profileImage];
        }
        setImages(imageUrls);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
      setImageLoading(false);
    }
  }, [userId, authTokens, userInfo, getValidToken, profileImage]);

  const loadProfileImages = async (imageFilenames: string[]): Promise<string[]> => {
    if (!userInfo || !authTokens?.idToken) return [];
    setImageLoading(true);
    try {
      const token = await getValidToken();
      if (!token) return [];
      const urls: string[] = [];

      const BACKEND_URL =
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        process.env.EXPO_PUBLIC_ENSOULEE_API_URL ||
        '';
      const base = BACKEND_URL.replace(/\/$/, '') + (BACKEND_URL.includes('/dev') ? '' : '/dev');

      for (const filename of imageFilenames) {
        try {
          const endpoint = `${base}/api/images/${encodeURIComponent(
            userId
          )}/${encodeURIComponent(filename)}`;
          const resp = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-api-key': userInfo.apiKey || '',
            },
          });
          if (resp.ok) {
            const url = await resp.text();
            if (url.startsWith('http')) urls.push(url);
          }
        } catch (e) {
          console.error('Error loading image:', e);
        }
      }
      return urls;
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleBack = () => router.back();
  const handleMessage = () => {
    if (!name || !userId) {
      return Alert.alert('Error', 'Cannot message this user. Missing user information.');
    }
    router.push({
      pathname: '/messages/chat',
      params: { matchId, userId, userName: name, profileImage: profileImage || '' },
    });
  };

  // Shared header + status bar
  const Header = () => (
    <>
      <ExpoStatusBar style="light" backgroundColor="rgba(31,34,35,1)" />
      <SafeAreaView style={styles.safeAreaHeader}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.rightPlaceholder} />
        </View>
      </SafeAreaView>
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f44d7b" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Image gallery */}
        <View style={styles.imageGalleryContainer}>
          {imageLoading ? (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator size="large" color="#f44d7b" />
            </View>
          ) : images.length > 0 ? (
            <Swiper
              style={styles.swiper}
              dot={<View style={styles.dot} />}
              activeDot={<View style={styles.activeDot} />}
              paginationStyle={styles.pagination}
              loop={false}
            >
              {images.map((uri, i) => (
                <View key={i} style={styles.slideContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.slideImage}
                    defaultSource={DEFAULT_AVATAR}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                    style={styles.imageGradient}
                  />
                </View>
              ))}
            </Swiper>
          ) : (
            <View style={styles.slideContainer}>
              <Image source={DEFAULT_AVATAR} style={styles.slideImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.imageGradient}
              />
            </View>
          )}

          <View style={styles.profileInfoOverlay}>
            <Text style={styles.profileName}>
              {profileData?.firstName || name}
              {profileData?.birthDate && `, ${calculateAge(profileData.birthDate)}`}
            </Text>
            {(profileData?.city || profileData?.state) && (
              <View style={styles.locationWrapper}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.locationText}>
                  {[profileData.city, profileData.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Match info */}
        {(matchScore !== undefined || matchRank) && (
          <View style={styles.matchInfoContainer}>
            {matchScore !== undefined && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Match</Text>
                <Text style={styles.scoreValue}>{Math.round(matchScore * 100)}%</Text>
              </View>
            )}
            {matchRank && (
              <View style={styles.rankContainer}>
                <Text style={styles.rankLabel}>Rank</Text>
                <Text style={[styles.rankValue, { color: getMatchRankColor(matchRank) }]}>
                  {matchRank}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bio */}
        {profileData?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profileData.bio}</Text>
          </View>
        )}

        {/* Personal Info */}
        {(profileData?.occupation ||
          profileData?.birthDate ||
          profileData?.city ||
          profileData?.state) && (
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
                <Text style={styles.infoText}>{formatDate(profileData.birthDate)}</Text>
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

        {/* Message button */}
        {matchId && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <LinearGradient
                colors={['#FF7B6F', '#F44D7B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={20}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Message</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helpers

function getMatchRankColor(rank: string): string {
  switch (rank.toUpperCase()) {
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeAreaHeader: {
    backgroundColor: 'rgba(31, 34, 35, 1)',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
    zIndex: 10,
  },
  header: {
    height: 70,
    backgroundColor: 'rgba(31, 34, 35, 1)',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerIconButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
  },
  rightPlaceholder: {
    width: 24,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },

  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },

  imageGalleryContainer: {
    width: '100%',
    height: height * 0.6,
    position: 'relative',
  },
  imageLoadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  swiper: {
    backgroundColor: '#121212',
  },
  slideContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#f44d7b',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 3,
  },
  pagination: {
    bottom: 15,
  },

  profileInfoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginLeft: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  matchInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 20,
    marginHorizontal: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 6,
  },
  scoreValue: {
    color: '#f44d7b',
    fontSize: 22,
    fontWeight: '600',
  },
  rankContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rankLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 6,
  },
  rankValue: {
    fontSize: 22,
    fontWeight: '600',
  },

  section: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: 'rgba(40, 40, 40, 0.4)',
    borderRadius: 16,
  },
  sectionTitle: {
    color: '#f44d7b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  bioText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 15,
  },

  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  messageButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
    paddingVertical: 16,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
