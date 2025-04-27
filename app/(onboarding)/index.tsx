import React, { useState, useEffect, useRef } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Swiper from 'react-native-swiper';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/components/AuthContext';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

interface OnboardingProps {
  onComplete?: () => void; // Optional callback for when onboarding completes
}

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<Swiper>(null);
  const { updateOnboardingStatus } = useAuth();

  // Hide splash screen after a brief delay
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // Wait for a short moment to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 800));
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error("Error hiding splash screen:", error);
      }
    };
    
    hideSplash();
  }, []);

  // Onboarding slide data
  const onboardingData = [
    {
      title: 'Simple & Safe',
      subTitle: '3 Steps To A Meaningful Connection',
      img: require('../../assets/images/onbond1.png'),
    },
    {
      title: 'AI Matching',
      subTitle: 'Let Our AI Put You In The Path Of Your Soulmate',
      img: require('../../assets/images/onbond2.png'),
    },
    {
      title: 'Friction Removed',
      subTitle: 'We Help You Get Out of Your Own Way',
      img: require('../../assets/images/onbond3.png'),
    },
    {
      title: 'Deeper Connections',
      subTitle: 'Bridging The Gap To Lasting Love',
      img: require('../../assets/images/onbond4.png'),
    },
  ];

  // Handle index change with correct tracking
const handleIndexChange = (index: number): void => {
    setCurrentIndex(index);
    
    // If we've reached the last slide, proceed to registration after a delay
    if (index === onboardingData.length - 1) {
        setTimeout(() => {
            completeOnboarding();
        }, 1500);
    }
};

  // Complete onboarding and navigate
  const completeOnboarding = async () => {
    try {
      // Mark onboarding intro as complete
      await updateOnboardingStatus('index', true);
      
      // Use callback if provided
      if (onComplete) {
        onComplete();
      } else {
        // Otherwise navigate to registration
        router.replace('/(onboarding)/register');
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // Navigate anyway in case of error
      router.replace('/(onboarding)/register');
    }
  };

  // Skip onboarding
  const skipOnboarding = async () => {
    await updateOnboardingStatus('index', true);
    if (onComplete) {
      onComplete();
    } else {
      router.replace('/(onboarding)/register');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Skip button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipOnboarding}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
        {/* Swiper for onboarding slides */}
        <Swiper
          ref={swiperRef}
          style={styles.wrapper}
          showsButtons={false}
          loop={false}
          onIndexChanged={handleIndexChange}
          dotStyle={styles.dot}
          activeDotStyle={styles.activeDot}
          paginationStyle={styles.pagination}
        >
          {onboardingData.map((item, index) => (
            <View style={styles.slide} key={index}>
              <ImageBackground 
                source={item.img} 
                style={styles.image}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={[
                    'rgba(20, 20, 20, 0.9)',
                    'rgba(20, 20, 20, 0.07)',
                    'rgba(20, 20, 20, 0.97)',
                  ]}
                  locations={[0.1, 0.4, 0.75]}
                  style={styles.overlay}
                >
                  <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subTitle}>{item.subTitle}</Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>
          ))}
        </Swiper>
        
        {/* Continue button (alternative to swiping) */}
        {currentIndex < onboardingData.length - 1 && (
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => swiperRef.current?.scrollBy(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        )}
        
        {/* Get Started button (on last slide) */}
        {currentIndex === onboardingData.length - 1 && (
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={completeOnboarding}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  wrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 25,
    paddingBottom: 180, // Make room for the buttons at bottom
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    opacity: 0.9,
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#F44D7B',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  pagination: {
    bottom: 130,
  },
  skipButton: {
    position: 'absolute',
    top: isIOS ? 50 : 30,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#F44D7B',
    fontSize: 17,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  continueButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#F44D7B',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    zIndex: 10,
    width: width * 0.8,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  getStartedButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#F44D7B',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    zIndex: 10,
    width: width * 0.8,
    alignItems: 'center',
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});