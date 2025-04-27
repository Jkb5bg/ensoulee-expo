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
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthContext';
import { StatusBar } from 'expo-status-bar';
import MatchType from '@/types/matchType';
import { useAppContext } from '@/components/TabsContext';
import NotificationsIcon from "@/components/icons/NotificationsIcon";
import SettingsIcon from "@/components/icons/SettingsIcon";
import { useAppData } from '@/components/AppDataContext';
import { Buffer } from 'buffer';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

export default function Messages() {
  const { user, userInfo, authTokens } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { setCustomHeader } = useAppContext();
  const { width, height } = Dimensions.get('window');
  const isSmallDevice = height < 700;
  const isLargeDevice = height > 800;
  
  // Get data from our shared context
  const { matches, refreshMatches, isLoading: isDataLoading } = useAppData();

  console.log(`[Messages] Matches count: ${matches?.length}`);

  // Make sure custom header is off when this screen mounts
  useEffect(() => {
    setCustomHeader(false);
  }, [setCustomHeader]);

  // Fetch matches from context if needed on component mount
  useEffect(() => {
    if (matches.length === 0 && !isDataLoading && userInfo && authTokens?.idToken) {
      console.log('[Messages] Fetching matches on component mount');
      refreshMatches();
    }
  }, [matches.length, isDataLoading, refreshMatches, userInfo, authTokens]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMatches();
    setRefreshing(false);
  }, [refreshMatches]);

  // Simple function to get image URL - no cleaning, just use what's provided
  const getImageUrl = useCallback((match: MatchType) => {
    if (!match.matchedUser) return DEFAULT_AVATAR;
    
    const profileImage = match.matchedUser.profileImage;
    
    if (!profileImage) return DEFAULT_AVATAR;
    
    // Simply use the URL directly as provided by the API
    return { uri: profileImage };
  }, []);



  const navigateToChat = (match: MatchType) => {
    if (!match.matchedUser) return;
    
    // Get the profile image URL
    const profileImage = match.matchedUser.profileImage || '';
    
    // Encode the URL to make it safe for navigation params
    const encodedProfileImage = encodeURIComponent(profileImage);
    
    console.log(`[Messages] Navigating to chat with encoded profileImage`);
    
    // Set the custom header BEFORE navigation
    setCustomHeader(true);
    
    // Navigate with the encoded URL
    router.push({
      pathname: "/messages/chat",
      params: {
        matchId: match.matchId,
        userId: match.matchedUser.id,
        userName: match.matchedUser.name,
        profileImage: encodedProfileImage
      }
    });
  };

  // Render match list item
  const renderMatchItem = ({ item }: { item: MatchType }) => {
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => navigateToChat(item)}
      >
        <View style={styles.matchItemContent}>
          <Image
            source={getImageUrl(item)}
            style={styles.avatar}
            onError={() => {
              console.warn(`[Messages] Image failed for ${item.matchedUser?.name || 'unknown'}`);
            }}
          />
          <View style={styles.matchDetails}>
            <Text style={styles.matchName}>{item.matchedUser?.name || 'Unknown'}</Text>
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
      
      {(isDataLoading && matches.length === 0) ? (
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
              onRefresh={handleRefresh}
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
    backgroundColor: '#333', // Show background while loading
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