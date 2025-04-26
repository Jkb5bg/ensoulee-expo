// components/ChatHeaderAvatar.tsx
import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import { cleanPresignedUrl } from '@/utils/imageHelpers';

interface ChatHeaderAvatarProps {
  imageUrl: string | null;
  userName: string;
  size?: number;
}

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

const ChatHeaderAvatar = ({ imageUrl, userName, size = 40 }: ChatHeaderAvatarProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // Clean the URL only if it exists
    if (imageUrl) {
      try {
        // Clean the URL and remove any problematic characters
        const cleaned = cleanPresignedUrl(imageUrl);
        console.log(`Cleaned URL for ${userName}:`, cleaned ? cleaned.substring(0, 50) + '...' : 'null');
        setCleanedUrl(cleaned || null);
      } catch (error) {
        console.error(`Error cleaning URL for ${userName}:`, error);
        setHasError(true);
      }
    } else {
      setCleanedUrl(null);
    }
  }, [imageUrl, userName]);
  
  // Dynamically create styles based on size prop
  const dynamicStyles = {
    avatarContainer: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
    }
  };
  
  return (
    <View style={[styles.avatarContainer, dynamicStyles.avatarContainer]}>
      {isLoading && !hasError && (
        <View style={[styles.loadingContainer, dynamicStyles.avatarContainer]}>
          <ActivityIndicator size="small" color="#F44D7B" />
        </View>
      )}
      
      <Image
        source={cleanedUrl && !hasError ? { uri: cleanedUrl } : DEFAULT_AVATAR}
        style={[styles.avatar, dynamicStyles.avatar]}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onLoadEnd={() => setIsLoading(false)}
        onError={(e) => {
          console.warn(`Failed to load avatar for ${userName}. Error:`, e.nativeEvent.error);
          console.warn(`URL attempted: ${cleanedUrl}`);
          setHasError(true);
          setIsLoading(false);
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