import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';

interface ChatHeaderAvatarProps {
  imageUrl: string | null;
  userName: string;
  size?: number;
}

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

const ChatHeaderAvatar = ({ imageUrl, userName, size = 40 }: ChatHeaderAvatarProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSource, setImageSource] = useState<any>(DEFAULT_AVATAR);
  const [fallbackAttempts, setFallbackAttempts] = useState(0);
  
  useEffect(() => {
    console.log(`[ChatHeaderAvatar] useEffect fired for user: ${userName}, imageUrl length: ${imageUrl ? imageUrl.length : 0}`);
    
    // Reset states
    setIsLoading(true);
    setHasError(false);
    setFallbackAttempts(0);
    
    // Only try to use the image URL if it exists
    if (imageUrl && imageUrl.trim() !== '') {
      setImageSource({ uri: imageUrl });
    } else {
      console.log(`[ChatHeaderAvatar] No imageUrl provided for ${userName}, using default`);
      setImageSource(DEFAULT_AVATAR);
      setIsLoading(false);
    }
  }, [imageUrl, userName]);
  
  const tryFallbackUrl = () => {
    if (!imageUrl) return false;
    
    // Only try a max of 2 fallbacks
    if (fallbackAttempts >= 2) return false;
    
    setFallbackAttempts(prev => prev + 1);
    
    // First fallback: Try the URL without query parameters
    if (fallbackAttempts === 0 && imageUrl.includes('?')) {
      const baseUrl = imageUrl.split('?')[0];
      console.log(`[ChatHeaderAvatar] Trying simplified URL for ${userName}`);
      setImageSource({ uri: baseUrl });
      setIsLoading(true);
      setHasError(false);
      return true;
    }
    
    // Second fallback: Try extracting just the filename pattern
    if (fallbackAttempts === 1 && imageUrl.includes('/')) {
      try {
        // Pattern: extract the last two path segments which should be userId/filename
        const parts = imageUrl.split('/');
        if (parts.length >= 2) {
          const userId = parts[parts.length - 2];
          let filename = parts[parts.length - 1];
          
          // Remove any query parameters from filename
          if (filename.includes('?')) {
            filename = filename.split('?')[0];
          }
          
          const simpleUrl = `https://ensoulee-user-images.s3.amazonaws.com/${userId}/${filename}`;
          console.log(`[ChatHeaderAvatar] Trying basic URL structure for ${userName}`);
          setImageSource({ uri: simpleUrl });
          setIsLoading(true);
          setHasError(false);
          return true;
        }
      } catch (e) {
        console.error('Error creating second fallback URL:', e);
      }
    }
    
    return false;
  };
  
  return (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {isLoading && !hasError && (
        <View style={[styles.loadingContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color="#F44D7B" />
        </View>
      )}
      
      <Image
        source={imageSource}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onLoadStart={() => {
          console.log(`[ChatHeaderAvatar] onLoadStart for ${userName}`);
          setIsLoading(true);
        }}
        onLoad={() => {
          console.log(`[ChatHeaderAvatar] onLoad success for ${userName}`);
          setIsLoading(false);
        }}
        onLoadEnd={() => {
          console.log(`[ChatHeaderAvatar] onLoadEnd for ${userName}`);
          setIsLoading(false);
        }}
        onError={() => {
          console.warn(`[ChatHeaderAvatar] onError loading avatar for ${userName}`);
          
          // Try a fallback URL
          if (!tryFallbackUrl()) {
            // If we've exhausted our fallbacks or couldn't create one, use default
            setHasError(true);
            setIsLoading(false);
            setImageSource(DEFAULT_AVATAR);
          }
        }}
        defaultSource={DEFAULT_AVATAR}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
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
});

export default ChatHeaderAvatar;