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
  
  // Simply use the image URL as provided or default if none
  const source = imageUrl ? { uri: imageUrl } : DEFAULT_AVATAR;
  
  return (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {isLoading && !hasError && (
        <View style={[styles.loadingContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color="#F44D7B" />
        </View>
      )}
      
      <Image
        source={source}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onLoadStart={() => {
          console.log(`[ChatHeaderAvatar] Loading avatar for ${userName}`);
          setIsLoading(true);
        }}
        onLoad={() => {
          console.log(`[ChatHeaderAvatar] Avatar loaded for ${userName}`);
          setIsLoading(false);
        }}
        onLoadEnd={() => {
          setIsLoading(false);
        }}
        onError={() => {
          console.warn(`[ChatHeaderAvatar] Failed to load avatar for ${userName}`);
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
});

export default ChatHeaderAvatar;