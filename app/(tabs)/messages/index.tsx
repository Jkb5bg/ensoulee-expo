import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthContext';
import { StatusBar } from 'expo-status-bar';
import MatchType from '@/types/matchType';
import { GetUserMatches } from '@/api/GetUserMatches';
import { GetUserProfileImage } from '@/api/GetUserProfileImage';
import { useAppContext } from '@/components/TabsContext';
import NotificationsIcon from "@/components/icons/NotificationsIcon";
import SettingsIcon from "@/components/icons/SettingsIcon";

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

const { width } = Dimensions.get('window');

// TODO: Fix up the message preview so it updates automatically, possibly with a new message indicator.

export default function Messages() {
  const { user, userInfo, authTokens } = useAuth();
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const token = authTokens?.idToken || '';
  const { setCustomHeader } = useAppContext();
  const { width, height } = Dimensions.get('window');
  const isSmallDevice = height < 700;
  const isLargeDevice = height > 800;

  // Simulate loading for a short period to ensure screen is dark
  useEffect(() => {
    // This ensures the screen stays dark during the loading process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Half second delay to prevent flashing
    
    return () => clearTimeout(timer);
  }, []);

  // Make sure custom header is off when this screen mounts
  useEffect(() => {
    setCustomHeader(false);
  }, []);

  // Fetch matches using your API function
  const fetchMatches = useCallback(async () => {
    if (!user || !userInfo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      if (!token) {
        throw new Error('No token available');
      }

      // Use your API function
      const matchesData = await GetUserMatches(userInfo, token);
      
      if (matchesData) {
        setMatches(matchesData as unknown as MatchType[]);

        // Load images after setting matches
        if (Array.isArray(matchesData) && matchesData.length > 0) {
          matchesData.forEach((match: any) => {
            if (match.matchedUser?.profileImage) {
              loadImageUrl(match.matchedUser.id, match.matchedUser.profileImage);
            }
          });
        }
      } else {
        // Handle the case when the API returns undefined
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      Alert.alert('Error', 'Failed to load your matches');
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userInfo]);

  // Load image URL function
  const loadImageUrl = useCallback(async (userId: string, filename: string) => {
    if (!filename || !userInfo || !user) return DEFAULT_AVATAR;

    try {
      if (!token) return DEFAULT_AVATAR;

      // Create minimal user object with necessary properties for the API function
      const userDataForImage = {
        id: userId,
        imageFilenames: [filename]
      };

      // Use your existing GetUserProfileImage function
      const imageUrl = await GetUserProfileImage(userInfo, token, userDataForImage as any);
      
      if (imageUrl) {
        // Extract the actual filename if it's a full URL
        const extractedFilename = filename.split('/').pop()?.split('?')[0] || filename;
        
        // Store the image URL in our local state
        setImageUrls(prev => ({
          ...prev,
          [`${userId}-${extractedFilename}`]: imageUrl
        }));
        
        return imageUrl;
      }
      
      return DEFAULT_AVATAR;
    } catch (error) {
      console.error('Error loading image URL:', error);
      return DEFAULT_AVATAR;
    }
  }, [user, userInfo]);

  // Helper function to get image URL from local state
  const getImageUrl = useCallback((userId: string, imageFilename?: string) => {
    if (!imageFilename) return DEFAULT_AVATAR;

    // Extract the actual filename if it's a full URL
    const cleanFilename = imageFilename.split('/').pop()?.split('?')[0] || imageFilename;

    // Check if we have the URL cached in our local state
    return imageUrls[`${userId}-${cleanFilename}`] || DEFAULT_AVATAR;
  }, [imageUrls]);

  const navigateToChat = (match: MatchType) => {
    // Get image URL before navigating
    let imageUrl = DEFAULT_AVATAR;
    if (match.matchedUser.profileImage) {
      const tempUrl = getImageUrl(match.matchedUser.id, match.matchedUser.profileImage);
      if (typeof tempUrl === 'string') {
        imageUrl = tempUrl;
      }
    }
    
    // Set the custom header BEFORE navigation to prevent flickering
    setCustomHeader(true);
    
    // Short timeout to ensure state updates before navigation
    setTimeout(() => {
      router.push({
        pathname: "/messages/chat",
        params: {
          matchId: match.matchId,
          userId: match.matchedUser.id,
          userName: match.matchedUser.name,
          profileImage: typeof imageUrl === 'string' ? imageUrl : ''
        }
      });
    }, 10);
  };

  // Fetch matches on component mount
  useEffect(() => {
    if (user && userInfo) {
      fetchMatches();
    }
  }, [user, userInfo, fetchMatches]);

  // Load images for matches
  useEffect(() => {
    matches.forEach(match => {
      if (match.matchedUser?.profileImage) {
        loadImageUrl(match.matchedUser.id, match.matchedUser.profileImage);
      }
    });
  }, [matches, loadImageUrl]);

  // Render match list item
  const renderMatchItem = ({ item }: { item: MatchType }) => {
    // Create a default image URL regardless of whether there's a profile image
    const imageUrl = item.matchedUser.profileImage ? 
      getImageUrl(item.matchedUser.id, item.matchedUser.profileImage) : 
      DEFAULT_AVATAR;
    
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => navigateToChat(item)}
      >
        <View style={styles.matchItemContent}>
          <Image
            source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl}
            style={styles.avatar}
            defaultSource={DEFAULT_AVATAR}
          />
          <View style={styles.matchDetails}>
            <Text style={styles.matchName}>{item.matchedUser.name}</Text>
            {item.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage.content}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ backgroundColor: 'rgba(31, 34, 35, 1)' }}>
        <View style={{
          height: Platform.OS === 'ios' 
            ? (isSmallDevice ? 120 : (isLargeDevice ? 160 : 140))
            : (isSmallDevice ? 100 : 120),
          paddingTop: Platform.OS === 'ios'
            ? (isSmallDevice ? 30 : (isLargeDevice ? 50 : 40))
            : (isSmallDevice ? 20 : 30),
          backgroundColor: 'rgba(31, 34, 35, 1)',
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginTop: isSmallDevice ? 15 : (isLargeDevice ? 30 : 20),
            height: 70, 
          }}>
          <View style={{ width: '20%' }}>
            <Image
              source={DEFAULT_AVATAR}
              style={{
                width: isSmallDevice ? 36 : 40,
                height: isSmallDevice ? 36 : 40,
                borderRadius: (isSmallDevice ? 36 : 40) / 2
              }}
              resizeMode="cover"
            />
          </View>
          
          <View style={{ 
            flex: 1, 
            alignItems: 'center',
            paddingLeft: width * 0.05
          }}>
            <Text style={{ 
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: isSmallDevice ? 22 : 24
            }}>
              Messages
            </Text>
          </View>
          
          <View style={{
            flexDirection: 'row',
            width: '20%',
            justifyContent: 'flex-end',
          }}>
            <TouchableOpacity style={{ marginLeft: 20 }} onPress={() => router.push('/settings')}>
              <SettingsIcon 
                width={isSmallDevice ? 24 : 26} 
                height={isSmallDevice ? 24 : 26} 
                color="#F44D7B" 
              />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 20 }}>
              <NotificationsIcon 
                width={isSmallDevice ? 24 : 26} 
                height={isSmallDevice ? 24 : 26} 
                color="#F44D7B" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
      
      {loading && matches.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f44d7b" />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.matchId}
          renderItem={renderMatchItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMatches();
              }}
              tintColor="#f44d7b"
            />
          }
          ListEmptyComponent={
            <View style={styles.noMatchesContainer}>
              <Text style={styles.noMatchesText}>No matches yet</Text>
              <Text style={styles.noMatchesSubtext}>
                Start swiping to find matches!
              </Text>
              <TouchableOpacity
                style={styles.discoverButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.discoverButtonText}>Go to Discover</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  matchItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  matchDetails: {
    flex: 1,
  },
  matchName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    color: '#bbb',
    fontSize: 14,
  },
  noMatchesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 50,
  },
  noMatchesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  noMatchesSubtext: {
    color: '#bbb',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: '#f44d7b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  discoverButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});