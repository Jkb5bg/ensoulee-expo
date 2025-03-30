import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

const LoadingScreen = () => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    // Create a repeating pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});

export default LoadingScreen;