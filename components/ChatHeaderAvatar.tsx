import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useAppData } from '@/components/AppDataContext';

interface ChatHeaderAvatarProps {
  imageUrl: string | null;
  userName: string;
  userId?: string; // Add userId prop to allow cache lookup
  size?: number;
}

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

const ChatHeaderAvatar = ({ imageUrl, userName, userId, size = 40 }: ChatHeaderAvatarProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Get the cached profile images from the app data context
  const { profileImagesCache } = useAppData();
  
  // Determine the final URL to use (cached or provided)
  const getFinalUrl = () => {
    // If we have a userId and imageUrl, check the cache first
    if (userId && imageUrl && profileImagesCache) {
      const cacheKey = `${userId}-${imageUrl}`;
      
      if (profileImagesCache[cacheKey]) {
        console.log(`[ChatHeaderAvatar] Using cached image for ${userName}`);
        return profileImagesCache[cacheKey];
      }
    }
    
    // Otherwise, use the provided imageUrl directly
    return imageUrl;
  };
  
  const finalUrl = getFinalUrl();
  
  // Log what we're doing
  console.log(`[ChatHeaderAvatar] ${userName}: ${finalUrl ? 'Using image' : 'No image'}`);
  
  // Create the source based on the final URL
  const source = finalUrl ? { uri: finalUrl } : DEFAULT_AVATAR;
  
  return (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {isLoading && !hasError && (
        <View style={[styles.loadingContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color="#F44D7B" />
        </View>
      )}
      
      <Image
        source={source}
        style={[
          styles.avatar, 
          { width: size, height: size, borderRadius: size / 2 }
        ]}
        onLoadStart={() => {
          console.log(`[ChatHeaderAvatar] Load start for ${userName}`);
          setIsLoading(true);
        }}
        onLoad={() => {
          console.log(`[ChatHeaderAvatar] Load success for ${userName}`);
          setIsLoading(false);
        }}
        onError={(e) => {
          console.error(`[ChatHeaderAvatar] Load error for ${userName}`);
          setHasError(true);
          setIsLoading(false);
        }}
        defaultSource={DEFAULT_AVATAR}
      />
      
      {hasError && (
        <View style={[styles.errorContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.errorText}>{userName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F44D7B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default ChatHeaderAvatar;