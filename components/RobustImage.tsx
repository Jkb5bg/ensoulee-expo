// components/RobustImage.tsx
import React, { useState } from 'react';
import { Image, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { cleanPresignedUrl } from '../utils/imageHelpers';

interface RobustImageProps {
  source: any;
  style: any;
  fallbackSource?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const DEFAULT_AVATAR = require('../assets/images/default-avatar.png');

const RobustImage: React.FC<RobustImageProps> = ({
  source,
  style,
  fallbackSource = DEFAULT_AVATAR,
  resizeMode = 'cover',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Clean URL if it's a string
  const imageSource = typeof source === 'string' 
    ? { uri: cleanPresignedUrl(source) || '' } 
    : source;
  
  // Use fallback for null/undefined sources
  const finalSource = !imageSource || (imageSource.uri === '') 
    ? fallbackSource 
    : imageSource;
  
  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator size="small" color="#F44D7B" />
        </View>
      )}
      
      {hasError && (
        <Image
          source={fallbackSource}
          style={style}
          resizeMode={resizeMode}
        />
      )}
      
      <Image
        source={finalSource}
        style={[style, hasError && styles.hidden]}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          console.log(`Image load error: ${JSON.stringify(imageSource)}`);
          setHasError(true);
          setIsLoading(false);
        }}
        resizeMode={resizeMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  hidden: {
    display: 'none',
  },
});

export default RobustImage;