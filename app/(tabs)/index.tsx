import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Image,
  ActivityIndicator
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

// Import your SVG icon components
import CloseIcon from '@/components/icons/CloseIcon';
import StarIcon from '@/components/icons/StarIcon';
import LoveIcon from '@/components/icons/LoveIcon';

// Default avatar image
const DEFAULT_AVATAR = require("@/assets/images/default-avatar.png");

export default function IndexScreen() {
  // Get app data from our shared context
  const { potentialMatches, refreshPotentialMatches, isLoading: isDataLoading } = useAppData();
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  
  const { userInfo, authTokens, logout } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // Get current profile
  const currentProfile: Profile | null = potentialMatches && potentialMatches.length > currentProfileIndex 
    ? potentialMatches[currentProfileIndex] 
    : null;

  // Navigate to settings
  const navigateToSettings = () => {
    router.push('/settings');
  }

  // Logout and redirect
  const logoutAndRedirect = () => {
    logout();
    router.replace("/(onboarding)");
  }

  // Handle swipe action
  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentProfile || !userInfo || !authTokens?.idToken) return;

    try {
      showLoading('Processing...');

      // Use API function to handle the swipe
      const success = await HandleSwipe(userInfo, authTokens.idToken, {
        swiperUserName: userInfo.userName || userInfo['cognito_username'] || "No-load",
        swipedUserName: currentProfile.userName,
        direction: direction
      });

      if (success) {
        // Move to next profile
        setCurrentProfileIndex(prevIndex => prevIndex + 1);
        
        // If we've reached the end of the list, refresh
        if (currentProfileIndex >= potentialMatches.length - 1) {
          await refreshPotentialMatches();
          setCurrentProfileIndex(0);
        }
        
        hideLoading();
      } else {
        hideLoading();
        Alert.alert('Error', 'Failed to record your choice');
      }
    } catch (error) {
      console.error('Error recording swipe:', error);
      hideLoading();
      Alert.alert('Error', 'Failed to record your choice');
    }
  }

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
      refreshPotentialMatches();
    }
  }, []);

  // Render profile content
  const renderContent = () => {
    if (isDataLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={"#f44d7b"} />
        </View>
      );
    }

    if (!currentProfile) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.noProfilesText}>No more profiles to show</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={async () => {
              showLoading('Refreshing profiles...');
              await refreshPotentialMatches();
              setCurrentProfileIndex(0);
              hideLoading();
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const hasValidImage = currentProfile.presignedImageUrls && 
      currentProfile.presignedImageUrls.length > 0 &&
      typeof currentProfile.presignedImageUrls[0] === 'string';

    return (
      <>
        <View style={styles.imageContainer}>
          <Image
            source={hasValidImage
              ? { uri: currentProfile.presignedImageUrls[0] }
              : DEFAULT_AVATAR}
            style={styles.image}
            resizeMode={'cover'}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {currentProfile.firstName || 'Unknown'}, {calculateAge(currentProfile.birthDate || '')}
            </Text>
            <Text style={styles.profileLocation}>
              {currentProfile.city || 'Unknown'}, {currentProfile.state || 'Unknown'}
            </Text>
            {currentProfile.bio && (
              <Text style={styles.profileBio} numberOfLines={3}>
                {currentProfile.bio}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => handleSwipe('left')} style={styles.actionButton}>
            <View style={[styles.actionButtonInner, styles.dislikeButton]}>
              <CloseIcon />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionButtonInner, styles.superlikeButton]}>
              <StarIcon />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSwipe('right')} style={styles.actionButton}>
            <View style={[styles.actionButtonInner, styles.likeButton]}>
              <LoveIcon />
            </View>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
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
    imageContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    image: {
        width: '100%',
        height: '85%',
        borderRadius: 16,
    },
    imageFallback: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        position: 'absolute',
        bottom: '20%',
        left: 20,
        right: 20,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
    },
    profileName: {
        fontFamily: "SF-600",
        fontSize: 22,
        color: "#FFFFFF"
    },
    profileLocation: {
        fontSize: 16,
        color: "#FFFFFF",
        marginTop: 4
    },
    profileBio: {
        fontSize: 14,
        color: "#FFFFFF",
        marginTop: 8
    },
    noProfilesText: {
        fontSize: 18,
        color: "#FFFFFF"
    },
    actionButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonInner: {
        width: 64,
        height: 64,
        borderWidth: 3,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
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
    refreshButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: 'rgba(244, 77, 123, 1)',
        borderRadius: 8,
    },
    refreshButtonText: {
        color: "#FFFFFF",
        fontSize: 16
    },
    headerContainer: {
        height: 70,
        backgroundColor: "rgba(31, 34, 35, 1)",
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    headerLeftSection: {
        width: 32,
    },
    headerCenterSection: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerRightSection: {
        flexDirection: 'row',
    },
    headerTitle: {
        fontFamily: "SF-600",
        fontSize: 20,
        color: "#FFFFFF"
    },
    profileIcon: {
        width: 32,
        height: 32,
        borderRadius: 16
    },
    headerIconButton: {
        marginLeft: 15
    }
});