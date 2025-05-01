// app/(tabs)/index.tsx - Fixed TypeScript version
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder
} from 'react-native';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { router } from 'expo-router';
import Profile from '@/types/profile';
import calculateAge from '@/functions/calculateAge';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HandleSwipe } from '@/api/HandleSwipe';
import { useAppData } from '@/components/AppDataContext';
import * as SplashScreen from 'expo-splash-screen';
import Swiper from 'react-native-swiper';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

// Import your SVG icon components
import CloseIcon from '@/components/icons/CloseIcon';
import StarIcon from '@/components/icons/StarIcon';
import LoveIcon from '@/components/icons/LoveIcon';

// Default avatar image
const DEFAULT_AVATAR = require("@/assets/images/default-avatar.png");
const { width, height } = Dimensions.get('window');

// Swipe threshold - how far user needs to swipe to trigger action
const SWIPE_THRESHOLD = 120;

export default function IndexScreen() {
  // Get app data from our shared context
  const { potentialMatches, refreshPotentialMatches, isLoading: isDataLoading } = useAppData();
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [nextProfilesLoaded, setNextProfilesLoaded] = useState(false);
  
  const { userInfo, authTokens, logout, user } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // Animation values
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });
  
  // Opacity values for like/dislike indicators
  const likeOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const dislikeOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  // Get current profile
  const currentProfile: Profile | null = potentialMatches && potentialMatches.length > currentProfileIndex 
    ? potentialMatches[currentProfileIndex] 
    : null;
    
  // Preload the next image in the stack
  useEffect(() => {
    const preloadNextProfile = async () => {
      if (potentialMatches && potentialMatches.length > currentProfileIndex + 1) {
        const nextProfile = potentialMatches[currentProfileIndex + 1];
        setNextProfilesLoaded(true);
        
        // Preload the next profile's first image if it exists
        if (nextProfile.presignedImageUrls && nextProfile.presignedImageUrls.length > 0) {
          await Image.prefetch(nextProfile.presignedImageUrls[0]);
        }
      } else {
        setNextProfilesLoaded(false);
      }
    };
    
    preloadNextProfile();
  }, [currentProfileIndex, potentialMatches]);

  // Reset position when profile changes
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
  }, [currentProfileIndex]);

  // Handle swipe action via API (only accepts 'left' or 'right')
  const handleSwipeAction = async (direction: 'left' | 'right') => {
    if (!currentProfile || !userInfo || !authTokens?.idToken) return;

    try {
      // Get the custom:userName from userInfo, which should match what's in the JWT
      const customUserName = userInfo.userName;
      
      console.log('Submitting swipe with customUserName:', customUserName);
      
      // Move to next profile immediately (for better UX)
      const nextIndex = currentProfileIndex + 1;
      setCurrentProfileIndex(nextIndex);
      
      // Perform API call in the background
      HandleSwipe(userInfo, authTokens.idToken, {
        swiperUserName: customUserName || 'UnknownUser',
        swipedUserName: currentProfile.userName,
        direction: direction
      }).then(success => {
        if (!success) {
          console.error('Swipe was not recorded successfully');
        }
      }).catch(error => {
        console.error('Error recording swipe:', error);
      });
      
      // Check if we've reached the end of the list
      if (nextIndex >= potentialMatches.length) {
        // We've reached the end of available profiles
        console.log('Reached end of potential matches');
      }
    } catch (error) {
      console.error('Error in handleSwipeAction:', error);
    }
  };

  // Special handler for superlike that uses 'right' direction for API
  const handleSuperLike = async () => {
    if (!currentProfile) return;
    // Just use 'right' direction for superlike in the API
    await handleSwipeAction('right');
  };

  // Set up pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right - LIKE
          Animated.spring(position, {
            toValue: { x: width + 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            handleSwipeAction('right');
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left - DISLIKE
          Animated.spring(position, {
            toValue: { x: -width - 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            handleSwipeAction('left');
          });
        } else {
          // Return to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Manual swipe buttons
  const swipeLeft = () => {
    if (!currentProfile) return;
    
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      handleSwipeAction('left');
    });
  };

  const swipeRight = () => {
    if (!currentProfile) return;
    
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      handleSwipeAction('right');
    });
  };
  
  const superLike = () => {
    if (!currentProfile) return;
    
    Animated.timing(position, {
      toValue: { x: 0, y: -100 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      handleSuperLike();
    });
  };

  // Refresh profiles - used when no profiles are available
  const refreshProfiles = () => {
    setRefreshing(true);
    refreshPotentialMatches().then(() => {
      setCurrentProfileIndex(0);
      setRefreshing(false);
    }).catch(error => {
      console.error('Error refreshing matches:', error);
      setRefreshing(false);
    });
  };

  // Refresh data if needed when the component mounts
  useEffect(() => {
    // Hide splash screen after a brief delay
    setTimeout(() => {
      SplashScreen.hideAsync().catch(err => 
        console.log("Error hiding splash screen:", err)
      );
      hideLoading();
    }, 1000); // Just a short delay to ensure component has rendered
    
    if (potentialMatches.length === 0 && !isDataLoading) {
      setRefreshing(true);
      refreshPotentialMatches().finally(() => {
        setRefreshing(false);
      });
    }
  }, []);

  // Render profile content
  const renderContent = () => {
    // Show loading indicator when initially loading data
    if ((isDataLoading || refreshing) && potentialMatches.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={"#f44d7b"} />
          <Text style={[styles.noProfilesSubText, {marginTop: 20}]}>Finding matches for you...</Text>
        </View>
      );
    }

    // Empty state - no more profiles to show
    if (!currentProfile) {
      return (
        <View style={styles.centerContainer}>
          <Image 
            source={require('@/assets/images/default-avatar.png')} 
            style={styles.emptyStateImage} 
            resizeMode="contain"
          />
          <Text style={styles.noProfilesText}>No more profiles to show</Text>
          <Text style={styles.noProfilesSubText}>Check back later or refresh to find new matches</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshProfiles}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.refreshButtonText}>Find New Matches</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    const hasValidImages = currentProfile.presignedImageUrls && 
      currentProfile.presignedImageUrls.length > 0;

    return (
      <>
        <View style={styles.profileCardContainer}>
          {/* Card with swipe animations */}
          <Animated.View 
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate: rotate }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Like indicator */}
            <Animated.View 
              style={[
                styles.likeIndicator, 
                { opacity: likeOpacity }
              ]}
            >
              <Text style={styles.indicatorText}>LIKE</Text>
            </Animated.View>
            
            {/* Dislike indicator */}
            <Animated.View 
              style={[
                styles.dislikeIndicator, 
                { opacity: dislikeOpacity }
              ]}
            >
              <Text style={styles.indicatorText}>NOPE</Text>
            </Animated.View>
            
            {/* Superlike indicator - shows when swiping up */}
            <Animated.View 
              style={[
                styles.superlikeIndicator, 
                { 
                  opacity: position.y.interpolate({
                    inputRange: [-height / 10, 0],
                    outputRange: [1, 0],
                    extrapolate: 'clamp'
                  }) 
                }
              ]}
            >
              <Text style={styles.indicatorText}>SUPER</Text>
            </Animated.View>

            <View style={styles.imageContainer}>
              {hasValidImages ? (
                <Swiper
                  style={styles.swiper}
                  loop={false}
                  dot={<View style={styles.dot} />}
                  activeDot={<View style={styles.activeDot} />}
                  paginationStyle={styles.pagination}
                >
                  {currentProfile.presignedImageUrls.map((imageUrl, index) => (
                    <View key={index} style={styles.slideContainer}>
                      <Image
                        source={{ uri: imageUrl }}
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
                  <Image
                    source={DEFAULT_AVATAR}
                    style={styles.slideImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                    style={styles.imageGradient}
                  />
                </View>
              )}
              
              <View style={styles.profileInfoOverlay}>
                <Text style={styles.profileName}>
                  {currentProfile.firstName || 'Unknown'}, {calculateAge(currentProfile.birthDate || '')}
                </Text>
                
                {(currentProfile.city || currentProfile.state) && (
                  <View style={styles.locationWrapper}>
                    <Text style={styles.locationText}>
                      {[currentProfile.city, currentProfile.state].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                )}
                
                {currentProfile.bio && (
                  <Text style={styles.profileBio} numberOfLines={3}>
                    {currentProfile.bio}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>

        <SafeAreaView style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            {currentProfile && (
              <>
                <TouchableOpacity onPress={swipeLeft} style={styles.actionButton}>
                  <View style={[styles.actionButtonInner, styles.dislikeButton]}>
                    <CloseIcon />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={superLike} style={styles.actionButton}>
                  <View style={[styles.actionButtonInner, styles.superlikeButton]}>
                    <StarIcon />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={swipeRight} style={styles.actionButton}>
                  <View style={[styles.actionButtonInner, styles.likeButton]}>
                    <LoveIcon />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Main Content */}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(24, 24, 24, 1)"
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Profile card container
  profileCardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // Added bottom padding to create space for buttons
  },
  card: {
    width: '100%',
    height: '80%', // Further reduced height to avoid bumping into buttons
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.29,
    shadowRadius: 4.65,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  
  // Swiper styles
  swiper: {
    height: '100%',
  },
  slideContainer: {
    flex: 1,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  },
  activeDot: {
    backgroundColor: '#f44d7b',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 3,
    marginRight: 3,
  },
  pagination: {
    bottom: 15,
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
    
  // Profile info overlay
  profileInfoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 10,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: "#FFFFFF",
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  locationText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  profileBio: {
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Empty state
  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.7,
    borderRadius: 60,
    tintColor: 'rgba(255,255,255,0.5)'
  },
  noProfilesText: {
    fontSize: 22,
    fontWeight: '600',
    color: "#FFFFFF",
    marginBottom: 10,
  },
  noProfilesSubText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  refreshButton: {
    padding: 16,
    backgroundColor: '#f44d7b',
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Action buttons container - now using SafeAreaView
  actionButtonsContainer: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30, // Increased bottom padding
    paddingTop: 20, // Increased top padding
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonInner: {
    width: 60,
    height: 60,
    borderWidth: 3,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darker background for better contrast
    marginHorizontal: 10, // Add horizontal spacing between buttons
  },
  dislikeButton: {
    borderColor: "rgba(246, 62, 64, 1)"
  },
  superlikeButton: {
    borderColor: "rgba(33, 186, 251, 1)"
  },
  likeButton: {
    borderColor: "rgba(30, 177, 89, 1)"
  },
  
  // Swipe indicators
  likeIndicator: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 10,
    transform: [{ rotate: '30deg' }],
    borderWidth: 4,
    borderRadius: 8,
    borderColor: "rgba(30, 177, 89, 1)",
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dislikeIndicator: {
    position: 'absolute',
    top: 50,
    left: 40,
    zIndex: 10,
    transform: [{ rotate: '-30deg' }],
    borderWidth: 4,
    borderRadius: 8,
    borderColor: "rgba(246, 62, 64, 1)",
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  superlikeIndicator: {
    position: 'absolute',
    top: 50, 
    alignSelf: 'center',
    zIndex: 10,
    borderWidth: 4,
    borderRadius: 8,
    borderColor: "rgba(33, 186, 251, 1)",
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  indicatorText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});